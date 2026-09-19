import type { Localized } from "./localized";
import type { SEMESTERS, STUDY_LEVELS } from "../utils/academicYears";

export type Curriculum = {
	id: string;
	name: Localized;
	facultyId: string;
	abbreviation: string;
	// academic year = study year 1-6, the same scale as Student.level
	academicYear: (typeof STUDY_LEVELS)[number];
	// semester 1 or 2 of that academic year
	semester: (typeof SEMESTERS)[number];
};
