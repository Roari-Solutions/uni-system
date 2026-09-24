import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import FormField from "../../components/formField";
import useAuth from "../../auth/useAuth";
import { updateAccount } from "../../api/account";
import { formCardClass, inputClass, submitButtonClass } from "../../styles/form";

// mirrors MIN_PASSWORD_LENGTH in the API
const MIN_PASSWORD = 8;

type FieldErrors = Partial<Record<"name" | "email" | "newPassword" | "currentPassword", string>>;

/** The signed-in user changes their own name, login and password. */
const AccountSettings = () => {
	const { t } = useTranslation();
	const { user, reloadUser } = useAuth();

	const [name, setName] = useState(user?.name ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [newPassword, setNewPassword] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitting, setSubmitting] = useState(false);
	const [saved, setSaved] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!user) return;

		const next: FieldErrors = {};
		if (!name.trim()) next.name = "userEntry.errors.required";
		if (!email.trim()) next.email = "userEntry.errors.required";
		// blank keeps the current password
		if (newPassword && newPassword.length < MIN_PASSWORD) {
			next.newPassword = "userEntry.errors.passwordLength";
		}
		if (!currentPassword) next.currentPassword = "account.errors.currentRequired";
		setErrors(next);
		setSaved(false);
		setFailure(null);
		if (Object.keys(next).length) return;

		const changes = {
			...(name.trim() !== user.name ? { name: name.trim() } : {}),
			...(email.trim() !== user.email ? { email: email.trim() } : {}),
			...(newPassword ? { newPassword } : {}),
		};
		if (!Object.keys(changes).length) {
			setFailure("account.errors.nothingChanged");
			return;
		}

		setSubmitting(true);
		try {
			await updateAccount({ ...changes, currentPassword });
			// the side nav reads the signed-in user, so it picks up the new name
			await reloadUser();
			setNewPassword("");
			setCurrentPassword("");
			setSaved(true);
		} catch (error) {
			const response = axios.isAxiosError(error) ? error.response : undefined;
			const code = (response?.data as { code?: string } | undefined)?.code;
			if (code === "WRONG_PASSWORD") {
				setErrors({ currentPassword: "account.errors.wrongPassword" });
			} else if (response?.status === 409) {
				setErrors({ email: "userEntry.errors.taken" });
			} else {
				setFailure("common.saveFailed");
			}
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="mx-auto max-w-xl">
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("account.title")}
			</h1>

			<form noValidate onSubmit={(e) => void handleSubmit(e)} className={formCardClass}>
				<FormField id="accountName" label={t("userEntry.name")} error={errors.name}>
					<input
						id="accountName"
						type="text"
						autoComplete="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						aria-invalid={!!errors.name}
						className={inputClass(!!errors.name)}
					/>
				</FormField>

				<FormField id="accountLogin" label={t("userEntry.email")} error={errors.email}>
					<input
						id="accountLogin"
						type="text"
						dir="ltr"
						autoComplete="username"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						aria-invalid={!!errors.email}
						className={inputClass(!!errors.email)}
					/>
				</FormField>

				<FormField id="accountNewPassword" label={t("account.newPassword")} error={errors.newPassword}>
					<input
						id="accountNewPassword"
						type="password"
						dir="ltr"
						autoComplete="new-password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						aria-invalid={!!errors.newPassword}
						aria-describedby="accountNewPasswordHint"
						className={inputClass(!!errors.newPassword)}
					/>
					<p id="accountNewPasswordHint" className="text-body-sm text-primary-hover">
						{t("account.newPasswordHint")}
					</p>
				</FormField>

				<FormField
					id="accountCurrentPassword"
					label={t("account.currentPassword")}
					error={errors.currentPassword}
				>
					<input
						id="accountCurrentPassword"
						type="password"
						dir="ltr"
						autoComplete="current-password"
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						aria-invalid={!!errors.currentPassword}
						aria-describedby="accountCurrentPasswordHint"
						className={inputClass(!!errors.currentPassword)}
					/>
					<p id="accountCurrentPasswordHint" className="text-body-sm text-primary-hover">
						{t("account.currentPasswordHint")}
					</p>
				</FormField>

				{saved && (
					<p role="status" className="text-body-sm text-primary-hover">
						{t("common.saved")}
					</p>
				)}
				{failure && (
					<p role="alert" className="text-body-sm text-error">
						{t(failure)}
					</p>
				)}

				<button type="submit" disabled={submitting} className={submitButtonClass}>
					{submitting ? t("common.saving") : t("account.submit")}
				</button>
			</form>
		</div>
	);
};

export default AccountSettings;
