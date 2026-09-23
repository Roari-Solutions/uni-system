import type { Localized } from "./localized";
import type { RequirementType } from "./requirementType";
import type { SEMESTERS, STUDY_LEVELS } from "../utils/academicYears";

// XXXX-0000: requirement letters, course letters, academic year, semester, serial
export const ABBREVIATION_PATTERN = /^[A-Z]{4}-[1-6][12](0[1-9]|[1-9]\d)$/;

export type Curriculum = {
	id: string;
	name: Localized;
	facultyId: string;
	abbreviation: string;
	// academic year = study year 1-6, the same scale as Student.level
	academicYear: (typeof STUDY_LEVELS)[number];
	// semester 1 or 2 of that academic year
	semester: (typeof SEMESTERS)[number];
	// null only on curriculums created before requirement types existed
	requirementType: RequirementType | null;
	// credit hours; they weight this curriculum's grade points in the GPA
	courseHours: number;
};
