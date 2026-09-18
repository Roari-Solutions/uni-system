import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import axios from "axios";
import FacultyField from "../../components/facultyField";
import FormField from "../../components/formField";
import { createUser, fetchRoles } from "../../api/users";
import type { AssignableRole } from "../../types/user";
import { formCardClass, inputClass, submitButtonClass } from "../../styles/form";

const REQUIRED = "userEntry.errors.required";

// mirrors MIN_PASSWORD_LENGTH in the API
const MIN_PASSWORD = 8;

// a role that spans every faculty leaves facultyId empty
const UNSCOPED_ROLES = ["admin"];

// messages are i18n keys, translated when rendered
const userSchema = z
	.object({
		name: z.string().trim().min(1, REQUIRED),
		email: z.string().trim().min(1, REQUIRED),
		password: z.string().min(MIN_PASSWORD, "userEntry.errors.passwordLength"),
		role: z.string().min(1, REQUIRED),
		facultyId: z.string(),
		phone: z.string().trim(),
	})
	.refine((v) => UNSCOPED_ROLES.includes(v.role) || v.facultyId !== "", {
		path: ["facultyId"],
		message: REQUIRED,
	});

type UserForm = z.infer<typeof userSchema>;
type FormErrors = Partial<Record<keyof UserForm, string[]>>;

const EMPTY_FORM: UserForm = {
	name: "",
	email: "",
	password: "",
	role: "",
	facultyId: "",
	phone: "",
};

const UserEntry = () => {
	const { t } = useTranslation();

	const [form, setForm] = useState<UserForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	const [roles, setRoles] = useState<AssignableRole[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [saved, setSaved] = useState(false);
	const [failure, setFailure] = useState<"taken" | "unavailable" | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetchRoles()
			.then((rows) => {
				if (!cancelled) setRoles(rows);
			})
			.catch(() => {
				if (!cancelled) setFailure("unavailable");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const setField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	// stable identity: FacultyField reports the locked faculty from an effect
	const setFacultyId = useCallback((facultyId: string) => {
		setForm((prev) => (prev.facultyId === facultyId ? prev : { ...prev, facultyId }));
	}, []);

	const unscoped = UNSCOPED_ROLES.includes(form.role);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = userSchema.safeParse(form);
		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		setErrors({});
		setSaved(false);
		setFailure(null);
		setSubmitting(true);
		try {
			await createUser({
				name: result.data.name,
				email: result.data.email,
				password: result.data.password,
				role: result.data.role,
				facultyId: unscoped ? undefined : result.data.facultyId,
				phone: result.data.phone || undefined,
			});
			setForm(EMPTY_FORM);
			setSaved(true);
		} catch (error) {
			// 409 means the login identifier is already taken
			const status = axios.isAxiosError(error) ? error.response?.status : undefined;
			setFailure(status === 409 ? "taken" : "unavailable");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="mx-auto max-w-xl">
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("userEntry.title")}
			</h1>

			<form noValidate onSubmit={(e) => void handleSubmit(e)} className={formCardClass}>
				<FormField id="name" label={t("userEntry.name")} error={errors.name?.[0]}>
					<input
						id="name"
						type="text"
						value={form.name}
						onChange={(e) => setField("name", e.target.value)}
						aria-invalid={!!errors.name}
						className={inputClass(!!errors.name)}
					/>
				</FormField>

				<FormField id="email" label={t("userEntry.email")} error={errors.email?.[0]}>
					<input
						id="email"
						type="text"
						dir="ltr"
						autoComplete="off"
						value={form.email}
						onChange={(e) => setField("email", e.target.value)}
						aria-invalid={!!errors.email}
						className={inputClass(!!errors.email)}
					/>
				</FormField>

				<FormField
					id="password"
					label={t("userEntry.password")}
					error={errors.password?.[0]}
				>
					<input
						id="password"
						type="text"
						dir="ltr"
						autoComplete="off"
						value={form.password}
						onChange={(e) => setField("password", e.target.value)}
						aria-invalid={!!errors.password}
						className={inputClass(!!errors.password)}
					/>
					{/* shown in the clear: the admin has to read it out to the user */}
					<p className="text-body-sm text-primary-hover">{t("userEntry.passwordHint")}</p>
				</FormField>

				<FormField id="role" label={t("userEntry.role")} error={errors.role?.[0]}>
					<select
						id="role"
						value={form.role}
						onChange={(e) => setField("role", e.target.value)}
						aria-invalid={!!errors.role}
						className={inputClass(!!errors.role)}
					>
						<option value="" disabled>
							{t("userEntry.selectRole")}
						</option>
						{roles.map((role) => (
							<option key={role.id} value={role.name}>
								{t(`roles.${role.name}`)}
							</option>
						))}
					</select>
				</FormField>

				{unscoped ? (
					<p className="text-body-sm text-primary-hover">{t("userEntry.unscopedRole")}</p>
				) : (
					<FacultyField
						label={t("userEntry.faculty")}
						placeholder={t("userEntry.facultyPlaceholder")}
						noResultsText={t("userEntry.noResults")}
						value={form.facultyId}
						onChange={setFacultyId}
						error={errors.facultyId?.[0]}
					/>
				)}

				<FormField id="phone" label={t("userEntry.phone")} error={errors.phone?.[0]}>
					<input
						id="phone"
						type="tel"
						dir="ltr"
						value={form.phone}
						onChange={(e) => setField("phone", e.target.value)}
						className={inputClass(false)}
					/>
				</FormField>

				{saved && (
					<p role="status" className="text-body-sm text-primary-hover">
						{t("userEntry.saved")}
					</p>
				)}
				{failure && (
					<p role="alert" className="text-body-sm text-error">
						{t(`userEntry.errors.${failure}`)}
					</p>
				)}

				<button type="submit" disabled={submitting} className={submitButtonClass}>
					{submitting ? t("common.saving") : t("userEntry.submit")}
				</button>
			</form>
		</div>
	);
};

export default UserEntry;
