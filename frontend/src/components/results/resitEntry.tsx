import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../dataTable";
import ResitNote from "../resitNote";
import { clearResit, enterResit } from "../../api/grades";
import type { ResitCandidate } from "../../types/result";
import { smallPrimaryButtonClass, smallSecondaryButtonClass } from "../../styles/form";
import { gradeSchema } from "../../utils/gradeInput";
import { conflictCode } from "../../utils/apiError";
import { cellText } from "../../utils/resultText";

type ResitEntryProps = {
	candidates: ResitCandidate[];
	/** The Sup & Sub results are approved, so the marks only show. */
	locked: boolean;
	onChange: (next: ResitCandidate) => void;
};

/** Why a re-exam write failed, as an i18n key. */
const resitError = (error: unknown) =>
	conflictCode(error) === "RESULTS_APPROVED" ? "results.resitLocked" : "common.saveFailed";

/**
 * The batch's Sup & Sub re-exam marks: every F (supplementary, counted as at
 * most a C) and every substitute (counted as it is). Each row saves on its own.
 */
const ResitEntry = ({ candidates, locked, onChange }: ResitEntryProps) => {
	const { t } = useTranslation();
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	// i18n keys, per grade row
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState<string | null>(null);

	const draftOf = (c: ResitCandidate) => drafts[c.gradeId] ?? (c.resit ? String(c.resit.grade) : "");
	const setError = (id: string, key: string | null) =>
		setErrors((prev) => {
			const next = { ...prev };
			if (key) next[id] = key;
			else delete next[id];
			return next;
		});

	const save = async (c: ResitCandidate) => {
		const parsed = gradeSchema.safeParse(draftOf(c));
		if (!parsed.success) {
			setError(c.gradeId, parsed.error.issues[0]?.message ?? "gradeSheet.errors.required");
			return;
		}
		setSaving(c.gradeId);
		try {
			const stored = await enterResit(c.gradeId, parsed.data);
			onChange({ ...c, resit: stored.resit });
			setError(c.gradeId, null);
		} catch (error) {
			setError(c.gradeId, resitError(error));
		} finally {
			setSaving(null);
		}
	};

	const clear = async (c: ResitCandidate) => {
		setSaving(c.gradeId);
		try {
			await clearResit(c.gradeId);
			onChange({ ...c, resit: null });
			setDrafts((prev) => ({ ...prev, [c.gradeId]: "" }));
			setError(c.gradeId, null);
		} catch (error) {
			setError(c.gradeId, resitError(error));
		} finally {
			setSaving(null);
		}
	};

	const columns: Column<ResitCandidate>[] = [
		{ key: "uniNumber", header: t("results.resitColumns.uniNumber"), render: (c) => c.uniNumber },
		{ key: "name", header: t("results.resitColumns.name"), render: (c) => <span dir="ltr">{c.name}</span> },
		{
			key: "course",
			header: t("results.resitColumns.course"),
			render: (c) => (
				<span dir="ltr">
					{c.sNo} · {c.code}
				</span>
			),
		},
		{
			key: "original",
			header: t("results.resitColumns.original"),
			// as the approved board results printed it
			render: (c) => (
				<span dir="ltr" className="font-semibold">
					{cellText({ ...c, resit: null }, "board", "regular").text}
				</span>
			),
		},
		{ key: "kind", header: t("results.resitColumns.kind"), render: (c) => t(`resit.kinds.${c.kind}`) },
		{
			key: "resit",
			header: t("results.resitColumns.resit"),
			render: (c) => {
				if (locked) return c.resit ? <ResitNote resit={c.resit} /> : "—";
				const error = errors[c.gradeId];
				const errorId = `resit-${c.gradeId}-error`;
				return (
					<div className="flex flex-col items-start gap-1">
						<input
							type="number"
							min={0}
							max={100}
							step="any"
							dir="ltr"
							value={draftOf(c)}
							disabled={saving === c.gradeId}
							onChange={(e) => setDrafts((prev) => ({ ...prev, [c.gradeId]: e.target.value }))}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									void save(c);
								}
							}}
							aria-label={t("results.resitFor", { name: c.name, course: c.code ?? c.sNo })}
							aria-invalid={!!error}
							aria-describedby={error ? errorId : undefined}
							className={`h-9 w-28 rounded-sm border bg-surface px-3 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background ${
								error ? "border-error" : "border-border"
							}`}
						/>
						<ResitNote resit={c.resit} />
						{error && (
							<p id={errorId} role="alert" className="text-body-sm text-error">
								{t(error)}
							</p>
						)}
					</div>
				);
			},
		},
		...(locked
			? []
			: [
					{
						key: "actions",
						header: t("common.actions"),
						render: (c: ResitCandidate) => (
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => void save(c)}
									disabled={saving === c.gradeId}
									aria-label={t("results.saveResitFor", { name: c.name, course: c.code ?? c.sNo })}
									className={`whitespace-nowrap ${smallPrimaryButtonClass}`}
								>
									<CheckIcon className="size-4" aria-hidden />
									{t("gradeSheet.save")}
								</button>
								{c.resit && (
									<button
										type="button"
										onClick={() => void clear(c)}
										disabled={saving === c.gradeId}
										aria-label={t("results.clearResitFor", { name: c.name, course: c.code ?? c.sNo })}
										className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
									>
										<XMarkIcon className="size-4" aria-hidden />
										{t("results.clearResit")}
									</button>
								)}
							</div>
						),
					},
				]),
	];

	return (
		<DataTable
			columns={columns}
			rows={candidates}
			getRowId={(c) => c.gradeId}
			emptyText={t("results.noResitCandidates")}
		/>
	);
};

export default ResitEntry;
