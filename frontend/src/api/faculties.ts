import api from "../lib/api";
import type { Department, Faculty, FacultyDetail, Specialization } from "../types/faculty";
import type { Localized } from "../types/localized";

/**
 * Lists faculties with their departments and specializations. The API scopes this by role: an
 * admin receives every faculty, a data-entry employee receives only their own.
 */
export const fetchFaculties = async (): Promise<Faculty[]> => {
	const { data } = await api.get<Faculty[]>("/gr/faculties");
	return data;
};

/** The faculty tab: details, departments and specializations with their use, and what lacks one. */
export const fetchFaculty = async (id: string): Promise<FacultyDetail> => {
	const { data } = await api.get<FacultyDetail>(`/gr/faculties/${id}`);
	return data;
};

export type FacultyPayload = {
	name?: Localized;
	// two capital letters; builds new university numbers and curriculum codes
	abbreviation?: string;
};

/** Fails with 409 NAME_TAKEN or ABBREVIATION_TAKEN when another faculty holds it. */
export const updateFaculty = async (id: string, payload: FacultyPayload): Promise<Faculty> => {
	const { data } = await api.patch<Faculty>(`/gr/faculties/${id}`, payload);
	return data;
};

/**
 * Fails with 409 NAME_TAKEN when the faculty already has a specialization by
 * that name. departmentId null puts it directly under the faculty.
 */
export const createSpecialization = async (
	facultyId: string,
	name: Localized,
	departmentId: string | null,
): Promise<Specialization> => {
	const { data } = await api.post<Specialization>(`/gr/faculties/${facultyId}/specializations`, {
		name,
		departmentId,
	});
	return data;
};

export type SpecializationChanges = {
	name?: Localized;
	// null: directly under the faculty; the specialization's students move with it
	departmentId?: string | null;
};

/**
 * Renames or moves a specialization. A move fails with 409 RESULTS_APPROVED when
 * it would change approved results, or GRADES_ORPHANED when grades would stop
 * counting; resend with confirmOrphanedGrades to go ahead.
 */
export const updateSpecialization = async (
	id: string,
	changes: SpecializationChanges,
	confirmOrphanedGrades = false,
): Promise<Specialization> => {
	const { data } = await api.patch<Specialization>(`/gr/faculties/specializations/${id}`, {
		...changes,
		...(confirmOrphanedGrades ? { confirmOrphanedGrades } : {}),
	});
	return data;
};

/** Fails with 409 IN_USE while any student, curriculum or result uses it. */
export const deleteSpecialization = async (id: string): Promise<void> => {
	await api.delete(`/gr/faculties/specializations/${id}`);
};

/** Fails with 409 NAME_TAKEN when the faculty already has a department by that name. */
export const createDepartment = async (facultyId: string, name: Localized): Promise<Department> => {
	const { data } = await api.post<Department>(`/gr/faculties/${facultyId}/departments`, { name });
	return data;
};

export const updateDepartment = async (id: string, name: Localized): Promise<Department> => {
	const { data } = await api.patch<Department>(`/gr/faculties/departments/${id}`, { name });
	return data;
};

/** Fails with 409 IN_USE while any specialization, student, curriculum or result uses it. */
export const deleteDepartment = async (id: string): Promise<void> => {
	await api.delete(`/gr/faculties/departments/${id}`);
};
