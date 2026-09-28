import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import FormField from "./formField";
import { inputClass, secondaryButtonClass, submitButtonClass } from "../styles/form";
import type { Faculty } from "../types/faculty";
import { conflictCode } from "../utils/apiError";
import { orphanedGradeCount } from "../utils/orphanedGrades";
import { specializationName } from "../utils/specializations";

/** One student or curriculum whose specialization is being set. */
export type SpecializationTarget = {
	id: string;
	name: string;
	// what it holds now
	specializationId: string | null;
};

type Step = "choose" | "review" | "orphans";

type SetSpecializationDialogProps = {
	open: boolean;
	title: string;
	faculties: Faculty[];
	/** The faculty whose specializations are offered; every target belongs to it. */
	facultyId: string;
	targets: SpecializationTarget[];
	/** Offers "no specialization" (students only). */
	allowNone: boolean;
	/** Writes it; `confirmOrphans` is set once the user accepted that grades stop counting. */
	onSave: (specializationId: string | null, confirmOrphans: boolean) => Promise<void>;
	onClose: () => void;
};

/**
 * Sets a specialization in three steps: pick it, review exactly who changes
 * (from what, to what), then, if grades would stop counting, confirm that too.
 */
const SetSpecializationDialog = ({
	open,
	title,
	faculties,
	facultyId,
	targets,
	allowNone,
	onSave,
	onClose,
}: SetSpecializationDialogProps) => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const ref = useRef<HTMLDialogElement>(null);
	const [value, setValue] = useState("");
	const [step, setStep] = useState<Step>("choose");
	const [orphans, setOrphans] = useState(0);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [wasOpen, setWasOpen] = useState(open);

	// each opening starts over, from the single target's current value if there is one
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setValue(targets.length === 1 ? (targets[0].specializationId ?? "") : "");
			setStep("choose");
			setError(null);
		}
	}

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const specs = faculties.find((f) => f.id === facultyId)?.specializations ?? [];
	const chosen = value || null;
	const changing = targets.filter((target) => target.specializationId !== chosen);
	const nameOf = (id: string | null) =>
		id ? specializationName(faculties, id, lang) : t("specialization.none");

	const save = async (confirmOrphans: boolean) => {
		setSaving(true);
		setError(null);
		try {
			await onSave(chosen, confirmOrphans);
			onClose();
		} catch (err) {
			const count = orphanedGradeCount(err);
			if (count !== null) {
				setOrphans(count);
				setStep("orphans");
			} else {
				setError(
					conflictCode(err) === "RESULTS_APPROVED" ? "specialization.errors.locked" : "common.saveFailed",
				);
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<dialog
			ref={ref}
			onClose={onClose}
			onClick={(e) => e.target === e.currentTarget && onClose()}
			aria-labelledby="setSpecializationTitle"
			className="m-auto w-full max-w-lg rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60"
		>
			<div className="flex flex-col gap-6 p-6">
				<h2 id="setSpecializationTitle" className="text-heading-5 text-accent-deep">
					{title}
				</h2>

				{step === "choose" && (
					<FormField id="setSpecializationValue" label={t("specialization.label")}>
						<select
							id="setSpecializationValue"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							className={inputClass(false)}
						>
							<option value="" disabled={!allowNone}>
								{allowNone ? t("specialization.none") : t("specialization.choose")}
							</option>
							{specs.map((spec) => (
								<option key={spec.id} value={spec.id}>
									{spec.name[lang]}
								</option>
							))}
						</select>
					</FormField>
				)}

				{step === "review" && (
					<section aria-labelledby="reviewTitle" className="flex flex-col gap-3">
						<h3 id="reviewTitle" className="text-body-md font-semibold text-accent-deep">
							{t("specialization.reviewTitle", { count: changing.length })}
						</h3>
						{/* §39 — each change is spelled out, not just counted */}
						<ul className="flex max-h-72 flex-col divide-y divide-border-subtle overflow-y-auto rounded-sm border border-border-subtle">
							{changing.map((target) => (
								<li key={target.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-body-sm">
									<span className="font-semibold">{target.name}</span>
									<span className="inline-flex items-center gap-2">
										<span className="text-primary-hover">{nameOf(target.specializationId)}</span>
										<ArrowLeftIcon className="size-4 ltr:rotate-180" aria-label={t("specialization.becomes")} />
										<span className="font-semibold text-accent-deep">{nameOf(chosen)}</span>
									</span>
								</li>
							))}
						</ul>
						{changing.length < targets.length && (
							<p className="text-body-sm text-primary-hover">
								{t("specialization.unchanged", { count: targets.length - changing.length })}
							</p>
						)}
					</section>
				)}

				{step === "orphans" && (
					<p className="text-body-md">{t("specialization.orphansMessage", { count: orphans })}</p>
				)}

				{error && (
					<p role="alert" className="text-body-sm text-error">
						{t(error)}
					</p>
				)}

				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={step === "choose" ? onClose : () => setStep("choose")}
						className={secondaryButtonClass}
					>
						{step === "choose" ? t("common.cancel") : t("specialization.back")}
					</button>
					{step === "choose" && (
						<button
							type="button"
							disabled={!changing.length || (!allowNone && !chosen)}
							onClick={() => setStep("review")}
							className={submitButtonClass}
						>
							{t("specialization.reviewAction")}
						</button>
					)}
					{step === "review" && (
						<button type="button" disabled={saving} onClick={() => void save(false)} className={submitButtonClass}>
							{saving ? t("common.saving") : t("specialization.save")}
						</button>
					)}
					{step === "orphans" && (
						<button type="button" disabled={saving} onClick={() => void save(true)} className={submitButtonClass}>
							{saving ? t("common.saving") : t("orphanedGrades.confirm")}
						</button>
					)}
				</div>
			</div>
		</dialog>
	);
};

export default SetSpecializationDialog;
