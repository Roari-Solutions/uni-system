import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import FormField from "./formField";
import { inputClass, secondaryButtonClass, submitButtonClass } from "../styles/form";

// mirrors MIN_PASSWORD_LENGTH in the API
const MIN_PASSWORD = 8;

/** The edited values; a null password leaves the current one in place. */
export type UserEdit = {
	name: string;
	// the login identifier, stored in users.email
	email: string;
	password: string | null;
};

type EditUserDialogProps = {
	open: boolean;
	name: string;
	login: string;
	saving: boolean;
	// i18n key of a failure reported by the caller
	failure: string | null;
	onSave: (edit: UserEdit) => void;
	onCancel: () => void;
};

type FieldErrors = { name?: string; email?: string; password?: string };

/** Edits a user's name and login and, optionally, sets a new password. */
const EditUserDialog = ({
	open,
	name,
	login,
	saving,
	failure,
	onSave,
	onCancel,
}: EditUserDialogProps) => {
	const { t } = useTranslation();
	const ref = useRef<HTMLDialogElement>(null);
	const [draftName, setDraftName] = useState("");
	const [draftLogin, setDraftLogin] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<FieldErrors>({});
	const [wasOpen, setWasOpen] = useState(open);

	// each user is edited from what they hold now, not from the last one edited
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setDraftName(name);
			setDraftLogin(login);
			setPassword("");
			setErrors({});
		}
	}

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;

		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const save = () => {
		const next: FieldErrors = {};
		if (!draftName.trim()) next.name = "userEntry.errors.required";
		if (!draftLogin.trim()) next.email = "userEntry.errors.required";
		// blank keeps the current password
		if (password && password.length < MIN_PASSWORD) {
			next.password = "userEntry.errors.passwordLength";
		}
		setErrors(next);
		if (next.name || next.email || next.password) return;

		onSave({ name: draftName.trim(), email: draftLogin.trim(), password: password || null });
	};

	return (
		<dialog
			ref={ref}
			onClose={onCancel}
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			aria-labelledby="editUserTitle"
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
					<h2 id="editUserTitle" className="mb-2 text-heading-5 text-accent-deep">
						{t("editUser.title")}
					</h2>
					<p dir="ltr" className="text-start text-body-sm text-primary-hover">
						{login}
					</p>
				</div>

				<FormField id="editUserName" label={t("userEntry.name")} error={errors.name}>
					<input
						id="editUserName"
						type="text"
						value={draftName}
						onChange={(e) => setDraftName(e.target.value)}
						aria-invalid={!!errors.name}
						className={inputClass(!!errors.name)}
					/>
				</FormField>

				<FormField id="editUserLogin" label={t("userEntry.email")} error={errors.email}>
					<input
						id="editUserLogin"
						type="text"
						dir="ltr"
						autoComplete="off"
						value={draftLogin}
						onChange={(e) => setDraftLogin(e.target.value)}
						aria-invalid={!!errors.email}
						className={inputClass(!!errors.email)}
					/>
				</FormField>

				<FormField
					id="editUserPassword"
					label={t("editUser.newPassword")}
					error={errors.password}
				>
					<input
						id="editUserPassword"
						type="text"
						dir="ltr"
						autoComplete="off"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						aria-invalid={!!errors.password}
						aria-describedby="editUserPasswordHint"
						className={inputClass(!!errors.password)}
					/>
					{/* shown in the clear: the admin has to read it out to the user */}
					<p id="editUserPasswordHint" className="text-body-sm text-primary-hover">
						{t("editUser.passwordHint")}
					</p>
				</FormField>

				{failure && (
					<p role="alert" className="text-body-sm text-error">
						{t(failure)}
					</p>
				)}

				<div className="flex justify-end gap-3">
					<button type="button" onClick={onCancel} className={secondaryButtonClass}>
						{t("common.cancel")}
					</button>
					<button type="submit" disabled={saving} className={submitButtonClass}>
						{saving ? t("common.saving") : t("editUser.save")}
					</button>
				</div>
			</form>
		</dialog>
	);
};

export default EditUserDialog;
