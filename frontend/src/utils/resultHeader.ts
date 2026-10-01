import type { ResultHeader, ResultSummary } from "../types/result";
import { STUDY_LEVELS } from "./academicYears";
import { levelText } from "./resultText";

const pad = (n: number) => String(n).padStart(2, "0");

/** Today as YYYY-MM-DD, the value a date input holds. */
export const todayIso = (now = new Date()) =>
	`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** The academic year a date falls in, e.g. "2025/2026"; a new one starts in July. */
export const academicYearOf = (now = new Date()) => {
	const year = now.getFullYear();
	return now.getMonth() >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

/** "September 2026": the exam period, when nothing better is known. */
const monthYear = (now: Date) => now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

const distinct = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];

export type HeaderSuggestions = Record<"program" | "batch" | "academicYearLabel" | "examDate", string[]>;

type HeaderContext = {
	/** The faculty's earlier results, newest first. */
	previous: ResultSummary[];
	facultyNameEn: string;
	level: number;
	semester: number;
	/**
	 * The specialization's English name, when the result is for one, or else the
	 * department's; it names the program.
	 */
	specializationNameEn?: string;
};

/**
 * What the header form starts from, and what each field offers in its list.
 * Earlier results of the same faculty (the same level first) supply the
 * program and exam period; the academic year and the college board's date
 * come from today. The batch is the level the sheet is for ("First Year"),
 * printed in English like the rest of the sheet.
 */
export const headerDefaults = ({
	previous,
	facultyNameEn,
	level,
	semester,
	specializationNameEn,
}: HeaderContext): { initial: ResultHeader; suggestions: HeaderSuggestions } => {
	const now = new Date();
	const sameLevel = previous.filter((r) => r.academicYear === level);
	const sameTerm = sameLevel.filter((r) => r.semester === semester);
	const pick = (rows: ResultSummary[], field: keyof ResultHeader) =>
		rows.map((r) => r.header[field]).find((v) => v.trim()) ?? "";

	const year = now.getFullYear();
	const academicYear = academicYearOf(now);
	return {
		initial: {
			program:
				specializationNameEn || pick(sameLevel, "program") || pick(previous, "program") || facultyNameEn,
			batch: levelText(level),
			academicYearLabel: academicYear,
			examDate: pick(sameTerm, "examDate") || monthYear(now),
			collegeBoardDate: todayIso(now),
			centralBoardDate: "",
		},
		suggestions: {
			program: distinct([
				...(specializationNameEn ? [specializationNameEn] : []),
				...previous.map((r) => r.header.program),
				facultyNameEn,
			]),
			// every level, so another can be picked
			batch: STUDY_LEVELS.map(levelText),
			academicYearLabel: distinct([
				academicYear,
				`${year - 1}/${year}`,
				`${year}/${year + 1}`,
				...previous.map((r) => r.header.academicYearLabel),
			]),
			examDate: distinct([monthYear(now), ...previous.map((r) => r.header.examDate)]),
		},
	};
};
