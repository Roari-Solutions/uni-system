import type { ResultSheet, ResultStudent } from "../types/result";
import { printedTotals } from "./resultText";

// every exported sheet is in English, so the remarks' wording lives here

/** What the Remarks column may hold: the university's academic status key, as printed on the cover. */
export const REMARKS = [
	["Crg", "Ceased Registration"],
	["Cro", "Carry Over"],
	["Dsc", "Discontinued"],
	["Dsm", "Dismissed"],
	["Frz", "Freeze"],
	["Pas", "Pass"],
	["Prm", "Promoted"],
	["Rad", "Readmitted"],
	["Rdo", "Redo"],
	["Rej", "Rejected"],
	["Rpt", "Repeated"],
	["Rrg", "Re-registration"],
	["Rst", "Resit"],
	["Rtk", "Retake"],
	["Sub", "Substitute"],
	["Sup", "Supplementary"],
	["Sus", "Suspension"],
] as const;

export type RemarkCode = (typeof REMARKS)[number][0];

/**
 * A student's remark as chosen on the sheet: a code from the key, or "" to
 * leave the cell blank. A student without one gets the automatic remark.
 */
export type RemarkChoices = Record<string, RemarkCode | "">;

/**
 * How many of the student's curriculums on the sheet still go to a
 * supplementary (any F) or a substitute (an excused absence) exam. Every column
 * counts, the first semester's on a second-semester sheet included; a cell
 * with a re-exam counts as that re-exam stands (a passed C* is done with).
 */
export const resitCounts = (student: ResultStudent) => ({
	sup: student.cells.filter((c) => (c.resit?.letter ?? c.letter) === "F").length,
	sub: student.cells.filter((c) => c.state === "substitute" && !c.resit).length,
});

/**
 * Where the count sits beside the abbreviation: after "Sup", with the F grade
 * that sends those curriculums to it, and before "Sub" ("Sup 2F", "1 Sub").
 */
export const withCount = (code: "Sup" | "Sub", count: number) =>
	!count ? code : code === "Sup" ? `Sup ${count}F` : `${count} Sub`;

/** What the automatic remark reads off the sheet: its kind, and which GPA it prints. */
type RemarkSheet = Pick<ResultSheet, "kind" | "totals">;

/**
 * The remark a regular sheet fills in by itself, from the GPA the sheet prints
 * (the year's on a second-semester sheet, the semester's otherwise) and its
 * Sup & Sub curriculums:
 *  - GPA 2.00 or above with none to resit: Pas;
 *  - GPA 1.50 or above with some to resit: Sup and/or Sub, with how many. They
 *    come before Pas: a student with any to resit hasn't passed yet;
 *  - GPA from 1.26 up to (not including) 1.50: Rpt.
 * Anything else is left for staff to choose. A Sup & Sub sheet gets none: it
 * records the re-exams themselves. (Remarks from the student's record, such as
 * a freeze, are meant to come in ahead of these rules.)
 */
export const autoRemark = (student: ResultStudent, sheet: RemarkSheet): RemarkCode | "" => {
	const gpa = printedTotals(student, sheet).gpa;
	if (sheet.kind !== "regular" || gpa === null) return "";
	const { sup, sub } = resitCounts(student);
	if (gpa >= 2 && !sup && !sub) return "Pas";
	if (gpa >= 1.5 && sup) return "Sup";
	if (gpa >= 1.5 && sub) return "Sub";
	if (gpa >= 1.26 && gpa < 1.5) return "Rpt";
	return "";
};

/**
 * What the Remarks cell prints. Sup and Sub carry their counts; an automatic
 * Sup also names the Sub curriculums when the student has both ("Sup 2F, 1 Sub").
 */
export const remarkText = (student: ResultStudent, code: RemarkCode | "", automatic: boolean) => {
	const { sup, sub } = resitCounts(student);
	if (code === "Sup") return automatic && sub ? `${withCount("Sup", sup)}, ${withCount("Sub", sub)}` : withCount("Sup", sup);
	if (code === "Sub") return withCount("Sub", sub);
	return code;
};

/**
 * The student's remark: the one chosen for them, or else the automatic one.
 * A chosen Sup or Sub the student no longer has any curriculums for (a mark
 * corrected since) gives way to the automatic one, as it can't print a count.
 * `choices` is undefined on approved results from before remarks were filled
 * in; those keep the blank column they were approved with.
 */
export const remarkOf = (
	student: ResultStudent,
	sheet: RemarkSheet,
	choices: RemarkChoices | undefined,
) => {
	if (!choices) return { code: "" as const, text: "", automatic: false };
	const chosen = choices[student.id];
	const { sup, sub } = resitCounts(student);
	const automatic = chosen === undefined || (chosen === "Sup" && !sup) || (chosen === "Sub" && !sub);
	const code = automatic ? autoRemark(student, sheet) : chosen;
	return { code, text: remarkText(student, code, automatic), automatic };
};
