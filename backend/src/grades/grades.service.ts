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
import { CreateGradeDto, GradeIdentifiersDto, UpdateGradeDto } from './dto/grades.dto';
import { assertFaculty, scopeFacultyId } from 'src/gr-scope/gr-scope';

/** CRUD for grades and term results with faculty scoping. */
@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Resolves a curriculum by name (or abbreviation); throws when missing. */
  private async curriculumOrThrow(name: string, notFound: boolean) {
    const clean = name.trim();
    const row =
      (await this.db.query.curriculums.findFirst({
        where: eq(curriculums.name, clean),
      })) ??
      (await this.db.query.curriculums.findFirst({
        where: eq(curriculums.abbreviation, clean),
      }));
    if (!row) {
      if (notFound) throw new NotFoundException();
      throw new BadRequestException();
    }
    return row;
  }

  /** Narrows a student's grades to exactly one row using the given identifiers. */
  private async gradeOrThrow(studentId: string, ids: GradeIdentifiersDto, notFound: boolean) {
    const rows = await this.db.query.grades.findMany({
      where: eq(grades.studentId, studentId),
      with: { curriculum: { columns: { name: true, abbreviation: true } } },
    });
    const clean = {
      curriculum: ids.curriculum?.trim(),
      year: ids.year?.trim(),
      semester: ids.semester,
    };
    // get all the grades that has this name or abbr and year and semester
    const matches = rows.filter(
      (g) =>
        (clean.curriculum === undefined ||
          g.curriculum.name === clean.curriculum ||
          g.curriculum.abbreviation === clean.curriculum) &&
        (clean.year === undefined || g.academicYear === clean.year) &&
        (clean.semester === undefined || g.semester === clean.semester),
    );
    // if no matches and not found is allowed throw it or throw a bad request
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

  /** Term grades with credit weight attached. */
  private async termGrades(studentId: string, academicYear: string, semester: '1' | '2') {
    return await this.db.query.grades.findMany({
      where: and(
        eq(grades.studentId, studentId),
        eq(grades.academicYear, academicYear),
        eq(grades.semester, semester),
        isNotNull(grades.grade),
      ),
      columns: { curriculumId: true, grade: true, score: true },
      with: { curriculum: { columns: { courseHours: true } } },
    });
  }

  /** All graded rows with credit weight (for CGPA). */
  private async allGrades(studentId: string) {
    return await this.db.query.grades.findMany({
      where: and(eq(grades.studentId, studentId), isNotNull(grades.grade)),
      columns: { grade: true },
      with: { curriculum: { columns: { courseHours: true } } },
    });
  }

  /** Weighted avg: gpa from grade-points, result from scores. tch=0 → zeros. */
  private weighted(
    rows: {
      grade: string | number | null;
      score?: string | number | null;
      curriculum: { courseHours: number | null };
    }[],
  ): { gpa: number; result: number; tch: number } {
    let tch = 0,
      tgp = 0,
      tsp = 0;
    for (const g of rows) {
      const ch = g.curriculum.courseHours ?? 1;
      tch += ch;
      tgp += Number(g.grade) * ch;
      tsp += Number(g.score ?? 0) * ch;
    }
    if (!tch) return { gpa: 0, result: 0, tch: 0 };
    return { gpa: tgp / tch, result: tsp / tch, tch };
  }

  async termCoverage(
    studentId: string,
    academicYear: string,
    semester: '1' | '2',
  ): Promise<{ complete: boolean; gpa: number; cgpa: number; result: number }> {
    const student = await this.db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { facultyId: true },
    });
    if (!student) throw new NotFoundException();

    const [required, studetGrades] = await Promise.all([
      this.requiredIds(student.facultyId),
      this.termGrades(studentId, academicYear, semester),
    ]);

    // when all required curriculums ids exisit in student gradeed curriculums
    const complete = required.every((id) => studetGrades.some((g) => g.curriculumId === id));
    // if not completed we dont calculate the gpa
    if (!complete) return { complete, gpa: 0, cgpa: 0, result: 0 };

    const { gpa, result, tch } = this.weighted(studetGrades);
    if (!tch) {
      this.logger.warn('devision by zero skipped');
      return { complete, gpa: 0, cgpa: 0, result: 0 };
    }

    // calculating the CGPA — reuse weighted(); its `gpa` field is the cumulative avg here
    const all = await this.allGrades(studentId);
    const { gpa: cgpaRaw } = this.weighted(all);
    const cgpa = Number(cgpaRaw.toFixed(2));

    return { complete, gpa, cgpa, result };
  }

  /** True when every faculty curriculum has a filled grade for the term. not used now but might be need later to check i will keep it*/
  async areGradesComplete(
    uniNo: string,
    academicYear: string,
    semester: '1' | '2',
  ): Promise<boolean> {
    const student = await this.db.query.students.findFirst({
      where: eq(students.uniNumber, uniNo.trim()),
      columns: { id: true },
    });

    if (!student) throw new NotFoundException();
    const { complete } = await this.termCoverage(student.id, academicYear, semester);
    return complete;
  }

  /**
   * Recomputes and stores the term result: upserts results when complete,
   * removes any stale row when incomplete.
   */
  private async refreshTermResult(
    studentId: string,
    academicYear: string,
    semester: '1' | '2',
  ): Promise<void> {
    const { complete, gpa, cgpa, result } = await this.termCoverage(
      studentId,
      academicYear,
      semester,
    );
    if (!complete) {
      await this.db
        .delete(results)
        .where(
          and(
            eq(results.studentId, studentId),
            eq(results.academicYear, academicYear),
            eq(results.semester, semester),
          ),
        );
      return;
    }
    const resultStr = result.toFixed(2);
    const gpaStr = gpa.toFixed(2);
    const cgpaStr = cgpa.toFixed(2);
    const status = result >= 50 ? 'pass' : 'fail';
    await this.db
      .insert(results)
      .values({
        studentId,
        academicYear,
        semester,
        result: resultStr,
        gpa: gpaStr,
        cgpa: cgpaStr,
        status,
      })
      .onConflictDoUpdate({
        target: [results.studentId, results.academicYear, results.semester],
        set: {
          result: resultStr,
          gpa: gpaStr,
          cgpa: cgpaStr,
          status,
        },
      });
  }

  /** Lists grades: all for admin, own faculty's students' for data-entry. */
  async listGrades(caller: GrCaller) {
    try {
      const scope = scopeFacultyId(caller);
      if (!scope) {
        return await this.db.query.grades.findMany({
          with: { student: true, curriculum: true },
        });
      }
      const owned = await this.db.query.students.findMany({
        where: eq(students.facultyId, scope),
        columns: { id: true },
      });
      if (!owned.length) return [];
      // get all the grades of all the studens in the faculty
      return await this.db.query.grades.findMany({
        where: inArray(
          grades.studentId,
          owned.map((s) => s.id),
        ),
        with: { student: true, curriculum: true },
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to list grades', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  CompleteGradeFromScore(score: number): {
    letterGrade: string;
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

  /** Creates a grade for a student; the student's faculty governs access. */
  async createGrade(dto: CreateGradeDto, caller: GrCaller): Promise<{ status: string }> {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, dto.uniNo.trim()),
        columns: { id: true, facultyId: true, uniNumber: true },
      });
      if (!student) throw new BadRequestException();
      assertFaculty(caller, student.facultyId);

      const curriculum = await this.curriculumOrThrow(dto.curriculum, false);
      const semester = dto.semester ?? '1';

      const existing = await this.db.query.grades.findFirst({
        where: and(
          eq(grades.studentId, student.id),
          eq(grades.curriculumId, curriculum.id),
          eq(grades.academicYear, dto.year.trim()),
          eq(grades.semester, semester),
        ),
        columns: { id: true },
      });
      if (existing) throw new ConflictException();

      const completeGradeFromScore = this.CompleteGradeFromScore(dto.score);

      await this.db.insert(grades).values({
        studentId: student.id,
        curriculumId: curriculum.id,
        score: dto.score.toFixed(2),
        grade: completeGradeFromScore.grade.toFixed(2),
        letterGrade: completeGradeFromScore.letterGrade,
        academicYear: dto.year.trim(),
        semester,
      });

      await this.refreshTermResult(student.id, dto.year.trim(), semester);

      this.logger.log(`Created grade for student: ${dto.uniNo}`);
      return { status: 'Ok' };
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
  /** Updates the single grade row selected by uniNo plus identifiers. */
  async updateGrade(
    uniNo: string,
    dto: UpdateGradeDto,
    caller: GrCaller,
  ): Promise<{ status: string }> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, uniNo.trim()),
        columns: { id: true, facultyId: true, uniNumber: true },
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);

      if (dto.uniNo !== undefined && dto.uniNo.trim() !== uniNo.trim()) {
        throw new BadRequestException();
      }

      const row = await this.gradeOrThrow(student.id, dto, true);

      let curriculumId = row.curriculumId;
      if (dto.curriculum !== undefined) {
        const curriculum = await this.curriculumOrThrow(dto.curriculum, true);
        curriculumId = curriculum.id;
      }
      const academicYear = dto.year !== undefined ? dto.year.trim() : row.academicYear;
      const semester = dto.semester ?? row.semester;

      const clash = await this.db.query.grades.findFirst({
        where: and(
          eq(grades.studentId, student.id),
          eq(grades.curriculumId, curriculumId),
          eq(grades.academicYear, academicYear),
          eq(grades.semester, semester),
        ),
        columns: { id: true },
      });
      if (clash && clash.id !== row.id) throw new ConflictException();
      let completeGradeFromScore;
      if (dto.score !== undefined) completeGradeFromScore = this.CompleteGradeFromScore(dto.score);

      await this.db
        .update(grades)
        .set({
          curriculumId,
          ...(completeGradeFromScore
            ? {
                grade: completeGradeFromScore.grade.toFixed(2),
                letterGrade: completeGradeFromScore.letterGrade,
                score: dto.score!.toFixed(2),
              }
            : {}),
          academicYear,
          semester,
        })
        .where(eq(grades.id, row.id));

      await this.refreshTermResult(student.id, academicYear, semester);
      if (row.academicYear !== academicYear || row.semester !== semester) {
        await this.refreshTermResult(student.id, row.academicYear, row.semester);
      }

      this.logger.log(`Updated grade for student: ${uniNo}`);
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
      this.logger.error(`Failed to update grade: ${uniNo}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Deletes the single grade row selected by uniNo plus identifiers. */
  async deleteGrade(
    uniNo: string,
    ids: GradeIdentifiersDto,
    caller: GrCaller,
  ): Promise<{ status: string }> {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, uniNo.trim()),
        columns: { id: true, facultyId: true },
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);

      const row = await this.gradeOrThrow(student.id, ids, true);
      await this.db.delete(grades).where(eq(grades.id, row.id));
      await this.refreshTermResult(student.id, row.academicYear, row.semester);

      this.logger.log(`Deleted grade for student: ${uniNo}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete grade: ${uniNo}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }
  async deleteAllGrades(uniNo: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, uniNo),
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);

      await this.db.delete(grades).where(eq(grades.studentId, student.id));
      await this.db.delete(results).where(eq(results.studentId, student.id));
      this.logger.log(`Deleted all grade for student: ${uniNo}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete grades: ${uniNo}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }
}
