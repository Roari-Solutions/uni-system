// the grading scale, best first; the API derives a mark's letter, the views only show it
export const LETTER_GRADES = ["A", "B+", "B", "C+", "C", "D", "F"] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

// how a student sat the exam; mirrors the API's seating_status enum
export const SEATING_STATUSES = ["attended", "cheating", "absent", "barred", "substitute"] as const;
export type SeatingStatus = (typeof SEATING_STATUSES)[number];

// a Sup & Sub re-exam: supplementary after an F (counts for at most a C), substitute after an excuse
export type ResitKind = "supplementary" | "substitute";

export type Resit = {
	kind: ResitKind;
	grade: number;
	// the letter it counts as
	letter: LetterGrade;
};

export type Grade = {
	id: string;
	studentId: string;
	curriculumId: string;
	// null for a substitute, which has no mark until its re-exam
	grade: number | null;
	letter: LetterGrade | null;
	// null only on grades saved before seating status existed
	seatingStatus: SeatingStatus | null;
	// cheating only: false while the case is still waiting on a decision
	cheatingResolved: boolean;
	resit: Resit | null;
};
