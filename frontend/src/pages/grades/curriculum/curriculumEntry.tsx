import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { z } from "zod";
import ConfirmDialog from "../../../components/confirmDialog";
import FacultyField from "../../../components/facultyField";
import FormField from "../../../components/formField";
import {
	createCurriculum,
	fetchCurriculum,
	suggestAbbreviation,
	updateCurriculum,
	type CurriculumPayload,
} from "../../../api/curriculums";
import { orphanedGradeCount } from "../../../utils/orphanedGrades";
import { formCardClass, inputClass, submitButtonClass } from "../../../styles/form";
import { SEMESTERS, STUDY_LEVELS } from "../../../utils/academicYears";
import { REQUIREMENT_TYPES, type RequirementType } from "../../../types/requirementType";
import { ABBREVIATION_PATTERN } from "../../../types/curriculum";
import useAuth from "../../../auth/useAuth";

// messages are i18n keys, translated when rendered
const curriculumSchema = z.object({
	nameAr: z.string().trim().min(1, "curriculumEntry.errors.required"),
	// optional: the API stores "-" when it is left blank
	nameEn: z.string().trim(),
	// a university requirement belongs to every faculty, so it names none
	facultyId: z.string(),
	abbreviation: z
		.string()
		.trim()
		.min(1, "curriculumEntry.errors.required")
		.regex(ABBREVIATION_PATTERN, "curriculumEntry.errors.abbreviationFormat"),
	// academic year = study year 1-6
	academicYear: z.string().min(1, "curriculumEntry.errors.required").transform(Number),
	semester: z.string().min(1, "curriculumEntry.errors.required").transform(Number),
	requirementType: z
		.string()
		.min(1, "curriculumEntry.errors.required")
		.pipe(z.enum(REQUIREMENT_TYPES)),
	// credit hours; they weight the curriculum's grade points in the GPA
	courseHours: z
		.string()
		.trim()
		.min(1, "curriculumEntry.errors.required")
		.transform(Number)
		.pipe(
			z
				.number({ error: "curriculumEntry.errors.courseHoursNumber" })
				.int("curriculumEntry.errors.courseHoursRange")
				.min(1, "curriculumEntry.errors.courseHoursRange")
				.max(12, "curriculumEntry.errors.courseHoursRange"),
		),
}).superRefine((value, ctx) => {
	// every requirement but a university one names the faculty that offers it
	if (value.requirementType !== "university" && !value.facultyId) {
		ctx.addIssue({
			code: "custom",
			path: ["facultyId"],
			message: "curriculumEntry.errors.required",
		});
	}
});

type CurriculumForm = z.input<typeof curriculumSchema>;
type FormErrors = Partial<Record<keyof CurriculumForm, string[]>>;

const EMPTY_FORM: CurriculumForm = {
	nameAr: "",
	nameEn: "",
	facultyId: "",
	abbreviation: "",
	academicYear: "",
	semester: "",
	requirementType: "",
	courseHours: "",
};

/** Adds a curriculum, or edits one when the route carries its id. */
const CurriculumEntry = () => {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { curriculumId } = useParams();
	const editing = curriculumId !== undefined;
	// a university requirement spans every faculty, so only an admin may add one
	const types = REQUIREMENT_TYPES.filter(
		(type) => type !== "university" || user?.role === "admin",
	);

	const [form, setForm] = useState<CurriculumForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	const [submitting, setSubmitting] = useState(false);
	const [saved, setSaved] = useState(false);
	const [failed, setFailed] = useState(false);
	// the abbreviation follows the suggestion until the user types their own
	const [abbreviationEdited, setAbbreviationEdited] = useState(false);
	const [suggestion, setSuggestion] = useState<{ key: string; value: string } | null>(null);
	const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">(
		editing ? "loading" : "ready",
	);
	// an edit the API held back because it would leave grades behind
	const [pendingOrphans, setPendingOrphans] = useState<{
		count: number;
		payload: CurriculumPayload;
	} | null>(null);

	useEffect(() => {
		if (!curriculumId) return;

		let cancelled = false;
		fetchCurriculum(curriculumId)
			.then((c) => {
				if (cancelled) return;
				setForm({
					nameAr: c.name.ar,
					// the API stores "-" for a missing English name
					nameEn: c.name.en === "-" ? "" : c.name.en,
					facultyId: c.requirementType === "university" ? "" : c.facultyId,
					abbreviation: c.abbreviation ?? "",
					academicYear: String(c.academicYear),
					semester: String(c.semester),
					requirementType: c.requirementType ?? "",
					courseHours: String(c.courseHours),
				});
				// the existing code stays unless the user clears it for a suggestion
				setAbbreviationEdited(true);
				setLoadState("ready");
			})
			.catch(() => {
				if (!cancelled) setLoadState("failed");
			});
		return () => {
			cancelled = true;
		};
	}, [curriculumId]);

	const { facultyId, requirementType, academicYear, semester, nameEn } = form;
	const university = requirementType === "university";
	const suggestReady = !!((facultyId || university) && requirementType && academicYear && semester);
	// identifies the inputs a suggestion was made for, so a stale one is never shown
	const suggestKey = suggestReady
		? [facultyId, requirementType, academicYear, semester, nameEn.trim()].join("|")
		: "";
	const suggested = suggestion?.key === suggestKey ? suggestion.value : "";
	const abbreviation = abbreviationEdited ? form.abbreviation : suggested;

	useEffect(() => {
		if (!suggestReady) return;

		let cancelled = false;
		suggestAbbreviation({
			facultyId: university ? undefined : facultyId,
			academicYear: Number(academicYear),
			semester: Number(semester),
			requirementType: requirementType as RequirementType,
			nameEn: nameEn.trim() || undefined,
		})
			.then((value) => {
				if (!cancelled) setSuggestion({ key: suggestKey, value: value ?? "" });
			})
			.catch(() => {
				if (!cancelled) setSuggestion({ key: suggestKey, value: "" });
			});

		return () => {
			cancelled = true;
		};
	}, [
		suggestReady,
		suggestKey,
		university,
		facultyId,
		academicYear,
		semester,
		requirementType,
		nameEn,
	]);

	const setField = <K extends keyof CurriculumForm>(key: K, value: CurriculumForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	// stable identity: FacultyField reports the locked faculty from an effect
	const setFacultyId = useCallback((facultyId: string) => {
		setForm((prev) => (prev.facultyId === facultyId ? prev : { ...prev, facultyId }));
	}, []);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = curriculumSchema.safeParse({ ...form, abbreviation });
		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		setErrors({});
		await save({
			// English is optional; omitting it makes the API store "-"
			name: { ar: result.data.nameAr, en: result.data.nameEn || undefined },
			facultyId: university ? undefined : result.data.facultyId,
			abbreviation: result.data.abbreviation,
			academicYear: result.data.academicYear,
			semester: result.data.semester,
			requirementType: result.data.requirementType,
			courseHours: result.data.courseHours,
		});
	};

	const save = async (payload: CurriculumPayload, confirmOrphanedGrades = false) => {
		setSaved(false);
		setFailed(false);
		setSubmitting(true);
		try {
			if (curriculumId) {
				await updateCurriculum(curriculumId, payload, confirmOrphanedGrades);
			} else {
				await createCurriculum(payload);
				setForm({ ...EMPTY_FORM, facultyId: form.facultyId });
				setAbbreviationEdited(false);
				setSuggestion(null);
			}
			setSaved(true);
		} catch (error) {
			const count = orphanedGradeCount(error);
			if (count !== null) setPendingOrphans({ count, payload });
			else setFailed(true);
		} finally {
			setSubmitting(false);
		}
	};

	const confirmOrphans = () => {
		if (!pendingOrphans) return;
		const { payload } = pendingOrphans;
		setPendingOrphans(null);
		void save(payload, true);
	};

	if (loadState !== "ready") {
		return (
			<p
				role={loadState === "failed" ? "alert" : "status"}
				className={`text-body-sm ${loadState === "failed" ? "text-error" : "text-primary-hover"}`}
			>
				{t(loadState === "failed" ? "common.loadFailed" : "common.loading")}
			</p>
		);
	}

	return (
		<div className="mx-auto max-w-xl">
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t(editing ? "curriculumEntry.editTitle" : "curriculumEntry.title")}
			</h1>

			<form noValidate onSubmit={(e) => void handleSubmit(e)} className={formCardClass}>
				<FormField id="nameAr" label={t("curriculumEntry.nameAr")} error={errors.nameAr?.[0]}>
					<input
						id="nameAr"
						type="text"
						value={form.nameAr}
						onChange={(e) => setField("nameAr", e.target.value)}
						aria-invalid={!!errors.nameAr}
						className={inputClass(!!errors.nameAr)}
					/>
				</FormField>

				<FormField id="nameEn" label={t("curriculumEntry.nameEn")} error={errors.nameEn?.[0]}>
					<input
						id="nameEn"
						type="text"
						dir="ltr"
						value={form.nameEn}
						onChange={(e) => setField("nameEn", e.target.value)}
						className={inputClass(false)}
					/>
				</FormField>

				<FormField
					id="requirementType"
					label={t("curriculumEntry.requirementType")}
					error={errors.requirementType?.[0]}
				>
					<select
						id="requirementType"
						value={form.requirementType}
						onChange={(e) =>
							setForm((prev) => ({
								...prev,
								requirementType: e.target.value,
								// a university requirement carries no faculty of its own
								facultyId: e.target.value === "university" ? "" : prev.facultyId,
							}))
						}
						aria-invalid={!!errors.requirementType}
						className={inputClass(!!errors.requirementType)}
					>
						<option value="" disabled>
							{t("curriculumEntry.selectRequirementType")}
						</option>
						{types.map((type) => (
							<option key={type} value={type}>
								{t(`requirementTypes.${type}`)}
							</option>
						))}
					</select>
				</FormField>

				<FormField
					id="courseHours"
					label={t("curriculumEntry.courseHours")}
					error={errors.courseHours?.[0]}
				>
					<input
						id="courseHours"
						type="number"
						min={1}
						max={12}
						dir="ltr"
						value={form.courseHours}
						onChange={(e) => setField("courseHours", e.target.value)}
						aria-invalid={!!errors.courseHours}
						className={inputClass(!!errors.courseHours)}
					/>
				</FormField>

				<FacultyField
					label={t("curriculumEntry.faculty")}
					placeholder={t("curriculumEntry.facultyPlaceholder")}
					noResultsText={t("curriculumEntry.noResults")}
					value={form.facultyId}
					onChange={setFacultyId}
					error={errors.facultyId?.[0]}
					fixed={
						university
							? {
									text: t("curriculumEntry.allFaculties"),
									note: t("curriculumEntry.universityFaculties"),
								}
							: undefined
					}
				/>

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

				<FormField
					id="semester"
					label={t("curriculumEntry.semester")}
					error={errors.semester?.[0]}
				>
					<select
						id="semester"
						value={form.semester}
						onChange={(e) => setField("semester", e.target.value)}
						aria-invalid={!!errors.semester}
						className={inputClass(!!errors.semester)}
					>
						<option value="" disabled>
							{t("curriculumEntry.selectSemester")}
						</option>
						{SEMESTERS.map((semester) => (
							<option key={semester} value={semester}>
								{t(`semesters.${semester}`)}
							</option>
						))}
					</select>
				</FormField>

				<FormField
					id="abbreviation"
					label={t("curriculumEntry.abbreviation")}
					error={errors.abbreviation?.[0]}
				>
					<input
						id="abbreviation"
						type="text"
						dir="ltr"
						placeholder="XXXX0000"
						value={abbreviation}
						onChange={(e) => {
							// codes are letters and digits only, so spaces, dashes and the like never get in
							const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
							// clearing the field hands it back to the suggestion
							setAbbreviationEdited(value !== "");
							setField("abbreviation", value);
						}}
						aria-invalid={!!errors.abbreviation}
						className={inputClass(!!errors.abbreviation)}
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

				<button type="submit" disabled={submitting} className={submitButtonClass}>
					{submitting ? t("common.saving") : t("curriculumEntry.submit")}
				</button>
			</form>

			<ConfirmDialog
				open={pendingOrphans !== null}
				title={t("orphanedGrades.title")}
				message={t("orphanedGrades.curriculumMessage", { count: pendingOrphans?.count ?? 0 })}
				confirmLabel={t("orphanedGrades.confirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={confirmOrphans}
				onCancel={() => setPendingOrphans(null)}
			/>
		</div>
	);
};

export default CurriculumEntry;
