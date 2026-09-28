import { and, asc, eq, isNull } from 'drizzle-orm';
import { curriculums, facultyCurriculums } from 'schema';
import type { Db } from 'src/database/database.module';
import type { AcademicYear, Semester } from 'src/common/academic-year';

/**
 * The S.No.s a faculty already uses in one year and semester, leaving out one
 * curriculum (the one being placed).
 */
async function takenSerialNos(
  db: Db,
  facultyId: string,
  academicYear: AcademicYear,
  semester: Semester,
  curriculumId: string,
): Promise<Set<number>> {
  const rows = await db
    .select({
      curriculumId: facultyCurriculums.curriculumId,
      serialNo: facultyCurriculums.serialNo,
    })
    .from(facultyCurriculums)
    .innerJoin(curriculums, eq(curriculums.id, facultyCurriculums.curriculumId))
    .where(
      and(
        eq(facultyCurriculums.facultyId, facultyId),
        eq(curriculums.academicYear, academicYear),
        eq(curriculums.semester, semester),
      ),
    );
  return new Set(
    rows
      .filter((r) => r.curriculumId !== curriculumId && r.serialNo !== null)
      .map((r) => r.serialNo as number),
  );
}

const firstFree = (taken: Set<number>) => {
  let serial = 1;
  while (taken.has(serial)) serial++;
  return serial;
};

/**
 * Gives the curriculum the first free S.No. in each of these faculties, for the
 * year and semester it now sits in. Like the code's serial, a number freed by a
 * deleted or moved curriculum is reused.
 */
export async function assignSerialNos(
  db: Db,
  curriculumId: string,
  facultyIds: string[],
  academicYear: AcademicYear,
  semester: Semester,
): Promise<void> {
  for (const facultyId of facultyIds) {
    const taken = await takenSerialNos(
      db,
      facultyId,
      academicYear,
      semester,
      curriculumId,
    );
    await db
      .update(facultyCurriculums)
      .set({ serialNo: firstFree(taken) })
      .where(
        and(
          eq(facultyCurriculums.facultyId, facultyId),
          eq(facultyCurriculums.curriculumId, curriculumId),
        ),
      );
  }
}

/**
 * Numbers every placement that has no S.No. yet (curriculums created before
 * S.No.s existed), in code order within each faculty -> year -> semester.
 */
export async function backfillSerialNos(db: Db): Promise<number> {
  const missing = await db
    .select({
      curriculumId: facultyCurriculums.curriculumId,
      facultyId: facultyCurriculums.facultyId,
      academicYear: curriculums.academicYear,
      semester: curriculums.semester,
    })
    .from(facultyCurriculums)
    .innerJoin(curriculums, eq(curriculums.id, facultyCurriculums.curriculumId))
    .where(isNull(facultyCurriculums.serialNo))
    .orderBy(asc(curriculums.abbreviation));

  for (const row of missing) {
    await assignSerialNos(
      db,
      row.curriculumId,
      [row.facultyId],
      row.academicYear,
      row.semester,
    );
  }
  return missing.length;
}
