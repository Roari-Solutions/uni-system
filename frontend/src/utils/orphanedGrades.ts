import axios from "axios";

/**
 * How many grades an edit would leave behind, when the API refused it for that
 * reason (409 GRADES_ORPHANED). The grades are kept as history but stop counting,
 * so the caller asks the user before resending with the confirmation flag.
 */
export const orphanedGradeCount = (error: unknown): number | null => {
	if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
	const data = error.response.data as { code?: string; count?: number } | undefined;
	return data?.code === "GRADES_ORPHANED" ? (data.count ?? 0) : null;
};
