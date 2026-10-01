import type { ResultHeader, ResultSummary } from "../types/result";
import { dateText, DEFAULT_RESULT_TITLE } from "./resultText";

/** The academic year a date falls in, e.g. "2025/2026"; a new one starts in July. */
export const academicYearOf = (now = new Date()) => {
	const year = now.getFullYear();
	return now.getMonth() >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

/** The trimmed, non-blank values, each once, in their first order. */
export const distinct = (values: (string | undefined)[]) => [
	...new Set(values.map((v) => (v ?? "").trim()).filter(Boolean)),
];

/** The degree a result prints when none was typed: every result before it was asked for. */
export const DEFAULT_DEGREE = "Bachelor";

/** The dates staff write in by hand: optional, so each starts blank and prints as dots until typed. */
export const DATE_FIELDS = ["examDate", "collegeBoardDate", "centralBoardDate"] as const;

/**
 * A stored header as the form edits it. One from before the degree was asked
 * for gets the default; a date picked from the old calendar (2026-10-01) is
 * shown as it prints ("1 October 2026"), so it reads and prints the same.
 */
export const editableHeader = (header: ResultHeader): ResultHeader => ({
	...header,
	degree: header.degree ?? DEFAULT_DEGREE,
	resultTitle: header.resultTitle ?? DEFAULT_RESULT_TITLE,
	examinationOfficer: header.examinationOfficer ?? "",
	collegeRegistrar: header.collegeRegistrar ?? "",
	dean: header.dean ?? "",
	examDate: dateText(header.examDate),
	collegeBoardDate: dateText(header.collegeBoardDate),
	centralBoardDate: dateText(header.centralBoardDate),
});

/** A header with the hand-written dates cleared, for an exam sitting of its own (Sup & Sub). */
export const withoutDates = (header: ResultHeader): ResultHeader => ({
	...header,
	examDate: "",
	collegeBoardDate: "",
	centralBoardDate: "",
});

export type HeaderSuggestions = Record<
	"degree" | "program" | "batch" | "academicYearLabel" | "examinationOfficer" | "collegeRegistrar" | "dean",
	string[]
>;

type HeaderContext = {
	/** The faculty's earlier results, newest first. */
	previous: ResultSummary[];
	facultyNameEn: string;
	level: number;
	/**
	 * The specialization's English name, when the result is for one, or else the
	 * department's; it names the program.
	 */
	specializationNameEn?: string;
};

/**
 * What the header form starts from, and what each field offers in its list.
 * Earlier results of the same faculty (the same level first) supply the
 * degree and program; the academic year comes from today. The batch is named
 * by its acceptance years, which only the preview knows, so it starts blank
 * here. The dates start blank: staff type them, or leave them to be written
 * on the printed sheet.
 */
export const headerDefaults = ({
	previous,
	facultyNameEn,
	level,
	specializationNameEn,
}: HeaderContext): { initial: ResultHeader; suggestions: HeaderSuggestions } => {
	const now = new Date();
	const sameLevel = previous.filter((r) => r.academicYear === level);
	const pick = (rows: ResultSummary[], field: keyof ResultHeader) =>
		rows.map((r) => r.header[field] ?? "").find((v) => v.trim()) ?? "";

	const year = now.getFullYear();
	const academicYear = academicYearOf(now);
	return {
		initial: {
			degree: pick(sameLevel, "degree") || pick(previous, "degree") || DEFAULT_DEGREE,
			program:
				specializationNameEn || pick(sameLevel, "program") || pick(previous, "program") || facultyNameEn,
			batch: "",
			resultTitle: DEFAULT_RESULT_TITLE,
			examinationOfficer: "",
			collegeRegistrar: "",
			dean: "",
			academicYearLabel: academicYear,
			examDate: "",
			collegeBoardDate: "",
			centralBoardDate: "",
		},
		suggestions: {
			degree: distinct([DEFAULT_DEGREE, ...previous.map((r) => r.header.degree)]),
			program: distinct([
				...(specializationNameEn ? [specializationNameEn] : []),
				...previous.map((r) => r.header.program),
				facultyNameEn,
			]),
			batch: distinct(previous.map((r) => r.header.batch)),
			// the people who signed the faculty's earlier results
			examinationOfficer: distinct(previous.map((r) => r.header.examinationOfficer)),
			collegeRegistrar: distinct(previous.map((r) => r.header.collegeRegistrar)),
			dean: distinct(previous.map((r) => r.header.dean)),
			academicYearLabel: distinct([
				academicYear,
				`${year - 1}/${year}`,
				`${year}/${year + 1}`,
				...previous.map((r) => r.header.academicYearLabel),
			]),
		},
	};
};
