import type { AcademicYear, Semester } from 'src/common/academic-year';
import type { RequirementType } from 'src/common/requirement-type';

/**
 * XXXX0000, with no separator: two requirement letters, two course letters,
 * then the academic year (1-6), the semester (1-2) and a serial (01-99) within
 * that faculty -> year -> semester.
 */
export const ABBREVIATION_PATTERN = /^[A-Z]{4}[1-6][12](0[1-9]|[1-9]\d)$/;

/** University requirements carry this in place of a faculty abbreviation. */
const UNIVERSITY_LETTERS = 'UT';
/** Faculty requirements carry this in place of the course letters. */
const FACULTY_COURSE_LETTERS = 'CR';

/** The first two letters of the English name, or null when it has fewer. */
function courseLetters(nameEn: string | undefined): string | null {
  const letters = (nameEn ?? '').toUpperCase().match(/[A-Z]/g);
  return letters && letters.length >= 2 ? letters[0] + letters[1] : null;
}

/**
 * The four letters before the digits, or null when an input they need is
 * missing (no two-letter faculty abbreviation, or no usable English name).
 */
export function abbreviationLetters(
  requirementType: RequirementType,
  facultyAbbreviation: string | null,
  nameEn: string | undefined,
): string | null {
  const faculty = facultyAbbreviation?.trim().toUpperCase() ?? '';
  const facultyOk = /^[A-Z]{2}$/.test(faculty);

  switch (requirementType) {
    case 'university': {
      const course = courseLetters(nameEn);
      return course && UNIVERSITY_LETTERS + course;
    }
    case 'faculty':
      return facultyOk ? faculty + FACULTY_COURSE_LETTERS : null;
    case 'major': {
      const course = courseLetters(nameEn);
      return facultyOk && course ? faculty + course : null;
    }
  }
}

/** The serial a code carries, or null for codes outside the format. */
export function serialOf(abbreviation: string | null): number | null {
  return abbreviation && ABBREVIATION_PATTERN.test(abbreviation)
    ? Number(abbreviation.slice(-2))
    : null;
}

/** Assembles a full code from its parts. */
export function buildAbbreviation(
  letters: string,
  academicYear: AcademicYear,
  semester: Semester,
  serial: number,
): string {
  return `${letters}${academicYear}${semester}${String(serial).padStart(2, '0')}`;
}
