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
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { curriculums, facultyCurriculums, gpas, grades, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import {
  CreateGradeDto,
  ListGradesQueryDto,
  UpdateGradeDto,
  type SeatingStatus,
} from './dto/grades.dto';
import { letterOf, pointsOf, type LetterGrade } from './letter-grade';
import { assertFaculty, scopeFacultyId } from 'src/gr-scope/gr-scope';
import type { RequirementType } from 'src/common/requirement-type';
import {
  academicYearToNumber,
  semesterToNumber,
  type AcademicYear,
  type Semester,
} from 'src/common/academic-year';

/** Absence voids the mark: the grade is stored as 0, so its letter is F. */
function voidsMark(status: SeatingStatus | null): boolean {
  return status === 'absent';
}

/**
 * A cheating case waits on a decision: staff either accept the mark (moving the
 * row to attended) or keep the cheating and record a 0. Until then the mark is
 * left out of the academic year entirely.
 */
function awaitsDecision(status: SeatingStatus | null, resolved: boolean): boolean {
  return status === 'cheating' && !resolved;
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
  /** The plain average of the semesters above; null until a semester is stored. */
  annual: number | null;
}

/** Grade points for one curriculum: the letter's points weighted by its course hours. */
function gpOf(letter: LetterGrade, courseHours: number): string {
  return (pointsOf(letter) * courseHours).toFixed(2);
}

/** A grade as the views consume it; `letter` comes from the mark on every write. */
export interface GradeView {
  id: string;
  studentId: string;
  curriculumId: string;
  grade: number;
  letter: LetterGrade;
  // null only on rows saved before seating status existed
  seatingStatus: SeatingStatus | null;
  cheatingResolved: boolean;
}

/** A curriculum's entry sheet: the curriculum and the students still without a grade for it. */
export interface PendingGradesView {
  curriculum: {
    id: string;
    name: { en: string; ar: string };
    abbreviation: string | null;
    facultyId: string;
    academicYear: number;
    semester: number;
  };
  students: { id: string; name: { en: string; ar: string }; uniNumber: string }[];
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
   * cheating case is skipped on every count, so the semester can complete around
   * it and its points stay out until staff settle the case.
   */
  async semesterCoverage(studentId: string, academicYear: AcademicYear, semester: Semester) {
    const empty = { complete: false, gpSum: 0, courseHours: 0 };

    const student = await this.db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { facultyId: true },
    });
    if (!student) throw new NotFoundException();

    const links = await this.db.query.facultyCurriculums.findMany({
      where: eq(facultyCurriculums.facultyId, student.facultyId),
      with: {
        curriculum: {
          columns: { id: true, academicYear: true, semester: true, courseHours: true },
        },
      },
    });
    // only this academic year's curriculums, and only this semester's
    const offered = links
      .map((link) => link.curriculum)
      .filter((c) => c.academicYear === academicYear && c.semester === semester);
    if (!offered.length) return empty;

    const marked = await this.db.query.grades.findMany({
      where: and(
        eq(grades.studentId, studentId),
        inArray(
          grades.curriculumId,
          offered.map((c) => c.id),
        ),
        isNotNull(grades.gp),
      ),
    });

    const counted = marked.filter((g) => !awaitsDecision(g.seatingStatus, g.cheatingResolved));
    const pending = new Set(
      marked
        .filter((g) => awaitsDecision(g.seatingStatus, g.cheatingResolved))
        .map((g) => g.curriculumId),
    );

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
   * Recomputes and stores one semester's GPA: upserts when the semester is
   * fully marked, and drops any stale row when it is not.
   */
  private async refreshSemesterGpa(
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
      columns: { id: true, studentId: true, letter: true },
    });

    for (const row of rows) {
      if (!row.letter) continue;
      await this.db
        .update(grades)
        .set({ gp: gpOf(row.letter, curriculum.courseHours) })
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

  /**
   * A student's stored semester GPAs for one academic year, plus the annual
   * figure: the plain average of those semesters, computed here and never stored.
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

      const annual = semesters.length
        ? Number(
            (semesters.reduce((acc, s) => acc + s.gpa, 0) / semesters.length).toFixed(2),
          )
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
   * filters. Rows with no mark yet are omitted: every listed grade has a letter.
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
        where: isNotNull(grades.grade),
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
        .map((row) => {
          const grade = Number(row.grade);
          return {
            id: row.id,
            studentId: row.studentId,
            curriculumId: row.curriculumId,
            grade,
            letter: letterOf(grade),
            seatingStatus: row.seatingStatus,
            cheatingResolved: row.cheatingResolved,
          };
        });

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
   * The students of the curriculum's faculty and academic year who hold no
   * grade row for it yet, for the entry sheet.
   */
  async pendingGrades(curriculumId: string, caller: GrCaller): Promise<PendingGradesView> {
    try {
      const curriculum = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.id, curriculumId),
        with: { facultyCurriculums: { columns: { facultyId: true } } },
      });
      // a curriculum belongs to one faculty; older rows with several use the first
      const facultyId = curriculum?.facultyCurriculums[0]?.facultyId;
      if (!curriculum || !facultyId) throw new NotFoundException();
      assertFaculty(caller, facultyId);

      const cohort = await this.db.query.students.findMany({
        where: and(
          eq(students.facultyId, facultyId),
          eq(students.academicYear, curriculum.academicYear),
        ),
        columns: { id: true, nameEn: true, nameAr: true, uniNumber: true },
      });

      // any existing row blocks a new one (student_curriculum_unique), marked or not
      const graded = await this.db.query.grades.findMany({
        where: eq(grades.curriculumId, curriculum.id),
        columns: { studentId: true },
      });
      const gradedIds = new Set(graded.map((g) => g.studentId));

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
          .filter((s) => !gradedIds.has(s.id))
          .sort((a, b) => a.uniNumber.localeCompare(b.uniNumber))
          .map((s) => ({
            id: s.id,
            name: { en: s.nameEn, ar: s.nameAr },
            uniNumber: s.uniNumber,
          })),
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
        columns: { id: true, facultyId: true, academicYear: true },
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);

      const links = await this.db.query.facultyCurriculums.findMany({
        where: eq(facultyCurriculums.facultyId, student.facultyId),
        with: { curriculum: true },
      });
      const yearCurriculums = links
        .map((link) => link.curriculum)
        .filter((c) => c.academicYear === student.academicYear);
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
        },
      });
      const markOf = new Map(marks.map((m) => [m.curriculumId, m]));

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

  /** Creates a grade; the student's faculty governs access. */
  async createGrade(dto: CreateGradeDto, caller: GrCaller): Promise<GradeView> {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.id, dto.studentId),
        columns: { id: true, facultyId: true, uniNumber: true },
      });
      if (!student) throw new BadRequestException();
      assertFaculty(caller, student.facultyId);

      const curriculum = await this.curriculumOrThrow(dto.curriculumId, false);

      const existing = await this.db.query.grades.findFirst({
        where: and(eq(grades.studentId, student.id), eq(grades.curriculumId, curriculum.id)),
        columns: { id: true },
      });
      if (existing) throw new ConflictException();

      // an absence stores 0 whatever mark was sent
      const grade = voidsMark(dto.seatingStatus) ? 0 : dto.grade;
      const letter = letterOf(grade);
      const [created] = await this.db
        .insert(grades)
        .values({
          studentId: student.id,
          curriculumId: curriculum.id,
          grade: String(grade),
          letter,
          gp: gpOf(letter, curriculum.courseHours),
          seatingStatus: dto.seatingStatus,
          cheatingResolved: dto.seatingStatus === 'cheating' && (dto.cheatingResolved ?? false),
        })
        .returning();

      await this.refreshSemesterGpa(student.id, curriculum.academicYear, curriculum.semester);

      this.logger.log(`Created grade for student: ${student.uniNumber}`);
      return {
        id: created.id,
        studentId: created.studentId,
        curriculumId: created.curriculumId,
        grade,
        letter,
        seatingStatus: created.seatingStatus,
        cheatingResolved: created.cheatingResolved,
      };
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
          student: { columns: { id: true, facultyId: true } },
          curriculum: {
            columns: { id: true, academicYear: true, semester: true, courseHours: true },
          },
        },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.student.facultyId);

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
      }

      // judge the status the row ends up with: a PATCH may send only one of grade and status.
      // An absence stores 0; switching back off it keeps the 0 until a new mark is sent.
      const seatingStatus = dto.seatingStatus ?? row.seatingStatus;
      const nextGrade = voidsMark(seatingStatus) ? 0 : dto.grade;
      // only a cheating row can carry a decision; any other status drops it
      const cheatingResolved =
        seatingStatus === 'cheating' ? (dto.cheatingResolved ?? row.cheatingResolved) : false;

      // the letter and its points are stored, so they are rebuilt on every write
      const mark = nextGrade ?? Number(row.grade ?? 0);
      const letter = letterOf(mark);

      const [updated] = await this.db
        .update(grades)
        .set({
          curriculumId,
          ...(nextGrade !== undefined ? { grade: String(nextGrade) } : {}),
          ...(dto.seatingStatus !== undefined ? { seatingStatus: dto.seatingStatus } : {}),
          cheatingResolved,
          letter,
          gp: gpOf(letter, courseHours),
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

      const grade = Number(updated.grade);
      this.logger.log(`Updated grade: ${row.id}`);
      return {
        id: updated.id,
        studentId: updated.studentId,
        curriculumId: updated.curriculumId,
        grade,
        letter,
        seatingStatus: updated.seatingStatus,
        cheatingResolved: updated.cheatingResolved,
      };
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

  /** Deletes the grade with this id. */
  async deleteGrade(id: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const row = await this.db.query.grades.findFirst({
        where: eq(grades.id, id),
        with: {
          student: { columns: { id: true, facultyId: true } },
          curriculum: { columns: { academicYear: true, semester: true } },
        },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.student.facultyId);

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
        columns: { id: true, facultyId: true, uniNumber: true },
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);

      await this.db.transaction(async (tx) => {
        await tx.delete(grades).where(eq(grades.studentId, student.id));
        await tx.delete(gpas).where(eq(gpas.studentId, student.id));
      });

      this.logger.log(`Deleted all grades for student: ${student.uniNumber}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
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
