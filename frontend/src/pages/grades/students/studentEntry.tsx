import { useCallback, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import FacultyField from "../../../components/facultyField";
import FormField from "../../../components/formField";
import { createStudent } from "../../../api/students";
import { formCardClass, inputClass, submitButtonClass } from "../../../styles/form";
import { ACCEPTANCE_TYPES, NATIONALITIES, STUDENT_STATUSES } from "../../../types/student";
import { ACCEPTANCE_YEARS, STUDY_LEVELS } from "../../../utils/academicYears";

const REQUIRED = "studentEntry.errors.required";

// messages are i18n keys, translated when rendered
const studentSchema = z.object({
	nameAr: z.string().trim().min(1, REQUIRED),
	// optional: the API stores "-" when it is left blank
	nameEn: z.string().trim(),
	uniNumber: z
		.string()
		.trim()
		.min(1, REQUIRED)
		.regex(/^[A-Za-z0-9-]+$/, "studentEntry.errors.uniNumberFormat"),
	nationality: z.enum(NATIONALITIES, { error: REQUIRED }),
	// national ID for Sudanese students, passport number for foreign ones
	documentNumber: z.string().trim(),
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
	nameAr: "",
	nameEn: "",
	uniNumber: "",
	// most students are Sudanese
	nationality: "sudanese",
	documentNumber: "",
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
	const [submitting, setSubmitting] = useState(false);
	const [saved, setSaved] = useState(false);
	const [failed, setFailed] = useState(false);

	const setField = <K extends keyof StudentForm>(key: K, value: StudentForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	// stable identity: FacultyField reports the locked faculty from an effect
	const setFacultyId = useCallback((facultyId: string) => {
		setForm((prev) => (prev.facultyId === facultyId ? prev : { ...prev, facultyId }));
	}, []);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = studentSchema.safeParse(form);
		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		setErrors({});
		setSaved(false);
		setFailed(false);
		setSubmitting(true);
		try {
			await createStudent({
				// English is optional; omitting it makes the API store "-"
				name: { ar: result.data.nameAr, en: result.data.nameEn || undefined },
				uniNumber: result.data.uniNumber,
				nationality: result.data.nationality,
				...(result.data.nationality === "sudanese"
					? { nationalId: result.data.documentNumber || undefined }
					: { passportNumber: result.data.documentNumber || undefined }),
				facultyId: result.data.facultyId,
				acceptanceYear: result.data.acceptanceYear,
				acceptanceType: result.data.acceptanceType,
				level: result.data.level,
				status: result.data.status,
			});
			setForm({ ...EMPTY_FORM, facultyId: form.facultyId });
			setSaved(true);
		} catch {
			setFailed(true);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="w-full">
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("studentEntry.title")}
			</h1>

			<form noValidate onSubmit={(e) => void handleSubmit(e)} className={formCardClass}>
				{/* two halves side by side from md up: who the student is, then their admission and study */}
				<div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
					<div className="flex flex-col gap-6">
						<FormField id="nameAr" label={t("studentEntry.nameAr")} error={errors.nameAr?.[0]}>
							<input
								id="nameAr"
								type="text"
								value={form.nameAr}
								onChange={(e) => setField("nameAr", e.target.value)}
								aria-invalid={!!errors.nameAr}
								className={inputClass(!!errors.nameAr)}
							/>
						</FormField>

						<FormField id="nameEn" label={t("studentEntry.nameEn")} error={errors.nameEn?.[0]}>
							<input
								id="nameEn"
								type="text"
								dir="ltr"
								value={form.nameEn}
								onChange={(e) => setField("nameEn", e.target.value)}
								className={inputClass(false)}
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

						<FormField id="nationality" label={t("studentEntry.nationality")} error={errors.nationality?.[0]}>
							<select
								id="nationality"
								value={form.nationality}
								onChange={(e) => {
									setField("nationality", e.target.value as StudentForm["nationality"]);
									// a national ID is not a passport number, so the old entry is dropped
									setField("documentNumber", "");
								}}
								aria-invalid={!!errors.nationality}
								className={inputClass(!!errors.nationality)}
							>
								{NATIONALITIES.map((nationality) => (
									<option key={nationality} value={nationality}>
										{t(`student.nationalities.${nationality}`)}
									</option>
								))}
							</select>
						</FormField>

						<FormField
							id="documentNumber"
							label={t(form.nationality === "foreign" ? "studentEntry.passportNumber" : "studentEntry.nationalId")}
							error={errors.documentNumber?.[0]}
						>
							<input
								id="documentNumber"
								type="text"
								// national IDs are digits; passport numbers mix letters and digits
								inputMode={form.nationality === "foreign" ? "text" : "numeric"}
								dir="ltr"
								value={form.documentNumber}
								onChange={(e) => setField("documentNumber", e.target.value)}
								className={inputClass(false)}
							/>
						</FormField>
					</div>
					<div className="flex flex-col gap-6">
						<FacultyField
							label={t("studentEntry.faculty")}
							placeholder={t("studentEntry.facultyPlaceholder")}
							noResultsText={t("studentEntry.noResults")}
							value={form.facultyId}
							onChange={setFacultyId}
							error={errors.facultyId?.[0]}
						/>

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
					</div>
				</div>

				{saved && (
					<p role="status" className="text-body-sm text-primary-hover">
						{t("common.saved")}
					</p>
				)}
				{failed && (
					<p role="alert" className="text-body-sm text-error">
						{t("common.saveFailed")}
					</p>
				)}

				<button type="submit" disabled={submitting} className={submitButtonClass}>
					{submitting ? t("common.saving") : t("studentEntry.submit")}
				</button>
			</form>
		</div>
	);
};

export default StudentEntry;
