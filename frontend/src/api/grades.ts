import api from "../lib/api";
import type { Grade } from "../types/grade";

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

export const createGrade = async (payload: GradePayload): Promise<Grade> => {
	const { data } = await api.post<Grade>("/gr/grades", payload);
	return data;
};
