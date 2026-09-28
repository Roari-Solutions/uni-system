import type { Localized } from "./localized";

// one of a faculty's specializations; both names are required (the English one prints on results)
export type Specialization = {
	id: string;
	facultyId: string;
	name: Localized;
};

export type Faculty = {
	id: string;
	name: Localized;
	// two letters; the bulk import builds university numbers from them
	abbreviation: string | null;
	specializations: Specialization[];
};

// a specialization on the faculty tab, with what uses it
export type SpecializationUsage = Specialization & {
	studentCount: number;
	curriculumCount: number;
};

// the faculty tab: its details, specializations, and what still lacks one
export type FacultyDetail = Omit<Faculty, "specializations"> & {
	specializations: SpecializationUsage[];
	studentsWithout: number;
	majorsWithout: number;
};

// a list filter value: a specialization's id, or the rows without one
export const WITHOUT_SPECIALIZATION = "none";
