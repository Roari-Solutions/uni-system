import { useMemo, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import FormField from "../../../components/formField";
import FacultyField from "../../../components/facultyField";
import ConfirmDialog from "../../../components/confirmDialog";
import useFaculties from "../../../hooks/useFaculties";
import {
	checkBulkStudents,
	importBulkStudents,
	type BulkStudentRow,
} from "../../../api/students";
import {
	readSheet,
	toBulkRows,
	TEMPLATES,
	type BulkRow,
	type BulkTemplate,
} from "../../../utils/bulkStudents";
import { ACCEPTANCE_TYPES, type AcceptanceType } from "../../../types/student";
import { ACCEPTANCE_YEARS, STUDY_LEVELS } from "../../../utils/academicYears";
import {
	cardClass,
	inputClass,
	submitButtonClass,
	smallSecondaryButtonClass,
} from "../../../styles/form";

/** The sheet's own row, plus whatever the API found wrong with it. */
type PreviewRow = BulkRow & { apiProblems: string[] };

const StudentImport = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { faculties, locked, lockedFacultyId } = useFaculties();

	const [template, setTemplate] = useState<BulkTemplate>("ministry");
	const [facultyId, setFacultyId] = useState("");
	const [acceptanceYear, setAcceptanceYear] = useState(ACCEPTANCE_YEARS[0] ?? "");
	const [acceptanceType, setAcceptanceType] = useState<AcceptanceType>("general");
	const [level, setLevel] = useState("1");
	const [rows, setRows] = useState<PreviewRow[]>([]);
	const [fileName, setFileName] = useState("");
	const [checking, setChecking] = useState(false);
	const [importing, setImporting] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [imported, setImported] = useState<number | null>(null);
	const [failed, setFailed] = useState(false);

	// a locked caller only ever imports into their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;
	const ministry = template === "ministry";

	const acceptanceLabels = useMemo(
		() =>
			Object.fromEntries(
				ACCEPTANCE_TYPES.map((type) => [type, t(`student.acceptanceTypes.${type}`, { lng: "ar" })]),
			) as Record<AcceptanceType, string>,
		[t],
	);

	const problemsOf = (row: PreviewRow) => [...row.problems, ...row.apiProblems];
	const blocked = rows.filter((row) => problemsOf(row).length);
	const ready = rows.length - blocked.length;

	/** Parses the file in the browser, then asks the API to judge the rows. */
	const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setFileName(file.name);
		setImported(null);
		setFailed(false);
		setChecking(true);
		try {
			const sheet = await readSheet(file);
			const parsed = toBulkRows(
				sheet,
				template,
				{
					acceptanceType,
					acceptanceYear,
					level: Number(level),
					facultyId: effectiveFacultyId,
				},
				faculties,
				acceptanceLabels,
			);

			const report = await checkBulkStudents(parsed.filter(sendable).map(toPayload));
			const byRow = new Map(report.rows.map((row) => [row.rowNumber, row.problems]));
			setRows(parsed.map((row) => ({ ...row, apiProblems: byRow.get(row.rowNumber) ?? [] })));
		} catch {
			setFailed(true);
			setRows([]);
		} finally {
			setChecking(false);
			// the same file can be picked again after a correction
			e.target.value = "";
		}
	};

	const confirmImport = async () => {
		setImporting(true);
		try {
			const result = await importBulkStudents(
				rows.filter((row) => !problemsOf(row).length).map(toPayload),
			);
			setImported(result.imported);
			setRows([]);
			setFileName("");
			setConfirming(false);
		} catch {
			setFailed(true);
		} finally {
			setImporting(false);
		}
	};

	const editRow = (rowNumber: number, patch: Partial<BulkRow>) =>
		setRows((prev) =>
			prev.map((row) => (row.rowNumber === rowNumber ? { ...row, ...patch } : row)),
		);

	const columns: Column<PreviewRow>[] = [
		{ key: "rowNumber", header: t("bulkImport.columns.row"), render: (r) => r.rowNumber },
		{
			key: "uniNumber",
			header: t("bulkImport.columns.uniNumber"),
			render: (r) => (
				<input
					type="text"
					dir="ltr"
					value={r.uniNumber}
					onChange={(e) => editRow(r.rowNumber, { uniNumber: e.target.value })}
					aria-label={t("bulkImport.columns.uniNumber")}
					className="h-9 w-40 rounded-sm border border-border bg-surface px-3 text-body-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
				/>
			),
		},
		{
			key: "nameAr",
			header: t("bulkImport.columns.nameAr"),
			render: (r) => (
				<input
					type="text"
					value={r.nameAr}
					onChange={(e) => editRow(r.rowNumber, { nameAr: e.target.value })}
					aria-label={t("bulkImport.columns.nameAr")}
					className="h-9 w-56 rounded-sm border border-border bg-surface px-3 text-body-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
				/>
			),
		},
		{
			key: "nationalId",
			header: t("bulkImport.columns.nationalId"),
			render: (r) => (
				<input
					type="text"
					dir="ltr"
					value={r.nationalId}
					onChange={(e) =>
						editRow(r.rowNumber, { nationalId: e.target.value })
					}
					aria-label={t("bulkImport.columns.nationalId")}
					className="h-9 w-40 rounded-sm border border-border bg-surface px-3 text-body-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
				/>
			),
		},
		{
			key: "faculty",
			header: t("bulkImport.columns.faculty"),
			render: (r) =>
				faculties.find((f) => f.id === r.facultyId)?.name[lang] ?? (
					<span className="text-error">{r.facultyName || "—"}</span>
				),
		},
		{
			key: "problems",
			header: t("bulkImport.columns.problems"),
			// §39 — the tint on the row repeats what this cell spells out
			render: (r) => {
				const problems = problemsOf(r);
				return problems.length ? (
					<ul className="flex flex-col gap-1 text-body-sm text-error">
						{problems.map((problem) => (
							<li key={problem}>{t(problem)}</li>
						))}
					</ul>
				) : (
					<span className="text-success">{t("bulkImport.rowReady")}</span>
				);
			},
		},
	];

	return (
		<div>
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("bulkImport.title")}
			</h1>

			<section className={`mb-8 flex flex-col gap-6 ${cardClass}`}>
				<FormField id="template" label={t("bulkImport.template")}>
					<select
						id="template"
						value={template}
						onChange={(e) => {
							setTemplate(e.target.value as BulkTemplate);
							setRows([]);
						}}
						className={inputClass(false)}
					>
						{TEMPLATES.map((value) => (
							<option key={value} value={value}>
								{t(`bulkImport.templates.${value}`)}
							</option>
						))}
					</select>
				</FormField>

				<FacultyField
					label={t("bulkImport.faculty")}
					placeholder={t("studentEntry.facultyPlaceholder")}
					noResultsText={t("studentEntry.noResults")}
					value={facultyId}
					onChange={setFacultyId}
				/>

				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<FormField id="acceptanceYear" label={t("bulkImport.acceptanceYear")}>
						<select
							id="acceptanceYear"
							value={acceptanceYear}
							onChange={(e) => setAcceptanceYear(e.target.value)}
							className={inputClass(false)}
						>
							{ACCEPTANCE_YEARS.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</FormField>

					{!ministry && (
						<>
							<FormField id="acceptanceType" label={t("bulkImport.acceptanceType")}>
								<select
									id="acceptanceType"
									value={acceptanceType}
									onChange={(e) => setAcceptanceType(e.target.value as AcceptanceType)}
									className={inputClass(false)}
								>
									{ACCEPTANCE_TYPES.map((type) => (
										<option key={type} value={type}>
											{t(`student.acceptanceTypes.${type}`)}
										</option>
									))}
								</select>
							</FormField>

							<FormField id="level" label={t("bulkImport.level")}>
								<select
									id="level"
									value={level}
									onChange={(e) => setLevel(e.target.value)}
									className={inputClass(false)}
								>
									{STUDY_LEVELS.map((value) => (
										<option key={value} value={value}>
											{t(`student.levels.${value}`)}
										</option>
									))}
								</select>
							</FormField>
						</>
					)}
				</div>

				<FormField id="sheet" label={t("bulkImport.file")}>
					<input
						id="sheet"
						type="file"
						accept=".xlsx,.xls,.csv"
						onChange={(e) => void handleFile(e)}
						className="text-body-md file:me-4 file:rounded-sm file:border-0 file:bg-primary file:px-4 file:py-2 file:text-button file:text-foreground hover:file:bg-primary-hover hover:file:text-surface"
					/>
					<p className="text-body-sm text-primary-hover">{t("bulkImport.fileHint")}</p>
				</FormField>
			</section>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("bulkImport.readFailed")}
				</p>
			)}
			{imported !== null && (
				<p role="status" className="mb-6 text-body-md text-primary-hover">
					{t("bulkImport.imported", { count: imported })}
				</p>
			)}

			{(checking || rows.length > 0) && (
				<section aria-labelledby="preview">
					<div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
						<h2 id="preview" className="text-heading-5 text-accent-deep">
							{t("bulkImport.preview", { file: fileName })}
						</h2>
						<p className="text-body-sm text-foreground">
							{t("bulkImport.summary", { ready, blocked: blocked.length })}
						</p>
					</div>

					<DataTable
						columns={columns}
						rows={rows}
						getRowId={(r) => String(r.rowNumber)}
						emptyText={checking ? t("common.loading") : t("bulkImport.empty")}
						rowClassName={(r) => (problemsOf(r).length ? "bg-error/8" : "")}
					/>

					<div className="mt-6 flex flex-wrap items-center gap-4">
						<button
							type="button"
							disabled={!ready || importing}
							onClick={() => setConfirming(true)}
							className={submitButtonClass}
						>
							<ArrowUpTrayIcon className="me-2 size-5" aria-hidden />
							{t("bulkImport.import", { count: ready })}
						</button>
						<button
							type="button"
							onClick={() => {
								setRows([]);
								setFileName("");
							}}
							className={smallSecondaryButtonClass}
						>
							{t("common.cancel")}
						</button>
					</div>
				</section>
			)}

			<ConfirmDialog
				open={confirming}
				title={t("bulkImport.confirmTitle")}
				message={t("bulkImport.confirmMessage", { ready, blocked: blocked.length })}
				confirmLabel={importing ? t("common.saving") : t("bulkImport.confirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void confirmImport()}
				onCancel={() => setConfirming(false)}
			/>
		</div>
	);
};

/** A row the API can judge: one whose faculty the sheet resolved. */
const sendable = (row: BulkRow) => !!row.facultyId;

const toPayload = (row: BulkRow): BulkStudentRow => ({
	rowNumber: row.rowNumber,
	name: { ar: row.nameAr, en: row.nameEn || undefined },
	uniNumber: row.uniNumber,
	nationality: row.nationality,
	...(row.nationality === "sudanese"
		? { nationalId: row.nationalId || undefined }
		: { passportNumber: undefined }),
	facultyId: row.facultyId,
	acceptanceYear: row.acceptanceYear,
	acceptanceType: row.acceptanceType,
	level: row.level,
});

export default StudentImport;
