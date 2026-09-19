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
import { curriculums, facultyCurriculums, grades } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import { assertFaculty, assertFacultyExists, scopeFacultyId } from 'src/gr-scope/gr-scope';
import { academicYearToNumber, semesterToNumber } from 'src/common/academic-year';
import { MISSING_NAME } from 'src/common/dto/localized-name.dto';
import {
  CreateCurriculumDto,
  ListCurriculumsQueryDto,
  UpdateCurriculumDto,
} from './dto/curriculums.dto';

/** A curriculum as the views consume it: one faculty, one study year, one semester. */
export interface CurriculumView {
  id: string;
  name: { en: string; ar: string };
  facultyId: string;
  abbreviation: string | null;
  academicYear: number;
  semester: number;
}

/** CRUD for curriculums with faculty scoping. */
@Injectable()
export class CurriculumsService {
  private readonly logger = new Logger(CurriculumsService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Resolves the curriculum plus the faculty that offers it, or throws. */
  private async offeringOrThrow(id: string) {
    const row = await this.db.query.curriculums.findFirst({
      where: eq(curriculums.id, id),
      with: { facultyCurriculums: true },
    });
    if (!row) throw new NotFoundException();

    // The views model a curriculum as belonging to exactly one faculty, which is
    // what createCurriculum writes; older rows with several links use the first.
    const link = row.facultyCurriculums[0];
    if (!link) throw new NotFoundException();

    return { row, link };
  }

  /**
   * Lists curriculums, narrowed by the caller's faculty scope and the optional
   * filters the list view and the grade-entry cascade both send.
   */
  async listCurriculums(
    caller: GrCaller,
    query: ListCurriculumsQueryDto = {},
  ): Promise<CurriculumView[]> {
    try {
      const scope = scopeFacultyId(caller);
      // data-entry may only ever see their own faculty, whatever they asked for
      const facultyId = scope ?? query.facultyId;
      if (scope && query.facultyId && query.facultyId !== scope) {
        throw new UnauthorizedException();
      }

      const links = await this.db.query.facultyCurriculums.findMany({
        where: facultyId ? eq(facultyCurriculums.facultyId, facultyId) : undefined,
        with: { curriculum: true },
      });

      const seen = new Set<string>();
      let views: CurriculumView[] = [];
      for (const link of links) {
        if (seen.has(link.curriculumId)) continue;
        seen.add(link.curriculumId);
        views.push({
          id: link.curriculum.id,
          name: { en: link.curriculum.nameEn, ar: link.curriculum.nameAr },
          facultyId: link.facultyId,
          abbreviation: link.curriculum.abbreviation,
          academicYear: academicYearToNumber(link.curriculum.academicYear),
          semester: semesterToNumber(link.curriculum.semester),
        });
      }

      if (query.academicYear) {
        const year = academicYearToNumber(query.academicYear);
        views = views.filter((v) => v.academicYear === year);
      }
      if (query.semester) {
        const semester = semesterToNumber(query.semester);
        views = views.filter((v) => v.semester === semester);
      }
      if (query.q?.trim()) {
        const needle = query.q.trim().toLowerCase();
        views = views.filter(
          (v) =>
            v.name.en.toLowerCase().includes(needle) ||
            v.name.ar.includes(needle) ||
            (v.abbreviation?.toLowerCase().includes(needle) ?? false),
        );
      }

      return views;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to list curriculums', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Creates a curriculum plus its faculty offering link. */
  async createCurriculum(dto: CreateCurriculumDto, caller: GrCaller): Promise<CurriculumView> {
    try {
      const facultyId = await assertFacultyExists(this.db, dto.facultyId);
      assertFaculty(caller, facultyId);

      // the abbreviation is the identifier; names are free text
      const abbreviation = dto.abbreviation.trim();
      const existing = await this.db.query.curriculums.findFirst({
        where: eq(curriculums.abbreviation, abbreviation),
      });
      if (existing) throw new ConflictException();

      const [created] = await this.db
        .insert(curriculums)
        .values({
          // an omitted English name is recorded as a dash, not as a copy of the Arabic
          nameEn: dto.name.en?.trim() || MISSING_NAME,
          nameAr: dto.name.ar.trim(),
          academicYear: dto.academicYear,
          semester: dto.semester,
          abbreviation,
        })
        .returning();

      await this.db.insert(facultyCurriculums).values({ facultyId, curriculumId: created.id });

      this.logger.log(`Created curriculum: ${abbreviation}`);
      return {
        id: created.id,
        name: { en: created.nameEn, ar: created.nameAr },
        facultyId,
        abbreviation: created.abbreviation,
        academicYear: academicYearToNumber(created.academicYear),
        semester: semesterToNumber(created.semester),
      };
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

  /** Updates the curriculum with this id, moving its faculty link when asked. */
  async updateCurriculum(
    id: string,
    dto: UpdateCurriculumDto,
    caller: GrCaller,
  ): Promise<CurriculumView> {
    if (!dto || !Object.keys(dto).length) throw new BadRequestException();
    try {
      const { row, link } = await this.offeringOrThrow(id);
      assertFaculty(caller, link.facultyId);

      const abbreviation = dto.abbreviation?.trim();
      if (abbreviation !== undefined && abbreviation !== row.abbreviation) {
        const clash = await this.db.query.curriculums.findFirst({
          where: eq(curriculums.abbreviation, abbreviation),
        });
        if (clash) throw new ConflictException();
      }

      const [updated] = await this.db
        .update(curriculums)
        .set({
          ...(dto.name !== undefined
            ? {
                nameEn: dto.name.en?.trim() || MISSING_NAME,
                nameAr: dto.name.ar.trim(),
              }
            : {}),
          ...(dto.academicYear !== undefined ? { academicYear: dto.academicYear } : {}),
          ...(dto.semester !== undefined ? { semester: dto.semester } : {}),
          ...(abbreviation !== undefined ? { abbreviation } : {}),
        })
        .where(eq(curriculums.id, row.id))
        .returning();

      let facultyId = link.facultyId;
      if (dto.facultyId !== undefined && dto.facultyId !== link.facultyId) {
        const destId = await assertFacultyExists(this.db, dto.facultyId);
        assertFaculty(caller, destId);

        await this.db
          .delete(facultyCurriculums)
          .where(
            and(
              eq(facultyCurriculums.curriculumId, row.id),
              eq(facultyCurriculums.facultyId, link.facultyId),
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
        facultyId = destId;
      }

      this.logger.log(`Updated curriculum: ${row.id}`);
      return {
        id: updated.id,
        name: { en: updated.nameEn, ar: updated.nameAr },
        facultyId,
        abbreviation: updated.abbreviation,
        academicYear: academicYearToNumber(updated.academicYear),
        semester: semesterToNumber(updated.semester),
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
      this.logger.error(`Failed to update curriculum: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /** Deletes the curriculum with this id, along with its links and grades. */
  async deleteCurriculum(id: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const { row, link } = await this.offeringOrThrow(id);
      assertFaculty(caller, link.facultyId);

      await this.db.transaction(async (tx) => {
        await tx.delete(grades).where(eq(grades.curriculumId, row.id));
        await tx.delete(facultyCurriculums).where(eq(facultyCurriculums.curriculumId, row.id));
        await tx.delete(curriculums).where(eq(curriculums.id, row.id));
      });

      this.logger.log(`Deleted curriculum: ${row.id}`);
      return { status: 'Ok' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to delete curriculum: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }
}
