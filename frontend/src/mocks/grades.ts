import type { Grade } from "../types/grade";

// TODO: replace mock data with the grades API
export const GRADES: Grade[] = [
	{ id: "1", studentId: "1", curriculumId: "1", grade: 87, status: "pass" },
	{ id: "2", studentId: "1", curriculumId: "2", grade: 74, status: "pass" },
	{ id: "3", studentId: "2", curriculumId: "1", grade: 42, status: "fail" },
	{ id: "4", studentId: "3", curriculumId: "3", grade: 65, status: "pass" },
	{ id: "5", studentId: "4", curriculumId: "4", grade: 91, status: "pass" },
	{ id: "6", studentId: "5", curriculumId: "5", grade: 78, status: "pass" },
	{ id: "7", studentId: "6", curriculumId: "5", grade: 58, status: "pass" },
	{ id: "8", studentId: "7", curriculumId: "3", grade: 35, status: "fail" },
	{ id: "9", studentId: "7", curriculumId: "4", grade: 49, status: "fail" },
];
