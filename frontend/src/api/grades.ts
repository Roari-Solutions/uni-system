import api from "../lib/api";
import type { Curriculum } from "../types/curriculum";
import type { Grade, SeatingStatus } from "../types/grade";
import type { Student, SuspensionYears } from "../types/student";

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
	// penalties recorded when this cheating case was decided
	penaltyWarning: boolean;
	penaltySuspensionYears: SuspensionYears | null;
	penaltyDismissal: boolean;
};

export const fetchStudentYearGrades = async (studentId: string): Promise<StudentYearGrade[]> => {
	const { data } = await api.get<StudentYearGrade[]>(`/gr/grades/student/${studentId}`);
	return data;
};

export const createGrade = async (payload: GradePayload): Promise<Grade> => {
	const { data } = await api.post<Grade>("/gr/grades", payload);
	return data;
};

/** How staff decided a cheating case, and any penalties on the student. */
export type CheatingDecision = {
	// "accept" keeps the mark and moves the row to attended; "zero" keeps the case and scores 0
	outcome: "accept" | "zero";
	warning: boolean;
	// omitted for no suspension; never sent with a dismissal
	suspensionYears?: SuspensionYears;
	dismiss: boolean;
};

export const resolveCheating = async (id: string, decision: CheatingDecision): Promise<Grade> => {
	const { data } = await api.post<Grade>(`/gr/grades/${id}/resolve`, decision);
	return data;
};

// PATCH is partial: send only the fields being changed
export const updateGrade = async (id: string, payload: Partial<GradePayload>): Promise<Grade> => {
	const { data } = await api.patch<Grade>(`/gr/grades/${id}`, payload);
	return data;
};


// a stored semester GPA; the annual figure averages the semesters on read
export type SemesterGpa = {
	semester: number;
	gpSum: number;
	courseHours: number;
	gpa: number;
	status: "pass" | "fail" | null;
};

export type StudentGpas = {
	academicYear: number;
	semesters: SemesterGpa[];
	// null until a semester of that year is complete
	annual: number | null;
};

export const fetchStudentGpas = async (studentId: string): Promise<StudentGpas> => {
	const { data } = await api.get<StudentGpas>(`/gr/grades/student/${studentId}/gpa`);
	return data;
};
