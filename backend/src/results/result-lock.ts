import { ConflictException } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
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

/**
 * Whether the Sup & Sub results are approved for the batch whose semester
 * results list this student. A Sup & Sub sheet lists only the students who
 * sat a re-exam, so this is judged by the batch, not by who is on that sheet:
 * once it is approved, no one in the batch takes a new re-exam mark.
 */
export async function resitsClosed(
  db: Db,
  studentId: string,
  academicYear: AcademicYear,
  semester: Semester,
): Promise<boolean> {
  const batches = await db
    .select({
      facultyId: results.facultyId,
      acceptanceYear: results.acceptanceYear,
    })
    .from(resultStudents)
    .innerJoin(results, eq(results.id, resultStudents.resultId))
    .where(
      and(
        eq(resultStudents.studentId, studentId),
        eq(results.academicYear, academicYear),
        eq(results.semester, semester),
        eq(results.kind, 'regular'),
        eq(results.status, 'approved'),
      ),
    );
  for (const batch of batches) {
    const resit = await db.query.results.findFirst({
      where: and(
        eq(results.facultyId, batch.facultyId),
        eq(results.academicYear, academicYear),
        batch.acceptanceYear
          ? eq(results.acceptanceYear, batch.acceptanceYear)
          : isNull(results.acceptanceYear),
        eq(results.semester, semester),
        eq(results.kind, 'resit'),
        eq(results.status, 'approved'),
      ),
      columns: { id: true },
    });
    if (resit) return true;
  }
  return false;
}
