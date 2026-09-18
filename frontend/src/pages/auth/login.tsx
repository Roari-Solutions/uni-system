import { useState, type FormEvent } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router";
import { LanguageIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import FormField from "../../components/formField";
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
		<main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-palette-1 px-4 py-12">
			<div className="flex w-full max-w-sm items-center justify-between">
				<img src="/logo.svg" alt="" className="h-10" />
				<button
					type="button"
					onClick={toggleLanguage}
					className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-palette-6 hover:bg-palette-2"
				>
					<LanguageIcon className="size-5 shrink-0" />
					{t("gradesNav.switchLanguage")}
				</button>
			</div>

			<div className="w-full max-w-sm">
				<h1 className="mb-2 text-2xl font-semibold text-palette-6">{t("login.title")}</h1>
				<p className="mb-6 text-palette-5">{t("login.subtitle")}</p>

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
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							value={form.password}
							onChange={(e) => setField("password", e.target.value)}
							aria-invalid={!!errors.password}
							className={inputClass(!!errors.password)}
						/>
					</FormField>

					{failure && (
						<p role="alert" className="text-sm text-red-600">
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
