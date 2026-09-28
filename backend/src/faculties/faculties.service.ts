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
import { and, count, eq, inArray, isNull, ne } from 'drizzle-orm';
import {
  curriculums,
  faculties,
  facultyCurriculums,
  results,
  specializations,
  students,
} from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import { assertFaculty, scopeFacultyId } from 'src/gr-scope/gr-scope';
import { SpecializationDto, UpdateFacultyDto } from './dto/faculties.dto';

/** A specialization as the views consume it. */
export interface SpecializationView {
  id: string;
  facultyId: string;
  name: { en: string; ar: string };
}

/** A faculty as the views consume it: one row, both languages, its specializations. */
export interface FacultyView {
  id: string;
  name: { en: string; ar: string };
  /** Two letters; the bulk import builds university numbers from them. */
  abbreviation: string | null;
  specializations: SpecializationView[];
}

/** A specialization on the faculty tab, with what uses it. */
export interface SpecializationUsageView extends SpecializationView {
  studentCount: number;
  curriculumCount: number;
}

/** The faculty tab: the faculty, and how much of it still lacks a specialization. */
export interface FacultyDetailView extends Omit<
  FacultyView,
  'specializations'
> {
  specializations: SpecializationUsageView[];
  /** Students without a specialization, and majors not yet tied to one. */
  studentsWithout: number;
  majorsWithout: number;
}

type SpecializationRow = typeof specializations.$inferSelect;

const specializationView = (row: SpecializationRow): SpecializationView => ({
  id: row.id,
  facultyId: row.facultyId,
  name: { en: row.nameEn, ar: row.nameAr },
});

/** A faculty row, with its specializations, as the views consume it. */
const toFacultyView = (
  row: typeof faculties.$inferSelect & { specializations: SpecializationRow[] },
): FacultyView => ({
  id: row.id,
  name: { en: row.nameEn, ar: row.nameAr },
  abbreviation: row.abbreviation,
  specializations: row.specializations
    .map(specializationView)
    .sort((a, b) => a.name.ar.localeCompare(b.name.ar, 'ar')),
});

/**
 * Faculties and their specializations. Admins reach every faculty; a
 * data-entry employee reaches only their own, and may edit it.
 */
@Injectable()
export class FacultiesService {
  private readonly logger = new Logger(FacultiesService.name);

  constructor(@Inject(DATABASE) private readonly db: Db) {}

  /** Rethrows the errors the views handle; anything else is logged as a failure. */
  private fail(message: string, error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnauthorizedException
    ) {
      throw error;
    }
    this.logger.error(message, error);
    throw new InternalServerErrorException('Faculties operation failed', {
      cause: error,
    });
  }

  private async facultyOrThrow(id: string, caller: GrCaller) {
    const row = await this.db.query.faculties.findFirst({
      where: eq(faculties.id, id),
    });
    if (!row) throw new NotFoundException();
    assertFaculty(caller, row.id);
    return row;
  }

  private async specializationOrThrow(id: string, caller: GrCaller) {
    const row = await this.db.query.specializations.findFirst({
      where: eq(specializations.id, id),
    });
    if (!row) throw new NotFoundException();
    assertFaculty(caller, row.facultyId);
    return row;
  }

  /** One faculty with its specializations, in the shape the list returns. */
  private async facultyView(id: string): Promise<FacultyView> {
    const row = await this.db.query.faculties.findFirst({
      where: eq(faculties.id, id),
      with: { specializations: true },
    });
    if (!row) throw new NotFoundException();
    return toFacultyView(row);
  }

  /** Lists faculties with their specializations: all for admin, only their own for data-entry. */
  async listFaculties(caller: GrCaller): Promise<FacultyView[]> {
    try {
      const scope = scopeFacultyId(caller);
      const rows = await this.db.query.faculties.findMany({
        where: scope ? eq(faculties.id, scope) : undefined,
        with: { specializations: true },
      });

      return rows.map(toFacultyView);
    } catch (error) {
      this.fail('Failed to list faculties', error);
    }
  }

  /** One faculty for its tab: its specializations with their use, and what still lacks one. */
  async getFaculty(id: string, caller: GrCaller): Promise<FacultyDetailView> {
    try {
      const row = await this.facultyOrThrow(id, caller);
      const specs = await this.db.query.specializations.findMany({
        where: eq(specializations.facultyId, row.id),
      });
      const specIds = specs.map((s) => s.id);

      const studentCounts = specIds.length
        ? await this.db
            .select({ id: students.specializationId, n: count() })
            .from(students)
            .where(inArray(students.specializationId, specIds))
            .groupBy(students.specializationId)
        : [];
      const curriculumCounts = specIds.length
        ? await this.db
            .select({ id: curriculums.specializationId, n: count() })
            .from(curriculums)
            .where(inArray(curriculums.specializationId, specIds))
            .groupBy(curriculums.specializationId)
        : [];
      const countOf = (
        rows: { id: string | null; n: number }[],
        specId: string,
      ) => rows.find((r) => r.id === specId)?.n ?? 0;

      const [studentsWithout] = await this.db
        .select({ n: count() })
        .from(students)
        .where(
          and(
            eq(students.facultyId, row.id),
            isNull(students.specializationId),
          ),
        );
      const links = await this.db.query.facultyCurriculums.findMany({
        where: eq(facultyCurriculums.facultyId, row.id),
        with: {
          curriculum: {
            columns: { requirementType: true, specializationId: true },
          },
        },
      });

      return {
        id: row.id,
        name: { en: row.nameEn, ar: row.nameAr },
        abbreviation: row.abbreviation,
        specializations: specs
          .map((s) => ({
            ...specializationView(s),
            studentCount: countOf(studentCounts, s.id),
            curriculumCount: countOf(curriculumCounts, s.id),
          }))
          .sort((a, b) => a.name.ar.localeCompare(b.name.ar, 'ar')),
        studentsWithout: studentsWithout.n,
        majorsWithout: links.filter(
          (l) =>
            l.curriculum.requirementType === 'major' &&
            l.curriculum.specializationId === null,
        ).length,
      };
    } catch (error) {
      this.fail(`Failed to read faculty: ${id}`, error);
    }
  }

  /**
   * Edits the faculty's names or two-letter code. The code builds new
   * university numbers and curriculum codes; existing ones keep theirs.
   */
  async updateFaculty(
    id: string,
    dto: UpdateFacultyDto,
    caller: GrCaller,
  ): Promise<FacultyView> {
    if (!dto || (dto.name === undefined && dto.abbreviation === undefined)) {
      throw new BadRequestException();
    }
    try {
      const row = await this.facultyOrThrow(id, caller);
      const nameEn = dto.name?.en.trim();
      const abbreviation = dto.abbreviation?.trim().toUpperCase();

      if (nameEn !== undefined && nameEn !== row.nameEn) {
        const clash = await this.db.query.faculties.findFirst({
          where: and(eq(faculties.nameEn, nameEn), ne(faculties.id, row.id)),
          columns: { id: true },
        });
        if (clash) throw new ConflictException({ code: 'NAME_TAKEN' });
      }
      if (abbreviation !== undefined && abbreviation !== row.abbreviation) {
        const clash = await this.db.query.faculties.findFirst({
          where: and(
            eq(faculties.abbreviation, abbreviation),
            ne(faculties.id, row.id),
          ),
          columns: { id: true },
        });
        if (clash) throw new ConflictException({ code: 'ABBREVIATION_TAKEN' });
      }

      await this.db
        .update(faculties)
        .set({
          ...(dto.name ? { nameEn, nameAr: dto.name.ar.trim() } : {}),
          ...(abbreviation !== undefined ? { abbreviation } : {}),
        })
        .where(eq(faculties.id, row.id));

      this.logger.log(`Updated faculty: ${row.id}`);
      return await this.facultyView(row.id);
    } catch (error) {
      this.fail(`Failed to update faculty: ${id}`, error);
    }
  }

  /** Refuses a name another of the faculty's specializations already uses. */
  private async assertNamesFree(
    facultyId: string,
    dto: SpecializationDto,
    exceptId?: string,
  ): Promise<void> {
    const same = await this.db.query.specializations.findMany({
      where: eq(specializations.facultyId, facultyId),
    });
    const en = dto.name.en.trim().toLowerCase();
    const ar = dto.name.ar.trim();
    const clash = same.some(
      (s) =>
        s.id !== exceptId && (s.nameEn.toLowerCase() === en || s.nameAr === ar),
    );
    if (clash) throw new ConflictException({ code: 'NAME_TAKEN' });
  }

  async createSpecialization(
    facultyId: string,
    dto: SpecializationDto,
    caller: GrCaller,
  ): Promise<SpecializationView> {
    try {
      const faculty = await this.facultyOrThrow(facultyId, caller);
      await this.assertNamesFree(faculty.id, dto);
      const [created] = await this.db
        .insert(specializations)
        .values({
          facultyId: faculty.id,
          nameEn: dto.name.en.trim(),
          nameAr: dto.name.ar.trim(),
        })
        .returning();
      this.logger.log(
        `Created specialization ${created.nameEn} in faculty ${faculty.id}`,
      );
      return specializationView(created);
    } catch (error) {
      this.fail('Failed to create specialization', error);
    }
  }

  async updateSpecialization(
    id: string,
    dto: SpecializationDto,
    caller: GrCaller,
  ): Promise<SpecializationView> {
    try {
      const row = await this.specializationOrThrow(id, caller);
      await this.assertNamesFree(row.facultyId, dto, row.id);
      const [updated] = await this.db
        .update(specializations)
        .set({ nameEn: dto.name.en.trim(), nameAr: dto.name.ar.trim() })
        .where(eq(specializations.id, row.id))
        .returning();
      this.logger.log(`Renamed specialization: ${row.id}`);
      return specializationView(updated);
    } catch (error) {
      this.fail(`Failed to update specialization: ${id}`, error);
    }
  }

  /** Deletes a specialization no student, curriculum or result uses yet (IN_USE otherwise). */
  async deleteSpecialization(
    id: string,
    caller: GrCaller,
  ): Promise<{ status: string }> {
    try {
      const row = await this.specializationOrThrow(id, caller);
      const [usedByStudents] = await this.db
        .select({ n: count() })
        .from(students)
        .where(eq(students.specializationId, row.id));
      const [usedByCurriculums] = await this.db
        .select({ n: count() })
        .from(curriculums)
        .where(eq(curriculums.specializationId, row.id));
      const [usedByResults] = await this.db
        .select({ n: count() })
        .from(results)
        .where(eq(results.specializationId, row.id));
      if (usedByStudents.n || usedByCurriculums.n || usedByResults.n) {
        throw new ConflictException({ code: 'IN_USE' });
      }
      await this.db
        .delete(specializations)
        .where(eq(specializations.id, row.id));
      this.logger.log(`Deleted specialization: ${row.id}`);
      return { status: 'Ok' };
    } catch (error) {
      this.fail(`Failed to delete specialization: ${id}`, error);
    }
  }
}
