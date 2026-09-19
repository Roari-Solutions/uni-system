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
import { and, eq } from 'drizzle-orm';
import { curriculums, faculties, facultyCurriculums } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import { assertFaculty, facultyIdFromName, scopeFacultyId } from 'src/gr-scope/gr-scope';
import { CreateCurriculumDto, UpdateCurriculumDto } from './dto/curriculums.dto';

/** CRUD for curriculums with faculty scoping. */
@Injectable()
export class CurriculumsService {
  private readonly logger = new Logger(CurriculumsService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Lists curriculums: all for admin, own faculty's offerings for data-entry. */
  async listCurriculums(caller: GrCaller) {
    try {
      const scope = scopeFacultyId(caller);
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
      const facultyId = await facultyIdFromName(this.db, dto.faculty);
      assertFaculty(caller, facultyId);

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
          ...(dto.courseHours !== undefined ? { courseHours: dto.courseHours } : {}),
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
      const facultyId = await facultyIdFromName(this.db, faculty);
      assertFaculty(caller, facultyId);

      const row = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.name, name.trim()),
        with: { facultyCurriculums: true },
      });
      if (!row) throw new NotFoundException();

      const link = row.facultyCurriculums.find((l) => l.facultyId === facultyId);
      if (!link) throw new NotFoundException();
      assertFaculty(caller, link.facultyId);

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
          ...(dto.courseHours !== undefined ? { courseHours: dto.courseHours } : {}),
        })
        .where(eq(curriculums.id, row.id));

      if (dto.faculty !== undefined) {
        const destId = await facultyIdFromName(this.db, dto.faculty);
        assertFaculty(caller, destId);
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
      assertFaculty(caller, facultyId);

      const row = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.name, name.trim()),
        with: { facultyCurriculums: true },
      });
      if (!row) throw new NotFoundException();

      const link = row.facultyCurriculums.find((l) => l.facultyId === facultyId);
      if (!link) throw new NotFoundException();
      assertFaculty(caller, link.facultyId);

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

}
