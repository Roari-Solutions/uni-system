/** Which body requires a curriculum: the university, the faculty, or the major. */
export const REQUIREMENT_TYPES = ['university', 'faculty', 'major'] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];
