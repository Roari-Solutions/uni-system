// the grading scale, best first; the API derives a mark's letter, the views only show it
export const LETTER_GRADES = ["A+", "A", "B+", "B", "C+", "C", "D", "F"] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

export type Grade = {
	id: string;
	studentId: string;
	curriculumId: string;
	grade: number;
	letter: LetterGrade;
};
