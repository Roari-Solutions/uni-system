import type { Localized } from "./localized";
import type { STUDY_LEVELS } from "../utils/academicYears";

export const ACCEPTANCE_TYPES = ["general", "special", "vacancies", "teachersChildren"] as const;
export type AcceptanceType = (typeof ACCEPTANCE_TYPES)[number];

export const STUDENT_STATUSES = ["success", "repeat"] as const;
// null until the year's result is determined
export type StudentStatus = (typeof STUDENT_STATUSES)[number] | null;

export type Student = {
	id: string;
	name: Localized;
	uniNumber: string;
	acceptanceYear: string;
	acceptanceType: AcceptanceType;
	level: (typeof STUDY_LEVELS)[number];
	facultyId: string;
	status: StudentStatus;
};
