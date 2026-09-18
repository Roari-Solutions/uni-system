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

  async termCoverage(studentId: string, academicYear: string, semester: '1' | '2') {
    const student = await this.db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { facultyId: true },
    });
    if (!student) throw new NotFoundException();

    const facultyId = student.facultyId;
    const facultyRequiredCurriculums = await this.db.query.facultyCurriculums.findMany({
      where: eq(facultyCurriculums.facultyId, facultyId),
    });

    const curriculumIds = facultyRequiredCurriculums.map((obj) => obj.curriculumId);

    const studetGrades = await this.db.query.grades.findMany({
      where: and(
        eq(grades.studentId, studentId),
        eq(grades.academicYear, academicYear),
        eq(grades.semester, semester),
        isNotNull(grades.grade),
      ),
    });

    const filledIds = new Set(studetGrades.map((g) => g.curriculumId));
    const complete = curriculumIds.every((id) => filledIds.has(id));
    if (!complete) return { complete, average: null as number | null };

    const average =
      studetGrades.reduce((acc, cur) => acc + Number(cur.grade), 0) / studetGrades.length;
    return { complete, average };
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
    const { complete, average } = await this.termCoverage(studentId, academicYear, semester);
    if (!complete || average === null) {
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
    const result = average.toFixed(2);
    const gpa = Math.min(average / 25, 4).toFixed(2);
    await this.db
      .insert(results)
      .values({
        studentId,
        academicYear,
        semester,
        result,
        gpa,
        status: average >= 50 ? 'pass' : 'fail',
      })
      .onConflictDoUpdate({
        target: [results.studentId, results.academicYear, results.semester],
        set: {
          result,
          gpa,
          status: average >= 50 ? 'pass' : 'fail',
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

      await this.db.insert(grades).values({
        studentId: student.id,
        curriculumId: curriculum.id,
        grade: String(dto.grade),
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

      await this.db
        .update(grades)
        .set({
          curriculumId,
          ...(dto.grade !== undefined ? { grade: String(dto.grade) } : {}),
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
  async deleteAllGrades(uniNo: string, caller: GrCaller) {
    try {
      const student = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, uniNo),
      });
      if (!student) throw new NotFoundException();
      assertFaculty(caller, student.facultyId);

      await this.db.delete(grades).where(eq(grades.studentId, student.id));
      await this.db.delete(results).where(eq(results.studentId, student.id));
      this.logger.log(`Deleted all grade for student: ${uniNo}`);
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
