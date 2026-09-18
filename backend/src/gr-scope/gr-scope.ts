import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { faculties } from 'schema';
import type { Db } from 'src/database/database.module';
import type { GrCaller } from 'src/gr-gurd/gr-gurd.guard';

/** Resolves a faculty name to its id; throws BadRequestException when unknown. */
export async function facultyIdFromName(db: Db, name: string): Promise<string> {
  const clean = name.trim();

  const row = await db.query.faculties.findFirst({
    where: eq(faculties.name, clean),
    columns: { id: true },
  });

  if (!row) throw new BadRequestException();

  return row.id;
}

/** Throws UnauthorizedException unless the caller may touch this faculty. */
export function assertFaculty(caller: GrCaller, rowFacultyId: string): void {
  if (caller.role === 'admin') return;
  if (rowFacultyId !== caller.facultyId) throw new UnauthorizedException();
}

/**
 * Faculty scope for list queries: null when unscoped (admin).
 * Throws UnauthorizedException for anyone else without a faculty.
 */
export function scopeFacultyId(caller: GrCaller): string | null {
  if (caller.role === 'admin') return null;
  if (caller.role !== 'data-entry' || !caller.facultyId) {
    throw new UnauthorizedException();
  }
  return caller.facultyId;
}
