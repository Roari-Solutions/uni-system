import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DataTable, { type Column } from "../../../components/dataTable";
import FilterSelect from "../../../components/filterSelect";
import useFaculties from "../../../hooks/useFaculties";
import { fetchGrades, updateGrade } from "../../../api/grades";
import { SeatingStatusTag } from "../../../components/seatingStatusSelect";
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
	// the cheating row being decided, if any
	const [resolving, setResolving] = useState<Grade | null>(null);
	const [saving, setSaving] = useState(false);

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
	const facultyName = (id?: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";
	const curriculumName = (id: string) => curriculums.find((c) => c.id === id)?.name[lang] ?? "";

	const changeFaculty = (id: string) => {
		setFacultyId(id);
		// drop a curriculum selection that doesn't belong to the new faculty
		if (id && curriculums.find((c) => c.id === curriculumId)?.facultyId !== id) {
			setCurriculumId("");
		}
	};

	const replaceRow = (updated: Grade) =>
		setGrades((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));

	// PATCH takes just the changed field; the API re-derives the letter
	const handleGradeChange = async (g: Grade, grade: number) => {
		const updated = await updateGrade(g.id, { grade });
		replaceRow(updated);
	};

	// accepting the mark moves the row to attended; the other outcome keeps the
	// cheating on record and scores 0. Either way the mark rejoins the year result.
	const handleResolve = async ({ outcome }: CheatingResolution) => {
		if (!resolving) return;
		setSaving(true);
		try {
			const updated = await updateGrade(
				resolving.id,
				outcome === "accept"
					? { seatingStatus: "attended" }
					: { seatingStatus: "cheating", grade: 0, cheatingResolved: true },
			);
			replaceRow(updated);
			setResolving(null);
		} catch {
			setFailed(true);
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
						defaultValue={g.grade}
						onBlur={(e) => void handleGradeChange(g, Number(e.target.value))}
						aria-label={t("gradeList.gradeFor", { name: student(g)?.name[lang] ?? "" })}
						className="h-9 w-20 rounded-sm border border-border bg-surface px-3 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
					/>
				) : (
					<span className="font-semibold">{g.grade}</span>
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
		{ key: "letter", header: t("gradeList.columns.letter"), render: (g) => <span dir="ltr" className="font-semibold">{g.letter}</span> },
	];

	return (
		<div>
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("gradeList.title")}
			</h1>

			<div className="mb-6 flex flex-wrap gap-6">
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
					options={curriculums.map((c) => ({ value: c.id, label: c.name[lang] }))}
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
			</div>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}

			<DataTable
				columns={columns}
				rows={grades}
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
		</div>
	);
};

export default GradeList;
