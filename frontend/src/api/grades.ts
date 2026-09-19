import api from "../lib/api";
import type { Curriculum } from "../types/curriculum";
import type { Grade } from "../types/grade";
import type { Student } from "../types/student";

export type GradeFilters = {
	facultyId?: string;
	curriculumId?: string;
	academicYear?: number;
	status?: Grade["status"];
};

export type GradePayload = {
	studentId: string;
	curriculumId: string;
	grade: number;
};

export const fetchGrades = async (filters: GradeFilters = {}): Promise<Grade[]> => {
	const { data } = await api.get<Grade[]>("/gr/grades", { params: filters });
	return data;
};

export type PendingGrades = {
	curriculum: Pick<Curriculum, "id" | "name" | "abbreviation" | "facultyId" | "academicYear" | "semester">;
	// the curriculum's faculty and year cohort, minus anyone already graded in it
	students: Pick<Student, "id" | "name" | "uniNumber">[];
};

export const fetchPendingGrades = async (curriculumId: string): Promise<PendingGrades> => {
	const { data } = await api.get<PendingGrades>(`/gr/grades/pending/${curriculumId}`);
	return data;
};

export const createGrade = async (payload: GradePayload): Promise<Grade> => {
	const { data } = await api.post<Grade>("/gr/grades", payload);
	return data;
};
