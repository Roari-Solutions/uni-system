import api from "../lib/api";
import type {
	ResitCandidate,
	Result,
	ResultHeader,
	ResultKind,
	ResultPreview,
	ResultStatus,
	ResultSummary,
} from "../types/result";

export type ResultFilters = {
	facultyId?: string;
	academicYear?: number;
	acceptanceYear?: string;
	// a specialization's id, or "none" for the results of the students without one
	specializationId?: string;
	semester?: number;
	status?: ResultStatus;
};

// one batch (faculty, level, and one acceptance year or all of them) in one semester
export type ResultBatch = {
	facultyId: string;
	academicYear: number;
	// omitted for every acceptance year at the level
	acceptanceYear?: string;
	// omitted for the students without a specialization
	specializationId?: string;
	semester: number;
	// students left off the sheet by hand
	excludedStudentIds?: string[];
};

/** The sheet the batch would get now; nothing is saved. */
export const previewResult = async (batch: ResultBatch, kind: ResultKind): Promise<ResultPreview> => {
	const { data } = await api.post<ResultPreview>("/gr/results/preview", { ...batch, kind });
	return data;
};

export const fetchResults = async (filters: ResultFilters = {}): Promise<ResultSummary[]> => {
	const { data } = await api.get<ResultSummary[]>("/gr/results", { params: filters });
	return data;
};

export const fetchResult = async (id: string): Promise<Result> => {
	const { data } = await api.get<Result>(`/gr/results/${id}`);
	return data;
};

/**
 * Generates a batch's board results, or regenerates pending ones. Fails with
 * 409 ALREADY_APPROVED once approved, REGULAR_NOT_APPROVED for Sup & Sub
 * before the regular results are, and 400 EMPTY_BATCH when there is nothing to list.
 */
export const generateResult = async (
	batch: ResultBatch,
	kind: ResultKind,
	header: ResultHeader,
): Promise<Result> => {
	const { data } = await api.post<Result>("/gr/results", { ...batch, kind, header });
	return data;
};

/** Fails with 409 RESULT_STALE when the grades moved since generation. */
export const approveResult = async (id: string): Promise<Result> => {
	const { data } = await api.post<Result>(`/gr/results/${id}/approve`);
	return data;
};

export const discardResult = async (id: string): Promise<void> => {
	await api.delete(`/gr/results/${id}`);
};

export const fetchResitCandidates = async (id: string): Promise<ResitCandidate[]> => {
	const { data } = await api.get<ResitCandidate[]>(`/gr/results/${id}/resits`);
	return data;
};
