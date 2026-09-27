/** The grading scale, best first. */
export const LETTER_GRADES = ['A', 'B+', 'B', 'C+', 'C', 'D', 'F'] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

/** Each letter's lowest mark; a mark takes the first band it reaches. */
const BANDS: readonly [min: number, letter: LetterGrade][] = [
  [80, 'A'],
  [70, 'B+'],
  [60, 'B'],
  [55, 'C+'],
  [50, 'C'],
  [40, 'D'],
  [0, 'F'],
];

/**
 * The letter for a 0-100 mark. The only place a grade's letter comes from.
 * A fractional mark is rounded to the nearest whole mark first (79.5 is an A).
 */
export function letterOf(grade: number): LetterGrade {
  const mark = Math.round(grade);
  return BANDS.find(([min]) => mark >= min)?.[1] ?? 'F';
}

/** Grade points per letter; the GPA is built from these, never from the mark. */
const POINTS: Record<LetterGrade, number> = {
  A: 4,
  'B+': 3.5,
  B: 3,
  'C+': 2.5,
  C: 2,
  D: 1,
  F: 0,
};

/** The points a letter is worth. */
export function pointsOf(letter: LetterGrade): number {
  return POINTS[letter];
}
