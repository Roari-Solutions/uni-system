export const GRADE_STATUSES = ["pass", "fail"] as const;
export type GradeStatus = (typeof GRADE_STATUSES)[number];

export type Grade = {
	id: string;
	studentId: string;
	curriculumId: string;
	grade: number;
	status: GradeStatus;
};
