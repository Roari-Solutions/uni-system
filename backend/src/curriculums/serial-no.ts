import { eq, inArray } from 'drizzle-orm';
import { curriculums, facultyCurriculums } from 'schema';
import type { Db } from 'src/database/database.module';
import type { AcademicYear, Semester } from 'src/common/academic-year';
import type { RequirementType } from 'src/common/requirement-type';

/** Where a requirement type sits: university, then faculty, then specialization (major). */
const TYPE_RANK: Record<RequirementType, number> = {
  university: 0,
  faculty: 1,
  major: 2,
};

/** What orders a faculty's curriculums within one year and semester. */
export interface Orderable {
  curriculumId: string;
  code: string | null;
  /** Null on curriculums from before requirement types; they go last. */
  requirementType: RequirementType | null;
}

/**
 * The order curriculums take on the results sheets, and so their S.No.:
 * university requirements, then faculty requirements, then specialization
 * requirements, each by abbreviation. Ties fall back to the id, so the order
 * never depends on how the rows came back.
 */
export function compareCurriculums(a: Orderable, b: Orderable): number {
  const rank = (c: Orderable) =>
    c.requirementType ? TYPE_RANK[c.requirementType] : 3;
  const text = (x: string | null, y: string | null) =>
    x === y ? 0 : x === null ? 1 : y === null ? -1 : x < y ? -1 : 1;
  return (
    rank(a) - rank(b) ||
    text(a.code, b.code) ||
    text(a.curriculumId, b.curriculumId)
  );
}

/** One faculty's curriculums in one year and semester: the set an S.No. counts within. */
export interface SerialGroup {
  facultyId: string;
  academicYear: AcademicYear;
  semester: Semester;
}

const groupKey = (g: SerialGroup) =>
  `${g.facultyId}:${g.academicYear}:${g.semester}`;

/**
 * Numbers each group's curriculums 1..n in the sheets' order, writing only the
 * S.No.s that change. With no groups given, renumbers every group. Run after
 * anything that adds, removes, moves or re-sorts a curriculum, so the S.No.s
 * always follow the order.
 */
export async function renumberSerialNos(
  db: Db,
  groups?: SerialGroup[],
): Promise<number> {
  if (groups && !groups.length) return 0;
  const facultyIds = groups
    ? [...new Set(groups.map((g) => g.facultyId))]
    : null;
  const rows = await db
    .select({
      linkId: facultyCurriculums.id,
      serialNo: facultyCurriculums.serialNo,
      facultyId: facultyCurriculums.facultyId,
      curriculumId: facultyCurriculums.curriculumId,
      academicYear: curriculums.academicYear,
      semester: curriculums.semester,
      code: curriculums.abbreviation,
      requirementType: curriculums.requirementType,
    })
    .from(facultyCurriculums)
    .innerJoin(curriculums, eq(curriculums.id, facultyCurriculums.curriculumId))
    .where(
      facultyIds
        ? inArray(facultyCurriculums.facultyId, facultyIds)
        : undefined,
    );

  const wanted = groups ? new Set(groups.map(groupKey)) : null;
  const byGroup = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = groupKey(row);
    if (wanted && !wanted.has(key)) continue;
    byGroup.set(key, [...(byGroup.get(key) ?? []), row]);
  }

  let changed = 0;
  for (const members of byGroup.values()) {
    const ordered = [...members].sort(compareCurriculums);
    for (const [index, row] of ordered.entries()) {
      if (row.serialNo === index + 1) continue;
      await db
        .update(facultyCurriculums)
        .set({ serialNo: index + 1 })
        .where(eq(facultyCurriculums.id, row.linkId));
      changed++;
    }
  }
  return changed;
}

/** The groups a curriculum sits in: each faculty offering it, in its year and semester. */
export const groupsOf = (
  facultyIds: string[],
  academicYear: AcademicYear,
  semester: Semester,
): SerialGroup[] =>
  facultyIds.map((facultyId) => ({ facultyId, academicYear, semester }));
