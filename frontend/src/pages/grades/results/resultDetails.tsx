import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
	ArrowLeftIcon,
	ArrowPathIcon,
	CheckBadgeIcon,
	DocumentArrowDownIcon,
	DocumentPlusIcon,
	ExclamationTriangleIcon,
	EyeIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import ConfirmDialog from "../../../components/confirmDialog";
import ApproveResultDialog from "../../../components/results/approveResultDialog";
import GenerateResultDialog from "../../../components/results/generateResultDialog";
import ResitEntry from "../../../components/results/resitEntry";
import ResultStatusTag from "../../../components/results/resultStatusTag";
import ResultTable from "../../../components/results/resultTable";
import StudentOrderSelect from "../../../components/studentOrderSelect";
import useFaculties from "../../../hooks/useFaculties";
import {
	discardResult,
	fetchResitCandidates,
	fetchResult,
	fetchResults,
	generateResult,
} from "../../../api/results";
import type {
	ResitCandidate,
	Result,
	ResultHeader,
	ResultKind,
	ResultSummary,
	ResultVersion,
} from "../../../types/result";
import {
	secondaryButtonClass,
	smallSecondaryButtonClass,
	submitButtonClass,
} from "../../../styles/form";
import { headerDefaults, type HeaderSuggestions } from "../../../utils/resultHeader";
import { specializationName } from "../../../utils/specializations";
import { generateError } from "../../../utils/resultErrors";
import { orderSheet, type StudentOrder } from "../../../utils/studentOrder";

// the regeneration dialog or the Sup & Sub one; both ask for the header
type Generating = { kind: ResultKind; header: ResultHeader; suggestions: HeaderSuggestions } | null;

/**
 * One batch's results for a semester. Pending board results can be exported,
 * regenerated, approved or discarded; approved ones export both versions and,
 * for the semester's own exams, take the Sup & Sub re-exam marks.
 */
const ResultDetails = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { resultId = "" } = useParams();
	const navigate = useNavigate();
	const { faculties } = useFaculties();

	const [result, setResult] = useState<Result | null>(null);
	// the batch's other result (regular <-> Sup & Sub), if there is one
	const [sibling, setSibling] = useState<ResultSummary | null>(null);
	const [candidates, setCandidates] = useState<ResitCandidate[]>([]);
	const [failed, setFailed] = useState(false);
	const [version, setVersion] = useState<ResultVersion>("board");
	const [order, setOrder] = useState<StudentOrder>("");
	const [approving, setApproving] = useState(false);
	const [confirmDiscard, setConfirmDiscard] = useState(false);
	const [generating, setGenerating] = useState<Generating>(null);
	const [submitting, setSubmitting] = useState(false);
	// i18n keys: why the dialog's last attempt failed, and why the last action failed
	const [generateFailed, setGenerateFailed] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const load = useCallback(async () => {
		const row = await fetchResult(resultId);
		const batch = await fetchResults({
			facultyId: row.facultyId,
			academicYear: row.academicYear,
			acceptanceYear: row.acceptanceYear ?? undefined,
			semester: row.semester,
		});
		const resits =
			row.kind === "regular" && row.status === "approved" ? await fetchResitCandidates(row.id) : [];
		// an all-acceptance-years result's sibling covers all of them too
		const other = batch.find(
			(r) =>
				r.kind !== row.kind &&
				r.acceptanceYear === row.acceptanceYear &&
				r.specializationId === row.specializationId,
		);
		return { row, sibling: other ?? null, resits };
	}, [resultId]);

	useEffect(() => {
		let cancelled = false;
		load()
			.then(({ row, sibling: other, resits }) => {
				if (cancelled) return;
				setResult(row);
				setSibling(other);
				setCandidates(resits);
				// an approved result opens on what gets handed out
				setVersion(row.status === "approved" ? "final" : "board");
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
		};
	}, [load]);

	const reload = async () => {
		const { row, sibling: other, resits } = await load();
		setResult(row);
		setSibling(other);
		setCandidates(resits);
	};

	const approved = async () => {
		setApproving(false);
		setActionError(null);
		try {
			await reload();
			setVersion("final");
		} catch {
			setFailed(true);
		}
	};

	/** Opens the header form: the result's own header, with the faculty's earlier values to pick from. */
	const openGenerating = async (kind: ResultKind) => {
		if (!result) return;
		setGenerateFailed(null);
		const previous = await fetchResults({ facultyId: result.facultyId }).catch(
			() => [] as ResultSummary[],
		);
		const { suggestions } = headerDefaults({
			previous,
			facultyNameEn: faculties.find((f) => f.id === result.facultyId)?.name.en ?? "",
			level: result.academicYear,
			semester: result.semester,
			specializationNameEn: result.sheet.specialization ?? undefined,
		});
		setGenerating({ kind, header: result.header, suggestions });
	};

	const discard = async () => {
		if (!result) return;
		setConfirmDiscard(false);
		try {
			await discardResult(result.id);
			void navigate("..", { relative: "path" });
		} catch {
			setActionError("common.saveFailed");
		}
	};

	const generate = async (header: ResultHeader) => {
		if (!result || !generating) return;
		setSubmitting(true);
		setGenerateFailed(null);
		try {
			const saved = await generateResult(
				{
					facultyId: result.facultyId,
					academicYear: result.academicYear,
					acceptanceYear: result.acceptanceYear ?? undefined,
					specializationId: result.specializationId ?? undefined,
					semester: result.semester,
					// a regeneration leaves off who it did; Sup & Sub follows the semester's result
					excludedStudentIds: generating.kind === result.kind ? result.excludedStudentIds : undefined,
				},
				generating.kind,
				header,
			);
			setGenerating(null);
			setActionError(null);
			if (saved.id === result.id) await reload();
			else void navigate(`../${saved.id}`, { relative: "path" });
		} catch (error) {
			setGenerateFailed(generateError(error));
		} finally {
			setSubmitting(false);
		}
	};

	if (failed) {
		return (
			<p role="alert" className="text-body-sm text-error">
				{t("common.loadFailed")}
			</p>
		);
	}
	if (!result) {
		return (
			<p role="status" className="text-body-md text-foreground">
				{t("common.loading")}
			</p>
		);
	}

	const pending = result.status === "pending";
	const facultyName = faculties.find((f) => f.id === result.facultyId)?.name[lang] ?? "";
	// the export prints in the order chosen here
	const printPath = (v: ResultVersion) =>
		`/print/results/${result.id}?version=${v}${order ? `&order=${order}` : ""}`;

	return (
		<div>
			<Link
				to=".."
				relative="path"
				className="mb-6 inline-flex items-center gap-2 text-body-sm font-medium text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep"
			>
				{/* §20 — the arrow points back in either reading direction */}
				<ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
				{t("results.back")}
			</Link>

			<h1 className="mb-2 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t(`results.detailTitles.${result.kind}`)}
			</h1>
			<p className="mb-8 flex flex-wrap items-center gap-x-2 ps-4 text-body-sm text-foreground">
				<span>{facultyName}</span>
				<span aria-hidden>·</span>
				<span>{t(`student.levels.${result.academicYear}`)}</span>
				<span aria-hidden>·</span>
				<span>
					{result.acceptanceYear ? (
						<>
							{t("results.acceptanceYearValue")} <span dir="ltr">{result.acceptanceYear}</span>
						</>
					) : (
						t("results.allAcceptanceYears")
					)}
				</span>
				<span aria-hidden>·</span>
				<span>{t(`semesters.${result.semester}`)}</span>
				{result.specializationId && (
					<>
						<span aria-hidden>·</span>
						<span>{specializationName(faculties, result.specializationId, lang)}</span>
					</>
				)}
				<span aria-hidden>·</span>
				<ResultStatusTag status={result.status} />
			</p>

			{pending && result.stale && (
				// §39 — the icon and words carry the warning
				<section
					aria-labelledby="staleTitle"
					className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-sm border-s-3 border-primary bg-accent-soft/30 p-4"
				>
					<div className="flex items-start gap-3">
						<ExclamationTriangleIcon className="mt-0.5 size-6 shrink-0 text-accent-deep" aria-hidden />
						<div>
							<h2 id="staleTitle" className="text-heading-5 text-accent-deep">
								{t("results.staleTitle")}
							</h2>
							<p className="text-body-md text-foreground">{t("results.staleText")}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => void openGenerating(result.kind)}
						className={smallSecondaryButtonClass}
					>
						<ArrowPathIcon className="size-4" aria-hidden />
						{t("results.regenerate")}
					</button>
				</section>
			)}

			{actionError && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t(actionError)}
				</p>
			)}

			<div className="mb-6 flex flex-wrap items-center gap-3">
				<Link to={printPath("board")} target="_blank" rel="noopener" className={secondaryButtonClass}>
					<DocumentArrowDownIcon className="me-2 size-5" aria-hidden />
					{t("results.exportBoard")}
				</Link>
				{!pending && (
					<Link to={printPath("final")} target="_blank" rel="noopener" className={submitButtonClass}>
						<DocumentArrowDownIcon className="me-2 size-5" aria-hidden />
						{t("results.exportFinal")}
					</Link>
				)}
				{pending && (
					<>
						<button
							type="button"
							onClick={() => void openGenerating(result.kind)}
							className={secondaryButtonClass}
						>
							<ArrowPathIcon className="me-2 size-5" aria-hidden />
							{t("results.regenerate")}
						</button>
						<button
							type="button"
							onClick={() => setApproving(true)}
							disabled={submitting}
							className={submitButtonClass}
						>
							<CheckBadgeIcon className="me-2 size-5" aria-hidden />
							{t("results.approve")}
						</button>
						<button type="button" onClick={() => setConfirmDiscard(true)} className={secondaryButtonClass}>
							<TrashIcon className="me-2 size-5" aria-hidden />
							{t("results.discard")}
						</button>
					</>
				)}
				{result.kind === "regular" && !pending && !sibling && (
					<button
						type="button"
						onClick={() => void openGenerating("resit")}
						className={secondaryButtonClass}
					>
						<DocumentPlusIcon className="me-2 size-5" aria-hidden />
						{t("results.generateResit")}
					</button>
				)}
				{sibling && (
					<Link to={`../${sibling.id}`} relative="path" className={secondaryButtonClass}>
						<EyeIcon className="me-2 size-5" aria-hidden />
						{t(`results.openSibling.${sibling.kind}`)}
					</Link>
				)}
			</div>

			{pending && <p className="mb-6 text-body-sm text-primary-hover">{t("results.pendingHint")}</p>}

			<div className="mb-4 flex flex-wrap items-end justify-between gap-4">
				{!pending && (
					// the two printed versions, as a toggle; the chosen one is the preview below
					<div role="group" aria-label={t("results.versionLabel")} className="inline-flex rounded-sm border border-border-accent">
						{(["final", "board"] as const).map((v) => (
							<button
								key={v}
								type="button"
								aria-pressed={version === v}
								onClick={() => setVersion(v)}
								className={`h-11 px-4 text-body-sm font-semibold transition-colors duration-200 ease-out ${
									version === v ? "bg-primary text-foreground" : "text-primary-hover hover:bg-accent-soft/30"
								}`}
							>
								{t(`results.versions.${v}`)}
							</button>
						))}
					</div>
				)}

				<StudentOrderSelect id="resultOrder" value={order} onChange={setOrder} />
			</div>

			<section aria-label={t("results.preview")} className="mb-10 overflow-x-auto rounded-md border border-border-subtle bg-surface p-4 shadow-md">
				<ResultTable sheet={orderSheet(result.sheet, order)} version={pending ? "board" : version} />
			</section>

			{result.kind === "regular" && !pending && (
				<section aria-labelledby="resitTitle">
					<h2 id="resitTitle" className="mb-2 text-heading-4 text-accent-deep">
						{t("results.resitTitle")}
					</h2>
					<p className="mb-6 text-body-md text-foreground">
						{sibling?.status === "approved" ? t("results.resitLockedText") : t("results.resitText")}
					</p>
					<ResitEntry
						candidates={candidates}
						locked={sibling?.status === "approved"}
						onChange={(next) =>
							setCandidates((prev) => prev.map((c) => (c.gradeId === next.gradeId ? next : c)))
						}
					/>
				</section>
			)}

			{approving && (
				<ApproveResultDialog
					open
					result={result}
					onApproved={() => void approved()}
					onCancel={() => setApproving(false)}
				/>
			)}

			<ConfirmDialog
				open={confirmDiscard}
				title={t("results.discardTitle")}
				message={t("results.discardMessage")}
				confirmLabel={t("results.discard")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void discard()}
				onCancel={() => setConfirmDiscard(false)}
			/>

			{generating && (
				<GenerateResultDialog
					open
					title={
						generating.kind === "resit" && result.kind === "regular"
							? t("results.generateResit")
							: t("results.regenerate")
					}
					initial={generating.header}
					suggestions={generating.suggestions}
					semester={result.semester}
					submitting={submitting}
					error={generateFailed}
					onSubmit={(header) => void generate(header)}
					onCancel={() => setGenerating(null)}
				/>
			)}
		</div>
	);
};

export default ResultDetails;
