import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import FormField from "../formField";
import { inputClass, secondaryButtonClass, submitButtonClass } from "../../styles/form";
import type { ResultHeader } from "../../types/result";

const FIELDS: (keyof ResultHeader)[] = [
	"program",
	"batch",
	"academicYearLabel",
	"examDate",
	"collegeBoardDate",
	"centralBoardDate",
];

type GenerateResultDialogProps = {
	open: boolean;
	title: string;
	/** What the fields start from: a regeneration or a Sup & Sub result keeps the last header. */
	initial: ResultHeader;
	submitting: boolean;
	/** An i18n key saying why the last attempt failed. */
	error: string | null;
	onSubmit: (header: ResultHeader) => void;
	onCancel: () => void;
};

/**
 * Asks for the header lines the sheet prints and the system doesn't hold.
 * They are printed in English, so they are typed in English; a blank one
 * prints as a dotted line to fill in by hand.
 */
const GenerateResultDialog = ({
	open,
	title,
	initial,
	submitting,
	error,
	onSubmit,
	onCancel,
}: GenerateResultDialogProps) => {
	const { t } = useTranslation();
	const ref = useRef<HTMLDialogElement>(null);
	const [header, setHeader] = useState<ResultHeader>(initial);
	const [wasOpen, setWasOpen] = useState(open);

	// each opening starts from the header it was given
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) setHeader(initial);
	}

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onSubmit(header);
	};

	return (
		<dialog
			ref={ref}
			onClose={onCancel}
			onClick={(e) => e.target === e.currentTarget && onCancel()}
			aria-labelledby="generateResultTitle"
			className="m-auto w-full max-w-lg rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60"
		>
			<form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
				<div>
					<h2 id="generateResultTitle" className="mb-2 text-heading-5 text-accent-deep">
						{title}
					</h2>
					<p className="text-body-sm text-primary-hover">{t("results.headerHint")}</p>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{FIELDS.map((field) => (
						<FormField key={field} id={`header-${field}`} label={t(`results.header.${field}`)}>
							<input
								id={`header-${field}`}
								type="text"
								dir="ltr"
								lang="en"
								maxLength={100}
								placeholder={t(`results.headerPlaceholders.${field}`)}
								value={header[field]}
								onChange={(e) => setHeader((prev) => ({ ...prev, [field]: e.target.value }))}
								className={inputClass(false)}
							/>
						</FormField>
					))}
				</div>

				{error && (
					<p role="alert" className="text-body-sm text-error">
						{t(error)}
					</p>
				)}

				<div className="flex justify-end gap-3">
					<button type="button" onClick={onCancel} className={secondaryButtonClass}>
						{t("common.cancel")}
					</button>
					<button type="submit" disabled={submitting} className={submitButtonClass}>
						{submitting ? t("results.generating") : t("results.generate")}
					</button>
				</div>
			</form>
		</dialog>
	);
};

export default GenerateResultDialog;
