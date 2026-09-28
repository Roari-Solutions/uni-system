import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { DocumentPlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import FilterSelect from "../../../components/filterSelect";
import GenerateResultDialog from "../../../components/results/generateResultDialog";
import ResultStatusTag from "../../../components/results/resultStatusTag";
import useFaculties from "../../../hooks/useFaculties";
import { fetchResults, generateResult } from "../../../api/results";
import { EMPTY_HEADER, type ResultHeader, type ResultSummary } from "../../../types/result";
import { smallSecondaryButtonClass, submitButtonClass } from "../../../styles/form";
import { ACCEPTANCE_YEARS, SEMESTERS, STUDY_LEVELS } from "../../../utils/academicYears";
import { generateError } from "../../../utils/resultErrors";

/**
 * Results per batch: pick the faculty, level, acceptance year and semester to
 * see what has been generated for it, and generate its board results.
 */
const ResultList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const navigate = useNavigate();
	const { faculties, locked, lockedFacultyId } = useFaculties();

	const [results, setResults] = useState<ResultSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [facultyId, setFacultyId] = useState("");
	const [level, setLevel] = useState("");
	const [acceptanceYear, setAcceptanceYear] = useState("");
	const [semester, setSemester] = useState("");
	const [generating, setGenerating] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// a locked caller only ever sees their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;
	// a board result belongs to one batch in one semester, so every filter must be set
	const batchChosen = !!(effectiveFacultyId && level && acceptanceYear && semester);

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchResults({
			facultyId: effectiveFacultyId || undefined,
			academicYear: level ? Number(level) : undefined,
			acceptanceYear: acceptanceYear || undefined,
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
	}, [effectiveFacultyId, level, acceptanceYear, semester]);

	// the chosen batch's regular results, if they were generated already
	const existing = batchChosen ? results.find((r) => r.kind === "regular") : undefined;

	const generate = async (header: ResultHeader) => {
		setSubmitting(true);
		setError(null);
		try {
			const created = await generateResult(
				{
					facultyId: effectiveFacultyId,
					academicYear: Number(level),
					acceptanceYear,
					semester: Number(semester),
				},
				"regular",
				header,
			);
			setGenerating(false);
			void navigate(created.id);
		} catch (err) {
			setError(generateError(err));
		} finally {
			setSubmitting(false);
		}
	};

	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";

	const columns: Column<ResultSummary>[] = [
		{ key: "faculty", header: t("results.columns.faculty"), render: (r) => facultyName(r.facultyId) },
		{ key: "level", header: t("results.columns.level"), render: (r) => t(`student.levels.${r.academicYear}`) },
		{
			key: "acceptanceYear",
			header: t("results.columns.acceptanceYear"),
			render: (r) => <span dir="ltr">{r.acceptanceYear}</span>,
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
			render: (r) => (
				<Link
					to={r.id}
					aria-label={t("results.openFor", {
						name: `${facultyName(r.facultyId)} ${r.acceptanceYear}`,
					})}
					className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
				>
					<EyeIcon className="size-4" aria-hidden />
					{t("results.open")}
				</Link>
			),
		},
	];

	return (
		<div>
			<h1 className="mb-2 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("results.title")}
			</h1>
			<p className="mb-8 ps-4 text-body-md text-foreground">{t("results.intro")}</p>

			<div className="mb-6 flex flex-wrap items-end gap-6">
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
					id="acceptanceYearFilter"
					label={t("gradeEntry.acceptanceYear")}
					value={acceptanceYear}
					onChange={setAcceptanceYear}
					allLabel={t("gradeEntry.allAcceptanceYears")}
					options={ACCEPTANCE_YEARS.map((year) => ({ value: year, label: year }))}
				/>
				<FilterSelect
					id="semesterFilter"
					label={t("gradeEntry.semester")}
					value={semester}
					onChange={setSemester}
					allLabel={t("gradeEntry.allSemesters")}
					options={SEMESTERS.map((s) => ({ value: String(s), label: t(`semesters.${s}`) }))}
				/>
			</div>

			<div className="mb-8 flex flex-wrap items-center gap-4">
				{existing ? (
					<Link to={existing.id} className={submitButtonClass}>
						<EyeIcon className="me-2 size-5" aria-hidden />
						{t("results.openBatch")}
					</Link>
				) : (
					<button
						type="button"
						disabled={!batchChosen}
						onClick={() => {
							setError(null);
							setGenerating(true);
						}}
						className={submitButtonClass}
					>
						<DocumentPlusIcon className="me-2 size-5" aria-hidden />
						{t("results.generateBoard")}
					</button>
				)}
				{!batchChosen && (
					<p className="text-body-sm text-primary-hover">{t("results.chooseBatch")}</p>
				)}
			</div>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
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

			<GenerateResultDialog
				open={generating}
				title={t("results.generateBoard")}
				initial={EMPTY_HEADER}
				submitting={submitting}
				error={error}
				onSubmit={(header) => void generate(header)}
				onCancel={() => setGenerating(false)}
			/>
		</div>
	);
};

export default ResultList;
