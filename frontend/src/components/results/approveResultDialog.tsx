import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon } from "@heroicons/react/24/outline";
import ResolveCheatingDialog, { type CheatingResolution } from "../resolveCheatingDialog";
import SeatingStatusSelect from "../seatingStatusSelect";
import { createGrade, resolveCheating, updateGrade } from "../../api/grades";
import { approveResult, generateResult, previewResult } from "../../api/results";
import type { SeatingStatus } from "../../types/grade";
import type { CellGrade, Result, ResultCourse, ResultStudent } from "../../types/result";
import {
	secondaryButtonClass,
	smallPrimaryButtonClass,
	smallSecondaryButtonClass,
	submitButtonClass,
} from "../../styles/form";
import { conflictCode } from "../../utils/apiError";
import { gradeSchema, markToSend, takesNoMark, voidsMark } from "../../utils/gradeInput";

// a grade still waiting on someone: an undecided cheating case, or no mark at all
type OpenItem = {
	key: string;
	student: ResultStudent;
	course: ResultCourse;
	kind: "cheating" | "missing";
	grade: CellGrade | null;
};

type Draft = { mark: string; status: SeatingStatus; error?: string };

type ApproveResultDialogProps = {
	open: boolean;
	result: Result;
	onApproved: () => void;
	onCancel: () => void;
};

/**
 * Confirms the approval, and first offers to settle what the sheet still has
 * open: each undecided cheating case (with the resolve dialog) and each
 * missing mark (with a mark and seating status). Anything settled here, or
 * grades that moved since generation, regenerate the sheet before it is
 * approved, so the locked sheet matches the grades.
 */
const ApproveResultDialog = ({ open, result, onApproved, onCancel }: ApproveResultDialogProps) => {
	const { t } = useTranslation();
	const ref = useRef<HTMLDialogElement>(null);
	const [items, setItems] = useState<OpenItem[]>([]);
	// which reload the items on show came from; they are loading until it matches
	const [loadedKey, setLoadedKey] = useState<number | null>(null);
	const [drafts, setDrafts] = useState<Record<string, Draft>>({});
	const [resolving, setResolving] = useState<OpenItem | null>(null);
	const [saving, setSaving] = useState(false);
	const [changed, setChanged] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);
	// only the semester's own exams leave cases and marks open
	const checksOpenItems = result.kind === "regular";
	const loading = open && checksOpenItems && loadedKey !== reloadKey;

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const batch = {
		facultyId: result.facultyId,
		academicYear: result.academicYear,
		acceptanceYear: result.acceptanceYear ?? undefined,
		semester: result.semester,
		excludedStudentIds: result.excludedStudentIds,
	};

	useEffect(() => {
		if (!open || !checksOpenItems) return;
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		previewResult(
			{
				facultyId: result.facultyId,
				academicYear: result.academicYear,
				acceptanceYear: result.acceptanceYear ?? undefined,
				semester: result.semester,
				excludedStudentIds: result.excludedStudentIds,
			},
			"regular",
		)
			.then((preview) => {
				if (cancelled) return;
				const found: OpenItem[] = [];
				for (const student of preview.sheet.students) {
					// a suspended or dismissed student's grades are frozen: nothing to settle
					if (student.standing !== "active") continue;
					student.cells.forEach((cell, i) => {
						const course = preview.sheet.courses[i];
						if (!course) return;
						const kind =
							cell.state === "cheatingPending" ? "cheating" : cell.state === "incomplete" ? "missing" : null;
						if (!kind) return;
						const key = `${student.id}:${course.curriculumId}`;
						found.push({ key, student, course, kind, grade: preview.grades[key] ?? null });
					});
				}
				setItems(found);
			})
			.catch(() => {
				if (!cancelled) setError("common.loadFailed");
			})
			.finally(() => {
				if (!cancelled) setLoadedKey(reloadKey);
			});
		return () => {
			cancelled = true;
		};
	}, [open, checksOpenItems, result, reloadKey]);

	const draftOf = (item: OpenItem): Draft => drafts[item.key] ?? { mark: "", status: "attended" };
	const setDraft = (item: OpenItem, next: Partial<Draft>) =>
		setDrafts((prev) => ({ ...prev, [item.key]: { ...draftOf(item), ...next } }));

	const settled = () => {
		setChanged(true);
		setReloadKey((k) => k + 1);
	};

	/** Records the missing mark on the student's grade itself. */
	const saveMark = async (item: OpenItem) => {
		const draft = draftOf(item);
		let grade: number | undefined;
		if (!takesNoMark(draft.status)) {
			const parsed = gradeSchema.safeParse(voidsMark(draft.status) ? "0" : draft.mark);
			if (!parsed.success) {
				setDraft(item, { error: parsed.error.issues[0]?.message });
				return;
			}
			grade = markToSend(draft.status, parsed.data);
		}
		setSaving(true);
		try {
			if (item.grade) {
				await updateGrade(item.grade.gradeId, { grade, seatingStatus: draft.status });
			} else {
				await createGrade({
					studentId: item.student.id,
					curriculumId: item.course.curriculumId,
					grade,
					seatingStatus: draft.status,
				});
			}
			setDrafts((prev) => {
				const next = { ...prev };
				delete next[item.key];
				return next;
			});
			settled();
		} catch {
			setDraft(item, { error: "common.saveFailed" });
		} finally {
			setSaving(false);
		}
	};

	const resolve = async (resolution: CheatingResolution) => {
		const item = resolving;
		if (!item?.grade) return;
		setSaving(true);
		try {
			await resolveCheating(item.grade.gradeId, resolution);
			setResolving(null);
			settled();
		} catch {
			setError("common.saveFailed");
			setResolving(null);
		} finally {
			setSaving(false);
		}
	};

	const approve = async () => {
		setSaving(true);
		setError(null);
		try {
			// what was settled here (or changed since) goes into the sheet before it locks
			if (changed || result.stale) await generateResult(batch, result.kind, result.header);
			await approveResult(result.id);
			onApproved();
		} catch (err) {
			setError(conflictCode(err) === "RESULT_STALE" ? "results.errors.stale" : "common.saveFailed");
		} finally {
			setSaving(false);
		}
	};

	const label = (item: OpenItem) => `${item.student.name} · ${item.course.code ?? item.course.sNo}`;

	return (
		<dialog
			ref={ref}
			onClose={onCancel}
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			aria-labelledby="approveResultTitle"
			className="m-auto w-full max-w-2xl rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60"
		>
			<div className="flex flex-col gap-6 p-6">
				<h2 id="approveResultTitle" className="text-heading-5 text-accent-deep">
					{t("results.approveTitle")}
				</h2>
				<p className="text-body-md">{t("results.approveMessage")}</p>

				{loading && <p className="text-body-sm text-foreground">{t("common.loading")}</p>}

				{items.length > 0 && (
					<section aria-labelledby="openItemsTitle" className="flex flex-col gap-3">
						<h3 id="openItemsTitle" className="text-body-md font-semibold text-accent-deep">
							{t("results.openItemsTitle", { count: items.length })}
						</h3>
						<p className="text-body-sm text-primary-hover">{t("results.openItemsHint")}</p>
						<ul className="flex max-h-80 flex-col divide-y divide-border-subtle overflow-y-auto rounded-sm border border-border-subtle">
							{items.map((item) => {
								const draft = draftOf(item);
								const errorId = `open-${item.key}-error`;
								return (
									<li key={item.key} className="flex flex-wrap items-center gap-3 p-3">
										<div className="min-w-48 flex-1">
											<p dir="ltr" className="text-start text-body-sm font-semibold">
												{label(item)}
											</p>
											<p className="text-body-sm text-primary-hover">
												{t(`results.openItemKinds.${item.kind}`)}
											</p>
										</div>
										{item.kind === "cheating" ? (
											<button
												type="button"
												onClick={() => setResolving(item)}
												disabled={saving}
												aria-label={t("resolveCheating.actionFor", { name: label(item) })}
												className={smallSecondaryButtonClass}
											>
												{t("resolveCheating.action")}
											</button>
										) : (
											<div className="flex flex-wrap items-start gap-2">
												<div className="flex flex-col gap-1">
													<input
														type="number"
														min={0}
														max={100}
														step="any"
														dir="ltr"
														value={voidsMark(draft.status) ? "0" : takesNoMark(draft.status) ? "" : draft.mark}
														disabled={saving || voidsMark(draft.status) || takesNoMark(draft.status)}
														onChange={(e) => setDraft(item, { mark: e.target.value, error: undefined })}
														aria-label={t("gradeSheet.gradeFor", { name: label(item) })}
														aria-invalid={!!draft.error}
														aria-describedby={draft.error ? errorId : undefined}
														className={`h-9 w-24 rounded-sm border bg-surface px-3 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background ${
															draft.error ? "border-error" : "border-border"
														}`}
													/>
													{draft.error && (
														<p id={errorId} role="alert" className="text-body-sm text-error">
															{t(draft.error)}
														</p>
													)}
												</div>
												<SeatingStatusSelect
													id={`open-${item.key}-status`}
													value={draft.status}
													disabled={saving}
													label={t("gradeSheet.seatingStatusFor", { name: label(item) })}
													onChange={(status) => setDraft(item, { status, error: undefined })}
												/>
												<button
													type="button"
													onClick={() => void saveMark(item)}
													disabled={saving}
													aria-label={t("gradeSheet.saveFor", { name: label(item) })}
													className={smallPrimaryButtonClass}
												>
													<CheckIcon className="size-4" aria-hidden />
													{t("gradeSheet.save")}
												</button>
											</div>
										)}
									</li>
								);
							})}
						</ul>
					</section>
				)}

				{(changed || result.stale) && (
					<p className="text-body-sm text-primary-hover">{t("results.regenerateBeforeApprove")}</p>
				)}
				{error && (
					<p role="alert" className="text-body-sm text-error">
						{t(error)}
					</p>
				)}

				<div className="flex justify-end gap-3">
					<button type="button" onClick={onCancel} className={secondaryButtonClass}>
						{t("common.cancel")}
					</button>
					<button type="button" onClick={() => void approve()} disabled={saving || loading} className={submitButtonClass}>
						{saving ? t("common.saving") : t("results.approve")}
					</button>
				</div>
			</div>

			<ResolveCheatingDialog
				open={resolving !== null}
				curriculumName={resolving ? label(resolving) : ""}
				grade={resolving?.grade?.grade ?? null}
				saving={saving}
				onResolve={(resolution) => void resolve(resolution)}
				onCancel={() => setResolving(null)}
			/>
		</dialog>
	);
};

export default ApproveResultDialog;
