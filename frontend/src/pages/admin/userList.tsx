import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../../components/confirmDialog";
import DataTable, { type Column } from "../../components/dataTable";
import EditUserDialog, { type UserEdit } from "../../components/editUserDialog";
import EditRolesDialog from "../../components/editRolesDialog";
import FilterSelect from "../../components/filterSelect";
import useAuth from "../../auth/useAuth";
import { PERMISSIONS } from "../../types/auth";
import useFaculties from "../../hooks/useFaculties";
import {
	fetchRoles,
	fetchUsers,
	updateUserIdentity,
	updateUserRoles,
	resetUserPassword,
	setUserSuspended,
} from "../../api/users";
import type { AssignableRole, ManagedUser } from "../../types/user";
import axios from "axios";

const UserList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { user: currentUser, reloadUser, can } = useAuth();
	// faculties are the grades system's; the website's users have none
	const inGrades = can(PERMISSIONS.grades);
	const { faculties } = useFaculties();

	const [users, setUsers] = useState<ManagedUser[]>([]);
	const [roles, setRoles] = useState<AssignableRole[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [facultyId, setFacultyId] = useState("");
	const [role, setRole] = useState("");
	const [pendingSuspend, setPendingSuspend] = useState<ManagedUser | null>(null);
	const [editing, setEditing] = useState<ManagedUser | null>(null);
	const [editSaving, setEditSaving] = useState(false);
	const [editFailure, setEditFailure] = useState<string | null>(null);
	const [editingRoles, setEditingRoles] = useState<ManagedUser | null>(null);
	const [rolesSaving, setRolesSaving] = useState(false);
	const [rolesFailure, setRolesFailure] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		Promise.all([
			fetchUsers({ facultyId: facultyId || undefined, role: role || undefined }),
			fetchRoles(),
		])
			.then(([userRows, roleRows]) => {
				if (cancelled) return;
				setUsers(userRows);
				setRoles(roleRows);
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [facultyId, role]);

	const facultyName = (id: string | null) =>
		id ? (faculties.find((f) => f.id === id)?.name[lang] ?? "") : t("userList.allFaculties");

	const confirmSuspend = async () => {
		if (!pendingSuspend) return;
		const target = pendingSuspend;
		setPendingSuspend(null);
		try {
			const updated = await setUserSuspended(target.id, !target.suspended);
			setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
		} catch {
			setFailed(true);
		}
	};

	const openEdit = (u: ManagedUser) => {
		setEditFailure(null);
		setEditing(u);
	};

	const saveEdit = async ({ name, email, password }: UserEdit) => {
		if (!editing) return;
		const target = editing;
		setEditSaving(true);
		setEditFailure(null);
		try {
			const changes = {
				...(name !== target.name ? { name } : {}),
				...(email !== target.email ? { email } : {}),
			};
			if (Object.keys(changes).length) {
				const updated = await updateUserIdentity(target.id, changes);
				setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
				setEditing(updated);
			}
			if (password) await resetUserPassword(target.id, password);
			// the side nav shows the signed-in user's own name
			if (target.id === currentUser?.id) await reloadUser();
			setEditing(null);
		} catch (error) {
			// the dialog stays open so nothing typed is lost; 409 means the login is taken
			const status = axios.isAxiosError(error) ? error.response?.status : undefined;
			setEditFailure(status === 409 ? "userEntry.errors.taken" : "common.saveFailed");
		} finally {
			setEditSaving(false);
		}
	};

	const openRoles = (u: ManagedUser) => {
		setRolesFailure(null);
		setEditingRoles(u);
	};

	const saveRoles = async (nextRoles: string[], nextFaculty: string | null) => {
		if (!editingRoles) return;
		setRolesSaving(true);
		setRolesFailure(null);
		try {
			const updated = await updateUserRoles(editingRoles.id, nextRoles, nextFaculty);
			setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
			setEditingRoles(null);
		} catch (error) {
			// the dialog stays open so the choice isn't lost; a user needs at least one role somewhere
			const code = axios.isAxiosError(error) ? (error.response?.data as { code?: string } | undefined)?.code : undefined;
			setRolesFailure(code === "ROLE_REQUIRED" ? "userEntry.errors.roleRequired" : "common.saveFailed");
		} finally {
			setRolesSaving(false);
		}
	};

	const actionClass =
		"rounded-xs px-3 py-2 text-body-sm text-accent-deep underline-offset-4 transition-colors duration-150 ease-out hover:bg-background hover:underline";

	const columns: Column<ManagedUser>[] = [
		{ key: "name", header: t("userList.columns.name"), render: (u) => u.name },
		{
			key: "email",
			header: t("userList.columns.email"),
			render: (u) => <span dir="ltr">{u.email}</span>,
		},
		{
			key: "roles",
			header: t("userList.columns.roles"),
			render: (u) => u.roles.map((r) => t(`roles.${r}`)).join(" · "),
		},
		...(inGrades
			? [{ key: "faculty", header: t("userList.columns.faculty"), render: (u: ManagedUser) => facultyName(u.facultyId) }]
			: []),
		{
			key: "status",
			header: t("userList.columns.status"),
			// §39 — the word carries the meaning, not a colour
			render: (u) => t(u.suspended ? "userList.suspended" : "userList.active"),
		},
		{
			key: "actions",
			header: t("common.actions"),
			render: (u) => (
				<div className="flex flex-wrap items-center gap-1">
					{/* the API decides what this admin may do to whom; the list only offers that */}
					{u.canEditAccount && (
						<button
							type="button"
							onClick={() => openEdit(u)}
							aria-label={t("userList.editItem", { name: u.name })}
							className={actionClass}
						>
							{t("userList.edit")}
						</button>
					)}
					{u.canEditRoles && (
						<button
							type="button"
							onClick={() => openRoles(u)}
							aria-label={t("userList.rolesItem", { name: u.name })}
							className={actionClass}
						>
							{t("userList.roles")}
						</button>
					)}
					{/* an admin may not suspend themselves: that locks everyone out */}
					{u.id === currentUser?.id ? (
						<span className="px-3 py-2 text-body-sm text-primary-hover">
							{t("userList.you")}
						</span>
					) : u.canEditAccount ? (
						<button type="button" onClick={() => setPendingSuspend(u)} className={actionClass}>
							{t(u.suspended ? "userList.restore" : "userList.suspend")}
						</button>
					) : (
						!u.canEditRoles && (
							<span className="px-3 py-2 text-body-sm text-primary-hover">
								{t("userList.readOnly")}
							</span>
						)
					)}
				</div>
			),
		},
	];

	return (
		<div>
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("userList.title")}
			</h1>

			<div className="mb-6 flex flex-wrap items-end gap-6">
				{inGrades && (
					<FilterSelect
						id="facultyFilter"
						label={t("userList.filters.faculty")}
						value={facultyId}
						onChange={setFacultyId}
						allLabel={t("userList.filters.allFaculties")}
						options={faculties.map((f) => ({ value: f.id, label: f.name[lang] }))}
					/>
				)}
				<FilterSelect
					id="roleFilter"
					label={t("userList.filters.role")}
					value={role}
					onChange={setRole}
					allLabel={t("userList.filters.allRoles")}
					options={roles.map((r) => ({ value: r.name, label: t(`roles.${r.name}`) }))}
				/>
			</div>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}

			<DataTable
				columns={columns}
				rows={users}
				getRowId={(u) => u.id}
				emptyText={loading ? t("common.loading") : t("userList.empty")}
			/>

			<ConfirmDialog
				open={pendingSuspend !== null}
				title={t(pendingSuspend?.suspended ? "userList.restoreTitle" : "userList.suspendTitle")}
				message={t(
					pendingSuspend?.suspended ? "userList.restoreMessage" : "userList.suspendMessage",
					{ name: pendingSuspend?.name },
				)}
				confirmLabel={t(pendingSuspend?.suspended ? "userList.restore" : "userList.suspend")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void confirmSuspend()}
				onCancel={() => setPendingSuspend(null)}
			/>

			<EditUserDialog
				open={editing !== null}
				name={editing?.name ?? ""}
				login={editing?.email ?? ""}
				saving={editSaving}
				failure={editFailure}
				onSave={(edit) => void saveEdit(edit)}
				onCancel={() => setEditing(null)}
			/>

			<EditRolesDialog
				open={editingRoles !== null}
				name={editingRoles?.name ?? ""}
				roles={roles.filter((r) => r.assignable)}
				current={editingRoles?.roles ?? []}
				facultyId={editingRoles?.facultyId ?? null}
				self={editingRoles?.id === currentUser?.id}
				saving={rolesSaving}
				failure={rolesFailure}
				onSave={(r, f) => void saveRoles(r, f)}
				onCancel={() => setEditingRoles(null)}
			/>
		</div>
	);
};

export default UserList;
