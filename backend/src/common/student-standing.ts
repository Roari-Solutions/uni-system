import { ConflictException } from '@nestjs/common';

/** Mirrors studentStandingEnum in the schema. */
export const STUDENT_STANDINGS = ['active', 'suspended', 'dismissed'] as const;
export type StudentStanding = (typeof STUDENT_STANDINGS)[number];

/** A suspension is served in academic years. */
export const SUSPENSION_YEARS = [1, 2] as const;
export type SuspensionYears = (typeof SUSPENSION_YEARS)[number];

/**
 * A suspended or dismissed student's grades and results are frozen: nothing may
 * write them until an admin reinstates the student. Refused with STUDENT_FROZEN
 * so the views can say why.
 */
export function assertNotFrozen(standing: StudentStanding): void {
  if (standing !== 'active') {
    throw new ConflictException({ code: 'STUDENT_FROZEN', standing });
  }
}
