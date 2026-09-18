import type { Localized } from "./localized";
import type { STUDY_LEVELS } from "../utils/academicYears";

export type Curriculum = {
	id: string;
	name: Localized;
	facultyId: string;
	abbreviation: string;
	// academic year = study year 1-6, the same scale as Student.level
	academicYear: (typeof STUDY_LEVELS)[number];
};
