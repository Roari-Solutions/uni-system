import api from "../lib/api";
import type { Student } from "../types/student";

export type StudentFilters = {
	facultyId?: string;
	level?: number;
	acceptanceYear?: string;
	q?: string;
};

export type StudentPayload = {
	// English may be omitted; the API records "-" in its place
	name: { ar: string; en?: string };
	uniNumber: string;
	nationality: Student["nationality"];
	// send the one document that matches the nationality
	nationalId?: string;
	passportNumber?: string;
	facultyId: string;
	acceptanceYear: string;
	acceptanceType: Student["acceptanceType"];
	level: number;
};

export const fetchStudents = async (filters: StudentFilters = {}): Promise<Student[]> => {
	const { data } = await api.get<Student[]>("/gr/students", { params: filters });
	return data;
};

export const fetchStudent = async (id: string): Promise<Student> => {
	const { data } = await api.get<Student>(`/gr/students/${id}`);
	return data;
};

export const createStudent = async (payload: StudentPayload): Promise<Student> => {
	const { data } = await api.post<Student>("/gr/students", payload);
	return data;
};

export const deleteStudent = async (id: string): Promise<void> => {
	await api.delete(`/gr/students/${id}`);
};

/** One row as the bulk endpoints take it; `rowNumber` points back at the sheet. */
export type BulkStudentRow = StudentPayload & { rowNumber: number };

/** What the API says about one row it could not take. */
export type BulkRowReport = {
	rowNumber: number;
	uniNumber: string;
	// i18n keys
	problems: string[];
};

export type BulkCheckReport = {
	rows: BulkRowReport[];
	ready: number;
	blocked: number;
};

// the dry run: nothing is written, every row comes back with its problems
export const checkBulkStudents = async (rows: BulkStudentRow[]): Promise<BulkCheckReport> => {
	const { data } = await api.post<BulkCheckReport>("/gr/students/bulk/check", { rows });
	return data;
};

export const importBulkStudents = async (
	rows: BulkStudentRow[],
): Promise<{ imported: number; skipped: BulkRowReport[] }> => {
	const { data } = await api.post<{ imported: number; skipped: BulkRowReport[] }>(
		"/gr/students/bulk",
		{ rows },
	);
	return data;
};
