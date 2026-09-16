// academic years from two years back to two years ahead, e.g. "2026/2027"
const currentYear = new Date().getFullYear();

export const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => {
	const start = currentYear - 2 + i;
	return `${start}/${start + 1}`;
});
