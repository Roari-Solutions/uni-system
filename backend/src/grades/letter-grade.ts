/** The grading scale, best first. */
export const LETTER_GRADES = ['A', 'B+', 'B', 'C+', 'C', 'D', 'F'] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

/**
 * Each letter's lowest mark; a mark takes the first band it reaches, so a
 * fractional mark between bands (e.g. 89.5) stays in the lower one.
 */
const BANDS: readonly [min: number, letter: LetterGrade][] = [
  [80, 'A'],
  [76, 'B+'],
  [70, 'B'],
  [60, 'C+'],
  [50, 'C'],
  [40, 'D'],
  [0, 'F'],
];

/** The letter for a 0-100 mark. The only place a grade's letter comes from. */
export function letterOf(grade: number): LetterGrade {
  return BANDS.find(([min]) => grade >= min)?.[1] ?? 'F';
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
