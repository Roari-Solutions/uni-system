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

export interface GradeIdentifiersDto {
  curriculum?: string;
  year?: string;
  semester?: number;
}

/** Seating statuses that void the mark: grade point becomes 0.0 and letter becomes F. */
const ZEROED_STATUSES: readonly SeatingStatus[] = ['absent', 'cheating'];

function voidsMark(status: SeatingStatus | null): boolean {
  return status !== null && ZEROED_STATUSES.includes(status);
}

/** A grade as views consume it. */
export interface GradeView {
  id: string;
  studentId: string;
  curriculumId: string;
  grade: number;
  score?: number | null;
  letter: LetterGrade;
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

/** One curriculum of a student's current year, with marks if entered. */
export interface StudentYearGradeView {
  curriculumId: string;
  name: { en: string; ar: string };
  abbreviation: string | null;
  semester: number;
  requirementType: RequirementType | null;
  grade: number | null;
  score: number | null;
  letter: LetterGrade | null;
  seatingStatus: SeatingStatus | null;
}

/** Summary for term-level calculations. */
export interface TermCoverageResult {
  complete: boolean;
  gpa: number;
  cgpa: number;
  result: number;
}

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  /** Pass threshold on percentage score (50/100). */
  static readonly PASS_MARK = 50;

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Maps raw percentage score (0-100) to Letter Grade and 4.0 Scale Grade Points. */
  completeGradeFromScore(score: number): {
    letterGrade: LetterGrade;
    grade: number;
  } {
    if (score >= 80) return { letterGrade: 'A', grade: 4.0 };
    if (score >= 70) return { letterGrade: 'B+', grade: 3.5 };
    if (score >= 60) return { letterGrade: 'B', grade: 3.0 };
    if (score >= 55) return { letterGrade: 'C+', grade: 2.5 };
    if (score >= 50) return { letterGrade: 'C', grade: 2.0 };
    if (score >= 40) return { letterGrade: 'D', grade: 1.0 };
    return { letterGrade: 'F', grade: 0.0 };
  }

  /** Resolves a curriculum by id. */
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

  /** Narrows a student's grades to exactly one row using fuzzy identifiers. */
  private async gradeOrThrow(studentId: string, ids: GradeIdentifiersDto, notFound: boolean) {
    const rows = await this.db.query.grades.findMany({
      where: eq(grades.studentId, studentId),
      with: { curriculum: { columns: { nameEn: true, abbreviation: true } } },
    });
    const clean = {
      curriculum: ids.curriculum?.trim(),
      year: ids.year?.trim(),
      semester: ids.semester,
    };

    const matches = rows.filter(
      (g) =>
        (clean.curriculum === undefined ||
          g.curriculum?.nameEn === clean.curriculum ||
          g.curriculum?.abbreviation === clean.curriculum) &&
        (clean.year === undefined || (g as any).academicYear === clean.year) &&
        (clean.semester === undefined || (g as any).semester === clean.semester),
    );

    if (!matches.length) {
      if (notFound) throw new NotFoundException();
      throw new BadRequestException();
    }
    if (matches.length > 1) throw new BadRequestException();
    return matches[0];
  }

  /** Curriculum ids the faculty requires (completeness baseline). */
  private async requiredIds(facultyId: string) {
    const rows = await this.db.query.facultyCurriculums.findMany({
      where: eq(facultyCurriculums.facultyId, facultyId),
    });
    return rows.map((r) => r.curriculumId);
  }

  /** Graded term rows with course credit hours attached. */
  private async termGrades(studentId: string, academicYear: string, semester: '1' | '2') {
    return await this.db.query.grades.findMany({
      where: and(
        eq(grades.studentId, studentId),
        eq((grades as any).academicYear, academicYear),
        eq((grades as any).semester, semester),
        isNotNull(grades.grade),
      ),
      columns: { curriculumId: true, grade: true, score: true },
      with: { curriculum: { columns: { courseHours: true } } },
    });
  }

  /** All completed course grades for cumulative CGPA calculation. */
  private async allGrades(studentId: string) {
    return await this.db.query.grades.findMany({
      where: and(eq(grades.studentId, studentId), isNotNull(grades.grade)),
      columns: { grade: true, score: true },
      with: { curriculum: { columns: { courseHours: true } } },
    });
  }

  /**
   * Computes credit-hour weighted metrics:
   * - gpa: weighted Grade Points (4.0 scale)
   * - result: weighted raw percentage score
   * - tch: total credit hours
   */
  private weighted(
    rows: {
      grade: string | number | null;
      score?: string | number | null;
      curriculum: { courseHours: number | null };
    }[],
  ): { gpa: number; result: number; tch: number } {
    let tch = 0;
    let tgp = 0;
    let tsp = 0;

    for (const g of rows) {
      const ch = g.curriculum?.courseHours ?? 1;
      tch += ch;
      tgp += Number(g.grade ?? 0) * ch;
      tsp += Number(g.score ?? 0) * ch;
    }

    if (!tch) return { gpa: 0, result: 0, tch: 0 };
    return { gpa: tgp / tch, result: tsp / tch, tch };
  }

  /** Evaluates term completeness and computes term GPA, CGPA, and weighted score. */
  async termCoverage(
    studentId: string,
    academicYear: string,
    semester: '1' | '2',
  ): Promise<TermCoverageResult> {
    const student = await this.db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { facultyId: true },
    });
    if (!student) throw new NotFoundException();

    const [required, studentGrades] = await Promise.all([
      this.requiredIds(student.facultyId),
      this.termGrades(studentId, academicYear, semester),
    ]);

    const complete = required.length > 0 && required.every((id) =>
      studentGrades.some((g) => g.curriculumId === id),
    );
    if (!complete) return { complete: false, gpa: 0, cgpa: 0, result: 0 };

    const { gpa, result, tch } = this.weighted(studentGrades);
    if (!tch) {
      this.logger.warn('Division by zero avoided: total credit hours is 0');
      return { complete: true, gpa: 0, cgpa: 0, result: 0 };
    }

    const all = await this.allGrades(studentId);
    const { gpa: cgpaRaw } = this.weighted(all);
    const cgpa = Number(cgpaRaw.toFixed(2));

    return {
      complete,
      gpa: Number(gpa.toFixed(2)),
      cgpa,
      result: Number(result.toFixed(2)),
    };
  }

  /** Year-level completeness and weighted averages across the full academic year. */
  async yearCoverage(studentId: string, academicYear: AcademicYear) {
    const student = await this.db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { facultyId: true },
    });
    if (!student) throw new NotFoundException();

    const links = await this.db.query.facultyCurriculums.findMany({
      where: eq(facultyCurriculums.facultyId, student.facultyId),
      with: { curriculum: { columns: { id: true, academicYear: true, courseHours: true } } },
    });

    const curriculumIds = links
      .filter((link) => link.curriculum.academicYear === academicYear)
      .map((link) => link.curriculumId);

    if (!curriculumIds.length) {
      return { complete: false, average: null, gpa: null, cgpa: null };
    }

    const marked = await this.db.query.grades.findMany({
      where: and(
        eq(grades.studentId, studentId),
        inArray(grades.curriculumId, curriculumIds),
        isNotNull(grades.grade),
      ),
      columns: { curriculumId: true, grade: true, score: true },
      with: { curriculum: { columns: { courseHours: true } } },
    });

    const filledIds = new Set(marked.map((g) => g.curriculumId));
    const complete = curriculumIds.every((id) => filledIds.has(id));
    if (!complete) {
      return { complete: false, average: null, gpa: null, cgpa: null };
    }

    const { gpa, result } = this.weighted(marked);
    const all = await this.allGrades(studentId);
    const { gpa: cgpa } = this.weighted(all);

    return {
      complete: true,
      average: Number(result.toFixed(2)),
      gpa: Number(gpa.toFixed(2)),
      cgpa: Number(cgpa.toFixed(2)),
    };
  }

  /** True when every curriculum of that academic year carries a mark. */
  async areGradesComplete(studentId: string, academicYear: AcademicYear): Promise<boolean> {
    const { complete } = await this.yearCoverage(studentId, academicYear);
    return complete;
  }

  /** Recomputes and upserts the academic year result; purges stale record if incomplete. */
  private async refreshYearResult(
    studentId: string,
    academicYear: AcademicYear,
  ): Promise<void> {
    const { complete, average, gpa, cgpa } = await this.yearCoverage(studentId, academicYear);
    if (!complete || average === null || gpa === null) {
      await this.db
        .delete(results)
        .where(and(eq(results.studentId, studentId), eq(results.academicYear, academicYear)));
      return;
    }

    const resultStr = average.toFixed(2);
    const gpaStr = gpa.toFixed(2);
    const cgpaStr = (cgpa ?? gpa).toFixed(2);
    const status = average >= GradesService.PASS_MARK ? 'pass' : 'fail';

    await this.db
      .insert(results)
      .values({
        studentId,
        academicYear,
        result: resultStr,
        gpa: gpaStr,
        cgpa: cgpaStr,
        status,
      } as any)
      .onConflictDoUpdate({
        target: [results.studentId, results.academicYear],
        set: {
          result: resultStr,
          gpa: gpaStr,
          cgpa: cgpaStr,
          status,
        },
      });
  }

  /** Lists grades narrowed by faculty scoping and filter query. */
  async listGrades(caller: GrCaller, query: ListGradesQueryDto = {}): Promise<GradeView[]> {
    try {
      const scope = scopeFacultyId(caller);
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
        .filter((row) => !facultyId || row.student?.facultyId === facultyId)
        .filter((row) => !query.curriculumId || row.curriculumId === query.curriculumId)
        .filter((row) => !query.academicYear || row.curriculum?.academicYear === query.academicYear)
        .map((row) => {
          const grade = Number(row.grade);
          const score = row.score !== null ? Number(row.score) : null;
          return {
            id: row.id,
            studentId: row.studentId,
            curriculumId: row.curriculumId,
            grade,
            score,
            letter: ((row as any).letterGrade as LetterGrade) ?? letterOf(score ?? grade),
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

  /** Unentered grade sheet cohort view. */
  async pendingGrades(curriculumId: string, caller: GrCaller): Promise<PendingGradesView> {
    try {
      const curriculum = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.id, curriculumId),
        with: { facultyCurriculums: { columns: { facultyId: true } } },
      });
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

  /** Detailed list of current year's grades for a student. */
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
        columns: { curriculumId: true, grade: true, score: true, seatingStatus: true },
      });
      const markOf = new Map(marks.map((m) => [m.curriculumId, m]));

      return yearCurriculums
        .map((c) => {
          const mark = markOf.get(c.id);
          const grade = mark === undefined || mark.grade === null ? null : Number(mark.grade);
          const score = mark === undefined || mark.score === null ? null : Number(mark.score);
          const letter =
            mark && (mark as any).letterGrade
              ? (mark as any).letterGrade
              : score !== null
                ? this.completeGradeFromScore(score).letterGrade
                : grade !== null
                  ? letterOf(grade)
                  : null;

          return {
            curriculumId: c.id,
            name: { en: c.nameEn, ar: c.nameAr },
            abbreviation: c.abbreviation,
            semester: semesterToNumber(c.semester),
            requirementType: c.requirementType,
            grade,
            score,
            letter,
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

  /**
   * Creates a grade row via score input:
   * score -> letterGrade + grade points (4.0).
   */
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

      const rawScore = (dto as any).score !== undefined ? Number((dto as any).score) : Number(dto.grade);
      const { grade: mappedGrade, letterGrade: mappedLetter } = this.completeGradeFromScore(rawScore);

      const isVoided = voidsMark(dto.seatingStatus);
      const finalGrade = isVoided ? 0.0 : mappedGrade;
      const finalLetter = isVoided ? 'F' : mappedLetter;

      const [created] = await this.db
        .insert(grades)
        .values({
          studentId: student.id,
          curriculumId: curriculum.id,
          score: rawScore.toFixed(2),
          grade: finalGrade.toFixed(2),
          letterGrade: finalLetter,
          seatingStatus: dto.seatingStatus,
          academicYear: (dto as any).year?.trim() ?? curriculum.academicYear,
          semester: (dto as any).semester ?? curriculum.semester,
        } as any)
        .returning();

      await this.refreshYearResult(student.id, curriculum.academicYear);

      this.logger.log(`Created grade for student: ${student.uniNumber}`);
      return {
        id: created.id,
        studentId: created.studentId,
        curriculumId: created.curriculumId,
        grade: finalGrade,
        score: rawScore,
        letter: finalLetter,
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

  /**
   * Updates an existing grade row with score/status adjustments
   * and recalculates academic year results.
   */
  async updateGrade(id: string, dto: UpdateGradeDto, caller: GrCaller): Promise<GradeView> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const row = await this.db.query.grades.findFirst({
        where: eq(grades.id, id),
        with: {
          student: { columns: { id: true, facultyId: true } },
          curriculum: { columns: { id: true, academicYear: true, semester: true } },
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

      const effectiveStatus = dto.seatingStatus ?? row.seatingStatus;
      const isVoided = voidsMark(effectiveStatus);

      const rawScore =
        (dto as any).score !== undefined
          ? Number((dto as any).score)
          : dto.grade !== undefined
            ? Number(dto.grade)
            : row.score !== null
              ? Number(row.score)
              : null;

      const updateValues: Record<string, any> = {
        curriculumId,
      };

      let finalGrade = Number(row.grade);
      let finalLetter = ((row as any).letterGrade as LetterGrade) ?? letterOf(finalGrade);

      if (rawScore !== null) {
        const computed = this.completeGradeFromScore(rawScore);
        finalGrade = isVoided ? 0.0 : computed.grade;
        finalLetter = isVoided ? 'F' : computed.letterGrade;

        updateValues.score = rawScore.toFixed(2);
        updateValues.grade = finalGrade.toFixed(2);
        updateValues.letterGrade = finalLetter;
      } else if (isVoided) {
        finalGrade = 0.0;
        finalLetter = 'F';
        updateValues.grade = '0.00';
        updateValues.letterGrade = 'F';
      }

      if (dto.seatingStatus !== undefined) {
        updateValues.seatingStatus = dto.seatingStatus;
      }

      const [updated] = await this.db
        .update(grades)
        .set(updateValues)
        .where(eq(grades.id, row.id))
        .returning();

      await this.refreshYearResult(row.studentId, academicYear);
      if (academicYear !== row.curriculum.academicYear) {
        await this.refreshYearResult(row.studentId, row.curriculum.academicYear);
      }

      this.logger.log(`Updated grade: ${row.id}`);
      return {
        id: updated.id,
        studentId: updated.studentId,
        curriculumId: updated.curriculumId,
        grade: finalGrade,
        score: rawScore,
        letter: finalLetter,
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