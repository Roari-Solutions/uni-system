import api from "../lib/api";
import type { Faculty } from "../types/faculty";

/**
 * Lists faculties. The API scopes this by role: an admin receives every
 * faculty, a data-entry employee receives only their own.
 */
export const fetchFaculties = async (): Promise<Faculty[]> => {
	const { data } = await api.get<Faculty[]>("/gr/faculties");
	return data;
};
