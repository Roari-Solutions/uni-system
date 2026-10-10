import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
	ArrowPathIcon,
	ArrowUturnLeftIcon,
	DocumentPlusIcon,
	EyeIcon,
	PencilSquareIcon,
} from "@heroicons/react/24/outline";
import useAuth from "../../../auth/useAuth";
import ConfirmDialog from "../../../components/confirmDialog";
import type { Column } from "../../../components/dataTable";
import DataTable from "../../../components/paginatedDataTable";
import PageBackdrop from "../../../components/pageBackdrop";
import EditGradeDialog, { type GradeEdit } from "../../../components/editGradeDialog";
import FilterSelect from "../../../components/filterSelect";
import ResultHeaderForm, { ResultSignaturesForm } from "../../../components/results/resultHeaderForm";
import ResultStatusTag from "../../../components/results/resultStatusTag";
import ResultTable, {
	type NameEditing,
	type RemarkEditing,
	type ResultTableEditing,
} from "../../../components/results/resultTable";
import StudentOrderSelect from "../../../components/studentOrderSelect";
import useFaculties from "../../../hooks/useFaculties";
import { createGrade, updateGrade } from "../../../api/grades";
import { fetchResults, generateResult, previewResult, type ResultBatch } from "../../../api/results";
import type {
	ResultCourse,
	ResultHeader,
	ResultPreview,
	ResultStudent,
	ResultSummary,
} from "../../../types/result";
import {
	cardClass,
	secondaryButtonClass,
	smallSecondaryButtonClass,
	submitButtonClass,
} from "../../../styles/form";
import { ACCEPTANCE_YEARS, SEMESTERS, STUDY_LEVELS } from "../../../utils/academicYears";
import { conflictCode } from "../../../utils/apiError";
import { distinct, editableHeader, headerDefaults, type HeaderSuggestions } from "../../../utils/resultHeader";
import { joinYears } from "../../../utils/resultText";
import { generateError } from "../../../utils/resultErrors";
import { clearDraft, EMPTY_DRAFT, loadDraft, saveDraft } from "../../../utils/resultDraft";
import { WITHOUT_DEPARTMENT, WITHOUT_SPECIALIZATION } from "../../../types/faculty";
import { departmentName, placementName } from "../../../utils/specializations";
import { orderSheet, type StudentOrder } from "../../../utils/studentOrder";

// the cell being corrected, then a correction to a recorded mark waiting on its confirmation
type CellEdit = { student: ResultStudent; course: ResultCourse };
type PendingEdit = CellEdit & {
	gradeId: string;
	edit: GradeEdit;
	from: { grade: number | null; status: string };
};

/** Which batch a result is for, in the same form as the filters' own key. */
const batchKeyOf = (r: ResultSummary) =>
	[
		r.facultyId,
		String(r.academicYear),
		r.acceptanceYear ?? "",
		r.specializationId ?? "",
		r.departmentId ?? "",
		String(r.semester),
	].join("|");

/**
 * Results per batch. The top section builds a new batch's board results: pick
 * the faculty, level, semester and (optionally) acceptance year, check the
 * live sheet (correcting a mark or leaving a student off), then generate it.
 * The section below lists the results already generated.
 */
const ResultList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const navigate = useNavigate();
	const { faculties, locked, lockedFacultyId } = useFaculties();
	const { user } = useAuth();
	const draftOwner = user?.id ?? "";
	// what was being prepared before a refresh or a trip to another page
	const [restored] = useState(() => loadDraft(draftOwner));

	const [results, setResults] = useState<ResultSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [facultyId, setFacultyId] = useState(restored.facultyId);
	const [level, setLevel] = useState(restored.level);
	// a result covers every student at the level unless narrowed to one acceptance year
	const [byAcceptanceYear, setByAcceptanceYear] = useState(restored.byAcceptanceYear);
	const [acceptanceYear, setAcceptanceYear] = useState(restored.acceptanceYear);
	// a faculty with specializations issues one result per specialization, and one for the rest
	const [specializationId, setSpecializationId] = useState(restored.specializationId);
	// with departments, one more per department for its students without a specialization
	const [departmentId, setDepartmentId] = useState(restored.departmentId);
	const [semester, setSemester] = useState(restored.semester);

	const [preview, setPreview] = useState<ResultPreview | null>(null);
	// an i18n key when the preview can't be built
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [excluded, setExcluded] = useState<string[]>(restored.excluded);
	const [order, setOrder] = useState<StudentOrder>("");
	// the header typed so far, kept until the result is generated
	const [headerDraft, setHeaderDraft] = useState<ResultHeader | null>(restored.header);
	// the pending result loaded back in for editing, if any
	const [loadedResultId, setLoadedResultId] = useState<string | null>(restored.loadedResultId);
	// a result being loaded into another batch: its choices survive the batch change below
	const [pendingLoad, setPendingLoad] = useState<ResultSummary | null>(null);
	const [confirmStartOver, setConfirmStartOver] = useState(false);
	// bumped after a mark is corrected, so the preview rebuilds
	const [reloadKey, setReloadKey] = useState(0);
	const [editing, setEditing] = useState<CellEdit | null>(null);
	const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
	const [editError, setEditError] = useState<string | null>(null);

	// what the header starts from for the chosen batch, and what each line offers to pick
	const [headerSetup, setHeaderSetup] = useState<{
		batchKey: string;
		initial: ResultHeader;
		suggestions: HeaderSuggestions;
	} | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// a locked caller only ever sees their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;
	const chosenYear = byAcceptanceYear ? acceptanceYear : "";
	const facultyDepartments = faculties.find((f) => f.id === effectiveFacultyId)?.departments ?? [];
	const hasDepartments = facultyDepartments.length > 0;
	// a department of another faculty (the faculty changed) counts as none
	const chosenDepartment = facultyDepartments.some((d) => d.id === departmentId) ? departmentId : "";
	const allSpecializations = faculties.find((f) => f.id === effectiveFacultyId)?.specializations ?? [];
	// where the faculty has departments, the chosen one's specializations (or those directly under it)
	const facultySpecializations = allSpecializations.filter(
		(s) => !hasDepartments || s.departmentId === (chosenDepartment || null),
	);
	const hasSpecializations = facultySpecializations.length > 0;
	// a specialization of another faculty or department counts as none
	const chosenSpecialization = facultySpecializations.some((s) => s.id === specializationId)
		? specializationId
		: "";
	// a specialization's result names its students on its own; without one, the department's does
	const resultDepartment = chosenSpecialization ? "" : chosenDepartment;
	// a board result belongs to one batch in one semester
	const batchChosen = !!(
		effectiveFacultyId &&
		level &&
		semester &&
		(!byAcceptanceYear || acceptanceYear)
	);
	const batchKey = [effectiveFacultyId, level, chosenYear, chosenSpecialization, resultDepartment, semester].join(
		"|",
	);

	// a new batch starts with nobody left off and a fresh header, unless it's a result being loaded
	const [shownBatch, setShownBatch] = useState(batchKey);
	if (shownBatch !== batchKey) {
		setShownBatch(batchKey);
		const loading = pendingLoad && batchKeyOf(pendingLoad) === batchKey ? pendingLoad : null;
		setExcluded(loading ? loading.excludedStudentIds : []);
		setHeaderDraft(loading ? loading.header : null);
		setLoadedResultId(loading ? loading.id : null);
		setPendingLoad(null);
		setPreview(null);
		setPreviewError(null);
		setEditError(null);
		setError(null);
	}

	const hasDraft = !!(
		facultyId ||
		level ||
		semester ||
		byAcceptanceYear ||
		specializationId ||
		departmentId ||
		excluded.length ||
		headerDraft ||
		loadedResultId
	);

	// every change is kept in this browser, so a refresh or leaving the page loses nothing;
	// with nothing chosen there is nothing to keep
	useEffect(() => {
		if (!draftOwner) return;
		if (!hasDraft) {
			clearDraft(draftOwner);
			return;
		}
		saveDraft(draftOwner, {
			facultyId,
			level,
			byAcceptanceYear,
			acceptanceYear,
			semester,
			specializationId,
			departmentId,
			excluded,
			header: headerDraft,
			loadedResultId,
		});
	}, [
		draftOwner,
		hasDraft,
		facultyId,
		level,
		byAcceptanceYear,
		acceptanceYear,
		semester,
		specializationId,
		departmentId,
		excluded,
		headerDraft,
		loadedResultId,
	]);

	/** Drops the batch, the students left off and the typed header; grade corrections stay saved. */
	const startOver = () => {
		setConfirmStartOver(false);
		setFacultyId(EMPTY_DRAFT.facultyId);
		setLevel(EMPTY_DRAFT.level);
		setByAcceptanceYear(EMPTY_DRAFT.byAcceptanceYear);
		setAcceptanceYear(EMPTY_DRAFT.acceptanceYear);
		setSemester(EMPTY_DRAFT.semester);
		setSpecializationId(EMPTY_DRAFT.specializationId);
		setDepartmentId(EMPTY_DRAFT.departmentId);
		setExcluded(EMPTY_DRAFT.excluded);
		setHeaderDraft(EMPTY_DRAFT.header);
		setLoadedResultId(EMPTY_DRAFT.loadedResultId);
		clearDraft(draftOwner);
	};

	const newSection = useRef<HTMLElement>(null);

	/**
	 * Brings a pending result back into the section above: its batch, the
	 * students it leaves off and its header, so marks can be corrected and the
	 * result updated in place.
	 */
	const loadResult = (result: ResultSummary) => {
		const key = batchKeyOf(result);
		if (!locked) setFacultyId(result.facultyId);
		setLevel(String(result.academicYear));
		setSemester(String(result.semester));
		setByAcceptanceYear(result.acceptanceYear !== null);
		setAcceptanceYear(result.acceptanceYear ?? "");
		setSpecializationId(result.specializationId ?? "");
		// a specialization's result is found under the department the specialization sits in
		const resultFaculty = faculties.find((f) => f.id === result.facultyId);
		setDepartmentId(
			result.departmentId ??
				resultFaculty?.specializations.find((s) => s.id === result.specializationId)?.departmentId ??
				"",
		);
		if (key === batchKey) {
			// the same batch is already chosen, so nothing resets it
			setExcluded(result.excludedStudentIds);
			setHeaderDraft(result.header);
			setLoadedResultId(result.id);
		} else {
			setPendingLoad(result);
		}
		newSection.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		newSection.current?.focus({ preventScroll: true });
	};

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchResults({
			facultyId: effectiveFacultyId || undefined,
			academicYear: level ? Number(level) : undefined,
			acceptanceYear: chosenYear || undefined,
			// where the faculty has specializations, the chosen one's results (or those of the rest)
			specializationId: allSpecializations.length ? chosenSpecialization || WITHOUT_SPECIALIZATION : undefined,
			// and where it has departments, the chosen one's own results (or those for none)
			departmentId: hasDepartments ? resultDepartment || WITHOUT_DEPARTMENT : undefined,
			semester: semester ? Number(semester) : undefined,
		})
			.then((rows) => {
				if (cancelled) return;
				setResults(rows);
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
	}, [
		effectiveFacultyId,
		level,
		chosenYear,
		allSpecializations.length,
		chosenSpecialization,
		hasDepartments,
		resultDepartment,
		semester,
	]);

	const excludedKey = excluded.join(",");
	useEffect(() => {
		if (!batchChosen) return;
		let cancelled = false;
		previewResult(
			{
				facultyId: effectiveFacultyId,
				academicYear: Number(level),
				acceptanceYear: chosenYear || undefined,
				specializationId: chosenSpecialization || undefined,
				departmentId: resultDepartment || undefined,
				semester: Number(semester),
				excludedStudentIds: excludedKey ? excludedKey.split(",") : [],
			},
			"regular",
		)
			.then((next) => {
				if (cancelled) return;
				setPreview(next);
				setPreviewError(null);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setPreview(null);
				setPreviewError(generateError(err));
			});
		return () => {
			cancelled = true;
		};
	}, [
		batchChosen,
		effectiveFacultyId,
		level,
		chosenYear,
		chosenSpecialization,
		resultDepartment,
		semester,
		excludedKey,
		reloadKey,
	]);

	// the chosen batch's regular results, if they were generated already
	const existing = batchChosen
		? results.find(
				(r) =>
					r.kind === "regular" &&
					r.acceptanceYear === (chosenYear || null) &&
					r.specializationId === (chosenSpecialization || null) &&
					r.departmentId === (resultDepartment || null),
			)
		: undefined;
	// it was loaded here for editing, and can still change
	const editingExisting = existing?.status === "pending" && existing.id === loadedResultId;

	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";

	const facultyNameEn = faculties.find((f) => f.id === effectiveFacultyId)?.name.en ?? "";
	// the specialization's name, or else the department's, names the program
	const programNameEn =
		facultySpecializations.find((s) => s.id === chosenSpecialization)?.name.en ??
		facultyDepartments.find((d) => d.id === resultDepartment)?.name.en;
	useEffect(() => {
		if (!batchChosen) return;
		let cancelled = false;
		// the faculty's earlier results supply the degree, program and exam period
		fetchResults({ facultyId: effectiveFacultyId })
			.catch(() => [] as ResultSummary[])
			.then((previous) => {
				if (cancelled) return;
				const defaults = headerDefaults({
					previous,
					facultyNameEn,
					level: Number(level),
					specializationNameEn: programNameEn,
				});
				setHeaderSetup({ batchKey, ...defaults });
			});
		return () => {
			cancelled = true;
		};
	}, [batchChosen, batchKey, effectiveFacultyId, facultyNameEn, level, programNameEn]);

	// a header typed earlier (before a refresh, say) is picked up where it was left; until
	// then the batch is named by the acceptance years of the students on the sheet
	const setup = headerSetup?.batchKey === batchKey ? headerSetup : null;
	const sheetYears = preview?.acceptanceYears ?? [];
	const header =
		setup && preview
			? editableHeader(headerDraft ?? { ...setup.initial, batch: joinYears(sheetYears) })
			: null;
	const headerSuggestions: HeaderSuggestions | null = setup && {
		...setup.suggestions,
		batch: distinct([joinYears(sheetYears), ...sheetYears, ...setup.suggestions.batch]),
	};
	// a batch already generated takes no new header until it's loaded back for editing
	const canGenerate = !existing || editingExisting;

	const generate = async () => {
		if (!header) return;
		setSubmitting(true);
		setError(null);
		const batch: ResultBatch = {
			facultyId: effectiveFacultyId,
			academicYear: Number(level),
			acceptanceYear: chosenYear || undefined,
			specializationId: chosenSpecialization || undefined,
			departmentId: resultDepartment || undefined,
			semester: Number(semester),
			excludedStudentIds: excluded,
		};
		try {
			const created = await generateResult(batch, "regular", header);
			// it's generated: nothing left to keep for this batch
			clearDraft(draftOwner);
			void navigate(created.id);
		} catch (err) {
			setError(generateError(err));
		} finally {
			setSubmitting(false);
		}
	};

	const gradeOf = (studentId: string, curriculumId: string) =>
		preview?.grades[`${studentId}:${curriculumId}`] ?? null;

	/** Writes a correction to the student's grade itself, then rebuilds the preview. */
	const writeEdit = async (target: CellEdit, edit: GradeEdit, gradeId: string | null) => {
		try {
			if (gradeId) {
				await updateGrade(gradeId, { grade: edit.grade, seatingStatus: edit.seatingStatus });
			} else {
				await createGrade({
					studentId: target.student.id,
					curriculumId: target.course.curriculumId,
					grade: edit.grade,
					seatingStatus: edit.seatingStatus,
				});
			}
			setEditError(null);
			setReloadKey((k) => k + 1);
		} catch (err) {
			setEditError(
				conflictCode(err) === "RESULTS_APPROVED" ? "results.lockedError" : "common.saveFailed",
			);
		}
	};

	const saveEdit = (edit: GradeEdit) => {
		const target = editing;
		setEditing(null);
		if (!target) return;
		const stored = gradeOf(target.student.id, target.course.curriculumId);
		// a new mark goes straight in; a recorded one changes only once confirmed, as on the grade sheet
		if (stored && (stored.grade !== null || stored.seatingStatus === "substitute")) {
			setPendingEdit({
				...target,
				gradeId: stored.gradeId,
				edit,
				from: { grade: stored.grade, status: stored.seatingStatus ?? "attended" },
			});
			return;
		}
		void writeEdit(target, edit, stored?.gradeId ?? null);
	};

	const lockedIds = new Set(preview?.lockedStudentIds ?? []);
	const tableEditing: ResultTableEditing = {
		// approved results lock a student; a suspended or dismissed one is frozen
		canEdit: (s) => !lockedIds.has(s.id) && s.standing === "active",
		onCellClick: (student, _cell, course) => setEditing({ student, course }),
		cellLabel: (s, c) => t("results.editCellFor", { name: s.name, course: c.code ?? c.sNo }),
		onRemove: (s) => setExcluded((prev) => [...prev, s.id]),
		removeLabel: (s) => t("results.removeFor", { name: s.name }),
		removeHeader: t("results.removeColumn"),
	};

	// remarks are picked on the sheet until it is generated; they go with the header
	const remarkEditing: RemarkEditing | undefined =
		canGenerate && header
			? {
					onChange: (student, choice) => {
						const remarks = { ...header.remarks };
						if (choice === undefined) delete remarks[student.id];
						else remarks[student.id] = choice;
						setHeaderDraft({ ...header, remarks });
					},
					label: (s) => t("results.remarkFor", { name: s.name }),
				}
			: undefined;

	// and words added after a name, printed on this result only
	const nameEditing: NameEditing | undefined =
		canGenerate && header
			? {
					onChange: (student, addition) =>
						setHeaderDraft({ ...header, nameAdditions: { ...header.nameAdditions, [student.id]: addition } }),
					label: (s) => t("results.nameAdditionFor", { name: s.name }),
					placeholder: t("results.nameAdditionPlaceholder"),
				}
			: undefined;

	const editingGrade = editing ? gradeOf(editing.student.id, editing.course.curriculumId) : null;
	const cellName = (target: CellEdit) =>
		`${target.student.name} · ${target.course.code ?? target.course.sNo}`;

	const anyDepartments = faculties.some((f) => f.departments.length > 0);
	const columns: Column<ResultSummary>[] = [
		{ key: "faculty", header: t("results.columns.faculty"), render: (r) => facultyName(r.facultyId) },
		{ key: "level", header: t("results.columns.level"), render: (r) => t(`student.levels.${r.academicYear}`) },
		{
			key: "acceptanceYear",
			header: t("results.columns.acceptanceYear"),
			render: (r) =>
				r.acceptanceYear ? <span dir="ltr">{r.acceptanceYear}</span> : t("results.allAcceptanceYears"),
		},
		{
			key: "specialization",
			header: t(anyDepartments ? "department.placementLabel" : "specialization.label"),
			render: (r) =>
				r.specializationId
					? placementName(faculties, null, r.specializationId, lang)
					: r.departmentId
						? t("department.resultFor", { name: departmentName(faculties, r.departmentId, lang) })
						: t(
								faculties.find((f) => f.id === r.facultyId)?.departments.length
									? "department.withoutResult"
									: "specialization.withoutResult",
							),
		},
		{ key: "semester", header: t("results.columns.semester"), render: (r) => t(`semesters.${r.semester}`) },
		{ key: "kind", header: t("results.columns.kind"), render: (r) => t(`results.kinds.${r.kind}`) },
		{ key: "status", header: t("results.columns.status"), render: (r) => <ResultStatusTag status={r.status} /> },
		{
			key: "students",
			header: t("results.columns.students"),
			render: (r) => <span dir="ltr">{r.studentCount}</span>,
		},
		{
			key: "updatedAt",
			header: t("results.columns.updatedAt"),
			render: (r) => (
				// day/month/year in Latin digits, like the other numbers in the table
				<span dir="ltr">{new Date(r.approvedAt ?? r.updatedAt).toLocaleDateString("en-GB")}</span>
			),
		},
		{
			key: "actions",
			header: t("common.actions"),
			render: (r) => {
				const name = `${facultyName(r.facultyId)} ${t(`student.levels.${r.academicYear}`)} ${r.acceptanceYear ?? ""}`.trim();
				return (
					<div className="flex flex-wrap items-center gap-2">
						<Link
							to={r.id}
							aria-label={t("results.openFor", { name })}
							className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
						>
							<EyeIcon className="size-4" aria-hidden />
							{t("results.open")}
						</Link>
						{/* only pending semester results can still change; approved ones lock their grades */}
						{r.kind === "regular" && r.status === "pending" && (
							<button
								type="button"
								onClick={() => loadResult(r)}
								aria-label={t("results.loadForEditingFor", { name })}
								className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
							>
								<PencilSquareIcon className="size-4" aria-hidden />
								{t("results.loadForEditing")}
							</button>
						)}
					</div>
				);
			},
		},
	];

	return (
		<div className="relative isolate">
			<PageBackdrop />
			<h1 className="mb-4 shrink-0 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("results.title")}
			</h1>
			<p className="mb-8 ps-4 text-body-md text-foreground">{t("results.intro")}</p>

			<section
				ref={newSection}
				// a loaded result brings focus here, where it is now shown
				tabIndex={-1}
				aria-labelledby="newResultTitle"
				className={`mb-12 scroll-mt-4 outline-none ${cardClass}`}
			>
				<div className="mb-2 flex flex-wrap items-center justify-between gap-3">
					<h2 id="newResultTitle" className="text-heading-4 text-accent-deep">
						{t("results.newTitle")}
					</h2>
					{hasDraft && (
						<button
							type="button"
							onClick={() => setConfirmStartOver(true)}
							className={smallSecondaryButtonClass}
						>
							<ArrowPathIcon className="size-4" aria-hidden />
							{t("results.startOver")}
						</button>
					)}
				</div>
				{hasDraft && <p className="mb-2 text-body-sm text-primary-hover">{t("results.draftKept")}</p>}
				<p className="mb-6 text-body-md text-foreground">{t("results.newHint")}</p>

				<div className="mb-6 flex flex-wrap shrink-0 items-end gap-6">
					<FilterSelect
						id="facultyFilter"
						label={t("gradeEntry.faculty")}
						value={effectiveFacultyId}
						onChange={setFacultyId}
						allLabel={t("gradeEntry.allFaculties")}
						options={faculties.map((f) => ({ value: f.id, label: f.name[lang] }))}
						disabled={locked}
					/>
					<FilterSelect
						id="levelFilter"
						label={t("gradeEntry.academicYear")}
						value={level}
						onChange={setLevel}
						allLabel={t("gradeEntry.allYears")}
						options={STUDY_LEVELS.map((l) => ({ value: String(l), label: t(`student.levels.${l}`) }))}
					/>
					<FilterSelect
						id="semesterFilter"
						label={t("gradeEntry.semester")}
						value={semester}
						onChange={setSemester}
						allLabel={t("gradeEntry.allSemesters")}
						options={SEMESTERS.map((s) => ({ value: String(s), label: t(`semesters.${s}`) }))}
					/>
					<div className="flex w-full flex-col gap-2 sm:w-64">
						{/* off: every acceptance year at the level, which is how results are usually issued */}
						<label className="flex items-center gap-2 text-body-sm font-medium text-accent-deep">
							<input
								type="checkbox"
								checked={byAcceptanceYear}
								onChange={(e) => setByAcceptanceYear(e.target.checked)}
								className="size-5 accent-primary"
							/>
							{t("results.byAcceptanceYear")}
						</label>
						<select
							id="acceptanceYearFilter"
							aria-label={t("gradeEntry.acceptanceYear")}
							value={byAcceptanceYear ? acceptanceYear : ""}
							disabled={!byAcceptanceYear}
							onChange={(e) => setAcceptanceYear(e.target.value)}
							className="h-12 w-full rounded-sm border border-border bg-surface px-4 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background disabled:text-primary-hover"
						>
							<option value="">
								{byAcceptanceYear ? t("results.chooseAcceptanceYear") : t("results.allAcceptanceYears")}
							</option>
							{ACCEPTANCE_YEARS.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</div>
					{/* with departments: one result per department for its students without a specialization */}
					{hasDepartments && (
						<FilterSelect
							id="resultDepartment"
							label={t("department.label")}
							value={chosenDepartment}
							onChange={setDepartmentId}
							allLabel={t("department.none")}
							options={facultyDepartments.map((d) => ({ value: d.id, label: d.name[lang] }))}
						/>
					)}
					{/* one result per specialization, and one for the students without one */}
					{hasSpecializations && (
						<FilterSelect
							id="resultSpecialization"
							label={t("specialization.label")}
							value={chosenSpecialization}
							onChange={setSpecializationId}
							allLabel={t(
								chosenDepartment
									? "department.withoutSpecializationResult"
									: hasDepartments
										? "department.withoutResult"
										: "specialization.withoutResult",
							)}
							options={facultySpecializations.map((spec) => ({ value: spec.id, label: spec.name[lang] }))}
						/>
					)}
				</div>

				{!batchChosen ? (
					<p className="text-body-sm text-primary-hover">{t("results.chooseBatch")}</p>
				) : (
					<>
						<div className="mb-4 flex flex-wrap items-center gap-4">
							{editingExisting ? (
								<>
									<p className="text-body-md text-foreground">{t("results.editingLoaded")}</p>
									<button
										type="button"
										disabled={!preview || !header || submitting}
										onClick={() => void generate()}
										className={submitButtonClass}
									>
										<ArrowPathIcon className="me-2 size-5" aria-hidden />
										{submitting ? t("results.generating") : t("results.updateBoard")}
									</button>
									<Link to={existing.id} className={secondaryButtonClass}>
										<EyeIcon className="me-2 size-5" aria-hidden />
										{t("results.openBatch")}
									</Link>
								</>
							) : existing ? (
								<>
									<p className="text-body-md text-foreground">
										{existing.status === "approved"
											? t("results.alreadyApproved")
											: t("results.alreadyGenerated")}
									</p>
									{existing.status === "pending" && (
										<button
											type="button"
											onClick={() => loadResult(existing)}
											className={submitButtonClass}
										>
											<PencilSquareIcon className="me-2 size-5" aria-hidden />
											{t("results.loadForEditing")}
										</button>
									)}
									<Link
										to={existing.id}
										className={existing.status === "pending" ? secondaryButtonClass : submitButtonClass}
									>
										<EyeIcon className="me-2 size-5" aria-hidden />
										{t("results.openBatch")}
									</Link>
								</>
							) : (
								<button
									type="button"
									disabled={!preview || !header || submitting}
									onClick={() => void generate()}
									className={submitButtonClass}
								>
									<DocumentPlusIcon className="me-2 size-5" aria-hidden />
									{submitting ? t("results.generating") : t("results.generateBoard")}
								</button>
							)}
							{preview && (
								<p className="text-body-sm text-foreground">
									{t("results.previewSummary", {
										students: preview.sheet.students.length,
										courses: preview.sheet.courses.length,
									})}
								</p>
							)}
						</div>

						{error && canGenerate && (
							<p role="alert" className="mb-4 text-body-sm text-error">
								{t(error)}
							</p>
						)}
						{previewError && (
							<p role="alert" className="mb-4 text-body-sm text-error">
								{t(previewError)}
							</p>
						)}
						{editError && (
							<p role="alert" className="mb-4 text-body-sm text-error">
								{t(editError)}
							</p>
						)}

						{preview && preview.excluded.length > 0 && (
							<div className="mb-4 flex flex-wrap items-center gap-2">
								<span className="text-body-sm font-medium text-accent-deep">{t("results.removed")}</span>
								{preview.excluded.map((s) => (
									<button
										key={s.id}
										type="button"
										onClick={() => setExcluded((prev) => prev.filter((id) => id !== s.id))}
										aria-label={t("results.restoreFor", { name: s.name })}
										title={t("results.restoreFor", { name: s.name })}
										className={smallSecondaryButtonClass}
									>
										<ArrowUturnLeftIcon className="size-4" aria-hidden />
										<span dir="ltr">{s.name}</span>
									</button>
								))}
							</div>
						)}

						{preview ? (
							<>
								<div className="mb-3 flex flex-wrap items-end justify-between gap-4">
									<div className="flex flex-col gap-1 text-body-sm text-primary-hover">
										{canGenerate && <p>{t("results.headerHint")}</p>}
										{canGenerate && <p>{t("results.remarksHint")}</p>}
										{canGenerate && <p>{t("results.nameAdditionHint")}</p>}
										<p>{t("results.previewHint")}</p>
									</div>
									<StudentOrderSelect id="previewOrder" value={order} onChange={setOrder} />
								</div>
								<div className="overflow-x-auto rounded-md border border-border-subtle bg-surface p-4">
									{/* the header is filled in where it prints, above the sheet it heads */}
									{canGenerate && headerSuggestions && header && (
										<div className="mb-4">
											<ResultHeaderForm
												idPrefix="newHeader"
												header={header}
												onChange={setHeaderDraft}
												suggestions={headerSuggestions}
												sheet={preview.sheet}
												disabled={submitting}
											/>
										</div>
									)}
									<ResultTable
										sheet={orderSheet(preview.sheet, order, preview.studentAcceptanceYears)}
										version="board"
										editing={tableEditing}
										remarks={header?.remarks}
										remarkEditing={remarkEditing}
										nameAdditions={header?.nameAdditions}
										nameEditing={nameEditing}
									/>
									{/* and who signs, where they sign: below the sheet */}
									{canGenerate && headerSuggestions && header && (
										<div className="mt-4">
											<ResultSignaturesForm
												idPrefix="newHeader"
												header={header}
												onChange={setHeaderDraft}
												suggestions={headerSuggestions}
												disabled={submitting}
											/>
										</div>
									)}
								</div>
							</>
						) : (
							!previewError && <p className="text-body-sm text-foreground">{t("common.loading")}</p>
						)}
					</>
				)}
			</section>

			<section aria-labelledby="generatedTitle">
				<h2 id="generatedTitle" className="mb-2 text-heading-4 text-accent-deep">
					{t("results.generatedTitle")}
				</h2>
				<p className="mb-6 text-body-md text-foreground">{t("results.generatedHint")}</p>

				{failed && (
					<p role="alert" className="mb-6  shrink-0 text-body-sm text-error">
						{t("common.loadFailed")}
					</p>
				)}

				<DataTable
					columns={columns}
					rows={results}
					getRowId={(r) => r.id}
					onRowClick={(r) => void navigate(r.id)}
					emptyText={loading ? t("common.loading") : t("results.empty")}
				/>
			</section>

			<EditGradeDialog
				open={editing !== null}
				curriculumName={editing ? cellName(editing) : ""}
				grade={editingGrade?.grade ?? null}
				seatingStatus={editingGrade?.seatingStatus ?? null}
				onSave={saveEdit}
				onCancel={() => setEditing(null)}
			/>

			<ConfirmDialog
				open={pendingEdit !== null}
				tone="primary"
				title={t("editGrade.confirmTitle")}
				message={
					pendingEdit
						? t("editGrade.confirmMessage", {
								name: cellName(pendingEdit),
								fromGrade: pendingEdit.from.grade ?? "—",
								fromStatus: t(`seatingStatuses.${pendingEdit.from.status}`),
								toGrade: pendingEdit.edit.grade ?? "—",
								toStatus: t(`seatingStatuses.${pendingEdit.edit.seatingStatus}`),
							})
						: ""
				}
				confirmLabel={t("editGrade.confirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => {
					const edit = pendingEdit;
					setPendingEdit(null);
					if (edit) void writeEdit(edit, edit.edit, edit.gradeId);
				}}
				onCancel={() => setPendingEdit(null)}
			/>


			<ConfirmDialog
				open={confirmStartOver}
				title={t("results.startOverTitle")}
				message={t("results.startOverMessage")}
				confirmLabel={t("results.startOver")}
				cancelLabel={t("common.cancel")}
				onConfirm={startOver}
				onCancel={() => setConfirmStartOver(false)}
			/>
		</div>
	);
};

export default ResultList;
