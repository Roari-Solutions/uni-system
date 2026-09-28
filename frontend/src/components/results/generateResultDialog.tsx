import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import FormField from "../formField";
import { inputClass, secondaryButtonClass, submitButtonClass } from "../../styles/form";
import type { ResultHeader } from "../../types/result";
import type { HeaderSuggestions } from "../../utils/resultHeader";

// typed in English (they print in English), each with its earlier values to pick from
const TEXT_FIELDS = ["program", "batch", "academicYearLabel", "examDate"] as const;
// a day each, picked from a calendar
const DATE_FIELDS = ["collegeBoardDate", "centralBoardDate"] as const;

// the input's own ISO value; anything else (an older free-text entry) starts blank
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type GenerateResultDialogProps = {
	open: boolean;
	title: string;
	/** What the fields start from: filled in from earlier results and today. */
	initial: ResultHeader;
	suggestions: HeaderSuggestions;
	/** Only the second semester's (year) result goes to the central board. */
	semester: number;
	submitting: boolean;
	/** An i18n key saying why the last attempt failed. */
	error: string | null;
	/** Hears every edit, so the caller can keep what's typed across a refresh. */
	onChange?: (header: ResultHeader) => void;
	onSubmit: (header: ResultHeader) => void;
	onCancel: () => void;
};

/**
 * The header lines the sheet prints and the system doesn't hold, filled in
 * ahead and left to check. A blank line prints as dots to fill in by hand.
 */
const GenerateResultDialog = ({
	open,
	title,
	initial,
	suggestions,
	semester,
	submitting,
	error,
	onChange,
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

	const set = (field: keyof ResultHeader, value: string) => {
		const next = { ...header, [field]: value };
		setHeader(next);
		onChange?.(next);
	};

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onSubmit(semester === 2 ? header : { ...header, centralBoardDate: "" });
	};

	const dateFields = DATE_FIELDS.filter((f) => f !== "centralBoardDate" || semester === 2);

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
					{TEXT_FIELDS.map((field) => (
						<FormField key={field} id={`header-${field}`} label={t(`results.header.${field}`)}>
							<input
								id={`header-${field}`}
								type="text"
								dir="ltr"
								lang="en"
								maxLength={100}
								// the earlier values drop down under the field; any other value can be typed
								list={`header-${field}-options`}
								autoComplete="off"
								value={header[field]}
								onChange={(e) => set(field, e.target.value)}
								className={inputClass(false)}
							/>
							<datalist id={`header-${field}-options`}>
								{suggestions[field].map((value) => (
									<option key={value} value={value} />
								))}
							</datalist>
						</FormField>
					))}
					{dateFields.map((field) => (
						<FormField key={field} id={`header-${field}`} label={t(`results.header.${field}`)}>
							<input
								id={`header-${field}`}
								type="date"
								dir="ltr"
								value={ISO_DATE.test(header[field]) ? header[field] : ""}
								onChange={(e) => set(field, e.target.value)}
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
