import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router";
import { z } from "zod";
import LanguageToggleIcon from "../../components/Languagetoggleicon";
import FormField from "../../components/formField";
import PasswordInput from "../../components/passwordInput";
import useAuth from "../../auth/useAuth";
import { signInTarget } from "../../auth/signInTarget";
import { HOST_PORTAL, LOGIN_PORTAL, staffLoginHref } from "../../portals";
import { blockSubmitButtonClass, inputClass } from "../../styles/form";

const REQUIRED = "login.errors.required";

// the campus photo shown in the layered panel (put the file in /public)
const CAMPUS_PHOTO = "/login-campus.jpg";

const WAVES = [
	"M0,0 H0.93 C0.85,0.10 0.99,0.24 0.89,0.36 C0.79,0.50 0.71,0.56 0.81,0.70 C0.91,0.84 0.83,0.92 0.87,1 H0Z",
	"M0,0 H0.85 C0.77,0.11 0.93,0.25 0.83,0.37 C0.73,0.51 0.64,0.58 0.74,0.71 C0.83,0.84 0.76,0.93 0.80,1 H0Z",
	"M0,0 H0.77 C0.69,0.12 0.86,0.26 0.76,0.38 C0.66,0.52 0.57,0.59 0.67,0.72 C0.76,0.85 0.69,0.94 0.73,1 H0Z",
];

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
	const { status, user, login } = useAuth();
	const location = useLocation();

	const [form, setForm] = useState<LoginForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	// "credentials" is the user's problem; "unavailable" is ours
	const [failure, setFailure] = useState<"credentials" | "unavailable" | null>(null);
	const [submitting, setSubmitting] = useState(false);

	// where the guard bounced them from, if anywhere
	const from = (location.state as { from?: string } | null)?.from;

	// once signed in (here, or on another portal sharing the session) the
	// session decides where to go; signing in only has to establish it
	const signedIn = status === "authed" && user ? signInTarget(user.portals, from) : null;
	const otherHost = signedIn?.kind === "url" ? signedIn.to : null;

	// a dashboard on another host is a full page load, not a route change
	useEffect(() => {
		if (otherHost) window.location.assign(otherHost);
	}, [otherHost]);

	if (signedIn?.kind === "path") return <Navigate to={signedIn.to} replace />;
	if (signedIn?.kind === "choose") return <Navigate to="/choose" replace />;
	const noDashboard = signedIn?.kind === "none";

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
		} catch (error) {
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

	const photo = { backgroundImage: `url(${CAMPUS_PHOTO})` };

	return (
		// the card fills the viewport inside a page margin: nothing scrolls
		<main className="relative flex h-svh overflow-hidden bg-background p-4 md:p-6">
			{/* clip paths for the paper-cut panel: one set per reading direction */}
			<svg width="0" height="0" aria-hidden="true" className="absolute">
				<defs>
					{WAVES.map((d, i) => (
						<g key={i}>
							<clipPath id={`login-wave-${i}`} clipPathUnits="objectBoundingBox">
								<path d={d} />
							</clipPath>
							<clipPath id={`login-wave-${i}-ltr`} clipPathUnits="objectBoundingBox">
								<path d={d} transform="translate(1 0) scale(-1 1)" />
							</clipPath>
						</g>
					))}
				</defs>
			</svg>

			{/* page backdrop: blurred photo + a corner shape */}
			<div
				aria-hidden="true"
				style={photo}
				className="pointer-events-none absolute -inset-10 bg-cover bg-center opacity-30 blur-2xl"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -start-44 -top-44 size-[360px] rotate-[20deg] rounded-lg bg-gradient-to-br from-muted-foreground/20 to-accent/10"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -start-16 -top-16 size-48 rotate-[20deg] rounded-lg border-2 border-muted-foreground/25"
			/>

			<div className="relative mx-auto flex h-full w-full max-w-[1440px] flex-col overflow-hidden rounded-lg bg-card shadow-xl md:flex-row">
				{/* small screens: the photo becomes a banner above the form */}
				<div
					aria-hidden="true"
					style={photo}
					className="h-32 shrink-0 bg-cover bg-[position:70%_40%] md:hidden"
				/>

				<section className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-8 px-6 py-6 max-md:overflow-y-auto md:flex-none md:basis-[42%] md:px-14">
					<div className="mx-auto flex w-full max-w-sm items-center justify-between">
						{/* the mark is a solid white shape, so it needs a dark surface to read
						    against: the dark footer brown, shaped as the §16 icon container */}
							<img src="../../../public/uniLogo.png" alt="" className="size-14 shrink-0 rounded-full bg-card object-contain p-1 shadow-sm" />
						<button
							type="button"
							onClick={toggleLanguage}
							className="inline-flex h-11 items-center gap-2 rounded-sm px-3 text-navigation text-muted-foreground transition-colors duration-200 ease-out hover:bg-secondary-hover"
						>
							<LanguageToggleIcon className="size-5 shrink-0" />
							{t("gradesNav.switchLanguage")}
						</button>
					</div>

					<div className="mx-auto w-full max-w-sm">
						<h1 className="mb-2 text-heading-3 text-muted-foreground">
							{t(`login.portals.${LOGIN_PORTAL}.title`)}
						</h1>
						<p className="mb-6 text-body-md text-accent-dark">
							{t(`login.portals.${LOGIN_PORTAL}.subtitle`)}
						</p>

						<form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
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

							{(failure || noDashboard) && (
								<p role="alert" className="text-body-sm text-destructive">
									{t(`login.errors.${failure ?? "noDashboard"}`)}
								</p>
							)}

							<button type="submit" disabled={submitting} className={blockSubmitButtonClass}>
								{submitting ? t("login.submitting") : t("login.submit")}
							</button>
						</form>

						{/* a dedicated portal points anyone else to the general staff sign-in */}
						{HOST_PORTAL !== null && HOST_PORTAL !== "staff" && (
							<p className="mt-6 text-center text-body-sm text-foreground">
								{t("login.otherPortal")}{" "}
								<a
									href={staffLoginHref()}
									className="font-semibold text-accent-dark underline-offset-4 hover:text-muted-foreground hover:underline"
								>
									{t("login.staffPortal")}
								</a>
							</p>
						)}
					</div>
				</section>

				{/* layered paper-cut photo panel (md and up) */}
				<div aria-hidden="true" className="relative hidden min-w-0 flex-1 md:block">
					<div className="absolute inset-0 rtl:[filter:drop-shadow(5px_4px_9px_rgba(23,38,58,.28))] ltr:[filter:drop-shadow(-5px_4px_9px_rgba(23,38,58,.28))]">
						<div className="absolute inset-0 bg-secondary-hover rtl:[clip-path:url(#login-wave-0)] ltr:[clip-path:url(#login-wave-0-ltr)]" />
					</div>
					<div className="absolute inset-0 rtl:[filter:drop-shadow(5px_4px_9px_rgba(23,38,58,.28))] ltr:[filter:drop-shadow(-5px_4px_9px_rgba(23,38,58,.28))]">
						<div className="absolute inset-0 bg-muted rtl:[clip-path:url(#login-wave-1)] ltr:[clip-path:url(#login-wave-1-ltr)]" />
					</div>
					<div className="absolute inset-0 rtl:[filter:drop-shadow(5px_4px_9px_rgba(23,38,58,.28))] ltr:[filter:drop-shadow(-5px_4px_9px_rgba(23,38,58,.28))]">
						<div
							style={photo}
							className="absolute inset-0 bg-cover bg-[position:82%_40%] rtl:[clip-path:url(#login-wave-2)] ltr:bg-[position:100%_40%] ltr:[clip-path:url(#login-wave-2-ltr)]"
						>
							{/* warm tint that deepens toward the wave edge */}
							<span className="absolute inset-0 rtl:[background:linear-gradient(to_left,rgba(75,44,0,.45),rgba(122,74,0,.08)_55%,rgba(122,74,0,0))] ltr:[background:linear-gradient(to_right,rgba(75,44,0,.45),rgba(122,74,0,.08)_55%,rgba(122,74,0,0))]" />
						</div>
					</div>
				</div>
			</div>
		</main>
	);

	};

export default Login;
