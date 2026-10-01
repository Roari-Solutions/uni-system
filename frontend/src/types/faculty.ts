import type { Localized } from "./localized";

// one of a faculty's academic departments (e.g. Engineering -> Electrical)
export type Department = {
	id: string;
	facultyId: string;
	name: Localized;
};

// one of a faculty's specializations, directly under the faculty (departmentId null) or
// under one of its departments; both names are required (the English one prints on results)
export type Specialization = {
	id: string;
	facultyId: string;
	departmentId: string | null;
	name: Localized;
};

export type Faculty = {
	id: string;
	name: Localized;
	// two letters; the bulk import builds university numbers from them
	abbreviation: string | null;
	departments: Department[];
	specializations: Specialization[];
};

// a specialization on the faculty tab, with what uses it
export type SpecializationUsage = Specialization & {
	studentCount: number;
	curriculumCount: number;
};

// a department on the faculty tab, with what uses it
export type DepartmentUsage = Department & {
	studentCount: number;
	// majors tied to the department itself
	curriculumCount: number;
	specializationCount: number;
};

// the faculty tab: its details, departments, specializations, and what still lacks one
export type FacultyDetail = Omit<Faculty, "specializations" | "departments"> & {
	departments: DepartmentUsage[];
	specializations: SpecializationUsage[];
	studentsWithout: number;
	// majors tied to neither a specialization nor a department
	majorsWithout: number;
	studentsWithoutDepartment: number;
};

// a list filter value: a specialization's id, or the rows without one
export const WITHOUT_SPECIALIZATION = "none";

// a list filter value: a department's id, or the rows outside every department
export const WITHOUT_DEPARTMENT = "none";
