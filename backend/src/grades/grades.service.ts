import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { curriculums, facultyCurriculums, gpas, grades, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import {
  CreateGradeDto,
  ListGradesQueryDto,
  ResitGradeDto,
  ResolveCheatingDto,
  UpdateGradeDto,
  type SeatingStatus,
} from './dto/grades.dto';
import { assertNotFrozen, type StudentStanding } from 'src/common/student-standing';
import {
  capLetter,
  letterOf,
  pointsOf,
  SUPPLEMENTARY_CAP,
  type LetterGrade,
} from './letter-grade';
import { assertFaculty, scopeFacultyId } from 'src/gr-scope/gr-scope';
import type { RequirementType } from 'src/common/requirement-type';
import { takesCurriculum } from 'src/common/specialization';
import {
  academicYearToNumber,
  semesterToNumber,
  SEMESTERS,
  type AcademicYear,
  type Semester,
} from 'src/common/academic-year';
import {
  approvedStudents,
  assertGradesOpen,
  hasApprovedResults,
  resitsClosed,
} from 'src/results/result-lock';

/** Absence and a bar void the mark: the grade is stored as 0, so its letter is F. */
export function voidsMark(status: SeatingStatus | null): boolean {
  return status === 'absent' || status === 'barred';
}

/** A substitute (accepted excuse) has no mark until the substitute exam. */
export function takesNoMark(status: SeatingStatus | null): boolean {
  return status === 'substitute';
}

type ResitKind = NonNullable<(typeof grades.$inferSelect)['resitKind']>;

/**
 * Which re-exam a row may take, if any: a substitute exam after an excuse, or a
 * supplementary one after any F (a failing mark, an absence, a bar or a
 * cheating zero). An undecided cheating case takes none.
 */
export function resitKindOf(row: {
  seatingStatus: SeatingStatus | null;
  letter: LetterGrade | null;
  cheatingResolved: boolean;
}): ResitKind | null {
  if (row.seatingStatus === 'substitute') return 'substitute';
  if (awaitsDecision(row.seatingStatus, row.cheatingResolved)) return null;
  return row.letter === 'F' ? 'supplementary' : null;
}

/**
 * A cheating case waits on a decision: staff either accept the mark (moving the
 * row to attended) or keep the cheating and record a 0. Until then the mark is
 * left out of the academic year entirely.
 */
function awaitsDecision(status: SeatingStatus | null, resolved: boolean): boolean {
  return status === 'cheating' && !resolved;
}

/**
 * The student's standing after a cheating decision. Dismissal outranks a
 * suspension, and a longer suspension outranks a shorter one; nothing here
 * lowers a standing, which only an admin's reinstatement does.
 */
function nextStanding(
  current: StudentStanding,
  currentYears: number | null,
  dto: ResolveCheatingDto,
): { standing: StudentStanding; suspensionYears: number | null } {
  if (current === 'dismissed' || dto.dismiss) {
    return { standing: 'dismissed', suspensionYears: null };
  }
  if (dto.suspensionYears !== undefined) {
    return {
      standing: 'suspended',
      suspensionYears: Math.max(dto.suspensionYears, currentYears ?? 0),
    };
  }
  return { standing: current, suspensionYears: currentYears };
}

/** A student's stored semester GPAs for one academic year, plus the annual average. */
export interface StudentGpasView {
  academicYear: number;
  semesters: {
    semester: number;
    gpSum: number;
    courseHours: number;
    gpa: number;
    status: 'pass' | 'fail' | null;
  }[];
  /** The semesters above weighted by their hours (all GP / all CH); null until one is stored. */
  annual: number | null;
}

/** Grade points for one curriculum: the letter's points weighted by its course hours. */
function gpOf(letter: LetterGrade, courseHours: number): string {
  return (pointsOf(letter) * courseHours).toFixed(2);
}

/** A Sup & Sub re-exam mark, and the letter it counts as. */
export interface ResitView {
  kind: ResitKind;
  grade: number;
  letter: LetterGrade;
}

/** A grade as the views consume it; `letter` comes from the mark on every write. */
export interface GradeView {
  id: string;
  studentId: string;
  curriculumId: string;
  /** Null for a substitute, which has no mark until its re-exam. */
  grade: number | null;
  letter: LetterGrade | null;
  // null only on rows saved before seating status existed
  seatingStatus: SeatingStatus | null;
  cheatingResolved: boolean;
  resit: ResitView | null;
}

type GradeRow = typeof grades.$inferSelect;

/** The resit a row carries, if any. */
function resitOf(row: Pick<GradeRow, 'resitKind' | 'resitGrade' | 'resitLetter'>): ResitView | null {
  if (!row.resitKind || row.resitGrade === null || !row.resitLetter) return null;
  return { kind: row.resitKind, grade: Number(row.resitGrade), letter: row.resitLetter };
}

/** A stored row as the views consume it. */
function toGradeView(row: GradeRow): GradeView {
  const grade = row.grade === null ? null : Number(row.grade);
  return {
    id: row.id,
    studentId: row.studentId,
    curriculumId: row.curriculumId,
    grade,
    letter: grade === null ? null : letterOf(grade),
    seatingStatus: row.seatingStatus,
    cheatingResolved: row.cheatingResolved,
    resit: resitOf(row),
  };
}

/** A curriculum's entry sheet: the curriculum and its year's students, each with their mark if any. */
export interface PendingGradesView {
  curriculum: {
    id: string;
    name: { en: string; ar: string };
    abbreviation: string | null;
    facultyId: string;
    academicYear: number;
    semester: number;
  };
  students: {
    id: string;
    name: { en: string; ar: string };
    uniNumber: string;
    acceptanceYear: string;
    specializationId: string | null;
    departmentId: string | null;
    /** The student's grade row for this curriculum; null until one exists. */
    gradeId: string | null;
    /** Null until a mark is entered, even when a row exists. */
    grade: number | null;
    letter: LetterGrade | null;
    seatingStatus: SeatingStatus | null;
    cheatingResolved: boolean;
    resit: ResitView | null;
    /** The semester's results are approved, so the mark can no longer change. */
    locked: boolean;
  }[];
}

/** One curriculum of a student's current year, with the mark if one is entered. */
export interface StudentYearGradeView {
  /** The grade row, so the views can edit it; null until a mark is entered. */
  gradeId: string | null;
  curriculumId: string;
  name: { en: string; ar: string };
  abbreviation: string | null;
  semester: number;
  requirementType: RequirementType | null;
  grade: number | null;
  letter: LetterGrade | null;
  // null when no grade row exists yet, or on rows saved before seating status existed
  seatingStatus: SeatingStatus | null;
  cheatingResolved: boolean;
  /** Penalties recorded when this cheating case was decided. */
  penaltyWarning: boolean;
  penaltySuspensionYears: number | null;
  penaltyDismissal: boolean;
  resit: ResitView | null;
  /** The semester's results are approved, so the mark can no longer change. */
  locked: boolean;
}

/** CRUD for grades and per-semester GPAs, with faculty scoping. */
@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  /** A semester passes at this GPA; single grades carry a letter instead (letterOf). */
  static readonly PASS_GPA = 2;

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Resolves a curriculum by id, with the academic year the grade inherits. */
  private async curriculumOrThrow(id: string, notFound: boolean) {
    const row = await this.db.query.curriculums.findFirst({
      where: eq(curriculums.id, id),
    });
    if (!row) {
      if (notFound) throw new NotFoundException();
      throw new BadRequestException();
    }
    return row;
  }

  /**
   * One semester's grade points for a student: the rows that count, the course
   * hours behind them, and whether the semester is fully marked. An undecided
   * cheating case and a substitute still waiting on its re-exam are skipped on
   * every count, so the semester can complete around them and their points stay
   * out until they are settled. `gp` already follows any resit letter.
   */
  async semesterCoverage(studentId: string, academicYear: AcademicYear, semester: Semester) {
    const empty = { complete: false, gpSum: 0, courseHours: 0 };

    const student = await this.db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { facultyId: true, specializationId: true, departmentId: true },
    });
    if (!student) throw new NotFoundException();

    const links = await this.db.query.facultyCurriculums.findMany({
      where: eq(facultyCurriculums.facultyId, student.facultyId),
      with: {
        curriculum: {
          columns: {
            id: true,
            academicYear: true,
            semester: true,
            courseHours: true,
            requirementType: true,
            specializationId: true,
            departmentId: true,
          },
        },
      },
    });
    // only this academic year's curriculums, only this semester's, and only the
    // majors of the student's own specialization and department
    const offered = links
      .map((link) => link.curriculum)
      .filter((c) => c.academicYear === academicYear && c.semester === semester)
      .filter((c) => takesCurriculum(student, c));
    if (!offered.length) return empty;

    const rows = await this.db.query.grades.findMany({
      where: and(
        eq(grades.studentId, studentId),
        inArray(
          grades.curriculumId,
          offered.map((c) => c.id),
        ),
      ),
    });

    const waiting = (g: GradeRow) =>
      awaitsDecision(g.seatingStatus, g.cheatingResolved) ||
      (takesNoMark(g.seatingStatus) && g.gp === null);
    const counted = rows.filter((g) => g.gp !== null && !waiting(g));
    const pending = new Set(rows.filter(waiting).map((g) => g.curriculumId));

    const countedIds = new Set(counted.map((g) => g.curriculumId));
    const complete = offered.every((c) => countedIds.has(c.id) || pending.has(c.id));
    if (!complete || !counted.length) return empty;

    const gpSum = counted.reduce((acc, g) => acc + Number(g.gp), 0);
    const courseHours = offered
      .filter((c) => countedIds.has(c.id))
      .reduce((acc, c) => acc + c.courseHours, 0);
    if (!courseHours) return empty;

    return { complete, gpSum, courseHours };
  }

  /**
   * Recomputes one semester's GPA, unless the student is suspended or dismissed:
   * their results stay as they were when the record froze.
   */
  private async refreshSemesterGpa(
    studentId: string,
    academicYear: AcademicYear,
    semester: Semester,
  ): Promise<void> {
    const student = await this.db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { standing: true },
    });
    if (student?.standing !== 'active') return;
    await this.rebuildSemesterGpa(studentId, academicYear, semester);
  }

  /**
   * Recomputes and stores one semester's GPA: upserts when the semester is
   * fully marked, and drops any stale row when it is not.
   */
  private async rebuildSemesterGpa(
    studentId: string,
    academicYear: AcademicYear,
    semester: Semester,
  ): Promise<void> {
    const { complete, gpSum, courseHours } = await this.semesterCoverage(
      studentId,
      academicYear,
      semester,
    );
    const where = and(
      eq(gpas.studentId, studentId),
      eq(gpas.academicYear, academicYear),
      eq(gpas.semester, semester),
    );
    if (!complete) {
      await this.db.delete(gpas).where(where);
      return;
    }

    const value = gpSum / courseHours;
    const gpa = value.toFixed(2);
    const status = value >= GradesService.PASS_GPA ? 'pass' : 'fail';
    await this.db
      .insert(gpas)
      .values({
        studentId,
        academicYear,
        semester,
        gpSum: gpSum.toFixed(2),
        courseHours,
        gpa,
        status,
      })
      .onConflictDoUpdate({
        target: [gpas.studentId, gpas.academicYear, gpas.semester],
        set: { gpSum: gpSum.toFixed(2), courseHours, gpa, status },
      });
  }

  /**
   * Rebuilds the stored grade points of every grade in one curriculum, then the
   * GPA of each student behind them. Called when the curriculum's course hours
   * change, since those hours weight the points.
   */
  async recomputeCurriculum(curriculumId: string): Promise<void> {
    const curriculum = await this.db.query.curriculums.findFirst({
      where: eq(curriculums.id, curriculumId),
      columns: { id: true, academicYear: true, semester: true, courseHours: true },
    });
    if (!curriculum) return;

    const rows = await this.db.query.grades.findMany({
      where: eq(grades.curriculumId, curriculum.id),
      columns: { id: true, studentId: true, letter: true, resitLetter: true },
    });

    for (const row of rows) {
      // a resit's letter replaces the original in the points
      const letter = row.resitLetter ?? row.letter;
      if (!letter) continue;
      await this.db
        .update(grades)
        .set({ gp: gpOf(letter, curriculum.courseHours) })
        .where(eq(grades.id, row.id));
    }

    for (const studentId of new Set(rows.map((r) => r.studentId))) {
      await this.refreshSemesterGpa(studentId, curriculum.academicYear, curriculum.semester);
    }
    this.logger.log(`Recomputed grade points for curriculum: ${curriculum.id}`);
  }

  /**
   * Rebuilds the stored GPA of every student a curriculum change reaches: the
   * students of those faculties sitting that academic year. Adding a curriculum
   * leaves their semester incomplete, so their stale rows are dropped here.
   */
  async refreshFacultiesSemester(
    facultyIds: string[],
    academicYear: AcademicYear,
    semester: Semester,
  ): Promise<void> {
    if (!facultyIds.length) return;

    const cohort = await this.db.query.students.findMany({
      where: and(
        inArray(students.facultyId, facultyIds),
        eq(students.academicYear, academicYear),
      ),
      columns: { id: true },
    });

    for (const student of cohort) {
      await this.refreshSemesterGpa(student.id, academicYear, semester);
    }
    this.logger.log(`Refreshed GPAs for ${cohort.length} students`);
  }

  /** Rebuilds one semester's stored GPA for each of these students. */
  async refreshStudentsSemester(
    studentIds: Iterable<string>,
    academicYear: AcademicYear,
    semester: Semester,
  ): Promise<void> {
    for (const studentId of new Set(studentIds)) {
      await this.refreshSemesterGpa(studentId, academicYear, semester);
    }
  }

  /**
   * A student's stored semester GPAs for one academic year, plus the annual
   * figure: those semesters weighted by their hours (all GP / all CH), as the
   * results sheet's year GPA is; computed here and never stored.
   */
  async studentGpas(studentId: string, caller: GrCaller): Promise<StudentGpasView> {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.id, studentId),
        columns: { id: true, facultyId: true, academicYear: true },
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);

      const rows = await this.db.query.gpas.findMany({
        where: and(eq(gpas.studentId, student.id), eq(gpas.academicYear, student.academicYear)),
      });

      const semesters = rows
        .map((row) => ({
          semester: semesterToNumber(row.semester),
          gpSum: Number(row.gpSum),
          courseHours: row.courseHours,
          gpa: Number(row.gpa),
          status: row.status,
        }))
        .sort((a, b) => a.semester - b.semester);

      const hours = semesters.reduce((acc, s) => acc + s.courseHours, 0);
      const annual = hours
        ? Number((semesters.reduce((acc, s) => acc + s.gpSum, 0) / hours).toFixed(2))
        : null;

      return { academicYear: academicYearToNumber(student.academicYear), semesters, annual };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to read GPAs: ${studentId}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Lists grades, narrowed by the caller's faculty scope and the list view's
   * filters. Rows with no mark yet are omitted, except a substitute, which has
   * none until its re-exam.
   */
  async listGrades(caller: GrCaller, query: ListGradesQueryDto = {}): Promise<GradeView[]> {
    try {
      const scope = scopeFacultyId(caller);
      // data-entry may only ever see their own faculty, whatever they asked for
      const facultyId = scope ?? query.facultyId;
      if (scope && query.facultyId && query.facultyId !== scope) {
        throw new UnauthorizedException();
      }

      const rows = await this.db.query.grades.findMany({
        where: or(isNotNull(grades.grade), eq(grades.seatingStatus, 'substitute')),
        with: {
          student: { columns: { id: true, facultyId: true } },
          curriculum: { columns: { id: true, academicYear: true } },
        },
      });

      let views = rows
        .filter((row) => !facultyId || row.student.facultyId === facultyId)
        .filter((row) => !query.curriculumId || row.curriculumId === query.curriculumId)
        .filter((row) => !query.academicYear || row.curriculum.academicYear === query.academicYear)
        .filter((row) => !query.seatingStatus || row.seatingStatus === query.seatingStatus)
        .map(toGradeView);

      if (query.letter) views = views.filter((v) => v.letter === query.letter);

      return views;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to list grades', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * The active students of the curriculum's academic year, each with their mark
   * for it (null until entered), for the entry sheet. A university requirement is offered by every
   * faculty, so the sheet lists the faculty it was opened for: a scoped caller's
   * own, the one asked for, or, for an admin who names none, every offering one.
   */
  async pendingGrades(
    curriculumId: string,
    caller: GrCaller,
    requestedFacultyId?: string,
  ): Promise<PendingGradesView> {
    try {
      const curriculum = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.id, curriculumId),
        with: { facultyCurriculums: { columns: { facultyId: true } } },
      });
      const offering = curriculum?.facultyCurriculums.map((l) => l.facultyId) ?? [];
      if (!curriculum || !offering.length) throw new NotFoundException();

      const scope = scopeFacultyId(caller);
      if (scope && requestedFacultyId && requestedFacultyId !== scope) {
        throw new UnauthorizedException();
      }
      const chosen = scope ?? requestedFacultyId;
      if (chosen && !offering.includes(chosen)) {
        // a scoped caller whose faculty doesn't offer it may not see it at all
        if (scope) throw new UnauthorizedException();
        throw new NotFoundException();
      }
      const facultyIds = chosen ? [chosen] : offering;
      const facultyId = chosen ?? offering[0];

      const cohort = await this.db.query.students.findMany({
        where: and(
          inArray(students.facultyId, facultyIds),
          eq(students.academicYear, curriculum.academicYear),
          // suspended and dismissed students take no new marks
          eq(students.standing, 'active'),
          // a specialization's major is taken by that specialization's students
          // only, and a department's by that department's
          curriculum.requirementType === 'major' && curriculum.specializationId
            ? eq(students.specializationId, curriculum.specializationId)
            : curriculum.requirementType === 'major' && curriculum.departmentId
              ? eq(students.departmentId, curriculum.departmentId)
              : undefined,
        ),
        columns: {
          id: true,
          nameEn: true,
          nameAr: true,
          uniNumber: true,
          acceptanceYear: true,
          specializationId: true,
          departmentId: true,
        },
      });

      // a student with a row, marked or not, is edited through it (student_curriculum_unique)
      const graded = cohort.length
        ? await this.db.query.grades.findMany({
            where: and(
              eq(grades.curriculumId, curriculum.id),
              inArray(
                grades.studentId,
                cohort.map((s) => s.id),
              ),
            ),
            columns: {
              id: true,
              studentId: true,
              grade: true,
              letter: true,
              seatingStatus: true,
              cheatingResolved: true,
              resitKind: true,
              resitGrade: true,
              resitLetter: true,
            },
          })
        : [];
      const markOf = new Map(graded.map((g) => [g.studentId, g]));
      const locked = await approvedStudents(
        this.db,
        cohort.map((s) => s.id),
        curriculum.academicYear,
        curriculum.semester,
      );

      return {
        curriculum: {
          id: curriculum.id,
          name: { en: curriculum.nameEn, ar: curriculum.nameAr },
          abbreviation: curriculum.abbreviation,
          facultyId,
          academicYear: academicYearToNumber(curriculum.academicYear),
          semester: semesterToNumber(curriculum.semester),
        },
        students: cohort
          .sort((a, b) => a.uniNumber.localeCompare(b.uniNumber))
          .map((s) => {
            const mark = markOf.get(s.id);
            const grade = mark?.grade == null ? null : Number(mark.grade);
            return {
              id: s.id,
              name: { en: s.nameEn, ar: s.nameAr },
              uniNumber: s.uniNumber,
              acceptanceYear: s.acceptanceYear,
              specializationId: s.specializationId,
              departmentId: s.departmentId,
              gradeId: mark?.id ?? null,
              grade,
              // the stored letter: a mark keeps the scale it was entered under
              letter: grade === null ? null : (mark?.letter ?? null),
              seatingStatus: mark?.seatingStatus ?? null,
              cheatingResolved: mark?.cheatingResolved ?? false,
              resit: mark ? resitOf(mark) : null,
              locked: locked.has(s.id),
            };
          }),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to list pending grades: ${curriculumId}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Every curriculum the student's faculty offers in the student's current
   * academic year, each with its mark (null until entered), for the details page.
   */
  async studentYearGrades(studentId: string, caller: GrCaller): Promise<StudentYearGradeView[]> {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.id, studentId),
        columns: {
          id: true,
          facultyId: true,
          academicYear: true,
          specializationId: true,
          departmentId: true,
        },
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);

      const links = await this.db.query.facultyCurriculums.findMany({
        where: eq(facultyCurriculums.facultyId, student.facultyId),
        with: { curriculum: true },
      });
      const yearCurriculums = links
        .map((link) => link.curriculum)
        .filter((c) => c.academicYear === student.academicYear)
        .filter((c) => takesCurriculum(student, c));
      if (!yearCurriculums.length) return [];

      const marks = await this.db.query.grades.findMany({
        where: and(
          eq(grades.studentId, student.id),
          inArray(
            grades.curriculumId,
            yearCurriculums.map((c) => c.id),
          ),
        ),
        columns: {
          id: true,
          curriculumId: true,
          grade: true,
          seatingStatus: true,
          cheatingResolved: true,
          penaltyWarning: true,
          penaltySuspensionYears: true,
          penaltyDismissal: true,
          resitKind: true,
          resitGrade: true,
          resitLetter: true,
        },
      });
      const markOf = new Map(marks.map((m) => [m.curriculumId, m]));
      // each semester's results lock on their own
      const lockedSemesters = new Set<number>();
      for (const semester of SEMESTERS) {
        const locked = await approvedStudents(this.db, [student.id], student.academicYear, semester);
        if (locked.size) lockedSemesters.add(semesterToNumber(semester));
      }

      return yearCurriculums
        .map((c) => {
          const mark = markOf.get(c.id);
          const grade =
            mark === undefined || mark.grade === null ? null : Number(mark.grade);
          return {
            gradeId: mark?.id ?? null,
            curriculumId: c.id,
            name: { en: c.nameEn, ar: c.nameAr },
            abbreviation: c.abbreviation,
            semester: semesterToNumber(c.semester),
            requirementType: c.requirementType,
            grade,
            letter: grade === null ? null : letterOf(grade),
            seatingStatus: mark?.seatingStatus ?? null,
            cheatingResolved: mark?.cheatingResolved ?? false,
            penaltyWarning: mark?.penaltyWarning ?? false,
            penaltySuspensionYears: mark?.penaltySuspensionYears ?? null,
            penaltyDismissal: mark?.penaltyDismissal ?? false,
            resit: mark ? resitOf(mark) : null,
            locked: lockedSemesters.has(semesterToNumber(c.semester)),
          };
        })
        .sort(
          (a, b) =>
            a.semester - b.semester || (a.abbreviation ?? '').localeCompare(b.abbreviation ?? ''),
        );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to list year grades: ${studentId}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * The stored mark, letter and points for a status. An absence or a bar stores
   * 0 whatever was sent; a substitute stores none. Otherwise the sent mark is
   * used, or the stored one when a PATCH sends only the status.
   */
  private markFor(
    status: SeatingStatus | null,
    sent: number | undefined,
    stored: string | null,
    courseHours: number,
  ): Pick<GradeRow, 'grade' | 'letter' | 'gp'> {
    if (takesNoMark(status)) return { grade: null, letter: null, gp: null };
    const grade = voidsMark(status) ? 0 : (sent ?? (stored === null ? undefined : Number(stored)));
    // switching a substitute back to a sat exam needs the mark it got
    if (grade === undefined) throw new BadRequestException();
    const letter = letterOf(grade);
    return { grade: String(grade), letter, gp: gpOf(letter, courseHours) };
  }

  /** Creates a grade; the student's faculty governs access. */
  async createGrade(dto: CreateGradeDto, caller: GrCaller): Promise<GradeView> {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.id, dto.studentId),
        columns: { id: true, facultyId: true, uniNumber: true, standing: true },
      });
      if (!student) throw new BadRequestException();
      assertFaculty(caller, student.facultyId);
      assertNotFrozen(student.standing);

      const curriculum = await this.curriculumOrThrow(dto.curriculumId, false);
      await assertGradesOpen(this.db, student.id, curriculum.academicYear, curriculum.semester);

      const existing = await this.db.query.grades.findFirst({
        where: and(eq(grades.studentId, student.id), eq(grades.curriculumId, curriculum.id)),
        columns: { id: true },
      });
      if (existing) throw new ConflictException();

      const mark = this.markFor(dto.seatingStatus, dto.grade, null, curriculum.courseHours);
      const [created] = await this.db
        .insert(grades)
        .values({
          studentId: student.id,
          curriculumId: curriculum.id,
          ...mark,
          seatingStatus: dto.seatingStatus,
          cheatingResolved: dto.seatingStatus === 'cheating' && (dto.cheatingResolved ?? false),
        })
        .returning();

      await this.refreshSemesterGpa(student.id, curriculum.academicYear, curriculum.semester);

      this.logger.log(`Created grade for student: ${student.uniNumber}`);
      return toGradeView(created);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Failed to create grade', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Updates the grade with this id. */
  async updateGrade(id: string, dto: UpdateGradeDto, caller: GrCaller): Promise<GradeView> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const row = await this.db.query.grades.findFirst({
        where: eq(grades.id, id),
        with: {
          student: { columns: { id: true, facultyId: true, standing: true } },
          curriculum: {
            columns: { id: true, academicYear: true, semester: true, courseHours: true },
          },
        },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.student.facultyId);
      assertNotFrozen(row.student.standing);
      await assertGradesOpen(
        this.db,
        row.studentId,
        row.curriculum.academicYear,
        row.curriculum.semester,
      );

      if (dto.studentId !== undefined && dto.studentId !== row.studentId) {
        throw new BadRequestException();
      }


      let curriculumId = row.curriculumId;
      let academicYear = row.curriculum.academicYear;
      let semester = row.curriculum.semester;
      // the course hours weight the grade points, so they follow the curriculum
      let courseHours = row.curriculum.courseHours;
      if (dto.curriculumId !== undefined && dto.curriculumId !== row.curriculumId) {
        const curriculum = await this.curriculumOrThrow(dto.curriculumId, true);
        curriculumId = curriculum.id;
        semester = curriculum.semester;
        courseHours = curriculum.courseHours;
        academicYear = curriculum.academicYear;

        const clash = await this.db.query.grades.findFirst({
          where: and(eq(grades.studentId, row.studentId), eq(grades.curriculumId, curriculumId)),
          columns: { id: true },
        });
        if (clash && clash.id !== row.id) throw new ConflictException();
        await assertGradesOpen(this.db, row.studentId, academicYear, semester);
      }

      // judge the status the row ends up with: a PATCH may send only one of grade and status.
      // An absence or a bar stores 0; switching back off it keeps the 0 until a new mark is sent.
      const seatingStatus = dto.seatingStatus ?? row.seatingStatus;
      // only a cheating row can carry a decision; any other status drops it
      const cheatingResolved =
        seatingStatus === 'cheating' ? (dto.cheatingResolved ?? row.cheatingResolved) : false;

      // the letter and its points are stored, so they are rebuilt on every write
      const mark = this.markFor(seatingStatus, dto.grade, row.grade, courseHours);

      const [updated] = await this.db
        .update(grades)
        .set({
          curriculumId,
          ...mark,
          ...(dto.seatingStatus !== undefined ? { seatingStatus: dto.seatingStatus } : {}),
          cheatingResolved,
          // a changed mark leaves any old re-exam behind
          resitKind: null,
          resitGrade: null,
          resitLetter: null,
        })
        .where(eq(grades.id, row.id))
        .returning();

      await this.refreshSemesterGpa(row.studentId, academicYear, semester);
      if (academicYear !== row.curriculum.academicYear || semester !== row.curriculum.semester) {
        await this.refreshSemesterGpa(
          row.studentId,
          row.curriculum.academicYear,
          row.curriculum.semester,
        );
      }

      this.logger.log(`Updated grade: ${row.id}`);
      return toGradeView(updated);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update grade: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Decides a pending cheating case: accept the mark (the row becomes attended)
   * or keep the case and score 0, then record the penalty, if any, on the row
   * and the student. A suspension or dismissal freezes the student's record; a stronger
   * standing is never downgraded by a later case. A frozen student's other
   * pending cases can still be decided, since they belong to the same record.
   */
  async resolveCheating(
    id: string,
    dto: ResolveCheatingDto,
    caller: GrCaller,
  ): Promise<GradeView> {
    // at most one penalty per case: a warning, one suspension, or a dismissal
    const penalties = [dto.warning, dto.suspensionYears !== undefined, dto.dismiss].filter(Boolean);
    if (penalties.length > 1) throw new BadRequestException();
    try {
      const row = await this.db.query.grades.findFirst({
        where: eq(grades.id, id),
        with: {
          student: {
            columns: {
              id: true,
              facultyId: true,
              uniNumber: true,
              standing: true,
              suspensionYears: true,
            },
          },
          curriculum: { columns: { academicYear: true, semester: true, courseHours: true } },
        },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.student.facultyId);
      if (!awaitsDecision(row.seatingStatus, row.cheatingResolved)) {
        throw new ConflictException({ code: 'NOT_PENDING' });
      }
      // a case still open when the results were approved stays open for good
      await assertGradesOpen(
        this.db,
        row.student.id,
        row.curriculum.academicYear,
        row.curriculum.semester,
      );

      // accepting keeps the mark; keeping the case scores the curriculum 0
      const grade = dto.outcome === 'accept' ? Number(row.grade ?? 0) : 0;
      const letter = letterOf(grade);

      const { standing, suspensionYears } = nextStanding(
        row.student.standing,
        row.student.suspensionYears,
        dto,
      );

      const updated = await this.db.transaction(async (tx) => {
        const [next] = await tx
          .update(grades)
          .set({
            grade: String(grade),
            letter,
            gp: gpOf(letter, row.curriculum.courseHours),
            seatingStatus: dto.outcome === 'accept' ? 'attended' : 'cheating',
            cheatingResolved: dto.outcome === 'zero',
            penaltyWarning: dto.warning,
            penaltySuspensionYears: dto.suspensionYears ?? null,
            penaltyDismissal: dto.dismiss,
          })
          .where(eq(grades.id, row.id))
          .returning();

        if (standing !== row.student.standing || suspensionYears !== row.student.suspensionYears) {
          await tx
            .update(students)
            .set({ standing, suspensionYears })
            .where(eq(students.id, row.student.id));
        }
        return next;
      });

      // the decision itself belongs to the results the record freezes with
      await this.rebuildSemesterGpa(
        row.student.id,
        row.curriculum.academicYear,
        row.curriculum.semester,
      );

      this.logger.log(
        `Resolved cheating case ${row.id} for ${row.student.uniNumber}: ${dto.outcome}` +
          (standing !== row.student.standing ? `, student now ${standing}` : ''),
      );
      return toGradeView(updated);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to resolve cheating case: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Loads a row for a Sup & Sub re-exam and checks it may take one: the regular
   * results for its semester are approved, the batch's Sup & Sub results are not yet,
   * and the row is an F or a substitute.
   */
  private async resitRowOrThrow(id: string, caller: GrCaller) {
    const row = await this.db.query.grades.findFirst({
      where: eq(grades.id, id),
      with: {
        student: { columns: { id: true, facultyId: true, standing: true } },
        curriculum: { columns: { academicYear: true, semester: true, courseHours: true } },
      },
    });
    if (!row) throw new NotFoundException();
    assertFaculty(caller, row.student.facultyId);
    assertNotFrozen(row.student.standing);

    const { academicYear, semester } = row.curriculum;
    const approved = await approvedStudents(this.db, [row.studentId], academicYear, semester);
    if (!approved.size) throw new ConflictException({ code: 'RESULTS_NOT_APPROVED' });
    if (await resitsClosed(this.db, row.studentId, academicYear, semester)) {
      throw new ConflictException({ code: 'RESULTS_APPROVED' });
    }

    const kind = resitKindOf(row);
    if (!kind) throw new ConflictException({ code: 'NO_RESIT' });
    return { row, kind };
  }

  /**
   * Records a Sup & Sub re-exam mark. A supplementary mark counts for at most a
   * C; a substitute mark counts as it is. The original mark stays for the
   * record, and the semester GPA is rebuilt from the resit's letter.
   */
  async enterResit(id: string, dto: ResitGradeDto, caller: GrCaller): Promise<GradeView> {
    try {
      const { row, kind } = await this.resitRowOrThrow(id, caller);
      const earned = letterOf(dto.grade);
      const letter = kind === 'supplementary' ? capLetter(earned, SUPPLEMENTARY_CAP) : earned;

      const [updated] = await this.db
        .update(grades)
        .set({
          resitKind: kind,
          resitGrade: String(dto.grade),
          resitLetter: letter,
          gp: gpOf(letter, row.curriculum.courseHours),
        })
        .where(eq(grades.id, row.id))
        .returning();

      await this.refreshSemesterGpa(
        row.studentId,
        row.curriculum.academicYear,
        row.curriculum.semester,
      );
      this.logger.log(`Entered ${kind} resit for grade: ${row.id}`);
      return toGradeView(updated);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to enter resit: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Removes a re-exam mark; the original mark counts again. */
  async clearResit(id: string, caller: GrCaller): Promise<GradeView> {
    try {
      const { row } = await this.resitRowOrThrow(id, caller);
      const [updated] = await this.db
        .update(grades)
        .set({
          resitKind: null,
          resitGrade: null,
          resitLetter: null,
          // back to the original letter's points; a substitute has none
          gp: row.letter ? gpOf(row.letter, row.curriculum.courseHours) : null,
        })
        .where(eq(grades.id, row.id))
        .returning();

      await this.refreshSemesterGpa(
        row.studentId,
        row.curriculum.academicYear,
        row.curriculum.semester,
      );
      this.logger.log(`Cleared resit for grade: ${row.id}`);
      return toGradeView(updated);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to clear resit: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Deletes the grade with this id. */
  async deleteGrade(id: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const row = await this.db.query.grades.findFirst({
        where: eq(grades.id, id),
        with: {
          student: { columns: { id: true, facultyId: true, standing: true } },
          curriculum: { columns: { academicYear: true, semester: true } },
        },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.student.facultyId);
      assertNotFrozen(row.student.standing);
      await assertGradesOpen(
        this.db,
        row.studentId,
        row.curriculum.academicYear,
        row.curriculum.semester,
      );

      await this.db.delete(grades).where(eq(grades.id, row.id));
      await this.refreshSemesterGpa(
        row.studentId,
        row.curriculum.academicYear,
        row.curriculum.semester,
      );

      this.logger.log(`Deleted grade: ${row.id}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete grade: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Deletes every grade and GPA belonging to one student. */
  async deleteAllGrades(studentId: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.id, studentId),
        columns: { id: true, facultyId: true, uniNumber: true, standing: true },
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);
      assertNotFrozen(student.standing);
      if (await hasApprovedResults(this.db, student.id)) {
        throw new ConflictException({ code: 'RESULTS_APPROVED' });
      }

      await this.db.transaction(async (tx) => {
        await tx.delete(grades).where(eq(grades.studentId, student.id));
        await tx.delete(gpas).where(eq(gpas.studentId, student.id));
      });

      this.logger.log(`Deleted all grades for student: ${student.uniNumber}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete grades: ${studentId}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }
}
