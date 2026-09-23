import api from "../lib/api";
import type { Curriculum } from "../types/curriculum";
import type { Grade, SeatingStatus } from "../types/grade";
import type { Student } from "../types/student";

export type GradeFilters = {
	facultyId?: string;
	curriculumId?: string;
	academicYear?: number;
	letter?: Grade["letter"];
	seatingStatus?: SeatingStatus;
};

export type GradePayload = {
	studentId: string;
	curriculumId: string;
	grade: number;
	seatingStatus: SeatingStatus;
	cheatingResolved?: boolean;
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

// one curriculum of the student's current year; the marks are null until entered
export type StudentYearGrade = {
	// the grade row behind this curriculum; null until a mark is entered
	gradeId: string | null;
	curriculumId: string;
	name: Curriculum["name"];
	abbreviation: string | null;
	semester: Curriculum["semester"];
	requirementType: Curriculum["requirementType"];
	grade: number | null;
	letter: Grade["letter"] | null;
	seatingStatus: SeatingStatus | null;
	cheatingResolved: boolean;
};

export const fetchStudentYearGrades = async (studentId: string): Promise<StudentYearGrade[]> => {
	const { data } = await api.get<StudentYearGrade[]>(`/gr/grades/student/${studentId}`);
	return data;
};

export const createGrade = async (payload: GradePayload): Promise<Grade> => {
	const { data } = await api.post<Grade>("/gr/grades", payload);
	return data;
};

// PATCH is partial: send only the fields being changed
export const updateGrade = async (id: string, payload: Partial<GradePayload>): Promise<Grade> => {
	const { data } = await api.patch<Grade>(`/gr/grades/${id}`, payload);
	return data;
};

