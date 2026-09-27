import { z } from "zod";
import type { SeatingStatus } from "../types/grade";

const GRADE_RANGE = "gradeSheet.errors.gradeRange";

/** A typed mark, checked as the API checks it; messages are i18n keys. */
export const gradeSchema = z
	.string()
	.trim()
	.min(1, "gradeSheet.errors.required")
	.transform(Number)
	.pipe(z.number({ error: "gradeSheet.errors.gradeNumber" }).min(0, GRADE_RANGE).max(100, GRADE_RANGE));

// an absence scores 0; the API enforces this too. A cheating case keeps its
// mark and is decided later from the grades list or the student's page.
export const voidsMark = (status: SeatingStatus) => status === "absent";
