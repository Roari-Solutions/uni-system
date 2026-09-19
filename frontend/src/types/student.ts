import type { Localized } from "./localized";
import type { STUDY_LEVELS } from "../utils/academicYears";

export const ACCEPTANCE_TYPES = [
	"general",
	"special",
	"vacancies",
	"teachersChildren",
	"international",
	"arabCertificate",
] as const;
export type AcceptanceType = (typeof ACCEPTANCE_TYPES)[number];

// Sudanese students carry a national ID; foreign students a passport number
export const NATIONALITIES = ["sudanese", "foreign"] as const;
export type Nationality = (typeof NATIONALITIES)[number];

export const STUDENT_STATUSES = ["success", "repeat"] as const;
// null until the year's result is determined
export type StudentStatus = (typeof STUDENT_STATUSES)[number] | null;

export type Student = {
	id: string;
	name: Localized;
	uniNumber: string;
	// optional; "-" is written to the English name when none is given
	nationalId: string | null;
	nationality: Nationality;
	// foreign students only
	passportNumber: string | null;
	acceptanceYear: string;
	acceptanceType: AcceptanceType;
	level: (typeof STUDY_LEVELS)[number];
	facultyId: string;
	status: StudentStatus;
};
