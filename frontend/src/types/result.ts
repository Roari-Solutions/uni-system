import type { LetterGrade, Resit } from "./grade";
import type { StudentStanding } from "./student";

// the semester's own exams, or the Sup & Sub re-exams that follow them
export type ResultKind = "regular" | "resit";
// board results wait for approval; approving locks the batch's grades for the semester
export type ResultStatus = "pending" | "approved";
// board results show "mark letter"; final results show the letter alone
export type ResultVersion = "board" | "final";

// typed when generating; printed in the sheet's header
export type ResultHeader = {
	program: string;
	batch: string;
	academicYearLabel: string;
	examDate: string;
	collegeBoardDate: string;
	centralBoardDate: string;
};

// a new batch starts blank; each blank line prints as dots to fill in by hand
export const EMPTY_HEADER: ResultHeader = {
	program: "",
	batch: "",
	academicYearLabel: "",
	examDate: "",
	collegeBoardDate: "",
	centralBoardDate: "",
};

export type ResultCourse = {
	sNo: number;
	curriculumId: string;
	code: string | null;
	name: string;
	hours: number;
};

// how a cell prints: an ordinary mark, an absence, a bar, a substitute (sub), no mark (inc),
// a cheating case decided with a zero, or one still open (@)
export type CellState =
	| "marked"
	| "absent"
	| "barred"
	| "substitute"
	| "incomplete"
	| "cheating"
	| "cheatingPending";

export type ResultCell = {
	curriculumId: string;
	state: CellState;
	mark: number | null;
	letter: LetterGrade | null;
	// the Sup & Sub re-exam, on resit sheets only
	resit: { kind: Resit["kind"]; mark: number; letter: LetterGrade } | null;
};

export type ResultTotals = {
	ch: number;
	gp: number;
	gpa: number | null;
};

export type ResultStudent = {
	id: string;
	uniNumber: string;
	name: string;
	standing: StudentStanding;
	cells: ResultCell[];
	semester: ResultTotals;
	// second-semester sheets only
	year: ResultTotals | null;
};

export type ResultSheet = {
	college: string;
	academicYear: number;
	acceptanceYear: string;
	semester: number;
	kind: ResultKind;
	courses: ResultCourse[];
	students: ResultStudent[];
};

export type ResultSummary = {
	id: string;
	facultyId: string;
	academicYear: number;
	acceptanceYear: string;
	semester: number;
	kind: ResultKind;
	status: ResultStatus;
	header: ResultHeader;
	studentCount: number;
	createdAt: string;
	updatedAt: string;
	approvedAt: string | null;
};

export type Result = ResultSummary & {
	sheet: ResultSheet;
	// pending only: the grades changed since the sheet was generated
	stale: boolean;
};

// a cell that may take a Sup & Sub re-exam
export type ResitCandidate = {
	gradeId: string;
	studentId: string;
	uniNumber: string;
	name: string;
	curriculumId: string;
	sNo: number;
	code: string | null;
	state: CellState;
	mark: number | null;
	letter: LetterGrade | null;
	kind: Resit["kind"];
	resit: Resit | null;
};
