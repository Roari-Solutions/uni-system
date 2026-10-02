import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { faculties, facultyDepartments, specializations } from 'schema';
import type { StudentTrack } from 'src/common/specialization';
import type { Db } from 'src/database/database.module';
import type { GrCaller } from 'src/gr-gurd/gr-gurd.guard';

/** Verifies a faculty id exists; throws BadRequestException when unknown. */
export async function assertFacultyExists(db: Db, facultyId: string): Promise<string> {
  const row = await db.query.faculties.findFirst({
    where: eq(faculties.id, facultyId),
    columns: { id: true },
  });

  if (!row) throw new BadRequestException();

  return row.id;
}

/** Throws UnauthorizedException unless the caller may touch this faculty. */
export function assertFaculty(caller: GrCaller, rowFacultyId: string): void {
  if (caller.allFaculties) return;
  if (rowFacultyId !== caller.facultyId) throw new UnauthorizedException();
}

/**
 * Faculty scope for list queries: null when unscoped (across all faculties).
 * Throws UnauthorizedException for a scoped caller without a faculty.
 */
export function scopeFacultyId(caller: GrCaller): string | null {
  if (caller.allFaculties) return null;
  if (!caller.facultyId) throw new UnauthorizedException();
  return caller.facultyId;
}

/**
 * Verifies a specialization belongs to the faculty; a specialization from
 * another faculty is refused with SPECIALIZATION_MISMATCH.
 */
export async function assertSpecializationOf(
  db: Db,
  specializationId: string,
  facultyId: string,
): Promise<void> {
  const row = await db.query.specializations.findFirst({
    where: eq(specializations.id, specializationId),
    columns: { facultyId: true },
  });
  if (row?.facultyId !== facultyId) {
    throw new BadRequestException({ code: 'SPECIALIZATION_MISMATCH' });
  }
}

/**
 * Verifies a department belongs to the faculty; a department from another
 * faculty is refused with DEPARTMENT_MISMATCH.
 */
export async function assertDepartmentOf(
  db: Db,
  departmentId: string,
  facultyId: string,
): Promise<void> {
  const row = await db.query.facultyDepartments.findFirst({
    where: eq(facultyDepartments.id, departmentId),
    columns: { facultyId: true },
  });
  if (row?.facultyId !== facultyId) {
    throw new BadRequestException({ code: 'DEPARTMENT_MISMATCH' });
  }
}

/**
 * Checks a student's place in the faculty and fills in what follows from it.
 * A specialization under a department puts the student in that department, so
 * an omitted department (undefined) is taken from it; a department sent that
 * contradicts it is refused with DEPARTMENT_MISMATCH.
 */
export async function resolveTrack(
  db: Db,
  facultyId: string,
  departmentId: string | null | undefined,
  specializationId: string | null,
): Promise<StudentTrack> {
  if (specializationId) {
    const spec = await db.query.specializations.findFirst({
      where: eq(specializations.id, specializationId),
      columns: { facultyId: true, departmentId: true },
    });
    if (spec?.facultyId !== facultyId) {
      throw new BadRequestException({ code: 'SPECIALIZATION_MISMATCH' });
    }
    if (departmentId !== undefined && departmentId !== spec.departmentId) {
      throw new BadRequestException({ code: 'DEPARTMENT_MISMATCH' });
    }
    return { departmentId: spec.departmentId, specializationId };
  }
  if (departmentId) await assertDepartmentOf(db, departmentId, facultyId);
  return { departmentId: departmentId ?? null, specializationId: null };
}
