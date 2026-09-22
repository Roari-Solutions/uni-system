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
import { curriculums, facultyCurriculums, grades, results, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import {
  CreateGradeDto,
  ListGradesQueryDto,
  UpdateGradeDto,
  type SeatingStatus,
} from './dto/grades.dto';
import { letterOf, type LetterGrade } from './letter-grade';
import { assertFaculty, scopeFacultyId } from 'src/gr-scope/gr-scope';
import type { RequirementType } from 'src/common/requirement-type';
import {
  academicYearToNumber,
  semesterToNumber,
  type AcademicYear,
} from 'src/common/academic-year';

/** A grade as the views consume it; `letter` is derived, never stored. */
export interface GradeView {
  id: string;
  studentId: string;
  curriculumId: string;
  grade: number;
  letter: LetterGrade;
  // null only on rows saved before seating status existed
  seatingStatus: SeatingStatus | null;
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
  curriculumId: string;
  name: { en: string; ar: string };
  abbreviation: string | null;
  semester: number;
  requirementType: RequirementType | null;
  grade: number | null;
  letter: LetterGrade | null;
  // null when no grade row exists yet, or on rows saved before seating status existed
  seatingStatus: SeatingStatus | null;
}

/** CRUD for grades and per-academic-year results, with faculty scoping. */
@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  /** The year result's pass threshold; single grades carry a letter instead (letterOf). */
  static readonly PASS_MARK = 50;

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
   * Coverage of one academic year: true once every curriculum the student's
   * faculty offers for that year carries a mark, plus the average of those marks.
   */
  async yearCoverage(studentId: string, academicYear: AcademicYear) {
    const student = await this.db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { facultyId: true },
    });
    if (!student) throw new NotFoundException();

    const links = await this.db.query.facultyCurriculums.findMany({
      where: eq(facultyCurriculums.facultyId, student.facultyId),
      with: { curriculum: { columns: { id: true, academicYear: true } } },
    });
    // only the curriculums of this academic year count toward it
    const curriculumIds = links
      .filter((link) => link.curriculum.academicYear === academicYear)
      .map((link) => link.curriculumId);

    if (!curriculumIds.length) return { complete: false, average: null as number | null };

    const marked = await this.db.query.grades.findMany({
      where: and(
        eq(grades.studentId, studentId),
        inArray(grades.curriculumId, curriculumIds),
        isNotNull(grades.grade),
      ),
    });

    const filledIds = new Set(marked.map((g) => g.curriculumId));
    const complete = curriculumIds.every((id) => filledIds.has(id));
    if (!complete) return { complete, average: null as number | null };

    const average = marked.reduce((acc, cur) => acc + Number(cur.grade), 0) / marked.length;
    return { complete, average };
  }

  /** True when every curriculum of that academic year carries a mark. */
  async areGradesComplete(studentId: string, academicYear: AcademicYear): Promise<boolean> {
    const { complete } = await this.yearCoverage(studentId, academicYear);
    return complete;
  }

  /**
   * Recomputes and stores the academic year's result: upserts when complete,
   * removes any stale row when incomplete.
   */
  private async refreshYearResult(
    studentId: string,
    academicYear: AcademicYear,
  ): Promise<void> {
    const { complete, average } = await this.yearCoverage(studentId, academicYear);
    if (!complete || average === null) {
      await this.db
        .delete(results)
        .where(and(eq(results.studentId, studentId), eq(results.academicYear, academicYear)));
      return;
    }
    const result = average.toFixed(2);
    const gpa = Math.min(average / 25, 4).toFixed(2);
    const status = average >= GradesService.PASS_MARK ? 'pass' : 'fail';
    await this.db
      .insert(results)
      .values({ studentId, academicYear, result, gpa, status })
      .onConflictDoUpdate({
        target: [results.studentId, results.academicYear],
        set: { result, gpa, status },
      });
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
        .map((row) => {
          const grade = Number(row.grade);
          return {
            id: row.id,
            studentId: row.studentId,
            curriculumId: row.curriculumId,
            grade,
            letter: letterOf(grade),
            seatingStatus: row.seatingStatus,
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
        columns: { curriculumId: true, grade: true, seatingStatus: true },
      });
      const markOf = new Map(marks.map((m) => [m.curriculumId, m]));

      return yearCurriculums
        .map((c) => {
          const mark = markOf.get(c.id);
          const grade =
            mark === undefined || mark.grade === null ? null : Number(mark.grade);
          return {
            curriculumId: c.id,
            name: { en: c.nameEn, ar: c.nameAr },
            abbreviation: c.abbreviation,
            semester: semesterToNumber(c.semester),
            requirementType: c.requirementType,
            grade,
            letter: grade === null ? null : letterOf(grade),
            seatingStatus: mark?.seatingStatus ?? null,
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

      const [created] = await this.db
        .insert(grades)
        .values({
          studentId: student.id,
          curriculumId: curriculum.id,
          grade: String(dto.grade),
          seatingStatus: dto.seatingStatus,
        })
        .returning();

      await this.refreshYearResult(student.id, curriculum.academicYear);

      this.logger.log(`Created grade for student: ${student.uniNumber}`);
      return {
        id: created.id,
        studentId: created.studentId,
        curriculumId: created.curriculumId,
        grade: dto.grade,
        letter: letterOf(dto.grade),
        seatingStatus: created.seatingStatus,
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
          curriculum: { columns: { id: true, academicYear: true } },
        },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.student.facultyId);

      if (dto.studentId !== undefined && dto.studentId !== row.studentId) {
        throw new BadRequestException();
      }

      let curriculumId = row.curriculumId;
      let academicYear = row.curriculum.academicYear;
      if (dto.curriculumId !== undefined && dto.curriculumId !== row.curriculumId) {
        const curriculum = await this.curriculumOrThrow(dto.curriculumId, true);
        curriculumId = curriculum.id;
        academicYear = curriculum.academicYear;

        const clash = await this.db.query.grades.findFirst({
          where: and(eq(grades.studentId, row.studentId), eq(grades.curriculumId, curriculumId)),
          columns: { id: true },
        });
        if (clash && clash.id !== row.id) throw new ConflictException();
      }

      const [updated] = await this.db
        .update(grades)
        .set({
          curriculumId,
          ...(dto.grade !== undefined ? { grade: String(dto.grade) } : {}),
          ...(dto.seatingStatus !== undefined ? { seatingStatus: dto.seatingStatus } : {}),
        })
        .where(eq(grades.id, row.id))
        .returning();

      await this.refreshYearResult(row.studentId, academicYear);
      if (academicYear !== row.curriculum.academicYear) {
        await this.refreshYearResult(row.studentId, row.curriculum.academicYear);
      }

      const grade = Number(updated.grade);
      this.logger.log(`Updated grade: ${row.id}`);
      return {
        id: updated.id,
        studentId: updated.studentId,
        curriculumId: updated.curriculumId,
        grade,
        letter: letterOf(grade),
        seatingStatus: updated.seatingStatus,
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
          curriculum: { columns: { academicYear: true } },
        },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.student.facultyId);

      await this.db.delete(grades).where(eq(grades.id, row.id));
      await this.refreshYearResult(row.studentId, row.curriculum.academicYear);

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

  /** Deletes every grade and result belonging to one student. */
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
        await tx.delete(results).where(eq(results.studentId, student.id));
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
