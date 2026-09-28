import api from "../lib/api";
import type { Faculty, FacultyDetail, Specialization } from "../types/faculty";
import type { Localized } from "../types/localized";

/**
 * Lists faculties with their specializations. The API scopes this by role: an
 * admin receives every faculty, a data-entry employee receives only their own.
 */
export const fetchFaculties = async (): Promise<Faculty[]> => {
	const { data } = await api.get<Faculty[]>("/gr/faculties");
	return data;
};

/** The faculty tab: details, specializations with their use, and what lacks one. */
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

/** Fails with 409 NAME_TAKEN when the faculty already has a specialization by that name. */
export const createSpecialization = async (
	facultyId: string,
	name: Localized,
): Promise<Specialization> => {
	const { data } = await api.post<Specialization>(`/gr/faculties/${facultyId}/specializations`, {
		name,
	});
	return data;
};

export const updateSpecialization = async (id: string, name: Localized): Promise<Specialization> => {
	const { data } = await api.patch<Specialization>(`/gr/faculties/specializations/${id}`, { name });
	return data;
};

/** Fails with 409 IN_USE while any student, curriculum or result uses it. */
export const deleteSpecialization = async (id: string): Promise<void> => {
	await api.delete(`/gr/faculties/specializations/${id}`);
};
