import { ConflictException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { results, resultStudents } from 'schema';
import type { Db } from 'src/database/database.module';
import type { AcademicYear, Semester } from 'src/common/academic-year';

type ResultKind = (typeof results.$inferSelect)['kind'];

/**
 * The students among these whose results of this kind are approved for the
 * academic year and semester. An approved regular result locks the marks; an
 * approved resit result locks the Sup & Sub marks as well.
 */
export async function approvedStudents(
  db: Db,
  studentIds: string[],
  academicYear: AcademicYear,
  semester: Semester,
  kind: ResultKind = 'regular',
): Promise<Set<string>> {
  if (!studentIds.length) return new Set();
  const rows = await db
    .select({ studentId: resultStudents.studentId })
    .from(resultStudents)
    .innerJoin(results, eq(results.id, resultStudents.resultId))
    .where(
      and(
        inArray(resultStudents.studentId, studentIds),
        eq(results.academicYear, academicYear),
        eq(results.semester, semester),
        eq(results.kind, kind),
        eq(results.status, 'approved'),
      ),
    );
  return new Set(rows.map((r) => r.studentId));
}

/**
 * Refuses a change to a mark once the student's results for that semester are
 * approved, with RESULTS_APPROVED so the views can say why.
 */
export async function assertGradesOpen(
  db: Db,
  studentId: string,
  academicYear: AcademicYear,
  semester: Semester,
): Promise<void> {
  const locked = await approvedStudents(
    db,
    [studentId],
    academicYear,
    semester,
  );
  if (locked.size) throw new ConflictException({ code: 'RESULTS_APPROVED' });
}

/** Whether any approved result lists the student, in any semester. */
export async function hasApprovedResults(
  db: Db,
  studentId: string,
): Promise<boolean> {
  const row = await db
    .select({ id: resultStudents.id })
    .from(resultStudents)
    .innerJoin(results, eq(results.id, resultStudents.resultId))
    .where(
      and(
        eq(resultStudents.studentId, studentId),
        eq(results.status, 'approved'),
      ),
    )
    .limit(1);
  return row.length > 0;
}
