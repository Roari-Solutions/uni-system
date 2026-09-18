import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import FacultyField from "../../../components/facultyField";
import FormField from "../../../components/formField";
import SearchSelect, { type SearchOption } from "../../../components/searchSelect";
import { createGrade } from "../../../api/grades";
import { fetchCurriculums } from "../../../api/curriculums";
import { fetchStudents } from "../../../api/students";
import { formCardClass, inputClass, submitButtonClass } from "../../../styles/form";
import { STUDY_LEVELS } from "../../../utils/academicYears";

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
});

type GradeForm = z.input<typeof gradeSchema>;
type FormErrors = Partial<Record<keyof GradeForm, string[]>>;

const EMPTY_FORM: GradeForm = {
	studentId: "",
	curriculumId: "",
	grade: "",
};

const GradeEntry = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";

	// the cascade: a faculty and an academic year scope both searches below
	const [facultyId, setFacultyId] = useState("");
	const [academicYear, setAcademicYear] = useState("");

	const [form, setForm] = useState<GradeForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	const [submitting, setSubmitting] = useState(false);
	const [saved, setSaved] = useState(false);
	const [failed, setFailed] = useState(false);

	const [studentQuery, setStudentQuery] = useState("");
	const [curriculumQuery, setCurriculumQuery] = useState("");
	const [studentOptions, setStudentOptions] = useState<SearchOption[]>([]);
	const [curriculumOptions, setCurriculumOptions] = useState<SearchOption[]>([]);

	// both searches stay closed until the cascade is answered
	const scoped = facultyId !== "" && academicYear !== "";

	const setField = <K extends keyof GradeForm>(key: K, value: GradeForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	// changing the scope invalidates anything chosen under the old one
	const clearScopedSelections = useCallback(() => {
		setForm(EMPTY_FORM);
		setStudentQuery("");
		setCurriculumQuery("");
		setStudentOptions([]);
		setCurriculumOptions([]);
	}, []);

	// FacultyField reports the locked faculty from an effect, so this must no-op
	// when nothing actually changed
	const handleFacultyChange = useCallback(
		(next: string) => {
			if (next === facultyId) return;
			clearScopedSelections();
			setFacultyId(next);
		},
		[facultyId, clearScopedSelections],
	);

	const handleAcademicYearChange = (next: string) => {
		if (next === academicYear) return;
		clearScopedSelections();
		setAcademicYear(next);
	};

	useEffect(() => {
		if (!scoped) return;

		let cancelled = false;
		const load = async () => {
			try {
				const rows = await fetchStudents({
					facultyId,
					level: Number(academicYear),
					q: studentQuery.trim() || undefined,
				});
				if (cancelled) return;
				setStudentOptions(
					rows.map((s) => ({ id: s.id, label: `${s.name[lang]} — ${s.uniNumber}` })),
				);
			} catch {
				if (!cancelled) setStudentOptions([]);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [scoped, facultyId, academicYear, studentQuery, lang]);

	useEffect(() => {
		if (!scoped) return;

		let cancelled = false;
		const load = async () => {
			try {
				const rows = await fetchCurriculums({
					facultyId,
					academicYear: Number(academicYear),
					q: curriculumQuery.trim() || undefined,
				});
				if (cancelled) return;
				setCurriculumOptions(rows.map((c) => ({ id: c.id, label: c.name[lang] })));
			} catch {
				if (!cancelled) setCurriculumOptions([]);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [scoped, facultyId, academicYear, curriculumQuery, lang]);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = gradeSchema.safeParse(form);
		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		setErrors({});
		setSaved(false);
		setFailed(false);
		setSubmitting(true);
		try {
			// pass/fail is derived from the mark by the API, never sent
			await createGrade({
				studentId: result.data.studentId,
				curriculumId: result.data.curriculumId,
				grade: result.data.grade,
			});
			setForm(EMPTY_FORM);
			setStudentQuery("");
			setCurriculumQuery("");
			setSaved(true);
		} catch {
			setFailed(true);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="mx-auto max-w-xl">
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("gradeEntry.title")}
			</h1>

			<form noValidate onSubmit={(e) => void handleSubmit(e)} className={formCardClass}>
				<FacultyField
					label={t("gradeEntry.faculty")}
					placeholder={t("gradeEntry.facultyPlaceholder")}
					noResultsText={t("gradeEntry.noResults")}
					value={facultyId}
					onChange={handleFacultyChange}
				/>

				<FormField id="academicYear" label={t("gradeEntry.academicYear")}>
					<select
						id="academicYear"
						value={academicYear}
						onChange={(e) => handleAcademicYearChange(e.target.value)}
						className={inputClass(false)}
					>
						<option value="" disabled>
							{t("gradeEntry.selectAcademicYear")}
						</option>
						{STUDY_LEVELS.map((level) => (
							<option key={level} value={level}>
								{t(`student.levels.${level}`)}
							</option>
						))}
					</select>
				</FormField>

				{!scoped && <p className="text-body-sm text-primary-hover">{t("gradeEntry.chooseScope")}</p>}

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

				<button type="submit" disabled={submitting || !scoped} className={submitButtonClass}>
					{submitting ? t("common.saving") : t("gradeEntry.submit")}
				</button>
			</form>
		</div>
	);
};

export default GradeEntry;
