import axios from "axios";
import { conflictCode } from "./apiError";

/** Why generating results failed, as an i18n key. */
export const generateError = (error: unknown): string => {
	const code = conflictCode(error);
	if (code === "ALREADY_APPROVED") return "results.errors.alreadyApproved";
	if (code === "REGULAR_NOT_APPROVED") return "results.errors.regularNotApproved";
	if (axios.isAxiosError(error) && error.response?.status === 400) {
		const data = error.response.data as { code?: string } | undefined;
		if (data?.code === "EMPTY_BATCH") return "results.errors.emptyBatch";
	}
	return "common.saveFailed";
};
