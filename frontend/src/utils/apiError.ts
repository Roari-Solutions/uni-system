import axios from "axios";

/** The `code` a 409 carries (e.g. RESULTS_APPROVED), or null for any other failure. */
export const conflictCode = (error: unknown): string | null => {
	if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
	const data = error.response.data as { code?: string } | undefined;
	return data?.code ?? null;
};
