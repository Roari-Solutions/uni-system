import type { LetterGrade } from 'src/grades/letter-grade';
import { pointsOf } from 'src/grades/letter-grade';
import type { StudentStanding } from 'src/common/student-standing';

/** The academic status key: what the Remarks column may hold. Mirrors REMARKS in the views. */
export const REMARK_CODES = [
  'Crg',
  'Cro',
  'Dsc',
  'Dsm',
  'Frz',
  'Pas',
  'Prm',
  'Rad',
  'Rdo',
  'Rej',
  'Rpt',
  'Rrg',
  'Rst',
  'Rtk',
  'Sub',
  'Sup',
  'Sus',
] as const;
export type RemarkCode = (typeof REMARK_CODES)[number];

/** What staff type when generating a result; printed in the sheet's header. */
export interface ResultHeader {
  /**
   * The degree printed before "Program", e.g. "Bachelor". Absent on results
   * generated before it was asked for; those print the default.
   */
  degree?: string;
  /** e.g. "Information Technology"; printed after "<degree> Program in". */
  program: string;
  /** The batch's label, e.g. "Batch 12". */
  batch: string;
  /** The calendar academic year, e.g. "2025/2026". */
  academicYearLabel: string;
  /**
   * The line under the title on the board's copy, e.g. "College Board Results"
   * or "Sup College Board Results". Blank leaves the line off; absent on
   * results from before it was asked for, which print the default.
   */
  resultTitle?: string;
  /** Who signs each page; optional, and a blank one prints a line to sign. */
  examinationOfficer?: string;
  collegeRegistrar?: string;
  dean?: string;
  /**
   * Each student's remark chosen on the sheet, by student id: a code from the
   * academic status key, or "" for a blank cell. Students without one print
   * the automatic remark. Absent on results from before remarks.
   */
  remarks?: Record<string, RemarkCode | ''>;
  /** Words printed after a student's name on this result only, by student id. */
  nameAdditions?: Record<string, string>;
  examDate: string;
  collegeBoardDate: string;
  centralBoardDate: string;
}

/** One curriculum column: its S.No., code, English name and credit hours. */
export interface ResultCourse {
  sNo: number;
  curriculumId: string;
  code: string | null;
  name: string;
  hours: number;
}

/**
 * How a cell prints. `marked` is an ordinary mark; `cheating` a case decided
 * with a zero; `cheatingPending` one still undecided; `incomplete` no mark yet.
 */
export const CELL_STATES = [
  'marked',
  'absent',
  'barred',
  'substitute',
  'incomplete',
  'cheating',
  'cheatingPending',
] as const;
export type CellState = (typeof CELL_STATES)[number];

export type ResitKind = 'supplementary' | 'substitute';

/** One student's cell under one curriculum. */
export interface ResultCell {
  curriculumId: string;
  state: CellState;
  /** The original mark and letter; null when there is none (incomplete, substitute, undecided cheating). */
  mark: number | null;
  letter: LetterGrade | null;
  /** The Sup & Sub re-exam, on resit sheets only. */
  resit: { kind: ResitKind; mark: number; letter: LetterGrade } | null;
}

/** Credit hours, grade points and GPA over the cells that count. */
export interface ResultTotals {
  ch: number;
  gp: number;
  /** Null when no hours count. */
  gpa: number | null;
}

export interface ResultStudent {
  id: string;
  uniNumber: string;
  /** English; all exported sheets are in English. */
  name: string;
  standing: StudentStanding;
  cells: ResultCell[];
  semester: ResultTotals;
  /** Second-semester sheets only: the whole academic year. */
  year: ResultTotals | null;
  /**
   * Second-semester sheets only: the cumulative GPA, the plain average of every
   * semester GPA the student has to date, this year's two included. Null when
   * none has one yet; absent on sheets from before it was printed.
   */
  cgpa?: number | null;
}

/** The frozen sheet: everything the board and final versions print. */
export interface ResultSheet {
  college: string;
  academicYear: number;
  /** Null when the sheet covers every acceptance year at the level. */
  acceptanceYear: string | null;
  /** The specialization's English name; null for students without one. */
  specialization: string | null;
  /**
   * The department's English name: the department's own result, or the one
   * the specialization sits under. Absent otherwise, so sheets from before
   * departments still compare equal.
   */
  department?: string;
  semester: number;
  kind: 'regular' | 'resit';
  courses: ResultCourse[];
  students: ResultStudent[];
}

/** What a cell counts as: the resit when there is one and the sheet uses it. */
export function effectiveLetter(
  cell: ResultCell,
  withResit: boolean,
): LetterGrade | null {
  return withResit && cell.resit ? cell.resit.letter : cell.letter;
}

/**
 * Whether a cell's hours count. A missing mark, an undecided cheating case and
 * an excused (substitute) absence without its re-exam are all left out.
 */
export function counts(cell: ResultCell, withResit: boolean): boolean {
  if (withResit && cell.resit) return true;
  return (
    cell.state !== 'incomplete' &&
    cell.state !== 'cheatingPending' &&
    cell.state !== 'substitute'
  );
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));

/** A semester's totals over its cells; the GPA is GP / CH, as the stored GPA is. */
export function totalsOf(
  cells: ResultCell[],
  courses: ResultCourse[],
  withResit: boolean,
): ResultTotals {
  const hoursOf = new Map(courses.map((c) => [c.curriculumId, c.hours]));
  let ch = 0;
  let gp = 0;
  for (const cell of cells) {
    const letter = effectiveLetter(cell, withResit);
    if (!letter || !counts(cell, withResit)) continue;
    const hours = hoursOf.get(cell.curriculumId) ?? 0;
    ch += hours;
    gp += pointsOf(letter) * hours;
  }
  return { ch, gp: round(gp, 2), gpa: ch ? round(gp / ch, 2) : null };
}

/**
 * The year's totals: hours and points summed, and the GPA as the plain average
 * of the semesters that have one, matching the annual GPA the system shows.
 */
export function yearTotalsOf(semesters: ResultTotals[]): ResultTotals {
  const gpas = semesters
    .map((s) => s.gpa)
    .filter((g): g is number => g !== null);
  return {
    ch: semesters.reduce((acc, s) => acc + s.ch, 0),
    gp: round(
      semesters.reduce((acc, s) => acc + s.gp, 0),
      2,
    ),
    gpa: gpas.length
      ? round(gpas.reduce((acc, g) => acc + g, 0) / gpas.length, 2)
      : null,
  };
}

/** The cumulative GPA: the plain average of the semester GPAs that exist, like the annual GPA. */
export function cumulativeGpaOf(
  semesterGpas: (number | null)[],
): number | null {
  const counted = semesterGpas.filter((g): g is number => g !== null);
  return counted.length
    ? round(counted.reduce((acc, g) => acc + g, 0) / counted.length, 2)
    : null;
}

/** JSON with object keys sorted, so two sheets compare equal whatever order jsonb kept them in. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
