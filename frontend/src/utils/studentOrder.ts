import type { ResultSheet } from "../types/result";

// "" is the university number, the order the API sends; "name" is alphabetical
export const STUDENT_ORDERS = ["name"] as const;
export type StudentOrder = (typeof STUDENT_ORDERS)[number] | "";

export const isStudentOrder = (value: string | null): value is StudentOrder =>
	value === "" || STUDENT_ORDERS.includes(value as (typeof STUDENT_ORDERS)[number]);

// the API records "-" for a missing English name; it sorts after every real one
const unnamed = (name: string) => name.trim() === "" || name.trim() === "-";

/**
 * A sorted copy of the students: by university number, or alphabetically by
 * the name in `lang`, so Arabic follows Arabic letter order. Ties fall back to
 * the university number, so the order never shifts between loads.
 */
export const orderStudents = <T>(
	rows: T[],
	order: StudentOrder,
	lang: "ar" | "en",
	pick: (row: T) => { name: string; uniNumber: string },
): T[] => {
	// the comparison the API sorts with, so the default order matches the server's
	const byNumber = (a: T, b: T) => pick(a).uniNumber.localeCompare(pick(b).uniNumber);
	if (order !== "name") return [...rows].sort(byNumber);

	const collator = new Intl.Collator(lang, { sensitivity: "base", ignorePunctuation: true });
	return [...rows].sort((a, b) => {
		const nameA = pick(a).name;
		const nameB = pick(b).name;
		const missing = Number(unnamed(nameA)) - Number(unnamed(nameB));
		return missing || collator.compare(nameA, nameB) || byNumber(a, b);
	});
};

/**
 * The sheet with its students in the chosen order; the sheet's names are
 * English. A sheet covering more than one acceptance year lists each year's
 * students together, the earliest year first, each group in the chosen order
 * (2023's by number or name, then 2024's). A student whose year isn't known
 * comes last.
 */
export const orderSheet = (
	sheet: ResultSheet,
	order: StudentOrder,
	acceptanceYears?: Record<string, string>,
): ResultSheet => {
	const ordered = orderStudents(sheet.students, order, "en", (s) => s);
	if (!acceptanceYears) return { ...sheet, students: ordered };
	// the sort is stable, so each year's group keeps the chosen order
	const yearOf = (id: string) => acceptanceYears[id] ?? "\uffff";
	return { ...sheet, students: ordered.sort((a, b) => yearOf(a.id).localeCompare(yearOf(b.id))) };
};
