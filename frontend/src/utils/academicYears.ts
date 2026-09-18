const currentYear = new Date().getFullYear();

// academic years from two years back to two years ahead, e.g. "2026/2027"
export const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => {
	const start = currentYear - 2 + i;
	return `${start}/${start + 1}`;
});

// acceptance years from the current year back six years, newest first
export const ACCEPTANCE_YEARS = Array.from({ length: 7 }, (_, i) => String(currentYear - i));

// study levels, e.g. 1 = first year (6 covers the longest programs such as medicine)
export const STUDY_LEVELS = [1, 2, 3, 4, 5, 6] as const;
