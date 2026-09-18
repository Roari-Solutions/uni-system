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
import { eq } from 'drizzle-orm';
import { grades, results, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import { assertFaculty, facultyIdFromName, scopeFacultyId } from 'src/gr-scope/gr-scope';
import { CreateStudentDto, UpdateStudentDto } from './dto/students.dto';

/** CRUD for students with faculty scoping. */
@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Lists students: all for admin, own faculty's for data-entry. */
  async listStudents(caller: GrCaller) {
    try {
      const scope = scopeFacultyId(caller);
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
      const facultyId = await facultyIdFromName(this.db, dto.faculty);
      assertFaculty(caller, facultyId);

      const existing = await this.db.query.students.findFirst({
        where: eq(students.uniNumber, dto.uniNo.trim()),
      });
      if (existing) throw new ConflictException();

      await this.db.insert(students).values({
        name: dto.name.trim(),
        uniNumber: dto.uniNo.trim(),
        acceptanceType: dto.acceptanceType.trim(),
        acceptanceYear: dto.year.trim(),
        academicYear: dto.year.trim(),
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
      assertFaculty(caller, row.facultyId);

      // the uniNumber is immutable
      if (dto.uniNo !== undefined && dto.uniNo.trim() !== row.uniNumber) {
        throw new BadRequestException();
      }

      let facultyId = row.facultyId;
      if (dto.faculty !== undefined) {
        facultyId = await facultyIdFromName(this.db, dto.faculty);
        assertFaculty(caller, facultyId);
      }

      await this.db
        .update(students)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.acceptanceType !== undefined
            ? { acceptanceType: dto.acceptanceType.trim() }
            : {}),
          ...(dto.year !== undefined
            ? { acceptanceYear: dto.year.trim(), academicYear: dto.year.trim() }
            : {}),
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
      assertFaculty(caller, row.facultyId);

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

}
