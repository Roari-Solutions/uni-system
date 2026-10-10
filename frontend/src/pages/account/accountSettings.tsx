import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import FormField from "../../components/formField";
import PasswordInput from "../../components/passwordInput";
import useAuth from "../../auth/useAuth";
import FillPage from "../../components/fillPage";
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
		<FillPage>
			{/* organic edges for the art panel and the photo frame; one set per reading direction */}
			<svg width="0" height="0" aria-hidden="true" className="absolute">
				<defs>
					<clipPath id="acct-wave-0" clipPathUnits="objectBoundingBox">
						<path d="M0,0 H0.90 C1.00,0.16 0.80,0.30 0.86,0.48 C0.92,0.66 1.02,0.80 0.93,1 H0Z" />
					</clipPath>
					<clipPath id="acct-wave-0-ltr" clipPathUnits="objectBoundingBox">
						<path d="M0,0 H0.90 C1.00,0.16 0.80,0.30 0.86,0.48 C0.92,0.66 1.02,0.80 0.93,1 H0Z" transform="translate(1 0) scale(-1 1)" />
					</clipPath>
					<clipPath id="acct-wave-1" clipPathUnits="objectBoundingBox">
						<path d="M0,0 H0.84 C0.94,0.16 0.74,0.30 0.80,0.48 C0.86,0.66 0.96,0.80 0.87,1 H0Z" />
					</clipPath>
					<clipPath id="acct-wave-1-ltr" clipPathUnits="objectBoundingBox">
						<path d="M0,0 H0.84 C0.94,0.16 0.74,0.30 0.80,0.48 C0.86,0.66 0.96,0.80 0.87,1 H0Z" transform="translate(1 0) scale(-1 1)" />
					</clipPath>
					<clipPath id="acct-photo" clipPathUnits="objectBoundingBox">
						<path d="M0.12,0.18 C0.22,0.02 0.52,0 0.70,0.08 C0.90,0.16 1,0.38 0.96,0.60 C0.92,0.84 0.70,1 0.46,0.98 C0.22,0.96 0.02,0.82 0.01,0.58 C0,0.40 0.04,0.28 0.12,0.18Z" />
					</clipPath>
				</defs>
			</svg>

			<div className="relative flex min-h-0 flex-1 overflow-hidden rounded-lg bg-footer shadow-xl">
				<div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-black/30" />

				{/* the art side (md and up): the college logo, and a corner of the campus in a soft blob */}
				<div aria-hidden="true" className="absolute inset-y-0 end-0 hidden w-[58%] md:block">
					<div className="absolute inset-0 bg-accent/40 rtl:[clip-path:url(#acct-wave-0)] ltr:[clip-path:url(#acct-wave-0-ltr)]" />
					<div className="absolute inset-0 bg-card rtl:[clip-path:url(#acct-wave-1)] ltr:[clip-path:url(#acct-wave-1-ltr)]" />
					<img src="/university-logo.jpg" alt="" className="absolute end-8 top-6 h-24 w-auto" />
					<div className="absolute inset-0 flex items-center justify-center ps-[14%] pt-16">
						<div className="relative aspect-[4/3] w-[min(86%,440px)] [filter:drop-shadow(0_14px_22px_rgba(75,44,0,0.28))]">
							<div className="absolute inset-0 scale-[1.04] bg-accent/30 [clip-path:url(#acct-photo)] rtl:translate-x-3 rtl:translate-y-3 ltr:-translate-x-3 ltr:translate-y-3" />
							<div
								style={{ backgroundImage: "url(/campus-corner.jpg)" }}
								className="absolute inset-0 bg-cover bg-center [clip-path:url(#acct-photo)]"
							/>
						</div>
					</div>
				</div>

				{/* the form side: the form keeps its own white card on the brown panel */}
				<section className="relative z-10 flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-6 py-8 [scrollbar-width:none] md:w-[46%] md:flex-none md:px-12 [&::-webkit-scrollbar]:hidden">
					<div className="mx-auto w-full max-w-md">
						<img
							src="/university-logo.jpg"
							alt=""
							className="mb-4 size-14 rounded-lg bg-card object-contain p-1 md:hidden"
						/>
						<h1 className="mb-6 border-s-3 border-accent ps-4 text-heading-3 text-footer-foreground">
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
								<PasswordInput
									id="accountNewPassword"
									dir="ltr"
									autoComplete="new-password"
									value={newPassword}
									onChange={setNewPassword}
									invalid={!!errors.newPassword}
									describedBy="accountNewPasswordHint"
								/>
								<p id="accountNewPasswordHint" className="text-body-sm text-accent-dark">
									{t("account.newPasswordHint")}
								</p>
							</FormField>

							<FormField
								id="accountCurrentPassword"
								label={t("account.currentPassword")}
								error={errors.currentPassword}
							>
								<PasswordInput
									id="accountCurrentPassword"
									dir="ltr"
									autoComplete="current-password"
									value={currentPassword}
									onChange={setCurrentPassword}
									invalid={!!errors.currentPassword}
									describedBy="accountCurrentPasswordHint"
								/>
								<p id="accountCurrentPasswordHint" className="text-body-sm text-accent-dark">
									{t("account.currentPasswordHint")}
								</p>
							</FormField>

							{saved && (
								<p role="status" className="text-body-sm text-accent-dark">
									{t("common.saved")}
								</p>
							)}
							{failure && (
								<p role="alert" className="text-body-sm text-destructive">
									{t(failure)}
								</p>
							)}

							<button type="submit" disabled={submitting} className={submitButtonClass}>
								{submitting ? t("common.saving") : t("account.submit")}
							</button>
						</form>
					</div>
				</section>
			</div>
		</FillPage>
	);
		};

export default AccountSettings;
