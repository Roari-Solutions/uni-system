import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import axios from "axios";
import FacultyField from "../../components/facultyField";
import FormField from "../../components/formField";
import PasswordInput from "../../components/passwordInput";
import RoleChecklist from "../../components/roleChecklist";
import { createUser, fetchRoles } from "../../api/users";
import { needsFaculty } from "../../utils/roles";
import type { AssignableRole } from "../../types/user";
import { formCardClass, inputClass, submitButtonClass } from "../../styles/form";

const REQUIRED = "userEntry.errors.required";

// mirrors MIN_PASSWORD_LENGTH in the API
const MIN_PASSWORD = 8;

// messages are i18n keys, translated when rendered
const userSchema = z
	.object({
		name: z.string().trim().min(1, REQUIRED),
		email: z.string().trim().min(1, REQUIRED),
		password: z.string().min(MIN_PASSWORD, "userEntry.errors.passwordLength"),
		roles: z.array(z.string()).min(1, "userEntry.errors.roleRequired"),
		facultyId: z.string(),
		phone: z.string().trim(),
	})
	.refine((v) => !needsFaculty(v.roles) || v.facultyId !== "", {
		path: ["facultyId"],
		message: REQUIRED,
	});

type UserForm = z.infer<typeof userSchema>;
type FormErrors = Partial<Record<keyof UserForm, string[]>>;

const EMPTY_FORM: UserForm = {
	name: "",
	email: "",
	password: "",
	roles: [],
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

	const unscoped = !needsFaculty(form.roles);

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
				roles: result.data.roles,
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
					<PasswordInput
						id="password"
						dir="ltr"
						autoComplete="new-password"
						value={form.password}
						onChange={(value) => setField("password", value)}
						invalid={!!errors.password}
					/>
					{/* the eye lets the admin check it before reading it out to the user */}
					<p className="text-body-sm text-primary-hover">{t("userEntry.passwordHint")}</p>
				</FormField>

				<RoleChecklist
					id="roles"
					label={t("userEntry.roles")}
					roles={roles.filter((r) => r.assignable)}
					value={form.roles}
					onChange={(value) => setField("roles", value)}
					error={errors.roles?.[0]}
				/>

				{unscoped ? (
					form.roles.length > 0 && (
						<p className="text-body-sm text-primary-hover">{t("userEntry.unscopedRole")}</p>
					)
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
