import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import FacultyField from "./facultyField";
import RoleChecklist from "./roleChecklist";
import type { AssignableRole } from "../types/user";
import { needsFaculty } from "../utils/roles";
import { secondaryButtonClass, submitButtonClass } from "../styles/form";

type EditRolesDialogProps = {
	open: boolean;
	name: string;
	roles: AssignableRole[];
	current: string[];
	facultyId: string | null;
	/** An admin may not change their own roles; the API refuses it too. */
	self: boolean;
	saving: boolean;
	// i18n key of a failure reported by the caller
	failure: string | null;
	onSave: (roles: string[], facultyId: string | null) => void;
	onCancel: () => void;
};

/** Changes which roles a user holds, e.g. to make a data-entry employee a content manager as well. */
const EditRolesDialog = ({
	open,
	name,
	roles,
	current,
	facultyId,
	self,
	saving,
	failure,
	onSave,
	onCancel,
}: EditRolesDialogProps) => {
	const { t } = useTranslation();
	const ref = useRef<HTMLDialogElement>(null);
	const [draft, setDraft] = useState<string[]>([]);
	const [faculty, setFaculty] = useState("");
	const [errors, setErrors] = useState<{ roles?: string; faculty?: string }>({});
	const [wasOpen, setWasOpen] = useState(open);

	// each user is edited from what they hold now, not from the last one edited
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setDraft(current);
			setFaculty(facultyId ?? "");
			setErrors({});
		}
	}

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;

		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const scoped = needsFaculty(draft);

	const save = () => {
		const next: typeof errors = {};
		// no roles here is allowed: the user may keep roles in another domain, and the API says if not
		if (scoped && !faculty) next.faculty = "userEntry.errors.required";
		setErrors(next);
		if (next.roles || next.faculty) return;

		onSave(draft, scoped ? faculty : null);
	};

	return (
		<dialog
			ref={ref}
			onClose={onCancel}
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			aria-labelledby="editRolesTitle"
			className="m-auto w-full max-w-md rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60"
		>
			<form
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
				className="flex flex-col gap-6 p-6"
			>
				<div>
					<h2 id="editRolesTitle" className="mb-2 text-heading-5 text-accent-deep">
						{t("editRoles.title")}
					</h2>
					<p className="text-body-sm text-primary-hover">{name}</p>
				</div>

				<RoleChecklist
					id="editRoles"
					label={t("userEntry.roles")}
					roles={roles}
					value={draft}
					onChange={setDraft}
					error={errors.roles}
					disabled={self}
					hint={self ? t("editRoles.selfNote") : undefined}
				/>

				{scoped && (
					<FacultyField
						label={t("userEntry.faculty")}
						placeholder={t("userEntry.facultyPlaceholder")}
						noResultsText={t("userEntry.noResults")}
						value={faculty}
						onChange={setFaculty}
						error={errors.faculty}
					/>
				)}

				{failure && (
					<p role="alert" className="text-body-sm text-error">
						{t(failure)}
					</p>
				)}

				<div className="flex justify-end gap-3">
					<button type="button" onClick={onCancel} className={secondaryButtonClass}>
						{t("common.cancel")}
					</button>
					<button type="submit" disabled={saving || self} className={submitButtonClass}>
						{saving ? t("common.saving") : t("editRoles.save")}
					</button>
				</div>
			</form>
		</dialog>
	);
};

export default EditRolesDialog;
