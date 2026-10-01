import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ResultHeader, ResultSheet } from "../../types/result";
import type { DATE_FIELDS, HeaderSuggestions } from "../../utils/resultHeader";
import InfoTip from "../infoTip";
import { levelText, sheetTitle, SIGNATORIES } from "../../utils/resultText";

// typed in English (they print in English), each with its earlier values to pick from
type TextField = keyof HeaderSuggestions;
// optional and typed by hand as they should print: the dates (left blank, they're
// written on the sheet) and the line under the title (left blank, it's left off)
type FreeField = (typeof DATE_FIELDS)[number] | "resultTitle";

// §31 — an input in the line it fills, as wide as what's typed in it
const fieldClass =
	"h-11 min-w-[12ch] max-w-full rounded-sm border border-border bg-surface px-3 text-body-md font-bold text-foreground outline-none field-sizing-content focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background";

/** One printed line: its fixed words and what fills them, centred like the sheet's. */
const Line = ({ children }: { children: ReactNode }) => (
	<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">{children}</div>
);

/** The university's emblem where the sheet prints it; on a phone there's no room beside the lines. */
const Logo = () => <img src="/university-logo.jpg" alt="" className="hidden size-36 shrink-0 object-contain sm:block" />;

type ResultHeaderFormProps = {
	/** Keeps the ids of two forms on one page apart. */
	idPrefix: string;
	header: ResultHeader;
	onChange: (header: ResultHeader) => void;
	suggestions: HeaderSuggestions;
	/** What the system fills in itself: the college, level, placement and which exams. */
	sheet: Pick<ResultSheet, "college" | "academicYear" | "specialization" | "semester" | "kind">;
	disabled?: boolean;
};

/**
 * The board results' header as it prints, with the lines staff type filled in
 * where they print. English and LTR like the sheet; a blank line prints as
 * dots to fill in by hand.
 */
const ResultHeaderForm = ({ idPrefix, header, onChange, suggestions, sheet, disabled }: ResultHeaderFormProps) => {
	const { t } = useTranslation();

	const set = (field: keyof ResultHeader, value: string) => onChange({ ...header, [field]: value });

	const text = (field: TextField) => (
		<>
			<input
				id={`${idPrefix}-${field}`}
				type="text"
				// the dashboard's language names the field; the sheet's own words are English
				aria-label={t(`results.header.${field}`)}
				title={t(`results.header.${field}`)}
				maxLength={100}
				// the earlier values drop down under the field; any other value can be typed
				list={`${idPrefix}-${field}-options`}
				autoComplete="off"
				disabled={disabled}
				value={header[field] ?? ""}
				onChange={(e) => set(field, e.target.value)}
				className={fieldClass}
			/>
			<datalist id={`${idPrefix}-${field}-options`}>
				{suggestions[field].map((value) => (
					<option key={value} value={value} />
				))}
			</datalist>
		</>
	);

	const free = (field: FreeField, extraClass = "") => (
		<input
			id={`${idPrefix}-${field}`}
			type="text"
			aria-label={t(`results.header.${field}`)}
			title={t(`results.header.${field}`)}
			maxLength={100}
			autoComplete="off"
			disabled={disabled}
			value={header[field] ?? ""}
			onChange={(e) => set(field, e.target.value)}
			className={`${fieldClass} ${extraClass}`}
		/>
	);

	return (
		<div dir="ltr" lang="en" className="font-en text-body-md text-foreground">
			<div className="flex items-start justify-between gap-4">
				<Logo />
				<div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
					<p className="text-heading-5 font-bold">University of Technology</p>
					<Line>
						College of <span className="font-bold">{sheet.college}</span>
					</Line>
					<Line>
						{text("degree")} Program in {text("program")}
					</Line>
					<Line>Batch {text("batch")}</Line>
					<Line>
						Level <span className="font-bold">{levelText(sheet.academicYear)}</span>
					</Line>
					{sheet.specialization && (
						<Line>
							Specialization <span className="font-bold">{sheet.specialization}</span>
						</Line>
					)}
					<Line>Academic Year {text("academicYearLabel")}</Line>
					<p className="font-bold">{sheetTitle(sheet.semester, sheet.kind)}</p>
					{/* it prints in capitals, so it is typed as it will look */}
					<Line>
						{free("resultTitle", "text-body-sm uppercase tracking-wide")}
						<InfoTip text={t("results.resultTitleTip")} />
					</Line>
				</div>
				<Logo />
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-dotted border-foreground pb-3">
				<Line>Date of Exam {free("examDate")}</Line>
				<Line>Date of College Board {free("collegeBoardDate")}</Line>
				<Line>Date of Central Board {free("centralBoardDate")}</Line>
			</div>
		</div>
	);
};

type ResultSignaturesFormProps = {
	idPrefix: string;
	header: ResultHeader;
	onChange: (header: ResultHeader) => void;
	suggestions: HeaderSuggestions;
	disabled?: boolean;
};

/**
 * The signatures at the foot of every printed page, with each signer's name
 * typed where it prints. Optional: a blank name prints a dotted line to sign.
 */
export const ResultSignaturesForm = ({ idPrefix, header, onChange, suggestions, disabled }: ResultSignaturesFormProps) => {
	const { t } = useTranslation();

	return (
		<div
			dir="ltr"
			lang="en"
			className="flex flex-wrap justify-between gap-x-6 gap-y-4 border-t border-dotted border-foreground pt-4 font-en text-body-md text-foreground"
		>
			{SIGNATORIES.map(({ field, role }) => (
				<div key={field} className="flex flex-col items-start gap-2">
					<label htmlFor={`${idPrefix}-${field}`} className="font-bold">
						{role}
					</label>
					<input
						id={`${idPrefix}-${field}`}
						type="text"
						// the dashboard's language says whose name goes here
						title={t(`results.header.${field}`)}
						maxLength={100}
						list={`${idPrefix}-${field}-options`}
						autoComplete="off"
						disabled={disabled}
						value={header[field] ?? ""}
						onChange={(e) => onChange({ ...header, [field]: e.target.value })}
						className={fieldClass}
					/>
					<datalist id={`${idPrefix}-${field}-options`}>
						{suggestions[field].map((value) => (
							<option key={value} value={value} />
						))}
					</datalist>
				</div>
			))}
		</div>
	);
};

export default ResultHeaderForm;
