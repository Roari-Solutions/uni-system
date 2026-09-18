import api from "../lib/api";
import type { Student } from "../types/student";

export type StudentFilters = {
	facultyId?: string;
	level?: number;
	acceptanceYear?: string;
	q?: string;
};

export type StudentPayload = {
	name: Student["name"];
	uniNumber: string;
	facultyId: string;
	acceptanceYear: string;
	acceptanceType: Student["acceptanceType"];
	level: number;
	status: Student["status"];
};

export const fetchStudents = async (filters: StudentFilters = {}): Promise<Student[]> => {
	const { data } = await api.get<Student[]>("/gr/students", { params: filters });
	return data;
};

export const createStudent = async (payload: StudentPayload): Promise<Student> => {
	const { data } = await api.post<Student>("/gr/students", payload);
	return data;
};

export const deleteStudent = async (id: string): Promise<void> => {
	await api.delete(`/gr/students/${id}`);
};
