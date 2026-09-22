const currentYear = new Date().getFullYear();

// acceptance years from the current year back six years, newest first
export const ACCEPTANCE_YEARS = Array.from({ length: 7 }, (_, i) => String(currentYear - i));

// the academic year a student or curriculum sits in, e.g. 1 = first year
// (6 covers the longest programs such as medicine). Calendar years are only
// ever used for acceptance years.
export const STUDY_LEVELS = [1, 2, 3, 4, 5, 6] as const;

// each academic year splits into two semesters; a curriculum runs in one
export const SEMESTERS = [1, 2] as const;
