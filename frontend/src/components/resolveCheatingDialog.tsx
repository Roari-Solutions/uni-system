import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { secondaryButtonClass, submitButtonClass } from "../styles/form";
import type { CheatingDecision } from "../api/grades";
import { SUSPENSION_YEARS, type SuspensionYears } from "../types/student";

/** What staff decided about a cheating case. */
export type CheatingResolution = CheatingDecision;

type ResolveCheatingDialogProps = {
	open: boolean;
	// what the row shows now, so the choices can name the mark
	curriculumName: string;
	grade: number | null;
	saving?: boolean;
	onResolve: (resolution: CheatingResolution) => void;
	onCancel: () => void;
};

/**
 * Asks how a cheating case ends and which penalties, if any, the student
 * receives. Until it is answered the mark stays out of the student's year result.
 */
const ResolveCheatingDialog = ({
	open,
	curriculumName,
	grade,
	saving,
	onResolve,
	onCancel,
}: ResolveCheatingDialogProps) => {
	const { t } = useTranslation();
	const ref = useRef<HTMLDialogElement>(null);
	const [outcome, setOutcome] = useState<CheatingResolution["outcome"]>("accept");
	const [warning, setWarning] = useState(false);
	const [suspend, setSuspend] = useState(false);
	const [suspensionYears, setSuspensionYears] = useState<SuspensionYears>(1);
	const [dismiss, setDismiss] = useState(false);
	const [wasOpen, setWasOpen] = useState(open);

	// each case is decided on its own; nothing carries over from the last one
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setOutcome("accept");
			setWarning(false);
			setSuspend(false);
			setSuspensionYears(1);
			setDismiss(false);
		}
	}

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;

		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const choiceClass =
		"flex cursor-pointer items-start gap-3 rounded-sm border border-border p-4 text-body-md transition-colors duration-150 ease-out hover:border-border-accent";
	const checkClass = "flex cursor-pointer items-start gap-3 text-body-md";

	const resolve = () =>
		onResolve({
			outcome,
			warning,
			suspensionYears: suspend ? suspensionYears : undefined,
			dismiss,
		});

	return (
		<dialog
			ref={ref}
			onClose={onCancel}
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			aria-labelledby="resolveCheatingTitle"
			className="m-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60"
		>
			<div className="flex flex-col gap-6 p-6">
				<div>
					<h2 id="resolveCheatingTitle" className="mb-2 text-heading-5 text-accent-deep">
						{t("resolveCheating.title")}
					</h2>
					<p className="text-body-sm text-primary-hover">{curriculumName}</p>
				</div>

				<fieldset className="flex flex-col gap-3">
					<legend className="mb-3 text-body-sm font-medium text-accent-deep">
						{t("resolveCheating.legend")}
					</legend>

					<label className={choiceClass}>
						<input
							type="radio"
							name="cheatingOutcome"
							value="accept"
							checked={outcome === "accept"}
							onChange={() => setOutcome("accept")}
							className="mt-1 accent-primary"
						/>
						<span>{t("resolveCheating.accept", { grade: grade ?? 0 })}</span>
					</label>

					<label className={choiceClass}>
						<input
							type="radio"
							name="cheatingOutcome"
							value="zero"
							checked={outcome === "zero"}
							onChange={() => setOutcome("zero")}
							className="mt-1 accent-primary"
						/>
						<span>{t("resolveCheating.zero")}</span>
					</label>
				</fieldset>

				<fieldset className="flex flex-col gap-3">
					<legend className="mb-3 text-body-sm font-medium text-accent-deep">
						{t("resolveCheating.penaltiesLegend")}
					</legend>

					<label className={checkClass}>
						<input
							type="checkbox"
							checked={warning}
							onChange={(e) => setWarning(e.target.checked)}
							className="mt-1 accent-primary"
						/>
						<span>{t("resolveCheating.warnStudent")}</span>
					</label>

					<label className={checkClass}>
						<input
							type="checkbox"
							checked={suspend}
							onChange={(e) => {
								setSuspend(e.target.checked);
								// a dismissal already ends the student's time; the two never stack
								if (e.target.checked) setDismiss(false);
							}}
							className="mt-1 accent-primary"
						/>
						<span>{t("resolveCheating.suspendStudent")}</span>
					</label>

					{suspend && (
						<fieldset className="ms-7 flex flex-wrap gap-x-6 gap-y-2">
							<legend className="sr-only">{t("resolveCheating.suspensionLength")}</legend>
							{SUSPENSION_YEARS.map((years) => (
								<label key={years} className="flex cursor-pointer items-center gap-2 text-body-md">
									<input
										type="radio"
										name="suspensionYears"
										value={years}
										checked={suspensionYears === years}
										onChange={() => setSuspensionYears(years)}
										className="accent-primary"
									/>
									{t(`resolveCheating.suspensionYears.${years}`)}
								</label>
							))}
						</fieldset>
					)}

					<label className={checkClass}>
						<input
							type="checkbox"
							checked={dismiss}
							onChange={(e) => {
								setDismiss(e.target.checked);
								if (e.target.checked) setSuspend(false);
							}}
							className="mt-1 accent-primary"
						/>
						<span>{t("resolveCheating.dismissStudent")}</span>
					</label>

					{(suspend || dismiss) && (
						<p className="text-body-sm text-primary-hover">{t("resolveCheating.freezeNote")}</p>
					)}
				</fieldset>

				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						disabled={saving}
						className={secondaryButtonClass}
					>
						{t("common.cancel")}
					</button>
					<button
						type="button"
						onClick={resolve}
						disabled={saving}
						className={submitButtonClass}
					>
						{saving ? t("common.saving") : t("resolveCheating.confirm")}
					</button>
				</div>
			</div>
		</dialog>
	);
};

export default ResolveCheatingDialog;
