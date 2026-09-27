import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useBlocker, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
	ArrowLeftIcon,
	ArrowUturnLeftIcon,
	CheckIcon,
	NoSymbolIcon,
	PauseCircleIcon,
} from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import FilterSelect from "../../../components/filterSelect";
import ConfirmDialog from "../../../components/confirmDialog";
import SeatingStatusSelect, { SeatingStatusTag } from "../../../components/seatingStatusSelect";
import useFaculties from "../../../hooks/useFaculties";
import { fetchStudent } from "../../../api/students";
import {
	createGrade,
	fetchStudentYearGrades,
	updateGrade,
	type StudentYearGrade,
} from "../../../api/grades";
import type { SeatingStatus } from "../../../types/grade";
import type { Student } from "../../../types/student";
import { smallSecondaryButtonClass, submitButtonClass } from "../../../styles/form";
import { SEMESTERS } from "../../../utils/academicYears";
import { gradeSchema, voidsMark } from "../../../utils/gradeInput";
import { adjacentRowId, focusField, focusRow } from "../../../utils/rowNav";

// what the row's fields hold, typed or loaded
type Draft = { grade: string; seatingStatus: SeatingStatus };

// the common case, so a row opens ready for the mark alone
const DEFAULT_STATUS: SeatingStatus = "attended";

// both semesters' rows, for the arrow keys
const NAV_GROUP = "student-grade-sheet";

const inputId = (curriculumId: string) => `grade-input-${curriculumId}`;
const selectId = (curriculumId: string) => `seating-status-${curriculumId}`;

/** A row's mark field, or its seating status when an absence has locked the mark. */
const focusRowField = (curriculumId: string) =>
	focusField(inputId(curriculumId), selectId(curriculumId));

const draftOf = (row: StudentYearGrade): Draft => ({
	grade: row.grade === null ? "" : String(row.grade),
	seatingStatus: row.seatingStatus ?? DEFAULT_STATUS,
});

/** Whether the row's fields differ from what the API holds for it. */
const isDirty = (row: StudentYearGrade, draft: Draft): boolean => {
	const voided = voidsMark(draft.seatingStatus);
	const typed = draft.grade.trim();
	// nothing typed on an unmarked row is nothing to save
	if (row.gradeId === null) return voided || typed !== "";
	if (draft.seatingStatus !== (row.seatingStatus ?? DEFAULT_STATUS)) return true;
	if (voided) return row.grade !== 0;
	return typed === "" || Number(typed) !== row.grade;
};

// step two of single entry: one student's curriculums for the year, all saved together
const StudentGradeSheet = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { studentId = "" } = useParams();
	const { faculties } = useFaculties();
	// the semester picked on the student list arrives here and stays in the URL
	const [searchParams, setSearchParams] = useSearchParams();
	const semester = searchParams.get("semester") ?? "";

	const [student, setStudent] = useState<Student | null>(null);
	const [rows, setRows] = useState<StudentYearGrade[]>([]);
	const [drafts, setDrafts] = useState<Record<string, Draft>>({});
	// i18n keys, per curriculum
	const [errors, setErrors] = useState<Record<string, string>>({});
	// curriculums written by the last save, marked until they are edited again
	const [saved, setSaved] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [saving, setSaving] = useState(false);
	const [result, setResult] = useState<{ saved: number; failed: number } | null>(null);

	useEffect(() => {
		let cancelled = false;
		Promise.all([fetchStudent(studentId), fetchStudentYearGrades(studentId)])
			.then(([studentRow, gradeRows]) => {
				if (cancelled) return;
				setStudent(studentRow);
				setRows(gradeRows);
				setDrafts(Object.fromEntries(gradeRows.map((row) => [row.curriculumId, draftOf(row)])));
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
	}, [studentId]);

	// a suspension or dismissal freezes the record; the API refuses its marks too
	const frozen = student !== null && student.standing !== "active";

	const draftFor = (row: StudentYearGrade) => drafts[row.curriculumId] ?? draftOf(row);
	const dirtyRows = frozen ? [] : rows.filter((row) => isDirty(row, draftFor(row)));
	const added = dirtyRows.filter((row) => row.gradeId === null).length;
	const changed = dirtyRows.length - added;

	// typed marks are lost on leaving, so an in-app move away asks first
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			dirtyRows.length > 0 && !saving && currentLocation.pathname !== nextLocation.pathname,
	);

	const clearError = (id: string) =>
		setErrors((prev) => {
			const next = { ...prev };
			delete next[id];
			return next;
		});

	const editDraft = (row: StudentYearGrade, patch: Partial<Draft>) => {
		const id = row.curriculumId;
		setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(row), ...patch } }));
		clearError(id);
		setSaved((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
		setResult(null);
	};

	/** Puts the row back to what the API holds for it. */
	const discardRow = (row: StudentYearGrade) => {
		const id = row.curriculumId;
		setDrafts((prev) => ({ ...prev, [id]: draftOf(row) }));
		clearError(id);
		setResult(null);
	};

	const saveButton = useRef<HTMLButtonElement>(null);

	/** Enter in a row's field goes on to the next row's; past the last, to the save button. */
	const handleFieldKeyDown = (
		e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
		row: StudentYearGrade,
	) => {
		const id = row.curriculumId;
		if (e.key === "Enter") {
			e.preventDefault();
			const next = adjacentRowId(NAV_GROUP, id, 1);
			if (next) focusRowField(next);
			else if (saveButton.current && !saveButton.current.disabled) saveButton.current.focus();
			else focusRow(NAV_GROUP, id);
		} else if (e.key === "Escape") {
			focusRow(NAV_GROUP, id);
		} else if (
			e.currentTarget instanceof HTMLInputElement &&
			(e.key === "ArrowDown" || e.key === "ArrowUp")
		) {
			// the arrows move between rows rather than nudge the mark
			e.preventDefault();
			const next = adjacentRowId(NAV_GROUP, id, e.key === "ArrowDown" ? 1 : -1);
			if (next) focusRowField(next);
		}
	};

	const setSemester = (value: string) =>
		setSearchParams(value ? { semester: value } : {}, { replace: true });

	/** Checks every changed row; the confirmation opens only when all pass. */
	const requestSave = () => {
		const found: Record<string, string> = {};
		for (const row of dirtyRows) {
			const draft = draftFor(row);
			const parsed = gradeSchema.safeParse(voidsMark(draft.seatingStatus) ? "0" : draft.grade);
			if (!parsed.success) found[row.curriculumId] = parsed.error.issues[0]?.message ?? "";
		}
		setErrors(found);
		setResult(null);
		if (!Object.keys(found).length) setConfirming(true);
	};

	/** Writes the changed rows one by one; a row that fails keeps its draft and says why. */
	const save = async () => {
		setConfirming(false);
		setSaving(true);
		const failures: Record<string, string> = {};
		const written = new Set<string>();

		for (const row of dirtyRows) {
			const draft = draftFor(row);
			const grade = voidsMark(draft.seatingStatus) ? 0 : Number(draft.grade.trim());
			try {
				if (row.gradeId === null) {
					await createGrade({
						studentId,
						curriculumId: row.curriculumId,
						grade,
						seatingStatus: draft.seatingStatus,
					});
				} else {
					await updateGrade(row.gradeId, { grade, seatingStatus: draft.seatingStatus });
				}
				written.add(row.curriculumId);
			} catch (error) {
				// 409: someone else graded this curriculum since the sheet loaded
				const status = axios.isAxiosError(error) ? error.response?.status : undefined;
				failures[row.curriculumId] =
					status === 409 ? "gradeSheet.errors.alreadyGraded" : "common.saveFailed";
			}
		}

		try {
			const fresh = await fetchStudentYearGrades(studentId);
			setRows(fresh);
			// saved rows take what the API now holds; failed ones keep what was typed
			setDrafts((prev) =>
				Object.fromEntries(
					fresh.map((row) => [
						row.curriculumId,
						failures[row.curriculumId] && prev[row.curriculumId]
							? prev[row.curriculumId]
							: draftOf(row),
					]),
				),
			);
		} catch {
			setFailed(true);
		}
		setErrors(failures);
		setSaved(written);
		setResult({ saved: written.size, failed: Object.keys(failures).length });
		setSaving(false);
	};

	const renderSeatingStatus = (row: StudentYearGrade) => {
		if (frozen) return <SeatingStatusTag status={row.seatingStatus} />;
		const draft = draftFor(row);
		return (
			<div className="flex flex-col items-start gap-1">
				<SeatingStatusSelect
					id={selectId(row.curriculumId)}
					value={draft.seatingStatus}
					disabled={saving}
					label={t("singleEntry.seatingStatusFor", { name: row.name[lang] })}
					onKeyDown={(e) => handleFieldKeyDown(e, row)}
					onChange={(next) => editDraft(row, { seatingStatus: next })}
				/>
				{row.seatingStatus === "cheating" && !row.cheatingResolved && (
					<span className="text-body-sm text-error">{t("resolveCheating.pending")}</span>
				)}
			</div>
		);
	};

	const renderGrade = (row: StudentYearGrade) => {
		if (frozen) {
			return row.grade === null ? (
				<span className="text-primary-hover">{t("gradeSheet.notEntered")}</span>
			) : (
				<span className="font-semibold">{row.grade}</span>
			);
		}

		const draft = draftFor(row);
		const voided = voidsMark(draft.seatingStatus);
		const error = errors[row.curriculumId];
		const errorId = `grade-${row.curriculumId}-error`;
		return (
			<div className="flex flex-col gap-1">
				<input
					id={inputId(row.curriculumId)}
					type="number"
					min={0}
					max={100}
					step="any"
					dir="ltr"
					value={voided ? "0" : draft.grade}
					disabled={saving || voided}
					onChange={(e) => editDraft(row, { grade: e.target.value })}
					onKeyDown={(e) => handleFieldKeyDown(e, row)}
					aria-label={t("singleEntry.gradeFor", { name: row.name[lang] })}
					aria-invalid={!!error}
					aria-describedby={error ? errorId : undefined}
					className={`h-9 w-28 rounded-sm border bg-surface px-3 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background ${
						error ? "border-error" : "border-border"
					}`}
				/>
				{voided && <p className="text-body-sm text-primary-hover">{t("gradeSheet.voidedGrade")}</p>}
				{error && (
					<p id={errorId} role="alert" className="text-body-sm text-error">
						{t(error)}
					</p>
				)}
			</div>
		);
	};

	const columns: Column<StudentYearGrade>[] = [
		{ key: "name", header: t("singleEntry.columns.curriculum"), render: (g) => g.name[lang] },
		{
			key: "abbreviation",
			header: t("singleEntry.columns.abbreviation"),
			render: (g) => <span dir="ltr">{g.abbreviation}</span>,
		},
		{ key: "seatingStatus", header: t("singleEntry.columns.seatingStatus"), render: renderSeatingStatus },
		{ key: "grade", header: t("singleEntry.columns.grade"), render: renderGrade },
		{
			key: "letter",
			header: t("singleEntry.columns.letter"),
			// the API derives the letter; a changed row shows none until it is saved
			render: (g) =>
				g.letter && (frozen || !isDirty(g, draftFor(g))) ? (
					<span dir="ltr" className="font-semibold">
						{g.letter}
					</span>
				) : (
					"—"
				),
		},
		{
			key: "state",
			header: t("singleEntry.columns.state"),
			render: (g) => {
				if (saved.has(g.curriculumId)) {
					return (
						<span className="inline-flex items-center gap-1 text-body-sm text-primary-hover">
							<CheckIcon className="size-4" aria-hidden />
							{t("common.saved")}
						</span>
					);
				}
				if (!frozen && isDirty(g, draftFor(g))) {
					return (
						<div className="flex flex-wrap items-center gap-3">
							<span className="text-body-sm text-accent-deep">{t("singleEntry.unsavedRow")}</span>
							<button
								type="button"
								onClick={() => discardRow(g)}
								disabled={saving}
								aria-label={t("singleEntry.discardFor", { name: g.name[lang] })}
								className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
							>
								<ArrowUturnLeftIcon className="size-4" aria-hidden />
								{t("singleEntry.discard")}
							</button>
						</div>
					);
				}
				return "—";
			},
		},
	];

	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";
	const shownSemesters = semester ? SEMESTERS.filter((s) => String(s) === semester) : SEMESTERS;

	return (
		<div>
			<Link
				to=".."
				relative="path"
				className="mb-6 inline-flex items-center gap-2 text-body-sm font-medium text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep"
			>
				{/* §20 — the arrow points back in either reading direction */}
				<ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
				{t("singleEntry.back")}
			</Link>

			<h1 className="mb-2 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{student ? student.name[lang] : t("singleEntry.title")}
			</h1>
			{student && (
				<p className="mb-8 ps-4 text-body-sm text-foreground">
					{student.uniNumber}
					{" · "}
					{facultyName(student.facultyId)}
					{" · "}
					{t(`student.levels.${student.level}`)}
					{" · "}
					<Link
						to={`/dashboards/grades/students/${student.id}`}
						className="font-medium text-primary-hover underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-deep hover:underline"
					>
						{t("singleEntry.studentPage")}
					</Link>
				</p>
			)}

			{student && frozen && (
				// §4.2 error token for a disciplinary state; §39 the icon and words carry the meaning
				<section
					aria-labelledby="standingTitle"
					className="mb-8 flex items-start gap-3 rounded-sm border-s-3 border-error bg-error/8 p-4"
				>
					{student.standing === "dismissed" ? (
						<NoSymbolIcon className="mt-0.5 size-6 shrink-0 text-error" aria-hidden />
					) : (
						<PauseCircleIcon className="mt-0.5 size-6 shrink-0 text-error" aria-hidden />
					)}
					<div>
						<h2 id="standingTitle" className="text-heading-5 text-error">
							{student.standing === "dismissed"
								? t("studentDetails.standing.dismissedTitle")
								: t(`student.suspendedFor.${student.suspensionYears ?? 1}`)}
						</h2>
						<p className="text-body-md text-foreground">
							{t(
								student.standing === "dismissed"
									? "studentDetails.standing.dismissedText"
									: "studentDetails.standing.suspendedText",
							)}
						</p>
					</div>
				</section>
			)}

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}
			{loading && !student && <p className="text-body-md text-foreground">{t("common.loading")}</p>}

			{student && (
				<>
					<div className="mb-6 flex flex-wrap gap-6">
						<FilterSelect
							id="semesterFilter"
							label={t("gradeEntry.semester")}
							value={semester}
							onChange={setSemester}
							allLabel={t("gradeEntry.allSemesters")}
							options={SEMESTERS.map((s) => ({ value: String(s), label: t(`semesters.${s}`) }))}
						/>
					</div>

					<div className="flex flex-col gap-8">
						{shownSemesters.map((s) => (
							<section key={s} aria-labelledby={`semester-${s}`}>
								<h2 id={`semester-${s}`} className="mb-4 text-heading-5 text-accent-deep">
									{t(`semesters.${s}`)}
								</h2>
								<DataTable
									columns={columns}
									rows={rows.filter((g) => g.semester === s)}
									getRowId={(g) => g.curriculumId}
									// a frozen record has nothing to enter, so its rows are no keyboard stops
									onRowActivate={frozen ? undefined : (g) => focusRowField(g.curriculumId)}
									navGroup={NAV_GROUP}
									emptyText={t("studentDetails.noCurriculums")}
								/>
							</section>
						))}
					</div>

					{!frozen && (
						<div className="mt-8 flex flex-wrap items-center justify-end gap-4">
							{result && (
								<p
									role={result.failed ? "alert" : "status"}
									className={`text-body-sm ${result.failed ? "text-error" : "text-primary-hover"}`}
								>
									{result.failed
										? t("singleEntry.savedWithFailures", result)
										: t("singleEntry.savedAll", { count: result.saved })}
								</p>
							)}
							{dirtyRows.length > 0 && !result && (
								<p className="text-body-sm text-foreground">
									{t("singleEntry.unsaved", { count: dirtyRows.length })}
								</p>
							)}
							<button
								type="button"
								ref={saveButton}
								onClick={requestSave}
								disabled={saving || dirtyRows.length === 0}
								className={submitButtonClass}
							>
								{saving ? t("common.saving") : t("singleEntry.save")}
							</button>
						</div>
					)}
				</>
			)}

			<ConfirmDialog
				open={confirming}
				tone="primary"
				title={t("singleEntry.confirmTitle")}
				message={t("singleEntry.confirmMessage", { added, changed, name: student?.name[lang] })}
				confirmLabel={t("singleEntry.save")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void save()}
				onCancel={() => setConfirming(false)}
			/>

			<ConfirmDialog
				open={blocker.state === "blocked"}
				title={t("singleEntry.leaveTitle")}
				message={t("singleEntry.leaveMessage", { count: dirtyRows.length })}
				confirmLabel={t("singleEntry.leave")}
				cancelLabel={t("singleEntry.stay")}
				onConfirm={() => blocker.proceed?.()}
				onCancel={() => blocker.reset?.()}
			/>
		</div>
	);
};

export default StudentGradeSheet;
