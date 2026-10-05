import type { Resit } from "../types/grade";
import type {
	ResultCell,
	ResultCourse,
	ResultKind,
	ResultSheet,
	ResultStudent,
	ResultTotals,
	ResultVersion,
} from "../types/result";

// every exported sheet is in English, whatever the dashboard's language, so its
// wording lives here rather than in the locale files

/** The results sheets' marks: * after a supplementary re-exam, ** after a substitute one. */
export const resitSymbol = (kind: Resit["kind"]) => (kind === "supplementary" ? "*" : "**");

const LEVELS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
const SEMESTERS = ["First", "Second"];

/** "First Year" for study year 1. */
export const levelText = (academicYear: number) => `${LEVELS[academicYear - 1] ?? academicYear} Year`;

/**
 * "(First Semester Examinations Result)"; the second semester's sheet carries
 * the whole year, so it is the year's result, named by the study year:
 * "(Third Year Sup & Sub Examinations Result)".
 */
export const sheetTitle = (semester: number, kind: ResultKind, academicYear: number) => {
	const term = semester === 2 ? levelText(academicYear) : `${SEMESTERS[semester - 1] ?? semester} Semester`;
	return `(${term}${kind === "resit" ? " Sup & Sub" : ""} Examinations Result)`;
};

/**
 * Whether a column is the sheet's own semester. A second-semester sheet also
 * shows the first semester's curriculums, which aren't edited, re-examined or
 * counted in its remarks from here; older sheets tag none and are all their own.
 */
export const ownSemester = (
	course: ResultCourse | undefined,
	sheet: Pick<ResultSheet, "semester">,
): course is ResultCourse => !!course && (course.semester === undefined || course.semester === sheet.semester);

/** A student's name as the sheet prints it: with anything added to it on this result. */
export const printedName = (name: string, addition: string | undefined) =>
	addition?.trim() ? `${name} ${addition.trim()}` : name;

/** Who signs every page, each with the header field that may name them. */
export const SIGNATORIES = [
	{ field: "examinationOfficer", role: "Examination Officer's" },
	{ field: "collegeRegistrar", role: "College Registrar" },
	{ field: "dean", role: "Dean of the College" },
] as const;

/** The board copy's line under the title, unless staff typed another (or none). */
export const DEFAULT_RESULT_TITLE = "College Board Results";

/** The version line under the title: the board's copy, or the approved final one. */
export const versionText = (version: ResultVersion) =>
	version === "board" ? DEFAULT_RESULT_TITLE : "Final Results";

/** "2024", "2023 and 2024", "2022, 2023 and 2024": the batch named by its acceptance years. */
export const joinYears = (years: string[]) =>
	years.length < 2 ? (years[0] ?? "") : `${years.slice(0, -1).join(", ")} and ${years[years.length - 1]}`;

/**
 * What one cell prints, and whether it is shaded as a fail. The board version
 * shows "mark letter" (85 A); the final one the letter alone. A re-exam, which
 * the sheet carries on a resit sheet and in the first-semester columns of a
 * second-semester one, replaces the cell, marked * (supplementary) or ** (substitute).
 */
export const cellText = (cell: ResultCell, version: ResultVersion): { text: string; failed: boolean } => {
	const withMark = (mark: number | null, letter: string) =>
		version === "board" && mark !== null ? `${mark} ${letter}` : letter;

	if (cell.resit) {
		const letter = `${cell.resit.letter}${resitSymbol(cell.resit.kind)}`;
		return { text: withMark(cell.resit.mark, letter), failed: cell.resit.letter === "F" };
	}
	switch (cell.state) {
		case "absent":
			return { text: "Abs.F", failed: true };
		case "barred":
			return { text: "Bar", failed: true };
		case "substitute":
			return { text: "sub", failed: false };
		case "incomplete":
			return { text: "inc", failed: false };
		case "cheating":
			return { text: withMark(cell.mark, "F@"), failed: true };
		case "cheatingPending":
			return { text: "@", failed: false };
		default:
			return { text: withMark(cell.mark, cell.letter ?? ""), failed: cell.letter === "F" };
	}
};

/**
 * A header date as the sheet prints it: a picked day (2026-02-02) reads
 * "2 February 2026"; anything typed by hand prints as typed.
 */
export const dateText = (value: string) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return value;
	const [, y, m, d] = match.map(Number);
	return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * The totals a student's CH, GP and GPA columns print: the whole year's on a
 * second-semester sheet, the semester's otherwise (and on sheets from before).
 */
export const printedTotals = (student: ResultStudent, sheet: Pick<ResultSheet, "totals">) =>
	sheet.totals === "year" && student.year ? student.year : student.semester;

/** CH as a whole number, GP to one decimal and GPA to two, as the university's sheet has them. */
export const totalsText = (totals: ResultTotals) => ({
	ch: String(totals.ch),
	gp: totals.gp.toFixed(1),
	gpa: totals.gpa === null ? "—" : totals.gpa.toFixed(2),
});
