import * as XLSX from "xlsx";
import type { Faculty } from "../types/faculty";
import { ACCEPTANCE_TYPES, type AcceptanceType, type Nationality } from "../types/student";

/**
 * The two sheets students arrive in. The ministry one lists next year's first
 * years and carries no university numbers; the other lists students the
 * university already has, each with the number it gave them.
 */
export const TEMPLATES = ["ministry", "existing"] as const;
export type BulkTemplate = (typeof TEMPLATES)[number];

/** A parsed row, ready for the preview table and for the API. */
export type BulkRow = {
	rowNumber: number;
	uniNumber: string;
	nameAr: string;
	nameEn: string;
	nationalId: string;
	nationality: Nationality;
	acceptanceType: AcceptanceType;
	acceptanceYear: string;
	level: number;
	facultyId: string;
	/** Faculty text as the sheet wrote it, shown when it matches nothing. */
	facultyName: string;
	/** i18n keys for what the sheet itself got wrong; the API adds its own. */
	problems: string[];
};

/** Values the upload form supplies for every row of a file. */
export type BulkDefaults = {
	acceptanceType: AcceptanceType;
	acceptanceYear: string;
	level: number;
	/** Set when the caller imports into one faculty; the ministry sheet names its own. */
	facultyId: string;
};

// Arabic headers, as the two templates write them
const HEADERS = {
	formNumber: "الاستمارة",
	uniNumber: "الرقم الجامعي",
	nameAr: "الاسم / عربي",
	nameEn: "الاسم / انجليزي",
	faculty: "الكلية",
	facultyMajor: "الكلية - التخصص",
	acceptanceType: "نوع القبول",
	nationalId: "الرقم الوطني",
	name: "الاسم",
} as const;

/**
 * Arabic text differs between sheets by article, spelling and spacing, so it is
 * compared loosely: "كلية الهندسة" and "الهندسة" name the same faculty, and
 * "القبول العام" the same admission route as "قبول عام".
 */
function normalise(value: string): string {
	return value
		.replace(/[ً-ْـ]/g, "")
		.replace(/[أإآ]/g, "ا")
		.replace(/ى/g, "ي")
		.replace(/ة/g, "ه")
		.replace(/\s+/g, " ")
		.trim()
		.split(" ")
		// the sheets write a faculty as "كلية الهندسة"; the records hold the name alone
		.filter((word) => word !== "كليه")
		.map((word) => word.replace(/^ال/, ""))
		.join(" ");
}

/** A sheet as its own grid: the header row, and every row of values below it. */
export type SheetGrid = {
	headers: string[];
	rows: string[][];
};

const text = (value: unknown): string =>
	value === undefined || value === null ? "" : String(value).trim();

/** The column a header names, or -1 when the sheet does not carry it. */
const columnOf = (headers: string[], header: string): number =>
	headers.findIndex((candidate) => normalise(candidate) === normalise(header));

const cell = (row: string[], headers: string[], header: string): string => {
	const index = columnOf(headers, header);
	return index === -1 ? "" : text(row[index]);
};

/**
 * The ministry sheet writes one name across four columns under a single الاسم
 * heading, so the columns after it have no heading of their own. They are the
 * rest of the name, and they read right to left like the sheet itself.
 */
function nameColumns(headers: string[]): number[] {
	const start = columnOf(headers, HEADERS.name);
	if (start === -1) return [];

	const columns = [start];
	for (let index = start + 1; index < headers.length && !text(headers[index]); index += 1) {
		columns.push(index);
	}
	return columns;
}

/** The Arabic acceptance label a sheet carries, back to the value we store. */
function acceptanceTypeOf(
	label: string,
	labels: Record<AcceptanceType, string>,
	fallback: AcceptanceType,
): AcceptanceType | null {
	if (!label) return fallback;
	const needle = normalise(label);
	return ACCEPTANCE_TYPES.find((type) => normalise(labels[type]) === needle) ?? null;
}

/** The faculty a cell names: everything before the first dash is its name. */
function facultyOf(cellValue: string, faculties: Faculty[]): Faculty | null {
	const name = normalise(cellValue.split("-")[0] ?? "");
	if (!name) return null;
	return faculties.find((faculty) => normalise(faculty.name.ar) === name) ?? null;
}

/** XX-00-00000000: the faculty's letters, the acceptance year, the form number. */
export function buildUniNumber(
	abbreviation: string | null,
	acceptanceYear: string,
	formNumber: string,
): string {
	const letters = (abbreviation ?? "").toUpperCase();
	const year = acceptanceYear.slice(-2);
	return `${letters}-${year}-${formNumber}`;
}

/** The headings one of the templates must carry for a row to be read at all. */
const ANCHORS = [HEADERS.formNumber, HEADERS.uniNumber, HEADERS.name, HEADERS.nameAr];

/**
 * Reads the first sheet of a .xlsx or .csv file as a grid. Sheets often carry a
 * title above the table, so the header row is found rather than assumed, and the
 * blank rows below the data are dropped.
 */
export async function readSheet(file: File): Promise<SheetGrid> {
	const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
	const first = book.SheetNames[0];
	if (!first) return { headers: [], rows: [] };

	const grid = XLSX.utils
		.sheet_to_json<unknown[]>(book.Sheets[first], { header: 1, defval: "", raw: false })
		.map((row) => row.map(text));

	const headerIndex = grid.findIndex((row) =>
		row.some((value) => ANCHORS.some((anchor) => normalise(value) === normalise(anchor))),
	);
	if (headerIndex === -1) return { headers: [], rows: [] };

	return {
		headers: grid[headerIndex],
		rows: grid.slice(headerIndex + 1).filter((row) => row.some((value) => value !== "")),
	};
}

/**
 * Turns sheet rows into student rows. Nothing here talks to the API: the rows
 * it returns are what the preview shows and, once confirmed, what is sent.
 */
export function toBulkRows(
	sheet: SheetGrid,
	template: BulkTemplate,
	defaults: BulkDefaults,
	faculties: Faculty[],
	acceptanceLabels: Record<AcceptanceType, string>,
): BulkRow[] {
	const { headers } = sheet;
	const ministry = template === "ministry";
	const nameParts = nameColumns(headers);

	return sheet.rows.map((raw, index) => {
		// the header sits directly above the first record
		const rowNumber = index + 2;
		const problems: string[] = [];

		const facultyCell = ministry
			? cell(raw, headers, HEADERS.faculty)
			: cell(raw, headers, HEADERS.facultyMajor);
		const matched = facultyOf(facultyCell, faculties);
		const faculty = matched ?? faculties.find((f) => f.id === defaults.facultyId) ?? null;

		if (facultyCell && !matched) problems.push("bulkImport.problems.facultyUnknown");
		if (!faculty) problems.push("bulkImport.problems.facultyMissing");
		if (matched && defaults.facultyId && matched.id !== defaults.facultyId) {
			problems.push("bulkImport.problems.facultyMismatch");
		}

		// the ministry sheet spreads a name over its columns; the other holds it whole
		const nameAr = ministry
			? nameParts
					.map((column) => text(raw[column]))
					.filter(Boolean)
					.join(" ")
			: cell(raw, headers, HEADERS.nameAr);
		if (!nameAr) problems.push("bulkImport.problems.nameMissing");

		const nationalId = cell(raw, headers, HEADERS.nationalId);

		let uniNumber: string;
		if (ministry) {
			const formNumber = cell(raw, headers, HEADERS.formNumber);
			if (!formNumber) problems.push("bulkImport.problems.formNumberMissing");
			if (!faculty?.abbreviation) problems.push("bulkImport.problems.facultyAbbreviation");
			uniNumber = buildUniNumber(faculty?.abbreviation ?? "", defaults.acceptanceYear, formNumber);
		} else {
			uniNumber = cell(raw, headers, HEADERS.uniNumber);
			if (!uniNumber) problems.push("bulkImport.problems.uniNumberMissing");
		}

		const acceptanceType = acceptanceTypeOf(
			ministry ? cell(raw, headers, HEADERS.acceptanceType) : "",
			acceptanceLabels,
			defaults.acceptanceType,
		);
		if (!acceptanceType) problems.push("bulkImport.problems.acceptanceTypeUnknown");

		return {
			rowNumber,
			uniNumber,
			nameAr,
			// the English name is filled in elsewhere when a sheet carries none
			nameEn: ministry ? "" : cell(raw, headers, HEADERS.nameEn),
			nationalId,
			// a blank national ID means nobody recorded one, not a foreign student
			nationality: "sudanese",
			acceptanceType: acceptanceType ?? defaults.acceptanceType,
			acceptanceYear: defaults.acceptanceYear,
			// the ministry sheet is next year's first years
			level: ministry ? 1 : defaults.level,
			facultyId: faculty?.id ?? "",
			facultyName: facultyCell,
			problems,
		};
	});
}
