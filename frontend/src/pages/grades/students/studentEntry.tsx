import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import FormField from "../../../components/formField";
import SearchSelect, { type SearchOption } from "../../../components/searchSelect";
import { formCardClass, inputClass, submitButtonClass } from "../../../styles/form";
import { ACCEPTANCE_TYPES, STUDENT_STATUSES } from "../../../types/student";
import { ACCEPTANCE_YEARS, STUDY_LEVELS } from "../../../utils/academicYears";

const REQUIRED = "studentEntry.errors.required";

// messages are i18n keys, translated when rendered
const studentSchema = z.object({
	name: z.string().trim().min(1, REQUIRED),
	uniNumber: z
		.string()
		.trim()
		.min(1, REQUIRED)
		.regex(/^\d+$/, "studentEntry.errors.uniNumberDigits"),
	acceptanceYear: z.string().min(1, REQUIRED),
	acceptanceType: z.enum(ACCEPTANCE_TYPES, { error: REQUIRED }),
	level: z.string().min(1, REQUIRED).transform(Number),
	facultyId: z.string().min(1, REQUIRED),
	// "" means the result isn't determined yet
	status: z.enum(["", ...STUDENT_STATUSES]).transform((s) => s || null),
});

type StudentForm = z.input<typeof studentSchema>;
type FormErrors = Partial<Record<keyof StudentForm, string[]>>;

const EMPTY_FORM: StudentForm = {
	name: "",
	uniNumber: "",
	acceptanceYear: "",
	acceptanceType: "" as StudentForm["acceptanceType"],
	level: "",
	facultyId: "",
	status: "",
};

const StudentEntry = () => {
	const { t } = useTranslation();

	const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	const [facultyQuery, setFacultyQuery] = useState("");
	// TODO: fill from the faculties search API using facultyQuery
	const facultyOptions: SearchOption[] = [];

	const setField = <K extends keyof StudentForm>(key: K, value: StudentForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = studentSchema.safeParse(form);
		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		setErrors({});
		// TODO: send result.data to the API
	};

	return (
		<div className="mx-auto max-w-xl">
			<h1 className="mb-6 text-2xl font-semibold text-palette-6">
				{t("studentEntry.title")}
			</h1>

			<form noValidate onSubmit={handleSubmit} className={formCardClass}>
				<FormField id="name" label={t("studentEntry.name")} error={errors.name?.[0]}>
					<input
						id="name"
						type="text"
						value={form.name}
						onChange={(e) => setField("name", e.target.value)}
						aria-invalid={!!errors.name}
						className={inputClass(!!errors.name)}
					/>
				</FormField>

				<FormField id="uniNumber" label={t("studentEntry.uniNumber")} error={errors.uniNumber?.[0]}>
					<input
						id="uniNumber"
						type="text"
						inputMode="numeric"
						value={form.uniNumber}
						onChange={(e) => setField("uniNumber", e.target.value)}
						aria-invalid={!!errors.uniNumber}
						className={inputClass(!!errors.uniNumber)}
					/>
				</FormField>

				<FormField id="faculty" label={t("studentEntry.faculty")} error={errors.facultyId?.[0]}>
					<SearchSelect
						id="faculty"
						query={facultyQuery}
						onQueryChange={(query) => {
							setFacultyQuery(query);
							// typing invalidates any previous selection
							setField("facultyId", "");
						}}
						options={facultyOptions}
						onSelect={(option) => {
							setFacultyQuery(option.label);
							setField("facultyId", option.id);
						}}
						placeholder={t("studentEntry.facultyPlaceholder")}
						noResultsText={t("studentEntry.noResults")}
						invalid={!!errors.facultyId}
					/>
				</FormField>

				<FormField
					id="acceptanceYear"
					label={t("studentEntry.acceptanceYear")}
					error={errors.acceptanceYear?.[0]}
				>
					<select
						id="acceptanceYear"
						value={form.acceptanceYear}
						onChange={(e) => setField("acceptanceYear", e.target.value)}
						aria-invalid={!!errors.acceptanceYear}
						className={inputClass(!!errors.acceptanceYear)}
					>
						<option value="" disabled>
							{t("studentEntry.selectAcceptanceYear")}
						</option>
						{ACCEPTANCE_YEARS.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</FormField>

				<FormField
					id="acceptanceType"
					label={t("studentEntry.acceptanceType")}
					error={errors.acceptanceType?.[0]}
				>
					<select
						id="acceptanceType"
						value={form.acceptanceType}
						onChange={(e) => setField("acceptanceType", e.target.value as StudentForm["acceptanceType"])}
						aria-invalid={!!errors.acceptanceType}
						className={inputClass(!!errors.acceptanceType)}
					>
						<option value="" disabled>
							{t("studentEntry.selectAcceptanceType")}
						</option>
						{ACCEPTANCE_TYPES.map((type) => (
							<option key={type} value={type}>
								{t(`student.acceptanceTypes.${type}`)}
							</option>
						))}
					</select>
				</FormField>

				<FormField id="level" label={t("studentEntry.level")} error={errors.level?.[0]}>
					<select
						id="level"
						value={form.level}
						onChange={(e) => setField("level", e.target.value)}
						aria-invalid={!!errors.level}
						className={inputClass(!!errors.level)}
					>
						<option value="" disabled>
							{t("studentEntry.selectLevel")}
						</option>
						{STUDY_LEVELS.map((level) => (
							<option key={level} value={level}>
								{t(`student.levels.${level}`)}
							</option>
						))}
					</select>
				</FormField>

				<FormField id="status" label={t("studentEntry.status")} error={errors.status?.[0]}>
					<select
						id="status"
						value={form.status}
						onChange={(e) => setField("status", e.target.value as StudentForm["status"])}
						className={inputClass(!!errors.status)}
					>
						<option value="">{t("studentEntry.statusUndetermined")}</option>
						{STUDENT_STATUSES.map((status) => (
							<option key={status} value={status}>
								{t(`student.statuses.${status}`)}
							</option>
						))}
					</select>
				</FormField>

				<button type="submit" className={submitButtonClass}>
					{t("studentEntry.submit")}
				</button>
			</form>
		</div>
	);
};

export default StudentEntry;
