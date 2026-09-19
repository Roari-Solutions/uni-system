import { useEffect, useState, type KeyboardEvent } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { z } from "zod";
import { ArrowLeftIcon, CheckIcon, PencilSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import { createGrade, fetchPendingGrades, type PendingGrades } from "../../../api/grades";
import { smallPrimaryButtonClass, smallSecondaryButtonClass } from "../../../styles/form";

const GRADE_RANGE = "gradeSheet.errors.gradeRange";

// messages are i18n keys, translated when rendered
const gradeSchema = z
	.string()
	.trim()
	.min(1, "gradeSheet.errors.required")
	.transform(Number)
	.pipe(z.number({ error: "gradeSheet.errors.gradeNumber" }).min(0, GRADE_RANGE).max(100, GRADE_RANGE));

type PendingStudent = PendingGrades["students"][number];

// a row is idle until its entry mode is opened; saved rows stay, read-only, for this visit
type RowState =
	| { mode: "idle" }
	| { mode: "editing" | "saving"; draft: string; error?: string }
	| { mode: "saved"; grade: number };

const IDLE: RowState = { mode: "idle" };

// step two of grade entry: one curriculum's students, each graded in its own row
const GradeSheet = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { curriculumId = "" } = useParams();

	const [sheet, setSheet] = useState<PendingGrades | null>(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [rows, setRows] = useState<Record<string, RowState>>({});

	useEffect(() => {
		let cancelled = false;
		fetchPendingGrades(curriculumId)
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
	}, [curriculumId]);

	const rowOf = (id: string) => rows[id] ?? IDLE;
	const setRow = (id: string, next: RowState) => setRows((prev) => ({ ...prev, [id]: next }));

	const save = async (student: PendingStudent) => {
		const row = rowOf(student.id);
		if (row.mode !== "editing") return;

		const result = gradeSchema.safeParse(row.draft);
		if (!result.success) {
			setRow(student.id, { ...row, error: result.error.issues[0]?.message });
			return;
		}

		setRow(student.id, { mode: "saving", draft: row.draft });
		try {
			await createGrade({ studentId: student.id, curriculumId, grade: result.data });
			setRow(student.id, { mode: "saved", grade: result.data });
		} catch (error) {
			// 409: someone else graded this student since the sheet loaded
			const status = axios.isAxiosError(error) ? error.response?.status : undefined;
			setRow(student.id, {
				mode: "editing",
				draft: row.draft,
				error: status === 409 ? "gradeSheet.errors.alreadyGraded" : "common.saveFailed",
			});
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, student: PendingStudent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			void save(student);
		} else if (e.key === "Escape") {
			setRow(student.id, IDLE);
		}
	};

	const renderGrade = (student: PendingStudent) => {
		const row = rowOf(student.id);
		if (row.mode === "saved") {
			return (
				<span className="inline-flex items-center gap-2 font-semibold">
					{row.grade}
					<span className="inline-flex items-center gap-1 text-body-sm font-normal text-primary-hover">
						<CheckIcon className="size-4" aria-hidden />
						{t("common.saved")}
					</span>
				</span>
			);
		}
		if (row.mode === "idle") {
			return <span className="text-primary-hover">{t("gradeSheet.notEntered")}</span>;
		}

		const errorId = `grade-${student.id}-error`;
		return (
			<div className="flex flex-col gap-1">
				<input
					type="number"
					min={0}
					max={100}
					step="any"
					dir="ltr"
					// the row was just opened for entry; take the user straight to its field
					autoFocus
					value={row.draft}
					disabled={row.mode === "saving"}
					onChange={(e) => setRow(student.id, { mode: "editing", draft: e.target.value })}
					onKeyDown={(e) => handleKeyDown(e, student)}
					aria-label={t("gradeSheet.gradeFor", { name: student.name[lang] })}
					aria-invalid={!!row.error}
					aria-describedby={row.error ? errorId : undefined}
					className={`h-9 w-28 rounded-sm border bg-surface px-3 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background ${
						row.error ? "border-error" : "border-border"
					}`}
				/>
				{row.error && (
					<p id={errorId} role="alert" className="text-body-sm text-error">
						{t(row.error)}
					</p>
				)}
			</div>
		);
	};

	const renderActions = (student: PendingStudent) => {
		const row = rowOf(student.id);
		const name = student.name[lang];
		if (row.mode === "saved") return null;
		if (row.mode === "idle") {
			return (
				<button
					type="button"
					onClick={() => setRow(student.id, { mode: "editing", draft: "" })}
					aria-label={t("gradeSheet.enterGradeFor", { name })}
					className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
				>
					<PencilSquareIcon className="size-4" aria-hidden />
					{t("gradeSheet.enterGrade")}
				</button>
			);
		}

		const saving = row.mode === "saving";
		return (
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => void save(student)}
					disabled={saving}
					aria-label={t("gradeSheet.saveFor", { name })}
					className={`whitespace-nowrap ${smallPrimaryButtonClass}`}
				>
					<CheckIcon className="size-4" aria-hidden />
					{saving ? t("common.saving") : t("gradeSheet.save")}
				</button>
				<button
					type="button"
					onClick={() => setRow(student.id, IDLE)}
					disabled={saving}
					aria-label={t("gradeSheet.cancelFor", { name })}
					className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
				>
					<XMarkIcon className="size-4" aria-hidden />
					{t("common.cancel")}
				</button>
			</div>
		);
	};

	const columns: Column<PendingStudent>[] = [
		{ key: "uniNumber", header: t("gradeSheet.columns.uniNumber"), render: (s) => s.uniNumber },
		{ key: "name", header: t("gradeSheet.columns.name"), render: (s) => s.name[lang] },
		{ key: "grade", header: t("gradeSheet.columns.grade"), render: renderGrade },
		{ key: "actions", header: t("common.actions"), render: renderActions },
	];

	const curriculum = sheet?.curriculum;

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
				</p>
			)}

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}

			<DataTable
				columns={columns}
				rows={sheet?.students ?? []}
				getRowId={(s) => s.id}
				emptyText={loading ? t("common.loading") : t("gradeSheet.empty")}
			/>
		</div>
	);
};

export default GradeSheet;
