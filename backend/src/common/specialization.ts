import type { RequirementType } from './requirement-type';

/** Where a student sits in the faculty: a department and a specialization, each optional. */
export interface StudentTrack {
  departmentId: string | null;
  specializationId: string | null;
}

/** What decides who takes a curriculum. */
export interface CurriculumAudience {
  requirementType: RequirementType | null;
  specializationId: string | null;
  departmentId: string | null;
}

/**
 * Whether a student at this place in the faculty takes the curriculum.
 * University and faculty requirements are for everyone in the faculty. A major
 * tied to a specialization is for that specialization's students only; one
 * tied to a department is for all the department's students, whatever their
 * specialization; a major tied to neither (it predates them) is still for
 * everyone. A student outside a specialization or department takes none of
 * its majors.
 */
export function takesCurriculum(
  student: StudentTrack,
  curriculum: CurriculumAudience,
): boolean {
  if (curriculum.requirementType !== 'major') return true;
  if (curriculum.specializationId !== null) {
    return curriculum.specializationId === student.specializationId;
  }
  if (curriculum.departmentId !== null) {
    return curriculum.departmentId === student.departmentId;
  }
  return true;
}

/** A list filter: one specialization's id, or "none" for the rows that have none yet. */
export const SPECIALIZATION_FILTER =
  /^(none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** A list filter: one department's id, or "none" for the rows outside every department. */
export const DEPARTMENT_FILTER = SPECIALIZATION_FILTER;
