import { useCallback, useEffect, useRef, useState } from "react";
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
import ResultHeaderForm, { ResultSignaturesForm } from "../../../components/results/resultHeaderForm";
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
import { editableHeader, headerDefaults, withoutDates, type HeaderSuggestions } from "../../../utils/resultHeader";
import { departmentName, placementName } from "../../../utils/specializations";
import { generateError } from "../../../utils/resultErrors";
import { orderSheet, type StudentOrder } from "../../../utils/studentOrder";

const NO_SUGGESTIONS: HeaderSuggestions = {
	degree: [],
	program: [],
	batch: [],
	academicYearLabel: [],
	examinationOfficer: [],
	collegeRegistrar: [],
	dean: [],
};

// header fields in a fixed order, so an edit is told apart from jsonb's key order
const sameHeader = (a: ResultHeader, b: ResultHeader) =>
	(Object.keys({ ...a, ...b }) as (keyof ResultHeader)[]).every((k) => (a[k] ?? "") === (b[k] ?? ""));

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
	// a pending result's header as edited above its sheet; regenerating saves it
	const [header, setHeader] = useState<ResultHeader | null>(null);
	// the Sup & Sub results' header, while it is being filled in
	const [resitHeader, setResitHeader] = useState<ResultHeader | null>(null);
	const [suggestions, setSuggestions] = useState<HeaderSuggestions>(NO_SUGGESTIONS);
	const [submitting, setSubmitting] = useState<ResultKind | null>(null);
	// i18n keys: why the last generation failed, and why the last action failed
	const [generateFailed, setGenerateFailed] = useState<string | null>(null);
	const resitSection = useRef<HTMLElement>(null);
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
				r.specializationId === row.specializationId &&
				r.departmentId === row.departmentId,
		);
		return { row, sibling: other ?? null, resits };
	}, [resultId]);

	useEffect(() => {
		let cancelled = false;
		load()
			.then(({ row, sibling: other, resits }) => {
				if (cancelled) return;
				setResult(row);
				setHeader(editableHeader(row.header));
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
		setHeader(editableHeader(row.header));
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

	// the faculty's earlier results, offered in each header line's list
	const facultyId = result?.facultyId;
	const facultyNameEn = faculties.find((f) => f.id === facultyId)?.name.en ?? "";
	const level = result?.academicYear;
	const programNameEn = result ? (result.sheet.specialization ?? result.sheet.department) : undefined;
	useEffect(() => {
		if (!facultyId || !level) return;
		let cancelled = false;
		fetchResults({ facultyId })
			.catch(() => [] as ResultSummary[])
			.then((previous) => {
				if (cancelled) return;
				setSuggestions(
					headerDefaults({ previous, facultyNameEn, level, specializationNameEn: programNameEn })
						.suggestions,
				);
			});
		return () => {
			cancelled = true;
		};
	}, [facultyId, facultyNameEn, level, programNameEn]);

	/** Opens the Sup & Sub header in place, starting from the semester results' own. */
	const openResit = () => {
		if (!result) return;
		setGenerateFailed(null);
		// the re-exams sit and go to the board on dates of their own
		setResitHeader(withoutDates(editableHeader(result.header)));
		// once it's shown, take the reader to it
		requestAnimationFrame(() => {
			resitSection.current?.scrollIntoView({ behavior: "smooth", block: "start" });
			resitSection.current?.focus({ preventScroll: true });
		});
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

	const generate = async (kind: ResultKind, typed: ResultHeader | null) => {
		if (!result || !typed) return;
		setSubmitting(kind);
		setGenerateFailed(null);
		try {
			const saved = await generateResult(
				{
					facultyId: result.facultyId,
					academicYear: result.academicYear,
					acceptanceYear: result.acceptanceYear ?? undefined,
					specializationId: result.specializationId ?? undefined,
					departmentId: result.departmentId ?? undefined,
					semester: result.semester,
					// a regeneration leaves off who it did; Sup & Sub follows the semester's result
					excludedStudentIds: kind === result.kind ? result.excludedStudentIds : undefined,
				},
				kind,
				typed,
			);
			setResitHeader(null);
			setActionError(null);
			if (saved.id === result.id) await reload();
			else void navigate(`../${saved.id}`, { relative: "path" });
		} catch (error) {
			setGenerateFailed(generateError(error));
		} finally {
			setSubmitting(null);
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
	// an edited header is only saved by regenerating; until then the exports print the saved one
	const headerEdited = pending && header !== null && !sameHeader(header, editableHeader(result.header));
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
						<span>{placementName(faculties, null, result.specializationId, lang)}</span>
					</>
				)}
				{result.departmentId && (
					<>
						<span aria-hidden>·</span>
						<span>{t("department.resultFor", { name: departmentName(faculties, result.departmentId, lang) })}</span>
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
						disabled={submitting !== null}
						onClick={() => void generate(result.kind, header)}
						className={smallSecondaryButtonClass}
					>
						<ArrowPathIcon className="size-4" aria-hidden />
						{submitting === result.kind ? t("results.generating") : t("results.regenerate")}
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
							disabled={submitting !== null}
							onClick={() => void generate(result.kind, header)}
							className={secondaryButtonClass}
						>
							<ArrowPathIcon className="me-2 size-5" aria-hidden />
							{submitting === result.kind ? t("results.generating") : t("results.regenerate")}
						</button>
						<button
							type="button"
							onClick={() => setApproving(true)}
							disabled={submitting !== null}
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
				{result.kind === "regular" && !pending && !sibling && !resitHeader && (
					<button type="button" onClick={openResit} className={secondaryButtonClass}>
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

			{generateFailed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t(generateFailed)}
				</p>
			)}

			{resitHeader && (
				// the Sup & Sub results' header, filled in here before they're generated
				<section
					ref={resitSection}
					tabIndex={-1}
					aria-labelledby="resitHeaderTitle"
					className="mb-10 scroll-mt-4 rounded-md border border-border-subtle bg-surface p-6 shadow-md outline-none"
				>
					<h2 id="resitHeaderTitle" className="mb-2 text-heading-4 text-accent-deep">
						{t("results.generateResit")}
					</h2>
					<p className="mb-6 text-body-sm text-primary-hover">{t("results.headerHint")}</p>
					<ResultHeaderForm
						idPrefix="resitHeader"
						header={resitHeader}
						onChange={setResitHeader}
						suggestions={suggestions}
						sheet={{ ...result.sheet, kind: "resit" }}
						disabled={submitting !== null}
					/>
					<div className="mt-6">
						<ResultSignaturesForm
							idPrefix="resitHeader"
							header={resitHeader}
							onChange={setResitHeader}
							suggestions={suggestions}
							disabled={submitting !== null}
						/>
					</div>
					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<button
							type="button"
							onClick={() => {
								setResitHeader(null);
								setGenerateFailed(null);
							}}
							className={secondaryButtonClass}
						>
							{t("common.cancel")}
						</button>
						<button
							type="button"
							disabled={submitting !== null}
							onClick={() => void generate("resit", resitHeader)}
							className={submitButtonClass}
						>
							<DocumentPlusIcon className="me-2 size-5" aria-hidden />
							{submitting === "resit" ? t("results.generating") : t("results.generate")}
						</button>
					</div>
				</section>
			)}

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

			{pending && header && (
				<div className="mb-3 flex flex-col gap-1 text-body-sm">
					<p className="text-primary-hover">{t("results.headerHint")}</p>
					{/* §39 — said in words, not by colour alone */}
					{headerEdited && (
						<p role="status" className="font-medium text-accent-deep">
							{t("results.headerEdited")}
						</p>
					)}
				</div>
			)}

			<section aria-label={t("results.preview")} className="mb-10 overflow-x-auto rounded-md border border-border-subtle bg-surface p-4 shadow-md">
				{/* a pending result's header is edited where it prints, above its sheet */}
				{pending && header && (
					<div className="mb-4">
						<ResultHeaderForm
							idPrefix="resultHeader"
							header={header}
							onChange={setHeader}
							suggestions={suggestions}
							sheet={result.sheet}
							disabled={submitting !== null}
						/>
					</div>
				)}
				<ResultTable sheet={orderSheet(result.sheet, order)} version={pending ? "board" : version} />
				{pending && header && (
					<div className="mt-4">
						<ResultSignaturesForm
							idPrefix="resultHeader"
							header={header}
							onChange={setHeader}
							suggestions={suggestions}
							disabled={submitting !== null}
						/>
					</div>
				)}
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

		</div>
	);
};

export default ResultDetails;
