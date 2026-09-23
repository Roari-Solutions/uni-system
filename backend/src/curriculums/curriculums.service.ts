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
import { and, eq, inArray, like } from 'drizzle-orm';
import { curriculums, faculties, facultyCurriculums, grades, students } from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import { assertFaculty, assertFacultyExists, scopeFacultyId } from 'src/gr-scope/gr-scope';
import { academicYearToNumber, semesterToNumber } from 'src/common/academic-year';
import { MISSING_NAME } from 'src/common/dto/localized-name.dto';
import type { RequirementType } from 'src/common/requirement-type';
import { GradesService } from 'src/grades/grades.service';
import {
  CreateCurriculumDto,
  ListCurriculumsQueryDto,
  SuggestAbbreviationQueryDto,
  UpdateCurriculumDto,
} from './dto/curriculums.dto';
import { abbreviationLetters, buildAbbreviation, serialOf } from './abbreviation';

/** A curriculum as the views consume it: one faculty, one study year, one semester. */
export interface CurriculumView {
  id: string;
  name: { en: string; ar: string };
  facultyId: string;
  abbreviation: string | null;
  academicYear: number;
  semester: number;
  /** Null only on curriculums created before requirement types existed. */
  requirementType: RequirementType | null;
  /** Credit hours; they weight this curriculum's grade points in the GPA. */
  courseHours: number;
}

/** CRUD for curriculums with faculty scoping. */
@Injectable()
export class CurriculumsService {
  private readonly logger = new Logger(CurriculumsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject() private readonly gradesService: GradesService,
  ) {}

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

      // a university requirement is offered by every faculty, so it lists once per one
      let views: CurriculumView[] = [];
      for (const link of links) {
        views.push({
          id: link.curriculum.id,
          name: { en: link.curriculum.nameEn, ar: link.curriculum.nameAr },
          facultyId: link.facultyId,
          abbreviation: link.curriculum.abbreviation,
          academicYear: academicYearToNumber(link.curriculum.academicYear),
          semester: semesterToNumber(link.curriculum.semester),
          requirementType: link.curriculum.requirementType,
          courseHours: link.curriculum.courseHours,
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
      if (query.requirementType) {
        views = views.filter((v) => v.requirementType === query.requirementType);
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

  /**
   * Suggests the next XXXX-0000 code: the first serial free within the
   * faculty -> year -> semester that also yields a code no other curriculum
   * holds. Null when an input the letters need is missing or all 99 are used.
   */
  async suggestAbbreviation(
    query: SuggestAbbreviationQueryDto,
    caller: GrCaller,
  ): Promise<{ abbreviation: string | null }> {
    try {
      // a university requirement spans every faculty, so it names none
      const university = query.requirementType === 'university';
      const facultyId = university ? null : await assertFacultyExists(this.db, query.facultyId);
      if (facultyId) assertFaculty(caller, facultyId);

      const faculty = facultyId
        ? await this.db.query.faculties.findFirst({
            where: eq(faculties.id, facultyId),
            columns: { abbreviation: true },
          })
        : null;
      const letters = abbreviationLetters(
        query.requirementType,
        faculty?.abbreviation ?? null,
        query.nameEn,
      );
      if (!letters) return { abbreviation: null };

      const taken = new Set<number>();

      // serials this faculty already uses in the same year and semester
      const links = facultyId
        ? await this.db.query.facultyCurriculums.findMany({
            where: eq(facultyCurriculums.facultyId, facultyId),
            with: {
              curriculum: { columns: { abbreviation: true, academicYear: true, semester: true } },
            },
          })
        : [];
      for (const { curriculum } of links) {
        if (curriculum.academicYear !== query.academicYear) continue;
        if (curriculum.semester !== query.semester) continue;
        const serial = serialOf(curriculum.abbreviation);
        if (serial !== null) taken.add(serial);
      }

      // codes are unique university-wide; UT codes from other faculties can collide
      const sameStem = await this.db.query.curriculums.findMany({
        where: like(curriculums.abbreviation, `${letters}-${query.academicYear}${query.semester}%`),
        columns: { abbreviation: true },
      });
      for (const row of sameStem) {
        const serial = serialOf(row.abbreviation);
        if (serial !== null) taken.add(serial);
      }

      for (let serial = 1; serial <= 99; serial++) {
        if (!taken.has(serial)) {
          return {
            abbreviation: buildAbbreviation(letters, query.academicYear, query.semester, serial),
          };
        }
      }
      return { abbreviation: null };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Failed to suggest curriculum abbreviation', error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Creates a curriculum plus its faculty offering links. A university
   * requirement belongs to every faculty, so only an admin may create one.
   */
  async createCurriculum(dto: CreateCurriculumDto, caller: GrCaller): Promise<CurriculumView> {
    try {
      const university = dto.requirementType === 'university';
      if (university && scopeFacultyId(caller) !== null) {
        this.logger.warn('Rejected a scoped caller creating a university requirement');
        throw new UnauthorizedException();
      }

      const facultyId = university ? null : await assertFacultyExists(this.db, dto.facultyId);
      if (facultyId) assertFaculty(caller, facultyId);

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
          requirementType: dto.requirementType,
          courseHours: dto.courseHours,
          abbreviation,
        })
        .returning();

      // every faculty offers a university requirement; the rest offer one
      const offering = facultyId
        ? [facultyId]
        : (await this.db.query.faculties.findMany({ columns: { id: true } })).map((f) => f.id);
      if (!offering.length) throw new BadRequestException();

      await this.db
        .insert(facultyCurriculums)
        .values(offering.map((id) => ({ facultyId: id, curriculumId: created.id })));

      // the new curriculum leaves its semester unmarked for that cohort, so any
      // GPA already stored for them no longer holds
      await this.gradesService.refreshFacultiesSemester(
        offering,
        created.academicYear,
        created.semester,
      );

      this.logger.log(
        `Created curriculum: ${abbreviation}${university ? ` across ${offering.length} faculties` : ''}`,
      );
      return {
        id: created.id,
        name: { en: created.nameEn, ar: created.nameAr },
        facultyId: offering[0],
        abbreviation: created.abbreviation,
        academicYear: academicYearToNumber(created.academicYear),
        semester: semesterToNumber(created.semester),
        requirementType: created.requirementType,
        courseHours: created.courseHours,
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

  /**
   * One curriculum for the edit form. A university requirement is offered by
   * every faculty; a scoped caller sees it under their own.
   */
  async getCurriculum(id: string, caller: GrCaller): Promise<CurriculumView> {
    try {
      const { row, link } = await this.offeringOrThrow(id);
      const scope = scopeFacultyId(caller);
      const offering = row.facultyCurriculums.map((l) => l.facultyId);
      if (scope && !offering.includes(scope)) throw new UnauthorizedException();

      return {
        id: row.id,
        name: { en: row.nameEn, ar: row.nameAr },
        facultyId: scope ?? link.facultyId,
        abbreviation: row.abbreviation,
        academicYear: academicYearToNumber(row.academicYear),
        semester: semesterToNumber(row.semester),
        requirementType: row.requirementType,
        courseHours: row.courseHours,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to read curriculum: ${id}`, error);
      throw new InternalServerErrorException('Grades operation failed', {
        cause: error,
      });
    }
  }

  /**
   * Updates the curriculum with this id. Every field may change; the faculties
   * offering it follow the requirement type and faculty, and every GPA the old
   * or new placement reaches is rebuilt.
   *
   * Grades are never deleted here. When faculties stop offering the curriculum,
   * their students' grades in it stop counting but stay as history; the caller
   * must first confirm that (GRADES_ORPHANED carries how many are affected).
   */
  async updateCurriculum(
    id: string,
    dto: UpdateCurriculumDto,
    caller: GrCaller,
  ): Promise<CurriculumView> {
    const { confirmOrphanedGrades, ...changes } = dto ?? {};
    if (!Object.keys(changes).length) throw new BadRequestException();
    try {
      const { row, link } = await this.offeringOrThrow(id);
      const before = row.facultyCurriculums.map((l) => l.facultyId);

      const requirementType = changes.requirementType ?? row.requirementType;
      const wasUniversity = row.requirementType === 'university';
      const isUniversity = requirementType === 'university';

      // a university requirement spans every faculty, so only an admin may touch
      // one, the same rule as creating it
      if ((wasUniversity || isUniversity) && scopeFacultyId(caller) !== null) {
        this.logger.warn(`Rejected a scoped caller editing a university requirement: ${row.id}`);
        throw new UnauthorizedException();
      }
      assertFaculty(caller, link.facultyId);

      let after: string[];
      if (isUniversity) {
        after = (await this.db.query.faculties.findMany({ columns: { id: true } })).map(
          (f) => f.id,
        );
      } else {
        // leaving "university" has to say which single faculty keeps it
        const target = changes.facultyId ?? (wasUniversity ? undefined : link.facultyId);
        if (!target) throw new BadRequestException();
        const facultyId = await assertFacultyExists(this.db, target);
        assertFaculty(caller, facultyId);
        after = [facultyId];
      }
      if (!after.length) throw new BadRequestException();

      const abbreviation = changes.abbreviation?.trim();
      if (abbreviation !== undefined && abbreviation !== row.abbreviation) {
        const clash = await this.db.query.curriculums.findFirst({
          where: eq(curriculums.abbreviation, abbreviation),
        });
        if (clash) throw new ConflictException();
      }

      const dropped = before.filter((f) => !after.includes(f));
      const added = after.filter((f) => !before.includes(f));
      if (dropped.length && !confirmOrphanedGrades) {
        const orphaned = await this.db
          .select({ id: grades.id })
          .from(grades)
          .innerJoin(students, eq(students.id, grades.studentId))
          .where(and(eq(grades.curriculumId, row.id), inArray(students.facultyId, dropped)));
        if (orphaned.length) {
          throw new ConflictException({ code: 'GRADES_ORPHANED', count: orphaned.length });
        }
      }

      const updated = await this.db.transaction(async (tx) => {
        const [next] = await tx
          .update(curriculums)
          .set({
            ...(changes.name !== undefined
              ? {
                  nameEn: changes.name.en?.trim() || MISSING_NAME,
                  nameAr: changes.name.ar.trim(),
                }
              : {}),
            ...(changes.academicYear !== undefined ? { academicYear: changes.academicYear } : {}),
            ...(changes.semester !== undefined ? { semester: changes.semester } : {}),
            ...(changes.courseHours !== undefined ? { courseHours: changes.courseHours } : {}),
            requirementType,
            ...(abbreviation !== undefined ? { abbreviation } : {}),
          })
          .where(eq(curriculums.id, row.id))
          .returning();

        if (dropped.length) {
          await tx
            .delete(facultyCurriculums)
            .where(
              and(
                eq(facultyCurriculums.curriculumId, row.id),
                inArray(facultyCurriculums.facultyId, dropped),
              ),
            );
        }
        if (added.length) {
          await tx
            .insert(facultyCurriculums)
            .values(added.map((facultyId) => ({ facultyId, curriculumId: row.id })));
        }
        return next;
      });

      // the hours weight each grade's points, so those are rebuilt first
      if (updated.courseHours !== row.courseHours) {
        await this.gradesService.recomputeCurriculum(row.id);
      }

      // rebuild every GPA the old or the new placement reaches: the cohorts that
      // sit it, and anyone already graded in it (their grades may be history)
      const moved =
        dropped.length > 0 ||
        added.length > 0 ||
        updated.academicYear !== row.academicYear ||
        updated.semester !== row.semester;
      if (moved) {
        const graded = (
          await this.db.query.grades.findMany({
            where: eq(grades.curriculumId, row.id),
            columns: { studentId: true },
          })
        ).map((g) => g.studentId);

        await this.gradesService.refreshFacultiesSemester(before, row.academicYear, row.semester);
        await this.gradesService.refreshStudentsSemester(graded, row.academicYear, row.semester);
        await this.gradesService.refreshFacultiesSemester(
          after,
          updated.academicYear,
          updated.semester,
        );
        await this.gradesService.refreshStudentsSemester(
          graded,
          updated.academicYear,
          updated.semester,
        );
      }

      this.logger.log(`Updated curriculum: ${row.id}`);
      return {
        id: updated.id,
        name: { en: updated.nameEn, ar: updated.nameAr },
        facultyId: after[0],
        abbreviation: updated.abbreviation,
        academicYear: academicYearToNumber(updated.academicYear),
        semester: semesterToNumber(updated.semester),
        requirementType: updated.requirementType,
        courseHours: updated.courseHours,
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

      // captured before the links go: their students' GPAs are rebuilt after
      const offering = (
        await this.db.query.facultyCurriculums.findMany({
          where: eq(facultyCurriculums.curriculumId, row.id),
          columns: { facultyId: true },
        })
      ).map((l) => l.facultyId);

      await this.db.transaction(async (tx) => {
        await tx.delete(grades).where(eq(grades.curriculumId, row.id));
        await tx.delete(facultyCurriculums).where(eq(facultyCurriculums.curriculumId, row.id));
        await tx.delete(curriculums).where(eq(curriculums.id, row.id));
      });

      await this.gradesService.refreshFacultiesSemester(offering, row.academicYear, row.semester);

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
