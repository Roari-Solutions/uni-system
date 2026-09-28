import type { Resit } from "../types/grade";
import type { ResultCell, ResultKind, ResultTotals, ResultVersion } from "../types/result";

// every exported sheet is in English, whatever the dashboard's language, so its
// wording lives here rather than in the locale files

/** The results sheets' marks: * after a supplementary re-exam, ** after a substitute one. */
export const resitSymbol = (kind: Resit["kind"]) => (kind === "supplementary" ? "*" : "**");

const LEVELS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];
const SEMESTERS = ["First", "Second"];

/** "First Year" for study year 1. */
export const levelText = (academicYear: number) => `${LEVELS[academicYear - 1] ?? academicYear} Year`;

/** "(First Semester Examinations Result)", "(Second Semester & Year Sup & Sub Examinations Result)"… */
export const sheetTitle = (semester: number, kind: ResultKind) => {
	const term = `${SEMESTERS[semester - 1] ?? semester} Semester${semester === 2 ? " & Year" : ""}`;
	return `(${term}${kind === "resit" ? " Sup & Sub" : ""} Examinations Result)`;
};

/** The version line under the title: the board's copy, or the approved final one. */
export const versionText = (version: ResultVersion) =>
	version === "board" ? "College Board Results" : "Final Results";

/**
 * What one cell prints, and whether it is shaded as a fail. The board version
 * shows "mark letter" (85 A); the final one the letter alone. On a resit sheet
 * a re-exam replaces the cell, marked * (supplementary) or ** (substitute).
 */
export const cellText = (
	cell: ResultCell,
	version: ResultVersion,
	kind: ResultKind,
): { text: string; failed: boolean } => {
	const withMark = (mark: number | null, letter: string) =>
		version === "board" && mark !== null ? `${mark} ${letter}` : letter;

	if (kind === "resit" && cell.resit) {
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

/** CH as a whole number, GP to one decimal and GPA to two, as the university's sheet has them. */
export const totalsText = (totals: ResultTotals) => ({
	ch: String(totals.ch),
	gp: totals.gp.toFixed(1),
	gpa: totals.gpa === null ? "—" : totals.gpa.toFixed(2),
});
