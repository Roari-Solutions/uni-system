import { Transform } from 'class-transformer';

/** Academic year = study year. The only year-like value that is not a calendar year. */
export const ACADEMIC_YEARS = ['1', '2', '3', '4', '5', '6'] as const;
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

/**
 * Accepts an academic year as a number (`3`) or a string (`"3"`) and normalises
 * it to the string the enum column stores. Anything else is left untouched so
 * `@IsIn(ACADEMIC_YEARS)` produces the validation error.
 */
export const NormaliseAcademicYear = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'number' ? String(value) : value,
  );

/** Reads an academic year back out as the number the views bind to. */
export const academicYearToNumber = (value: AcademicYear): number => Number(value);
