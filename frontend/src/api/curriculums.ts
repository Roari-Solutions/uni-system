import api from "../lib/api";
import type { Curriculum } from "../types/curriculum";

export type CurriculumFilters = {
	facultyId?: string;
	academicYear?: number;
	q?: string;
};

export type CurriculumPayload = {
	name: Curriculum["name"];
	facultyId: string;
	abbreviation: string;
	academicYear: number;
};

export const fetchCurriculums = async (
	filters: CurriculumFilters = {},
): Promise<Curriculum[]> => {
	const { data } = await api.get<Curriculum[]>("/gr/curriculum", { params: filters });
	return data;
};

export const createCurriculum = async (payload: CurriculumPayload): Promise<Curriculum> => {
	const { data } = await api.post<Curriculum>("/gr/curriculum", payload);
	return data;
};

export const deleteCurriculum = async (id: string): Promise<void> => {
	await api.delete(`/gr/curriculum/${id}`);
};
