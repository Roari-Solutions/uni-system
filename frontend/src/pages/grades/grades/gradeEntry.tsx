import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import FormField from "../../../components/formField";
import SearchSelect, { type SearchOption } from "../../../components/searchSelect";
import { formCardClass, inputClass, submitButtonClass } from "../../../styles/form";
import { GRADE_STATUSES } from "../../../types/grade";

const REQUIRED = "gradeEntry.errors.required";
const GRADE_RANGE = "gradeEntry.errors.gradeRange";

// messages are i18n keys, translated when rendered
const gradeSchema = z.object({
	studentId: z.string().min(1, REQUIRED),
	curriculumId: z.string().min(1, REQUIRED),
	grade: z
		.string()
		.trim()
		.min(1, REQUIRED)
		.transform(Number)
		.pipe(z.number({ error: "gradeEntry.errors.gradeNumber" }).min(0, GRADE_RANGE).max(100, GRADE_RANGE)),
	status: z.enum(GRADE_STATUSES, { error: REQUIRED }),
});

type GradeForm = z.input<typeof gradeSchema>;
type FormErrors = Partial<Record<keyof GradeForm, string[]>>;

const EMPTY_FORM: GradeForm = {
	studentId: "",
	curriculumId: "",
	grade: "",
	status: "" as GradeForm["status"],
};

const GradeEntry = () => {
	const { t } = useTranslation();

	const [form, setForm] = useState<GradeForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	const [studentQuery, setStudentQuery] = useState("");
	const [curriculumQuery, setCurriculumQuery] = useState("");
	// TODO: fill from the students search API (by name or university number) using studentQuery
	const studentOptions: SearchOption[] = [];
	// TODO: fill from the curriculums search API using curriculumQuery
	const curriculumOptions: SearchOption[] = [];

	const setField = <K extends keyof GradeForm>(key: K, value: GradeForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = gradeSchema.safeParse(form);
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
				{t("gradeEntry.title")}
			</h1>

			<form noValidate onSubmit={handleSubmit} className={formCardClass}>
				<FormField id="student" label={t("gradeEntry.student")} error={errors.studentId?.[0]}>
					<SearchSelect
						id="student"
						query={studentQuery}
						onQueryChange={(query) => {
							setStudentQuery(query);
							// typing invalidates any previous selection
							setField("studentId", "");
						}}
						options={studentOptions}
						onSelect={(option) => {
							setStudentQuery(option.label);
							setField("studentId", option.id);
						}}
						placeholder={t("gradeEntry.studentPlaceholder")}
						noResultsText={t("gradeEntry.noResults")}
						invalid={!!errors.studentId}
					/>
				</FormField>

				<FormField id="curriculum" label={t("gradeEntry.curriculum")} error={errors.curriculumId?.[0]}>
					<SearchSelect
						id="curriculum"
						query={curriculumQuery}
						onQueryChange={(query) => {
							setCurriculumQuery(query);
							setField("curriculumId", "");
						}}
						options={curriculumOptions}
						onSelect={(option) => {
							setCurriculumQuery(option.label);
							setField("curriculumId", option.id);
						}}
						placeholder={t("gradeEntry.curriculumPlaceholder")}
						noResultsText={t("gradeEntry.noResults")}
						invalid={!!errors.curriculumId}
					/>
				</FormField>

				<FormField id="grade" label={t("gradeEntry.grade")} error={errors.grade?.[0]}>
					<input
						id="grade"
						type="number"
						min={0}
						max={100}
						step="any"
						value={form.grade}
						onChange={(e) => setField("grade", e.target.value)}
						aria-invalid={!!errors.grade}
						className={inputClass(!!errors.grade)}
					/>
				</FormField>

				<FormField id="status" label={t("gradeEntry.status")} error={errors.status?.[0]}>
					<select
						id="status"
						value={form.status}
						onChange={(e) => setField("status", e.target.value as GradeForm["status"])}
						aria-invalid={!!errors.status}
						className={inputClass(!!errors.status)}
					>
						<option value="" disabled>
							{t("gradeEntry.selectStatus")}
						</option>
						{GRADE_STATUSES.map((status) => (
							<option key={status} value={status}>
								{t(`grade.statuses.${status}`)}
							</option>
						))}
					</select>
				</FormField>

				<button type="submit" className={submitButtonClass}>
					{t("gradeEntry.submit")}
				</button>
			</form>
		</div>
	);
};

export default GradeEntry;
