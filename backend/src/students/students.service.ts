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
import { and, eq, SQL } from 'drizzle-orm';
import { grades, results, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import { assertFaculty, assertFacultyExists, scopeFacultyId } from 'src/gr-scope/gr-scope';
import { academicYearToNumber } from 'src/common/academic-year';
import { MISSING_NAME } from 'src/common/dto/localized-name.dto';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  UpdateStudentDto,
  type AcceptanceType,
  type StudentStatus,
} from './dto/students.dto';

/** A student as the views consume it. */
export interface StudentView {
  id: string;
  name: { en: string; ar: string };
  uniNumber: string;
  nationalId: string | null;
  acceptanceYear: string;
  acceptanceType: AcceptanceType;
  level: number;
  facultyId: string;
  status: StudentStatus | null;
}

type StudentRow = typeof students.$inferSelect;

/** CRUD for students with faculty scoping. */
@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Maps a row to the shape the views bind to. */
  private toView(row: StudentRow): StudentView {
    return {
      id: row.id,
      name: { en: row.nameEn, ar: row.nameAr },
      uniNumber: row.uniNumber,
      nationalId: row.nationalId,
      acceptanceYear: row.acceptanceYear,
      acceptanceType: row.acceptanceType as AcceptanceType,
      level: academicYearToNumber(row.academicYear),
      facultyId: row.facultyId,
      status: row.status,
    };
  }

  /**
   * Lists students, narrowed by the caller's faculty scope and the optional
   * filters the list view and the grade-entry cascade both send.
   */
  async listStudents(
    caller: GrCaller,
    query: ListStudentsQueryDto = {},
  ): Promise<StudentView[]> {
    try {
      const scope = scopeFacultyId(caller);
      // data-entry may only ever see their own faculty, whatever they asked for
      const facultyId = scope ?? query.facultyId;
      if (scope && query.facultyId && query.facultyId !== scope) {
        throw new UnauthorizedException();
      }

      const filters: SQL[] = [];
      if (facultyId) filters.push(eq(students.facultyId, facultyId));
      if (query.level) filters.push(eq(students.academicYear, query.level));
      if (query.acceptanceYear) {
        filters.push(eq(students.acceptanceYear, query.acceptanceYear));
      }

      const rows = await this.db.query.students.findMany({
        where: filters.length ? and(...filters) : undefined,
      });

      let views = rows.map((row) => this.toView(row));
      if (query.q?.trim()) {
        const needle = query.q.trim().toLowerCase();
        views = views.filter(
          (v) =>
            v.name.en.toLowerCase().includes(needle) ||
            v.name.ar.includes(needle) ||
            v.uniNumber.toLowerCase().includes(needle) ||
            (v.nationalId?.includes(needle) ?? false),
        );
      }

      return views;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to list students', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** The student with this id, for the details page. */
  async getStudent(id: string, caller: GrCaller): Promise<StudentView> {
    try {
      const row = await this.db.query.students.findFirst({ where: eq(students.id, id) });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.facultyId);
      return this.toView(row);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to get student: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Creates a student in the given faculty. */
  async createStudent(dto: CreateStudentDto, caller: GrCaller): Promise<StudentView> {
    try {
      const facultyId = await assertFacultyExists(this.db, dto.facultyId);
      assertFaculty(caller, facultyId);

      const uniNumber = dto.uniNumber.trim();
      const existing = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, uniNumber),
      });
      if (existing) throw new ConflictException();

      const nationalId = dto.nationalId?.trim() || null;
      if (nationalId) {
        const clash = await this.db.query.students.findFirst({
          where: eq(students.nationalId, nationalId),
        });
        if (clash) throw new ConflictException();
      }

      const [created] = await this.db
        .insert(students)
        .values({
          // an omitted English name is recorded as a dash, not as a copy of the Arabic
          nameEn: dto.name.en?.trim() || MISSING_NAME,
          nameAr: dto.name.ar.trim(),
          uniNumber,
          nationalId,
          acceptanceType: dto.acceptanceType,
          acceptanceYear: dto.acceptanceYear.trim(),
          academicYear: dto.level,
          status: dto.status ?? null,
          facultyId,
        })
        .returning();

      this.logger.log(`Created student: ${uniNumber}`);
      return this.toView(created);
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

  /** Updates the student with this id. */
  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    caller: GrCaller,
  ): Promise<StudentView> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const row = await this.db.query.students.findFirst({
        where: eq(students.id, id),
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.facultyId);

      // the university number is immutable
      if (dto.uniNumber !== undefined && dto.uniNumber.trim() !== row.uniNumber) {
        throw new BadRequestException();
      }

      let facultyId = row.facultyId;
      if (dto.facultyId !== undefined) {
        facultyId = await assertFacultyExists(this.db, dto.facultyId);
        assertFaculty(caller, facultyId);
      }

      let nationalId = row.nationalId;
      if (dto.nationalId !== undefined) {
        nationalId = dto.nationalId.trim() || null;
        if (nationalId && nationalId !== row.nationalId) {
          const clash = await this.db.query.students.findFirst({
            where: eq(students.nationalId, nationalId),
          });
          if (clash) throw new ConflictException();
        }
      }

      const [updated] = await this.db
        .update(students)
        .set({
          ...(dto.name !== undefined
            ? {
                nameEn: dto.name.en?.trim() || MISSING_NAME,
                nameAr: dto.name.ar.trim(),
              }
            : {}),
          ...(dto.nationalId !== undefined ? { nationalId } : {}),
          ...(dto.acceptanceType !== undefined ? { acceptanceType: dto.acceptanceType } : {}),
          ...(dto.acceptanceYear !== undefined
            ? { acceptanceYear: dto.acceptanceYear.trim() }
            : {}),
          ...(dto.level !== undefined ? { academicYear: dto.level } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          facultyId,
        })
        .where(eq(students.id, row.id))
        .returning();

      this.logger.log(`Updated student: ${row.uniNumber}`);
      return this.toView(updated);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update student: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Deletes the student with this id, plus their grades and results. */
  async deleteStudent(id: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const row = await this.db.query.students.findFirst({
        where: eq(students.id, id),
        columns: { id: true, facultyId: true, uniNumber: true },
      });
      if (!row) throw new NotFoundException();
      assertFaculty(caller, row.facultyId);

      await this.db.transaction(async (tx) => {
        await tx.delete(grades).where(eq(grades.studentId, row.id));
        await tx.delete(results).where(eq(results.studentId, row.id));
        await tx.delete(students).where(eq(students.id, row.id));
      });

      this.logger.log(`Deleted student: ${row.uniNumber}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to delete student: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }
}
