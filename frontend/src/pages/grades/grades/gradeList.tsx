import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import FilterSelect from "../../../components/filterSelect";
import type { Column } from "../../../components/dataTable";
import DataTable from "../../../components/paginatedDataTable";
import FillPage from "../../../components/fillPage";
import PageBackdrop from "../../../components/pageBackdrop";
import DepartmentFilter from "../../../components/departmentFilter";
import SpecializationFilter from "../../../components/specializationFilter";
import { WITHOUT_DEPARTMENT, WITHOUT_SPECIALIZATION } from "../../../types/faculty";
import useFaculties from "../../../hooks/useFaculties";
import { fetchGrades, resolveCheating, updateGrade } from "../../../api/grades";
import { SeatingStatusTag } from "../../../components/seatingStatusSelect";
import ResitNote from "../../../components/resitNote";
import { conflictCode } from "../../../utils/apiError";
import ResolveCheatingDialog, {
	type CheatingResolution,
} from "../../../components/resolveCheatingDialog";
import { fetchCurriculums } from "../../../api/curriculums";
import { fetchStudents } from "../../../api/students";
import { smallSecondaryButtonClass } from "../../../styles/form";
import type { Curriculum } from "../../../types/curriculum";
import type { Student } from "../../../types/student";
import {
	LETTER_GRADES,
	SEATING_STATUSES,
	type Grade,
	type LetterGrade,
	type SeatingStatus,
} from "../../../types/grade";

const GradeList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { faculties, locked, lockedFacultyId } = useFaculties();

	const [grades, setGrades] = useState<Grade[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [facultyId, setFacultyId] = useState("");
	const [curriculumId, setCurriculumId] = useState("");
	const [letter, setLetter] = useState("");
	const [seatingStatus, setSeatingStatus] = useState("");
	// the students' specialization; the grades carry only the student's id, so it narrows here
	const [specializationId, setSpecializationId] = useState("");
	const [departmentId, setDepartmentId] = useState("");
	// the cheating row being decided, if any
	const [resolving, setResolving] = useState<Grade | null>(null);
	const [saving, setSaving] = useState(false);
	// approved results lock a case that was still open; the API says so with RESULTS_APPROVED
	const [resultsLocked, setResultsLocked] = useState(false);

	// a locked caller only ever sees their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;

	useEffect(() => {
		let cancelled = false;
		// the rows carry ids only, so the names come from the other two lists;
		// state changes live in the callbacks to keep the effect body sync-free
		Promise.all([
			fetchGrades({
				facultyId: effectiveFacultyId || undefined,
				curriculumId: curriculumId || undefined,
				letter: letter ? (letter as LetterGrade) : undefined,
				seatingStatus: seatingStatus ? (seatingStatus as SeatingStatus) : undefined,
			}),
			fetchStudents({ facultyId: effectiveFacultyId || undefined }),
			fetchCurriculums({ facultyId: effectiveFacultyId || undefined }),
		])
			.then(([gradeRows, studentRows, curriculumRows]) => {
				if (cancelled) return;
				setGrades(gradeRows);
				setStudents(studentRows);
				setCurriculums(curriculumRows);
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [effectiveFacultyId, curriculumId, letter, seatingStatus]);

	const student = (g: Grade) => students.find((s) => s.id === g.studentId);
	const shown = grades.filter((g) => {
		const dept = student(g)?.departmentId ?? null;
		if (departmentId && (departmentId === WITHOUT_DEPARTMENT ? dept !== null : dept !== departmentId)) {
			return false;
		}
		if (!specializationId) return true;
		const spec = student(g)?.specializationId ?? null;
		return specializationId === WITHOUT_SPECIALIZATION ? spec === null : spec === specializationId;
	});
	const facultyName = (id?: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";
	const curriculumName = (id: string) => curriculums.find((c) => c.id === id)?.name[lang] ?? "";

	const changeFaculty = (id: string) => {
		setFacultyId(id);
		// a specialization and department belong to their faculty
		setSpecializationId("");
		setDepartmentId("");
		// drop a curriculum selection the new faculty doesn't offer; every faculty
		// offers a university requirement, so that selection always stays
		const selected = curriculums.find((c) => c.id === curriculumId);
		if (id && selected && selected.requirementType !== "university" && selected.facultyId !== id) {
			setCurriculumId("");
		}
	};

	// the filter lists each curriculum once, however many faculties offer it
	const curriculumOptions = curriculums.filter(
		(c, index) => curriculums.findIndex((other) => other.id === c.id) === index,
	);

	const replaceRow = (updated: Grade) =>
		setGrades((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));

	// PATCH takes just the changed field; the API re-derives the letter
	const handleGradeChange = async (g: Grade, grade: number) => {
		const updated = await updateGrade(g.id, { grade });
		replaceRow(updated);
	};

	// accepting the mark moves the row to attended; the other outcome keeps the
	// cheating on record and scores 0. Either way the mark rejoins the year result,
	// and any penalties land on the case and the student.
	const handleResolve = async (resolution: CheatingResolution) => {
		if (!resolving) return;
		setSaving(true);
		try {
			const updated = await resolveCheating(resolving.id, resolution);
			replaceRow(updated);
			setResolving(null);
			setResultsLocked(false);
		} catch (error) {
			if (conflictCode(error) === "RESULTS_APPROVED") {
				setResultsLocked(true);
				setResolving(null);
			} else {
				setFailed(true);
			}
		} finally {
			setSaving(false);
		}
	};

	const awaitsDecision = (g: Grade) => g.seatingStatus === "cheating" && !g.cheatingResolved;

	const columns: Column<Grade>[] = [
		{ key: "name", header: t("gradeList.columns.name"), render: (g) => student(g)?.name[lang] },
		{ key: "uniNumber", header: t("gradeList.columns.uniNumber"), render: (g) => student(g)?.uniNumber },
		{ key: "faculty", header: t("gradeList.columns.faculty"), render: (g) => facultyName(student(g)?.facultyId) },
		{ key: "curriculum", header: t("gradeList.columns.curriculum"), render: (g) => curriculumName(g.curriculumId) },
		{
			key: "grade",
			header: t("gradeList.columns.grade"),
			// a settled row keeps its mark: only an open cheating case is re-entered
			render: (g) =>
				awaitsDecision(g) ? (
					<input
						type="number"
						min={0}
						max={100}
						step="any"
						dir="ltr"
						defaultValue={g.grade ?? ""}
						onBlur={(e) => void handleGradeChange(g, Number(e.target.value))}
						aria-label={t("gradeList.gradeFor", { name: student(g)?.name[lang] ?? "" })}
						className="h-9 w-20 rounded-sm border border-border bg-surface px-3 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
					/>
				) : (
					<div className="flex flex-col items-start gap-1">
						{/* a substitute has no mark until its re-exam */}
						<span className="font-semibold">{g.grade ?? "—"}</span>
						<ResitNote resit={g.resit} />
					</div>
				),
		},
		{
			key: "seatingStatus",
			header: t("gradeList.columns.seatingStatus"),
			render: (g) => (
				<div className="flex flex-col items-start gap-1">
					<SeatingStatusTag status={g.seatingStatus} />
					{awaitsDecision(g) && (
						<button
							type="button"
							onClick={() => setResolving(g)}
							aria-label={t("resolveCheating.actionFor", { name: student(g)?.name[lang] ?? "" })}
							className={smallSecondaryButtonClass}
						>
							{t("resolveCheating.action")}
						</button>
					)}
				</div>
			),
		},
		{ key: "letter", header: t("gradeList.columns.letter"), render: (g) => <span dir="ltr" className="font-semibold">{g.letter ?? "—"}</span> },
	];

	return (

		<FillPage>
			<PageBackdrop />
			<h1 className="mb-4 shrink-0 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("gradeList.title")}
			</h1>

			<div className="mb-6 flex shrink-0 flex-wrap gap-6">
				<FilterSelect
					id="facultyFilter"
					label={t("gradeList.filters.faculty")}
					value={effectiveFacultyId}
					onChange={changeFaculty}
					allLabel={t("gradeList.filters.allFaculties")}
					options={faculties.map((f) => ({ value: f.id, label: f.name[lang] }))}
					disabled={locked}
				/>
				<FilterSelect
					id="curriculumFilter"
					label={t("gradeList.filters.curriculum")}
					value={curriculumId}
					onChange={setCurriculumId}
					allLabel={t("gradeList.filters.allCurriculums")}
					options={curriculumOptions.map((c) => ({ value: c.id, label: c.name[lang] }))}
				/>
				<FilterSelect
					id="seatingStatusFilter"
					label={t("gradeList.filters.seatingStatus")}
					value={seatingStatus}
					onChange={setSeatingStatus}
					allLabel={t("gradeList.filters.allSeatingStatuses")}
					options={SEATING_STATUSES.map((status) => ({
						value: status,
						label: t(`seatingStatuses.${status}`),
					}))}
				/>
				<FilterSelect
					id="letterFilter"
					label={t("gradeList.filters.letter")}
					value={letter}
					onChange={setLetter}
					allLabel={t("gradeList.filters.allLetters")}
					// an <option> can't take its own direction; the mark keeps "A+" from reading "+A" in Arabic
					options={LETTER_GRADES.map((l) => ({ value: l, label: `${l}\u200E` }))}
				/>
				<DepartmentFilter
					faculties={faculties}
					facultyId={effectiveFacultyId}
					value={departmentId}
					onChange={setDepartmentId}
				/>
				<SpecializationFilter
					faculties={faculties}
					facultyId={effectiveFacultyId}
					value={specializationId}
					onChange={setSpecializationId}
				/>
			</div>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm shrink-0 text-error">
					{t("common.loadFailed")}
				</p>
			)}
			{resultsLocked && (
				<p role="alert" className="mb-6 shrink-0 text-body-sm text-error">
					{t("results.lockedError")}
				</p>
			)}

			<DataTable
				columns={columns}
				rows={shown}
				getRowId={(g) => g.id}
				emptyText={loading ? t("common.loading") : t("gradeList.empty")}
				// §39 — the tint repeats what the status cell already says
				rowClassName={(g) => (awaitsDecision(g) ? "bg-error/8" : "")}
			/>

			<ResolveCheatingDialog
				open={resolving !== null}
				curriculumName={resolving ? curriculumName(resolving.curriculumId) : ""}
				grade={resolving?.grade ?? null}
				saving={saving}
				onResolve={(resolution) => void handleResolve(resolution)}
				onCancel={() => setResolving(null)}
			/>
		</FillPage>
	);
};

export default GradeList;
