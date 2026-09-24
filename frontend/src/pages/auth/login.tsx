import { useState, type FormEvent } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router";
import { LanguageIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import FormField from "../../components/formField";
import PasswordInput from "../../components/passwordInput";
import useAuth from "../../auth/useAuth";
import { blockSubmitButtonClass, formCardClass, inputClass } from "../../styles/form";

const REQUIRED = "login.errors.required";

// messages are i18n keys, translated when rendered.
// The identifier is not checked against an email shape: the API treats it as an
// opaque string (LoginDto is IsString + IsNotEmpty) and the seeded accounts are
// bare names like "test-admin". Rejecting those here would be stricter than the
// contract and would lock the seeds out of the UI.
const loginSchema = z.object({
	email: z.string().trim().min(1, REQUIRED),
	password: z.string().min(1, REQUIRED),
});

type LoginForm = z.infer<typeof loginSchema>;
type FormErrors = Partial<Record<keyof LoginForm, string[]>>;

const EMPTY_FORM: LoginForm = { email: "", password: "" };

const Login = () => {
	const { t, i18n } = useTranslation();
	const { status, login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const [form, setForm] = useState<LoginForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	// "credentials" is the user's problem; "unavailable" is ours
	const [failure, setFailure] = useState<"credentials" | "unavailable" | null>(null);
	const [submitting, setSubmitting] = useState(false);

	// where the guard bounced them from, if anywhere
	const from = (location.state as { from?: string } | null)?.from;

	if (status === "authed") {
		return <Navigate to={from ?? "/dashboards/grades/students/list"} replace />;
	}

	const setField = <K extends keyof LoginForm>(key: K, value: LoginForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = loginSchema.safeParse(form);
		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		setErrors({});
		setFailure(null);
		setSubmitting(true);
		try {
			await login(result.data.email, result.data.password);
			void navigate(from ?? "/dashboards/grades/students/list", { replace: true });
		} catch (error) {
			// only a 401 means the credentials were rejected. A 502 from the dev
			// proxy, a dropped connection or a 500 must not accuse the user of
			// mistyping something they got right.
			const status = axios.isAxiosError(error) ? error.response?.status : undefined;
			setFailure(status === 401 ? "credentials" : "unavailable");
		} finally {
			setSubmitting(false);
		}
	};

	const toggleLanguage = () => {
		void i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");
	};

	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
			<div className="flex w-full max-w-sm items-center justify-between">
				{/* the mark is a solid white shape, so it needs a dark surface to read
				    against: §33's accent-deep, shaped as the §16 icon container */}
				<span className="inline-flex size-14 shrink-0 items-center justify-center rounded-md bg-accent-deep shadow-sm">
					<img src="/logo.svg" alt="" className="h-9" />
				</span>
				<button
					type="button"
					onClick={toggleLanguage}
					className="inline-flex h-11 items-center gap-2 rounded-sm px-3 text-navigation text-accent-deep transition-colors duration-200 ease-out hover:bg-background-secondary"
				>
					<LanguageIcon className="size-5 shrink-0" />
					{t("gradesNav.switchLanguage")}
				</button>
			</div>

			<div className="w-full max-w-sm">
				<h1 className="mb-2 text-heading-3 text-accent-deep">{t("login.title")}</h1>
				<p className="mb-6 text-body-md text-primary-hover">{t("login.subtitle")}</p>

				<form noValidate onSubmit={handleSubmit} className={formCardClass}>
					<FormField id="email" label={t("login.email")} error={errors.email?.[0]}>
						<input
							id="email"
							type="text"
							inputMode="email"
							autoComplete="username"
							value={form.email}
							onChange={(e) => setField("email", e.target.value)}
							aria-invalid={!!errors.email}
							className={inputClass(!!errors.email)}
						/>
					</FormField>

					<FormField id="password" label={t("login.password")} error={errors.password?.[0]}>
						<PasswordInput
							id="password"
							autoComplete="current-password"
							value={form.password}
							onChange={(value) => setField("password", value)}
							invalid={!!errors.password}
						/>
					</FormField>

					{failure && (
						<p role="alert" className="text-body-sm text-error">
							{t(`login.errors.${failure}`)}
						</p>
					)}

					<button type="submit" disabled={submitting} className={blockSubmitButtonClass}>
						{submitting ? t("login.submitting") : t("login.submit")}
					</button>
				</form>
			</div>
		</main>
	);
};

export default Login;
