import { useCallback, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import FacultyField from "../../../components/facultyField";
import FormField from "../../../components/formField";
import { createCurriculum } from "../../../api/curriculums";
import { formCardClass, inputClass, submitButtonClass } from "../../../styles/form";
import { STUDY_LEVELS } from "../../../utils/academicYears";

// messages are i18n keys, translated when rendered
const curriculumSchema = z.object({
	name: z.string().trim().min(1, "curriculumEntry.errors.required"),
	facultyId: z.string().min(1, "curriculumEntry.errors.required"),
	abbreviation: z
		.string()
		.trim()
		.min(1, "curriculumEntry.errors.required")
		.max(10, "curriculumEntry.errors.abbreviationTooLong"),
	// academic year = study year 1-6
	academicYear: z.string().min(1, "curriculumEntry.errors.required").transform(Number),
});

type CurriculumForm = z.input<typeof curriculumSchema>;
type FormErrors = Partial<Record<keyof CurriculumForm, string[]>>;

const EMPTY_FORM: CurriculumForm = {
	name: "",
	facultyId: "",
	abbreviation: "",
	academicYear: "",
};

const CurriculumEntry = () => {
	const { t } = useTranslation();

	const [form, setForm] = useState<CurriculumForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	const [submitting, setSubmitting] = useState(false);
	const [saved, setSaved] = useState(false);
	const [failed, setFailed] = useState(false);

	const setField = <K extends keyof CurriculumForm>(key: K, value: CurriculumForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	// stable identity: FacultyField reports the locked faculty from an effect
	const setFacultyId = useCallback((facultyId: string) => {
		setForm((prev) => (prev.facultyId === facultyId ? prev : { ...prev, facultyId }));
	}, []);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = curriculumSchema.safeParse(form);
		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		setErrors({});
		setSaved(false);
		setFailed(false);
		setSubmitting(true);
		try {
			await createCurriculum({
				// one name, both languages — the API stores them separately
				name: { en: result.data.name, ar: result.data.name },
				facultyId: result.data.facultyId,
				abbreviation: result.data.abbreviation,
				academicYear: result.data.academicYear,
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
		<div className="mx-auto max-w-xl">
			<h1 className="mb-6 text-2xl font-semibold text-palette-6">
				{t("curriculumEntry.title")}
			</h1>

			<form noValidate onSubmit={(e) => void handleSubmit(e)} className={formCardClass}>
				<FormField id="name" label={t("curriculumEntry.name")} error={errors.name?.[0]}>
					<input
						id="name"
						type="text"
						value={form.name}
						onChange={(e) => setField("name", e.target.value)}
						aria-invalid={!!errors.name}
						className={inputClass(!!errors.name)}
					/>
				</FormField>

				<FacultyField
					label={t("curriculumEntry.faculty")}
					placeholder={t("curriculumEntry.facultyPlaceholder")}
					noResultsText={t("curriculumEntry.noResults")}
					value={form.facultyId}
					onChange={setFacultyId}
					error={errors.facultyId?.[0]}
				/>

				<FormField
					id="abbreviation"
					label={t("curriculumEntry.abbreviation")}
					error={errors.abbreviation?.[0]}
				>
					<input
						id="abbreviation"
						type="text"
						value={form.abbreviation}
						onChange={(e) => setField("abbreviation", e.target.value)}
						aria-invalid={!!errors.abbreviation}
						className={inputClass(!!errors.abbreviation)}
					/>
				</FormField>

				<FormField
					id="academicYear"
					label={t("curriculumEntry.academicYear")}
					error={errors.academicYear?.[0]}
				>
					<select
						id="academicYear"
						value={form.academicYear}
						onChange={(e) => setField("academicYear", e.target.value)}
						aria-invalid={!!errors.academicYear}
						className={inputClass(!!errors.academicYear)}
					>
						<option value="" disabled>
							{t("curriculumEntry.selectYear")}
						</option>
						{STUDY_LEVELS.map((level) => (
							<option key={level} value={level}>
								{t(`student.levels.${level}`)}
							</option>
						))}
					</select>
				</FormField>

				{saved && (
					<p role="status" className="text-sm text-palette-5">
						{t("common.saved")}
					</p>
				)}
				{failed && (
					<p role="alert" className="text-sm text-red-600">
						{t("common.saveFailed")}
					</p>
				)}

				<button type="submit" disabled={submitting} className={submitButtonClass}>
					{submitting ? t("common.saving") : t("curriculumEntry.submit")}
				</button>
			</form>
		</div>
	);
};

export default CurriculumEntry;
