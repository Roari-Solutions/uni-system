import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { secondaryButtonClass, submitButtonClass } from "../styles/form";

/** What staff decided about a cheating case. */
export type CheatingResolution = {
	// "accept" keeps the mark and moves the row to attended; "zero" keeps the
	// cheating on record and scores the curriculum 0
	outcome: "accept" | "zero";
	// §UI-only for now: the student warning is a later task
	warnStudent: boolean;
};

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
 * Asks how a cheating case ends. Until it is answered the mark stays out of the
 * student's year result.
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
	const [warnStudent, setWarnStudent] = useState(false);
	const [wasOpen, setWasOpen] = useState(open);

	// each case is decided on its own; nothing carries over from the last one
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setOutcome("accept");
			setWarnStudent(false);
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

	return (
		<dialog
			ref={ref}
			onClose={onCancel}
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			aria-labelledby="resolveCheatingTitle"
			className="m-auto w-full max-w-md rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60"
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

				<label className="flex items-center gap-3 text-body-md">
					<input
						type="checkbox"
						checked={warnStudent}
						onChange={(e) => setWarnStudent(e.target.checked)}
						className="accent-primary"
					/>
					{t("resolveCheating.warnStudent")}
				</label>

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
						onClick={() => onResolve({ outcome, warnStudent })}
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
