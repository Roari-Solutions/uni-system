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
import { and, eq, inArray } from 'drizzle-orm';
import { curriculums, faculties, facultyCurriculums, grades, results, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import {
  CreateCurriculumDto,
  CreateGradeDto,
  CreateStudentDto,
  GradeIdentifiersDto,
  UpdateCurriculumDto,
  UpdateGradeDto,
  UpdateStudentDto,
} from './dto/grades.dto';

/** CRUD for curriculums, students, and grades with faculty scoping. */
@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Resolves a faculty name to its id; throws BadRequestException when unknown. */
  async facultyIdFromName(name: string) {
    const clean = name.trim();

    const row = await this.db.query.faculties.findFirst({
      where: eq(faculties.name, clean),
      columns: { id: true },
    });

    if (!row) throw new BadRequestException();

    return row.id;
  }

  /** Throws UnauthorizedException unless the caller may touch this faculty. */
  private assertFaculty(caller: GrCaller, rowFacultyId: string): void {
    if (caller.role === 'admin') return;
    if (rowFacultyId !== caller.facultyId) throw new UnauthorizedException();
  }

  /**
   * Faculty scope for list queries: null when unscoped (admin).
   * Throws UnauthorizedException for anyone else without a faculty.
   */
  private scopeFacultyId(caller: GrCaller): string | null {
    if (caller.role === 'admin') return null;
    if (caller.role !== 'data-entry' || !caller.facultyId) {
      throw new UnauthorizedException();
    }
    return caller.facultyId;
  }

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

  // ============================================== curriculums ==============================================

  /** Lists curriculums: all for admin, own faculty's offerings for data-entry. */
  async listCurriculums(caller: GrCaller) {
    try {
      const scope = this.scopeFacultyId(caller);
      if (!scope) return await this.db.query.curriculums.findMany();
      const links = await this.db.query.facultyCurriculums.findMany({
        where: eq(facultyCurriculums.facultyId, scope),
        with: { curriculum: true },
      });
      return links.map((l) => l.curriculum);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to list curriculums', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Creates a curriculum plus its faculty offering link. */
  async createCurriculum(dto: CreateCurriculumDto, caller: GrCaller): Promise<{ status: string }> {
    try {
      const facultyId = await this.facultyIdFromName(dto.faculty);
      this.assertFaculty(caller, facultyId);

      const existing = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.name, dto.name.trim()),
      });
      if (existing) throw new ConflictException();

      const [created] = await this.db
        .insert(curriculums)
        .values({
          name: dto.name.trim(),
          academicYear: dto.year.trim(),
          abbreviation: dto.abbreviation.trim(),
        })
        .returning({ id: curriculums.id });

      await this.db.insert(facultyCurriculums).values({ facultyId, curriculumId: created.id });

      this.logger.log(`Created curriculum: ${dto.name}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Failed to create curriculum', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Updates a curriculum identified by name plus its offering faculty. */
  async updateCurriculum(
    name: string,
    faculty: string,
    dto: UpdateCurriculumDto,
    caller: GrCaller,
  ): Promise<{ status: string }> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const facultyId = await this.facultyIdFromName(faculty);
      this.assertFaculty(caller, facultyId);

      const row = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.name, name.trim()),
        with: { facultyCurriculums: true },
      });
      if (!row) throw new NotFoundException();

      const link = row.facultyCurriculums.find((l) => l.facultyId === facultyId);
      if (!link) throw new NotFoundException();
      this.assertFaculty(caller, link.facultyId);

      if (dto.name !== undefined && dto.name.trim() !== row.name) {
        const clash = await this.db.query.curriculums.findFirst({
          where: eq(curriculums.name, dto.name.trim()),
        });
        if (clash) throw new ConflictException();
      }

      await this.db
        .update(curriculums)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.year !== undefined ? { academicYear: dto.year.trim() } : {}),
          ...(dto.abbreviation !== undefined ? { abbreviation: dto.abbreviation.trim() } : {}),
        })
        .where(eq(curriculums.id, row.id));

      if (dto.faculty !== undefined) {
        const destId = await this.facultyIdFromName(dto.faculty);
        this.assertFaculty(caller, destId);
        if (destId !== facultyId) {
          await this.db
            .delete(facultyCurriculums)
            .where(
              and(
                eq(facultyCurriculums.curriculumId, row.id),
                eq(facultyCurriculums.facultyId, facultyId),
              ),
            );
          const destLink = await this.db.query.facultyCurriculums.findFirst({
            where: and(
              eq(facultyCurriculums.curriculumId, row.id),
              eq(facultyCurriculums.facultyId, destId),
            ),
          });
          if (!destLink) {
            await this.db
              .insert(facultyCurriculums)
              .values({ facultyId: destId, curriculumId: row.id });
          }
        }
      }

      this.logger.log(`Updated curriculum: ${name}`);
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
      this.logger.error(`Failed to update curriculum: ${name}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Removes a faculty offering link; deletes the curriculum when orphaned. */
  async deleteCurriculum(
    name: string,
    faculty: string,
    caller: GrCaller,
  ): Promise<{ status: string }> {
    try {
      const facultyRow = await this.db.query.faculties.findFirst({
        where: eq(faculties.name, faculty.trim()),
        columns: { id: true },
      });
      if (!facultyRow) throw new NotFoundException();
      const facultyId = facultyRow.id;
      this.assertFaculty(caller, facultyId);

      const row = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.name, name.trim()),
        with: { facultyCurriculums: true },
      });
      if (!row) throw new NotFoundException();

      const link = row.facultyCurriculums.find((l) => l.facultyId === facultyId);
      if (!link) throw new NotFoundException();
      this.assertFaculty(caller, link.facultyId);

      await this.db
        .delete(facultyCurriculums)
        .where(
          and(
            eq(facultyCurriculums.curriculumId, row.id),
            eq(facultyCurriculums.facultyId, facultyId),
          ),
        );

      const remaining = await this.db.query.facultyCurriculums.findFirst({
        where: eq(facultyCurriculums.curriculumId, row.id),
        columns: { id: true },
      });

      if (!remaining) await this.db.delete(curriculums).where(eq(curriculums.id, row.id));

      this.logger.log(`Deleted curriculum offering: ${name} (${faculty})`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to delete curriculum: ${name}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  // ============================================== students ==============================================

  /** Lists students: all for admin, own faculty's for data-entry. */
  async listStudents(caller: GrCaller) {
    try {
      const scope = this.scopeFacultyId(caller);
      if (!scope) return await this.db.query.students.findMany();
      return await this.db.query.students.findMany({
        where: eq(students.facultyId, scope),
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to list students', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Creates a student in the given faculty. */
  async createStudent(dto: CreateStudentDto, caller: GrCaller): Promise<{ status: string }> {
    try {
      const facultyId = await this.facultyIdFromName(dto.faculty);
      this.assertFaculty(caller, facultyId);

      const existing = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, dto.uniNo.trim()),
      });
      if (existing) throw new ConflictException();

      await this.db.insert(students).values({
        name: dto.name.trim(),
        uniNumber: dto.uniNo.trim(),
        acceptanceType: dto.acceptanceType.trim(),
        acceptanceYear: dto.year.trim(),
        facultyId,
      });

      this.logger.log(`Created student: ${dto.uniNo}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Failed to create student', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Updates a student identified by university number. */
  async updateStudent(
    uniNo: string,
    dto: UpdateStudentDto,
    caller: GrCaller,
  ): Promise<{ status: string }> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const row = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, uniNo.trim()),
      });
      if (!row) throw new NotFoundException();
      this.assertFaculty(caller, row.facultyId);

      // the uniNumber is immutable
      if (dto.uniNo !== undefined && dto.uniNo.trim() !== row.uniNumber) {
        throw new BadRequestException();
      }

      let facultyId = row.facultyId;
      if (dto.faculty !== undefined) {
        facultyId = await this.facultyIdFromName(dto.faculty);
        this.assertFaculty(caller, facultyId);
      }

      await this.db
        .update(students)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.acceptanceType !== undefined
            ? { acceptanceType: dto.acceptanceType.trim() }
            : {}),
          ...(dto.year !== undefined ? { acceptanceYear: dto.year.trim() } : {}),
          facultyId,
        })
        .where(eq(students.id, row.id));

      this.logger.log(`Updated student: ${uniNo}`);
      return { status: 'Ok' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update student: ${uniNo}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Deletes a student plus their grades and results. */
  async deleteStudent(uniNo: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const row = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, uniNo.trim()),
        columns: { id: true, facultyId: true },
      });
      if (!row) throw new NotFoundException();
      this.assertFaculty(caller, row.facultyId);

      await this.db.transaction(async (tx) => {
        await tx.delete(grades).where(eq(grades.studentId, row.id));
        await tx.delete(results).where(eq(results.studentId, row.id));
        await tx.delete(students).where(eq(students.id, row.id));
      });

      this.logger.log(`Deleted student: ${uniNo}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to delete student: ${uniNo}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  // ============================================== grades ==============================================

  /** Lists grades: all for admin, own faculty's students' for data-entry. */
  async listGrades(caller: GrCaller) {
    try {
      const scope = this.scopeFacultyId(caller);
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
        columns: { id: true, facultyId: true },
      });
      if (!student) throw new BadRequestException();
      this.assertFaculty(caller, student.facultyId);

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
        columns: { id: true, facultyId: true },
      });
      if (!student) throw new NotFoundException();
      this.assertFaculty(caller, student.facultyId);

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
      this.assertFaculty(caller, student.facultyId);

      const row = await this.gradeOrThrow(student.id, ids, true);
      await this.db.delete(grades).where(eq(grades.id, row.id));

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
      this.assertFaculty(caller, student.facultyId);

      await this.db.delete(grades).where(eq(grades.studentId, student.id));
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
