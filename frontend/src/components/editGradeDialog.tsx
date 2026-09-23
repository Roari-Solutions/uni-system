import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SeatingStatusSelect from "./seatingStatusSelect";
import FormField from "./formField";
import { inputClass, secondaryButtonClass, submitButtonClass } from "../styles/form";
import type { SeatingStatus } from "../types/grade";

/** The edited values, as the caller sends them on. */
export type GradeEdit = {
	grade: number;
	seatingStatus: SeatingStatus;
};

type EditGradeDialogProps = {
	open: boolean;
	curriculumName: string;
	grade: number | null;
	seatingStatus: SeatingStatus | null;
	onSave: (edit: GradeEdit) => void;
	onCancel: () => void;
};

/** An absence scores 0 whatever is typed; the API enforces the same rule. */
const voidsMark = (status: SeatingStatus) => status === "absent";

/**
 * Edits one curriculum's mark and seating status. Saving hands the values to
 * the caller, which confirms them before anything is sent.
 */
const EditGradeDialog = ({
	open,
	curriculumName,
	grade,
	seatingStatus,
	onSave,
	onCancel,
}: EditGradeDialogProps) => {
	const { t } = useTranslation();
	const ref = useRef<HTMLDialogElement>(null);
	const [draft, setDraft] = useState("");
	const [status, setStatus] = useState<SeatingStatus>("attended");
	const [error, setError] = useState("");
	const [wasOpen, setWasOpen] = useState(open);

	// each row is edited from what it holds now, not from the last row edited
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setDraft(grade === null ? "" : String(grade));
			setStatus(seatingStatus ?? "attended");
			setError("");
		}
	}

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;

		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const voided = voidsMark(status);

	const save = () => {
		const value = voided ? 0 : Number(draft.trim());
		if (draft.trim() === "" && !voided) {
			setError("gradeSheet.errors.required");
			return;
		}
		if (Number.isNaN(value)) {
			setError("gradeSheet.errors.gradeNumber");
			return;
		}
		if (value < 0 || value > 100) {
			setError("gradeSheet.errors.gradeRange");
			return;
		}
		setError("");
		onSave({ grade: value, seatingStatus: status });
	};

	return (
		<dialog
			ref={ref}
			onClose={onCancel}
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			aria-labelledby="editGradeTitle"
			className="m-auto w-full max-w-md rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60"
		>
			<div className="flex flex-col gap-6 p-6">
				<div>
					<h2 id="editGradeTitle" className="mb-2 text-heading-5 text-accent-deep">
						{t("editGrade.title")}
					</h2>
					<p className="text-body-sm text-primary-hover">{curriculumName}</p>
				</div>

				<FormField id="editGradeValue" label={t("editGrade.grade")} error={error || undefined}>
					<input
						id="editGradeValue"
						type="number"
						min={0}
						max={100}
						step="any"
						dir="ltr"
						value={voided ? "0" : draft}
						disabled={voided}
						onChange={(e) => setDraft(e.target.value)}
						aria-invalid={!!error}
						className={`${inputClass(!!error)} disabled:bg-background disabled:text-primary-hover`}
					/>
				</FormField>

				<FormField id="editGradeStatus" label={t("editGrade.seatingStatus")}>
					<SeatingStatusSelect
						id="editGradeStatus"
						value={status}
						onChange={setStatus}
						label={t("editGrade.seatingStatus")}
					/>
					{voided && (
						<p className="text-body-sm text-primary-hover">{t("gradeSheet.voidedGrade")}</p>
					)}
				</FormField>

				<div className="flex justify-end gap-3">
					<button type="button" onClick={onCancel} className={secondaryButtonClass}>
						{t("common.cancel")}
					</button>
					<button type="button" onClick={save} className={submitButtonClass}>
						{t("editGrade.save")}
					</button>
				</div>
			</div>
		</dialog>
	);
};

export default EditGradeDialog;
