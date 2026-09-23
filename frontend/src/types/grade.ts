// the grading scale, best first; the API derives a mark's letter, the views only show it
export const LETTER_GRADES = ["A", "B+", "B", "C+", "C", "D", "F"] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

// how a student sat the exam; mirrors the API's seating_status enum
export const SEATING_STATUSES = ["attended", "cheating", "absent"] as const;
export type SeatingStatus = (typeof SEATING_STATUSES)[number];

export type Grade = {
	id: string;
	studentId: string;
	curriculumId: string;
	grade: number;
	letter: LetterGrade;
	// null only on grades saved before seating status existed
	seatingStatus: SeatingStatus | null;
	// cheating only: false while the case is still waiting on a decision
	cheatingResolved: boolean;
};
