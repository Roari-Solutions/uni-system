import api from "../lib/api";
import type { Curriculum } from "../types/curriculum";
import type { RequirementType } from "../types/requirementType";

export type CurriculumFilters = {
	facultyId?: string;
	academicYear?: number;
	semester?: number;
	requirementType?: RequirementType;
	q?: string;
};

export type CurriculumPayload = {
	// English may be omitted; the API records "-" in its place
	name: { ar: string; en?: string };
	// omitted for a university requirement: the API links every faculty
	facultyId?: string;
	abbreviation: string;
	academicYear: number;
	semester: number;
	requirementType: RequirementType;
	courseHours: number;
};

export const fetchCurriculums = async (
	filters: CurriculumFilters = {},
): Promise<Curriculum[]> => {
	const { data } = await api.get<Curriculum[]>("/gr/curriculum", { params: filters });
	return data;
};

export type AbbreviationInputs = {
	// omitted for a university requirement, whose letters carry no faculty
	facultyId?: string;
	academicYear: number;
	semester: number;
	requirementType: RequirementType;
	nameEn?: string;
};

// null when the inputs can't make a code yet (e.g. no English name for its letters)
export const suggestAbbreviation = async (inputs: AbbreviationInputs): Promise<string | null> => {
	const { data } = await api.get<{ abbreviation: string | null }>(
		"/gr/curriculum/suggest-abbreviation",
		{ params: inputs },
	);
	return data.abbreviation;
};

export const createCurriculum = async (payload: CurriculumPayload): Promise<Curriculum> => {
	const { data } = await api.post<Curriculum>("/gr/curriculum", payload);
	return data;
};

export const fetchCurriculum = async (id: string): Promise<Curriculum> => {
	const { data } = await api.get<Curriculum>(`/gr/curriculum/${id}`);
	return data;
};

/**
 * Fails with 409 GRADES_ORPHANED when faculties that stop offering the
 * curriculum hold grades in it; resend with confirmOrphanedGrades to go ahead.
 */
export const updateCurriculum = async (
	id: string,
	payload: CurriculumPayload,
	confirmOrphanedGrades = false,
): Promise<Curriculum> => {
	const { data } = await api.patch<Curriculum>(`/gr/curriculum/${id}`, {
		...payload,
		...(confirmOrphanedGrades ? { confirmOrphanedGrades } : {}),
	});
	return data;
};

export const deleteCurriculum = async (id: string): Promise<void> => {
	await api.delete(`/gr/curriculum/${id}`);
};
