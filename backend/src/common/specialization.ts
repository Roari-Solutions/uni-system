import type { RequirementType } from './requirement-type';

/** What decides who takes a curriculum. */
export interface CurriculumAudience {
  requirementType: RequirementType | null;
  specializationId: string | null;
}

/**
 * Whether a student with this specialization (or none) takes the curriculum.
 * University and faculty requirements are for everyone in the faculty. A major
 * tied to a specialization is for that specialization's students only; a major
 * not tied to one yet (it predates specializations) is still for everyone. A
 * student without a specialization takes no specialization-tied major.
 */
export function takesCurriculum(
  studentSpecializationId: string | null,
  curriculum: CurriculumAudience,
): boolean {
  if (curriculum.requirementType !== 'major') return true;
  if (curriculum.specializationId === null) return true;
  return curriculum.specializationId === studentSpecializationId;
}

/** A list filter: one specialization's id, or "none" for the rows that have none yet. */
export const SPECIALIZATION_FILTER =
  /^(none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
