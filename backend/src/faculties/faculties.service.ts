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
  facultyDepartments,
  grades,
  results,
  specializations,
  students,
} from 'schema';
import { DATABASE, type Db } from 'src/database/database.module';
import { GrCaller } from 'src/gr-gurd/gr-gurd.guard';
import {
  assertDepartmentOf,
  assertFaculty,
  scopeFacultyId,
} from 'src/gr-scope/gr-scope';
import { SEMESTERS } from 'src/common/academic-year';
import { takesCurriculum } from 'src/common/specialization';
import { GradesService } from 'src/grades/grades.service';
import { approvedStudents } from 'src/results/result-lock';
import {
  DepartmentDto,
  SpecializationDto,
  UpdateFacultyDto,
  UpdateSpecializationDto,
} from './dto/faculties.dto';

/** A specialization as the views consume it. */
export interface SpecializationView {
  id: string;
  facultyId: string;
  /** Null for a specialization directly under the faculty. */
  departmentId: string | null;
  name: { en: string; ar: string };
}

/** An academic department as the views consume it. */
export interface DepartmentView {
  id: string;
  facultyId: string;
  name: { en: string; ar: string };
}

/** A faculty as the views consume it: one row, both languages, its departments and specializations. */
export interface FacultyView {
  id: string;
  name: { en: string; ar: string };
  /** Two letters; the bulk import builds university numbers from them. */
  abbreviation: string | null;
  departments: DepartmentView[];
  specializations: SpecializationView[];
}

/** A specialization on the faculty tab, with what uses it. */
export interface SpecializationUsageView extends SpecializationView {
  studentCount: number;
  curriculumCount: number;
}

/** A department on the faculty tab, with what uses it. */
export interface DepartmentUsageView extends DepartmentView {
  studentCount: number;
  /** Majors tied to the department itself; its specializations' majors count under them. */
  curriculumCount: number;
  specializationCount: number;
}

/** The faculty tab: the faculty, and how much of it still lacks a department or specialization. */
export interface FacultyDetailView extends Omit<
  FacultyView,
  'specializations' | 'departments'
> {
  departments: DepartmentUsageView[];
  specializations: SpecializationUsageView[];
  /** Students without a specialization, and majors tied to neither a specialization nor a department. */
  studentsWithout: number;
  majorsWithout: number;
  /** Students outside every department. */
  studentsWithoutDepartment: number;
}

type SpecializationRow = typeof specializations.$inferSelect;
type DepartmentRow = typeof facultyDepartments.$inferSelect;

const specializationView = (row: SpecializationRow): SpecializationView => ({
  id: row.id,
  facultyId: row.facultyId,
  departmentId: row.departmentId,
  name: { en: row.nameEn, ar: row.nameAr },
});

const departmentView = (row: DepartmentRow): DepartmentView => ({
  id: row.id,
  facultyId: row.facultyId,
  name: { en: row.nameEn, ar: row.nameAr },
});

const byArabicName = (a: { name: { ar: string } }, b: { name: { ar: string } }) =>
  a.name.ar.localeCompare(b.name.ar, 'ar');

/** A faculty row, with its departments and specializations, as the views consume it. */
const toFacultyView = (
  row: typeof faculties.$inferSelect & {
    specializations: SpecializationRow[];
    departments: DepartmentRow[];
  },
): FacultyView => ({
  id: row.id,
  name: { en: row.nameEn, ar: row.nameAr },
  abbreviation: row.abbreviation,
  departments: row.departments.map(departmentView).sort(byArabicName),
  specializations: row.specializations.map(specializationView).sort(byArabicName),
});

/**
 * Faculties, their departments and their specializations. Admins reach every
 * faculty; a data-entry employee reaches only their own, and may edit it.
 */
@Injectable()
export class FacultiesService {
  private readonly logger = new Logger(FacultiesService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject() private readonly gradesService: GradesService,
  ) {}

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

  private async departmentOrThrow(id: string, caller: GrCaller) {
    const row = await this.db.query.facultyDepartments.findFirst({
      where: eq(facultyDepartments.id, id),
    });
    if (!row) throw new NotFoundException();
    assertFaculty(caller, row.facultyId);
    return row;
  }

  /** One faculty with its departments and specializations, in the shape the list returns. */
  private async facultyView(id: string): Promise<FacultyView> {
    const row = await this.db.query.faculties.findFirst({
      where: eq(faculties.id, id),
      with: { specializations: true, departments: true },
    });
    if (!row) throw new NotFoundException();
    return toFacultyView(row);
  }

  /** Lists faculties with their departments and specializations: all for admin, only their own for data-entry. */
  async listFaculties(caller: GrCaller): Promise<FacultyView[]> {
    try {
      const scope = scopeFacultyId(caller);
      const rows = await this.db.query.faculties.findMany({
        where: scope ? eq(faculties.id, scope) : undefined,
        with: { specializations: true, departments: true },
      });

      return rows.map(toFacultyView);
    } catch (error) {
      this.fail('Failed to list faculties', error);
    }
  }

  /** One faculty for its tab: its departments and specializations with their use, and what still lacks one. */
  async getFaculty(id: string, caller: GrCaller): Promise<FacultyDetailView> {
    try {
      const row = await this.facultyOrThrow(id, caller);
      const specs = await this.db.query.specializations.findMany({
        where: eq(specializations.facultyId, row.id),
      });
      const specIds = specs.map((s) => s.id);
      const depts = await this.db.query.facultyDepartments.findMany({
        where: eq(facultyDepartments.facultyId, row.id),
      });
      const deptIds = depts.map((d) => d.id);

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
      const deptStudentCounts = deptIds.length
        ? await this.db
            .select({ id: students.departmentId, n: count() })
            .from(students)
            .where(inArray(students.departmentId, deptIds))
            .groupBy(students.departmentId)
        : [];
      const deptCurriculumCounts = deptIds.length
        ? await this.db
            .select({ id: curriculums.departmentId, n: count() })
            .from(curriculums)
            .where(inArray(curriculums.departmentId, deptIds))
            .groupBy(curriculums.departmentId)
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
      const [studentsWithoutDepartment] = await this.db
        .select({ n: count() })
        .from(students)
        .where(
          and(eq(students.facultyId, row.id), isNull(students.departmentId)),
        );
      const links = await this.db.query.facultyCurriculums.findMany({
        where: eq(facultyCurriculums.facultyId, row.id),
        with: {
          curriculum: {
            columns: {
              requirementType: true,
              specializationId: true,
              departmentId: true,
            },
          },
        },
      });

      return {
        id: row.id,
        name: { en: row.nameEn, ar: row.nameAr },
        abbreviation: row.abbreviation,
        departments: depts
          .map((d) => ({
            ...departmentView(d),
            studentCount: countOf(deptStudentCounts, d.id),
            curriculumCount: countOf(deptCurriculumCounts, d.id),
            specializationCount: specs.filter((s) => s.departmentId === d.id)
              .length,
          }))
          .sort(byArabicName),
        specializations: specs
          .map((s) => ({
            ...specializationView(s),
            studentCount: countOf(studentCounts, s.id),
            curriculumCount: countOf(curriculumCounts, s.id),
          }))
          .sort(byArabicName),
        studentsWithout: studentsWithout.n,
        majorsWithout: links.filter(
          (l) =>
            l.curriculum.requirementType === 'major' &&
            l.curriculum.specializationId === null &&
            l.curriculum.departmentId === null,
        ).length,
        studentsWithoutDepartment: studentsWithoutDepartment.n,
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
    dto: { name: DepartmentDto['name'] },
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
      if (dto.departmentId) {
        await assertDepartmentOf(this.db, dto.departmentId, faculty.id);
      }
      const [created] = await this.db
        .insert(specializations)
        .values({
          facultyId: faculty.id,
          departmentId: dto.departmentId ?? null,
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

  /**
   * Renames a specialization, moves it to another department of its faculty
   * (null: directly under the faculty), or both. Its students move with it.
   */
  async updateSpecialization(
    id: string,
    dto: UpdateSpecializationDto,
    caller: GrCaller,
  ): Promise<SpecializationView> {
    const { confirmOrphanedGrades, ...changes } = dto ?? {};
    if (changes.name === undefined && changes.departmentId === undefined) {
      throw new BadRequestException();
    }
    try {
      const row = await this.specializationOrThrow(id, caller);
      if (changes.name) await this.assertNamesFree(row.facultyId, { name: changes.name }, row.id);

      const departmentId =
        changes.departmentId !== undefined ? changes.departmentId : row.departmentId;
      const moved = departmentId !== row.departmentId;
      if (moved) {
        if (departmentId) await assertDepartmentOf(this.db, departmentId, row.facultyId);
        await this.assertMoveAllowed(row, departmentId, confirmOrphanedGrades ?? false);
      }

      const updated = await this.db.transaction(async (tx) => {
        const [next] = await tx
          .update(specializations)
          .set({
            ...(changes.name
              ? { nameEn: changes.name.en.trim(), nameAr: changes.name.ar.trim() }
              : {}),
            departmentId,
          })
          .where(eq(specializations.id, row.id))
          .returning();
        // a specialization's students are always in its department
        if (moved) {
          await tx
            .update(students)
            .set({ departmentId })
            .where(eq(students.specializationId, row.id));
        }
        return next;
      });

      if (moved) {
        // their current year is measured against the department's majors, so it is rebuilt
        const members = await this.db.query.students.findMany({
          where: eq(students.specializationId, row.id),
          columns: { id: true, academicYear: true },
        });
        for (const member of members) {
          for (const semester of SEMESTERS) {
            await this.gradesService.refreshStudentsSemester(
              [member.id],
              member.academicYear,
              semester,
            );
          }
        }
        this.logger.log(
          `Moved specialization ${row.id} to ${departmentId ?? 'the faculty'} with ${members.length} students`,
        );
      } else {
        this.logger.log(`Renamed specialization: ${row.id}`);
      }
      return specializationView(updated);
    } catch (error) {
      this.fail(`Failed to update specialization: ${id}`, error);
    }
  }

  /**
   * Moving a specialization moves its students between departments, which
   * changes the department majors they take. That is refused for a student
   * whose results are approved in a semester it would change
   * (RESULTS_APPROVED), and grades in the old department's majors, which stop
   * counting but are kept, need the caller's confirmation (GRADES_ORPHANED).
   */
  private async assertMoveAllowed(
    spec: SpecializationRow,
    departmentId: string | null,
    confirmed: boolean,
  ): Promise<void> {
    const members = await this.db.query.students.findMany({
      where: eq(students.specializationId, spec.id),
      columns: { id: true, academicYear: true },
    });
    if (!members.length) return;

    const touched = [spec.departmentId, departmentId].filter(
      (d): d is string => d !== null,
    );
    const departmentMajors = touched.length
      ? await this.db.query.curriculums.findMany({
          where: and(
            eq(curriculums.requirementType, 'major'),
            inArray(curriculums.departmentId, touched),
          ),
          columns: {
            id: true,
            academicYear: true,
            semester: true,
            requirementType: true,
            specializationId: true,
            departmentId: true,
          },
        })
      : [];

    for (const member of members) {
      for (const semester of SEMESTERS) {
        const changes = departmentMajors.some(
          (c) => c.academicYear === member.academicYear && c.semester === semester,
        );
        if (!changes) continue;
        const locked = await approvedStudents(
          this.db,
          [member.id],
          member.academicYear,
          semester,
        );
        if (locked.size) throw new ConflictException({ code: 'RESULTS_APPROVED' });
      }
    }

    if (confirmed) return;
    const before = { departmentId: spec.departmentId, specializationId: spec.id };
    const after = { departmentId, specializationId: spec.id };
    const lost = new Set(
      departmentMajors
        .filter((c) => takesCurriculum(before, c) && !takesCurriculum(after, c))
        .map((c) => c.id),
    );
    if (!lost.size) return;
    const [orphaned] = await this.db
      .select({ n: count() })
      .from(grades)
      .where(
        and(
          inArray(
            grades.studentId,
            members.map((m) => m.id),
          ),
          inArray(grades.curriculumId, [...lost]),
        ),
      );
    if (orphaned.n) {
      throw new ConflictException({ code: 'GRADES_ORPHANED', count: orphaned.n });
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

  /** Refuses a name another of the faculty's departments already uses. */
  private async assertDepartmentNamesFree(
    facultyId: string,
    dto: DepartmentDto,
    exceptId?: string,
  ): Promise<void> {
    const same = await this.db.query.facultyDepartments.findMany({
      where: eq(facultyDepartments.facultyId, facultyId),
    });
    const en = dto.name.en.trim().toLowerCase();
    const ar = dto.name.ar.trim();
    const clash = same.some(
      (d) =>
        d.id !== exceptId && (d.nameEn.toLowerCase() === en || d.nameAr === ar),
    );
    if (clash) throw new ConflictException({ code: 'NAME_TAKEN' });
  }

  async createDepartment(
    facultyId: string,
    dto: DepartmentDto,
    caller: GrCaller,
  ): Promise<DepartmentView> {
    try {
      const faculty = await this.facultyOrThrow(facultyId, caller);
      await this.assertDepartmentNamesFree(faculty.id, dto);
      const [created] = await this.db
        .insert(facultyDepartments)
        .values({
          facultyId: faculty.id,
          nameEn: dto.name.en.trim(),
          nameAr: dto.name.ar.trim(),
        })
        .returning();
      this.logger.log(`Created department ${created.nameEn} in faculty ${faculty.id}`);
      return departmentView(created);
    } catch (error) {
      this.fail('Failed to create department', error);
    }
  }

  async updateDepartment(
    id: string,
    dto: DepartmentDto,
    caller: GrCaller,
  ): Promise<DepartmentView> {
    try {
      const row = await this.departmentOrThrow(id, caller);
      await this.assertDepartmentNamesFree(row.facultyId, dto, row.id);
      const [updated] = await this.db
        .update(facultyDepartments)
        .set({ nameEn: dto.name.en.trim(), nameAr: dto.name.ar.trim() })
        .where(eq(facultyDepartments.id, row.id))
        .returning();
      this.logger.log(`Renamed department: ${row.id}`);
      return departmentView(updated);
    } catch (error) {
      this.fail(`Failed to update department: ${id}`, error);
    }
  }

  /** Deletes a department no specialization, student, curriculum or result uses yet (IN_USE otherwise). */
  async deleteDepartment(id: string, caller: GrCaller): Promise<{ status: string }> {
    try {
      const row = await this.departmentOrThrow(id, caller);
      const uses = await Promise.all([
        this.db.select({ n: count() }).from(specializations).where(eq(specializations.departmentId, row.id)),
        this.db.select({ n: count() }).from(students).where(eq(students.departmentId, row.id)),
        this.db.select({ n: count() }).from(curriculums).where(eq(curriculums.departmentId, row.id)),
        this.db.select({ n: count() }).from(results).where(eq(results.departmentId, row.id)),
      ]);
      if (uses.some(([use]) => use.n)) {
        throw new ConflictException({ code: 'IN_USE' });
      }
      await this.db.delete(facultyDepartments).where(eq(facultyDepartments.id, row.id));
      this.logger.log(`Deleted department: ${row.id}`);
      return { status: 'Ok' };
    } catch (error) {
      this.fail(`Failed to delete department: ${id}`, error);
    }
  }
}
