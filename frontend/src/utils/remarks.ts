import type { ResultSheet, ResultStudent } from "../types/result";

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

/** How many of the student's curriculums go to a supplementary (any F) or a substitute (an excused absence) exam. */
export const resitCounts = (student: ResultStudent) => ({
	sup: student.cells.filter((c) => c.letter === "F").length,
	sub: student.cells.filter((c) => c.state === "substitute").length,
});

/**
 * Where the count sits beside the abbreviation: before "Sup" and after "Sub"
 * ("2 Sup", "Sub 1"). The university's own convention wasn't confirmed, so
 * this is the one line to change if it's the other way round.
 */
const withCount = (code: "Sup" | "Sub", count: number) =>
	!count ? code : code === "Sup" ? `${count} Sup` : `Sub ${count}`;

/**
 * The remark a regular sheet fills in by itself, from the semester's GPA and
 * its Sup & Sub curriculums:
 *  - GPA 2.00 or above with none to resit: Pas;
 *  - GPA 1.50 or above with some to resit: Sup and/or Sub, with how many;
 *  - GPA from 1.26 up to (not including) 1.50: Rpt.
 * Anything else is left for staff to choose. A Sup & Sub sheet gets none: it
 * records the re-exams themselves. (Remarks from the student's record, such as
 * a freeze, are meant to come in ahead of these rules.)
 */
export const autoRemark = (student: ResultStudent, sheet: Pick<ResultSheet, "kind">): RemarkCode | "" => {
	const gpa = student.semester.gpa;
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
 * Sup also names the Sub curriculums when the student has both ("2 Sup, Sub 1").
 */
export const remarkText = (student: ResultStudent, code: RemarkCode | "", automatic: boolean) => {
	const { sup, sub } = resitCounts(student);
	if (code === "Sup") return automatic && sub ? `${withCount("Sup", sup)}, ${withCount("Sub", sub)}` : withCount("Sup", sup);
	if (code === "Sub") return withCount("Sub", sub);
	return code;
};

/**
 * The student's remark: the one chosen for them, or else the automatic one.
 * `choices` is undefined on approved results from before remarks were filled
 * in; those keep the blank column they were approved with.
 */
export const remarkOf = (
	student: ResultStudent,
	sheet: Pick<ResultSheet, "kind">,
	choices: RemarkChoices | undefined,
) => {
	if (!choices) return { code: "" as const, text: "", automatic: false };
	const chosen = choices[student.id];
	const automatic = chosen === undefined;
	const code = automatic ? autoRemark(student, sheet) : chosen;
	return { code, text: remarkText(student, code, automatic), automatic };
};
