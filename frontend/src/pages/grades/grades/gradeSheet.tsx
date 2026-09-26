import { useEffect, useState, type KeyboardEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
	ArrowLeftIcon,
	ArrowUturnLeftIcon,
	CheckIcon,
	PencilSquareIcon,
} from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import ConfirmDialog from "../../../components/confirmDialog";
import DeleteButton from "../../../components/deleteButton";
import FilterSelect from "../../../components/filterSelect";
import SearchField from "../../../components/searchField";
import {
	createGrade,
	deleteGrade,
	fetchPendingGrades,
	updateGrade,
	type PendingGrades,
	type SheetStudent,
} from "../../../api/grades";
import SeatingStatusSelect, { SeatingStatusTag } from "../../../components/seatingStatusSelect";
import type { Grade, SeatingStatus } from "../../../types/grade";
import { smallPrimaryButtonClass, smallSecondaryButtonClass } from "../../../styles/form";
import { gradeSchema, voidsMark } from "../../../utils/gradeInput";
import { adjacentRowId, afterRender, focusField, focusRow } from "../../../utils/rowNav";

// a row is idle, showing what is stored, until it is opened to enter or edit its mark
type RowState =
	| { mode: "idle" }
	| { mode: "editing" | "saving"; draft: string; seatingStatus: SeatingStatus; error?: string };

const IDLE: RowState = { mode: "idle" };

const MARK_FILTERS = ["notEntered", "entered"] as const;
type MarkFilter = (typeof MARK_FILTERS)[number] | "";

// a changed mark waits here for its confirmation; `advance` carries Enter's move to the next row
type PendingEdit = {
	student: SheetStudent;
	grade: number;
	seatingStatus: SeatingStatus;
	advance: boolean;
};

// the sheet's rows, for the arrow keys
const NAV_GROUP = "grade-sheet";

const inputId = (studentId: string) => `grade-input-${studentId}`;
const selectId = (studentId: string) => `seating-status-${studentId}`;

// the common case, so a row opens ready for the grade alone
const DEFAULT_STATUS: SeatingStatus = "attended";

const hasMark = (s: SheetStudent) => s.grade !== null;

/** Folds Arabic spelling variants and case, so a search finds a name however it is typed. */
const fold = (value: string) =>
	value
		.toLowerCase()
		.replace(/[ً-ْـ]/g, "")
		.replace(/[أإآ]/g, "ا")
		.replace(/ى/g, "ي")
		.replace(/ة/g, "ه")
		.trim();

// step two of grade entry: one curriculum's students, each entered, edited or cleared in its own row
const GradeSheet = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { curriculumId = "" } = useParams();
	// a shared university requirement lists the students of the faculty it was opened from
	const [searchParams] = useSearchParams();
	const facultyId = searchParams.get("facultyId") ?? undefined;

	const [sheet, setSheet] = useState<PendingGrades | null>(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [rows, setRows] = useState<Record<string, RowState>>({});
	// rows written or cleared this visit, marked until opened again
	const [saved, setSaved] = useState<Set<string>>(new Set());
	const [search, setSearch] = useState("");
	const [markFilter, setMarkFilter] = useState<MarkFilter>("");
	const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
	const [pendingDelete, setPendingDelete] = useState<SheetStudent | null>(null);
	const [deleteFailed, setDeleteFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		fetchPendingGrades(curriculumId, facultyId)
			.then((data) => {
				if (cancelled) return;
				setSheet(data);
				setRows({});
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
	}, [curriculumId, facultyId]);

	const students = sheet?.students ?? [];
	const entered = students.filter(hasMark).length;

	const needle = fold(search);
	const visible = students.filter((s) => {
		if (needle && ![s.name.ar, s.name.en, s.uniNumber].some((v) => fold(v).includes(needle))) {
			return false;
		}
		// a row saved this visit stays in view, so "not entered" doesn't whisk it away mid-entry
		if (markFilter === "notEntered") return !hasMark(s) || saved.has(s.id);
		if (markFilter === "entered") return hasMark(s);
		return true;
	});

	const rowOf = (id: string) => rows[id] ?? IDLE;
	const setRow = (id: string, next: RowState) => setRows((prev) => ({ ...prev, [id]: next }));
	const markSaved = (id: string, on: boolean) =>
		setSaved((prev) => {
			const next = new Set(prev);
			if (on) next.add(id);
			else next.delete(id);
			return next;
		});

	/** Replaces one student's mark with what the API now holds. */
	const storeMark = (studentId: string, mark: Grade | null) =>
		setSheet((prev) =>
			prev && {
				...prev,
				students: prev.students.map((s) =>
					s.id !== studentId
						? s
						: {
								...s,
								gradeId: mark?.id ?? null,
								grade: mark?.grade ?? null,
								letter: mark?.letter ?? null,
								seatingStatus: mark?.seatingStatus ?? null,
								cheatingResolved: mark?.cheatingResolved ?? false,
							},
				),
			},
		);

	/** Opens a row with what it holds, ready for a new mark or a correction. */
	const openRow = (student: SheetStudent) => {
		markSaved(student.id, false);
		setRow(student.id, {
			mode: "editing",
			draft: student.grade === null ? "" : String(student.grade),
			seatingStatus: student.seatingStatus ?? DEFAULT_STATUS,
		});
	};

	/** Sends the mark; true once it is stored. */
	const write = async (
		student: SheetStudent,
		grade: number,
		seatingStatus: SeatingStatus,
		draft: string,
	): Promise<boolean> => {
		setRow(student.id, { mode: "saving", draft, seatingStatus });
		try {
			// a row can exist without a mark; it is filled through the row, not beside it
			const stored = student.gradeId
				? await updateGrade(student.gradeId, { grade, seatingStatus })
				: await createGrade({ studentId: student.id, curriculumId, grade, seatingStatus });
			storeMark(student.id, stored);
			setRow(student.id, IDLE);
			markSaved(student.id, true);
			return true;
		} catch (error) {
			// 409: someone else graded this student since the sheet loaded
			const status = axios.isAxiosError(error) ? error.response?.status : undefined;
			setRow(student.id, {
				mode: "editing",
				draft,
				seatingStatus,
				error: status === 409 ? "gradeSheet.errors.alreadyGraded" : "common.saveFailed",
			});
			return false;
		}
	};

	/**
	 * Checks the open row and stores it. A new mark goes straight through; a changed
	 * one waits for its confirmation. True once the mark is stored.
	 */
	const save = async (student: SheetStudent, advance: boolean): Promise<boolean> => {
		const row = rowOf(student.id);
		if (row.mode !== "editing") return false;

		// a voided mark needs no entry: the grade is 0 whatever was typed
		const result = gradeSchema.safeParse(voidsMark(row.seatingStatus) ? "0" : row.draft);
		if (!result.success) {
			setRow(student.id, { ...row, error: result.error.issues[0]?.message });
			return false;
		}

		if (student.grade !== null) {
			const unchanged =
				result.data === student.grade &&
				row.seatingStatus === (student.seatingStatus ?? DEFAULT_STATUS);
			if (unchanged) {
				setRow(student.id, IDLE);
				return true;
			}
			setPendingEdit({ student, grade: result.data, seatingStatus: row.seatingStatus, advance });
			return false;
		}

		return write(student, result.data, row.seatingStatus, row.draft);
	};

	const confirmEdit = async () => {
		const edit = pendingEdit;
		if (!edit) return;
		setPendingEdit(null);
		const row = rowOf(edit.student.id);
		const draft = row.mode === "idle" ? String(edit.grade) : row.draft;
		const stored = await write(edit.student, edit.grade, edit.seatingStatus, draft);
		if (!stored) return;
		if (edit.advance) openNext(edit.student.id);
		else afterRender(() => focusRow(NAV_GROUP, edit.student.id));
	};

	const confirmDelete = async () => {
		const student = pendingDelete;
		if (!student?.gradeId) return;
		setPendingDelete(null);
		try {
			await deleteGrade(student.gradeId);
			storeMark(student.id, null);
			markSaved(student.id, false);
			setDeleteFailed(false);
		} catch {
			setDeleteFailed(true);
		}
		afterRender(() => focusRow(NAV_GROUP, student.id));
	};

	/** Enter on a row: open it, or return to its open field. */
	const activateRow = (student: SheetStudent) => {
		const row = rowOf(student.id);
		// the field mounts focused (autoFocus)
		if (row.mode === "idle") openRow(student);
		else if (row.mode === "editing") focusField(inputId(student.id), selectId(student.id));
	};

	// Enter on a stored mark carries on to the next student in view still without one
	const openNext = (studentId: string) => {
		const next = visible
			.slice(visible.findIndex((s) => s.id === studentId) + 1)
			.find((s) => !hasMark(s) && rowOf(s.id).mode !== "saving");

		if (next && rowOf(next.id).mode === "idle") {
			openRow(next);
		} else if (next) {
			afterRender(() => focusField(inputId(next.id), selectId(next.id)));
		} else {
			// nobody left: the field just closed, so focus rests on its row
			afterRender(() => focusRow(NAV_GROUP, studentId));
		}
	};

	const discard = (student: SheetStudent) => {
		setRow(student.id, IDLE);
		afterRender(() => focusRow(NAV_GROUP, student.id));
	};

	const handleKeyDown = (
		e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
		student: SheetStudent,
	) => {
		if (e.key === "Enter") {
			e.preventDefault();
			void save(student, true).then((stored) => stored && openNext(student.id));
		} else if (e.key === "Escape") {
			discard(student);
		} else if (
			e.currentTarget instanceof HTMLInputElement &&
			(e.key === "ArrowDown" || e.key === "ArrowUp")
		) {
			// the arrows move between rows rather than nudge the mark; the open row keeps its draft
			e.preventDefault();
			const next = adjacentRowId(NAV_GROUP, student.id, e.key === "ArrowDown" ? 1 : -1);
			if (next) focusRow(NAV_GROUP, next);
		}
	};

	const renderGrade = (student: SheetStudent) => {
		const row = rowOf(student.id);
		if (row.mode === "idle") {
			if (!hasMark(student)) {
				return <span className="text-primary-hover">{t("gradeSheet.notEntered")}</span>;
			}
			return (
				<span className="inline-flex items-center gap-2 font-semibold">
					{student.grade}
					{saved.has(student.id) && (
						<span className="inline-flex items-center gap-1 text-body-sm font-normal text-primary-hover">
							<CheckIcon className="size-4" aria-hidden />
							{t("common.saved")}
						</span>
					)}
				</span>
			);
		}

		const errorId = `grade-${student.id}-error`;
		const voided = voidsMark(row.seatingStatus);
		return (
			<div className="flex flex-col gap-1">
				<input
					type="number"
					min={0}
					max={100}
					step="any"
					id={inputId(student.id)}
					dir="ltr"
					// the row was just opened; take the user straight to its field
					autoFocus
					// a correction replaces the whole mark
					onFocus={(e) => e.currentTarget.select()}
					value={voided ? "0" : row.draft}
					disabled={row.mode === "saving" || voided}
					onChange={(e) =>
						setRow(student.id, {
							mode: "editing",
							draft: e.target.value,
							seatingStatus: row.seatingStatus,
						})
					}
					onKeyDown={(e) => handleKeyDown(e, student)}
					aria-label={t("gradeSheet.gradeFor", { name: student.name[lang] })}
					aria-invalid={!!row.error}
					aria-describedby={row.error ? errorId : undefined}
					className={`h-9 w-28 rounded-sm border bg-surface px-3 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background ${
						row.error ? "border-error" : "border-border"
					}`}
				/>
				{voided && <p className="text-body-sm text-primary-hover">{t("gradeSheet.voidedGrade")}</p>}
				{row.error && (
					<p id={errorId} role="alert" className="text-body-sm text-error">
						{t(row.error)}
					</p>
				)}
			</div>
		);
	};

	const renderSeatingStatus = (student: SheetStudent) => {
		const row = rowOf(student.id);
		if (row.mode === "idle") {
			if (!hasMark(student)) return <span className="text-primary-hover">—</span>;
			return (
				<div className="flex flex-col items-start gap-1">
					<SeatingStatusTag status={student.seatingStatus} />
					{student.seatingStatus === "cheating" && !student.cheatingResolved && (
						<span className="text-body-sm text-error">{t("resolveCheating.pending")}</span>
					)}
				</div>
			);
		}

		return (
			<SeatingStatusSelect
				id={selectId(student.id)}
				value={row.seatingStatus}
				disabled={row.mode === "saving"}
				label={t("gradeSheet.seatingStatusFor", { name: student.name[lang] })}
				onKeyDown={(e) => handleKeyDown(e, student)}
				onChange={(next) =>
					setRow(student.id, { mode: "editing", draft: row.draft, seatingStatus: next })
				}
			/>
		);
	};

	const renderActions = (student: SheetStudent) => {
		const row = rowOf(student.id);
		const name = student.name[lang];
		if (row.mode === "idle") {
			if (!hasMark(student)) {
				return (
					<button
						type="button"
						onClick={() => openRow(student)}
						aria-label={t("gradeSheet.enterGradeFor", { name })}
						className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
					>
						<PencilSquareIcon className="size-4" aria-hidden />
						{t("gradeSheet.enterGrade")}
					</button>
				);
			}
			return (
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => openRow(student)}
						aria-label={t("editGrade.actionFor", { name })}
						className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
					>
						<PencilSquareIcon className="size-4" aria-hidden />
						{t("editGrade.action")}
					</button>
					<DeleteButton
						label={t("gradeSheet.deleteFor", { name })}
						onClick={() => setPendingDelete(student)}
					/>
				</div>
			);
		}

		const saving = row.mode === "saving";
		return (
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => void save(student, false)}
					disabled={saving}
					aria-label={t("gradeSheet.saveFor", { name })}
					className={`whitespace-nowrap ${smallPrimaryButtonClass}`}
				>
					<CheckIcon className="size-4" aria-hidden />
					{saving ? t("common.saving") : t("gradeSheet.save")}
				</button>
				<button
					type="button"
					onClick={() => discard(student)}
					disabled={saving}
					aria-label={t("gradeSheet.discardFor", { name })}
					className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
				>
					<ArrowUturnLeftIcon className="size-4" aria-hidden />
					{t("gradeSheet.discard")}
				</button>
			</div>
		);
	};

	const columns: Column<SheetStudent>[] = [
		{ key: "uniNumber", header: t("gradeSheet.columns.uniNumber"), render: (s) => s.uniNumber },
		{ key: "name", header: t("gradeSheet.columns.name"), render: (s) => s.name[lang] },
		{
			key: "seatingStatus",
			header: t("gradeSheet.columns.seatingStatus"),
			render: renderSeatingStatus,
		},
		{ key: "grade", header: t("gradeSheet.columns.grade"), render: renderGrade },
		{
			key: "letter",
			header: t("gradeSheet.columns.letter"),
			// the API derives the letter; an open row shows none until it is saved
			render: (s) =>
				s.letter && rowOf(s.id).mode === "idle" ? (
					<span dir="ltr" className="font-semibold">
						{s.letter}
					</span>
				) : (
					"—"
				),
		},
		{ key: "actions", header: t("common.actions"), render: renderActions },
	];

	const curriculum = sheet?.curriculum;
	const statusLabel = (status: SeatingStatus) => t(`seatingStatuses.${status}`);

	return (
		<div>
			<Link
				to=".."
				relative="path"
				className="mb-6 inline-flex items-center gap-2 text-body-sm font-medium text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep"
			>
				{/* §20 — the arrow points back in either reading direction */}
				<ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
				{t("gradeSheet.back")}
			</Link>

			<h1 className="mb-2 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{curriculum ? curriculum.name[lang] : t("gradeSheet.title")}
			</h1>
			{curriculum && (
				<p className="mb-8 ps-4 text-body-sm text-foreground">
					<span dir="ltr">{curriculum.abbreviation}</span>
					{" · "}
					{t(`student.levels.${curriculum.academicYear}`)}
					{" · "}
					{t(`semesters.${curriculum.semester}`)}
					{" · "}
					{t("gradeSheet.progress", { entered, total: students.length })}
				</p>
			)}

			<div className="mb-6 flex flex-wrap items-end gap-6">
				<SearchField
					id="gradeSheetSearch"
					label={t("gradeSheet.search")}
					placeholder={t("gradeSheet.searchPlaceholder")}
					value={search}
					onChange={setSearch}
				/>
				<FilterSelect
					id="markFilter"
					label={t("gradeSheet.markFilter")}
					value={markFilter}
					onChange={(value) => setMarkFilter(value as MarkFilter)}
					allLabel={t("gradeSheet.markFilters.all")}
					options={MARK_FILTERS.map((f) => ({ value: f, label: t(`gradeSheet.markFilters.${f}`) }))}
				/>
			</div>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}
			{deleteFailed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("gradeSheet.deleteFailed")}
				</p>
			)}

			<DataTable
				columns={columns}
				rows={visible}
				getRowId={(s) => s.id}
				onRowActivate={activateRow}
				navGroup={NAV_GROUP}
				emptyText={
					loading
						? t("common.loading")
						: students.length
							? t("gradeSheet.noMatches")
							: t("gradeSheet.empty")
				}
			/>

			<ConfirmDialog
				open={pendingEdit !== null}
				tone="primary"
				title={t("editGrade.confirmTitle")}
				message={
					pendingEdit
						? t("editGrade.confirmMessage", {
								name: pendingEdit.student.name[lang],
								fromGrade: pendingEdit.student.grade,
								fromStatus: statusLabel(pendingEdit.student.seatingStatus ?? DEFAULT_STATUS),
								toGrade: pendingEdit.grade,
								toStatus: statusLabel(pendingEdit.seatingStatus),
							})
						: ""
				}
				confirmLabel={t("editGrade.confirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void confirmEdit()}
				onCancel={() => {
					const edit = pendingEdit;
					setPendingEdit(null);
					// back to the open field, to change the mark or discard it
					if (edit) afterRender(() => focusField(inputId(edit.student.id), selectId(edit.student.id)));
				}}
			/>

			<ConfirmDialog
				open={pendingDelete !== null}
				title={t("gradeSheet.deleteTitle")}
				message={t("gradeSheet.deleteMessage", {
					name: pendingDelete?.name[lang],
					grade: pendingDelete?.grade,
				})}
				confirmLabel={t("common.delete")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void confirmDelete()}
				onCancel={() => setPendingDelete(null)}
			/>
		</div>
	);
};

export default GradeSheet;
