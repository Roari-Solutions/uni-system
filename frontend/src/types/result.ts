import type { LetterGrade, Resit, SeatingStatus } from "./grade";
import type { StudentStanding } from "./student";

// the semester's own exams, or the Sup & Sub re-exams that follow them
export type ResultKind = "regular" | "resit";
// board results wait for approval; approving locks the batch's grades for the semester
export type ResultStatus = "pending" | "approved";
// board results show "mark letter"; final results show the letter alone
export type ResultVersion = "board" | "final";

// typed when generating; printed in the sheet's header
export type ResultHeader = {
	// the degree printed before "Program"; absent on results generated before it was asked for
	degree?: string;
	program: string;
	batch: string;
	// the board copy's line under the title; blank leaves it off, absent prints the default
	resultTitle?: string;
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
	// null when the sheet covers every acceptance year at the level
	acceptanceYear: string | null;
	// the specialization's English name; null for the students without one
	specialization: string | null;
	// the department's English name (its own result, or the specialization's); absent otherwise
	department?: string;
	semester: number;
	kind: ResultKind;
	courses: ResultCourse[];
	students: ResultStudent[];
};

export type ResultSummary = {
	id: string;
	facultyId: string;
	academicYear: number;
	// null when the result covers every acceptance year at the level
	acceptanceYear: string | null;
	// null for the students without a specialization
	specializationId: string | null;
	// a department's own result (its students without a specialization); null otherwise
	departmentId: string | null;
	semester: number;
	kind: ResultKind;
	status: ResultStatus;
	header: ResultHeader;
	studentCount: number;
	// students of the batch left off by hand
	excludedStudentIds: string[];
	createdAt: string;
	updatedAt: string;
	approvedAt: string | null;
};

export type Result = ResultSummary & {
	sheet: ResultSheet;
	// pending only: the grades changed since the sheet was generated
	stale: boolean;
};

// the grade row behind one cell of a preview, so it can be edited in place
export type CellGrade = {
	gradeId: string;
	grade: number | null;
	seatingStatus: SeatingStatus | null;
	cheatingResolved: boolean;
};

// the sheet a batch would get if generated now
export type ResultPreview = {
	sheet: ResultSheet;
	// keyed `${studentId}:${curriculumId}`; a cell with no grade row has none
	grades: Record<string, CellGrade>;
	// students whose semester is locked by approved results
	lockedStudentIds: string[];
	// the students left off, so they can be put back
	excluded: { id: string; uniNumber: string; name: string }[];
	// the acceptance years of the students on the sheet, oldest first; they name the batch
	acceptanceYears: string[];
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
