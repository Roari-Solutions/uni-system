import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../../components/confirmDialog";
import DataTable, { type Column } from "../../components/dataTable";
import EditUserDialog, { type UserEdit } from "../../components/editUserDialog";
import FilterSelect from "../../components/filterSelect";
import useAuth from "../../auth/useAuth";
import useFaculties from "../../hooks/useFaculties";
import {
	fetchRoles,
	fetchUsers,
	renameUser,
	resetUserPassword,
	setUserSuspended,
} from "../../api/users";
import type { AssignableRole, ManagedUser } from "../../types/user";

const UserList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { user: currentUser } = useAuth();
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

	const saveEdit = async ({ name, password }: UserEdit) => {
		if (!editing) return;
		const target = editing;
		setEditSaving(true);
		setEditFailure(null);
		try {
			if (name !== target.name) {
				const updated = await renameUser(target.id, name);
				setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
			}
			if (password) await resetUserPassword(target.id, password);
			setEditing(null);
		} catch {
			// the dialog stays open so nothing typed is lost
			setEditFailure("common.saveFailed");
		} finally {
			setEditSaving(false);
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
		{ key: "role", header: t("userList.columns.role"), render: (u) => t(`roles.${u.role}`) },
		{ key: "faculty", header: t("userList.columns.faculty"), render: (u) => facultyName(u.facultyId) },
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
					<button
						type="button"
						onClick={() => openEdit(u)}
						aria-label={t("userList.editItem", { name: u.name })}
						className={actionClass}
					>
						{t("userList.edit")}
					</button>
					{/* an admin may not suspend themselves: that locks everyone out */}
					{u.id === currentUser?.id ? (
						<span className="px-3 py-2 text-body-sm text-primary-hover">
							{t("userList.you")}
						</span>
					) : (
						<button type="button" onClick={() => setPendingSuspend(u)} className={actionClass}>
							{t(u.suspended ? "userList.restore" : "userList.suspend")}
						</button>
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
				<FilterSelect
					id="facultyFilter"
					label={t("userList.filters.faculty")}
					value={facultyId}
					onChange={setFacultyId}
					allLabel={t("userList.filters.allFaculties")}
					options={faculties.map((f) => ({ value: f.id, label: f.name[lang] }))}
				/>
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
		</div>
	);
};

export default UserList;
