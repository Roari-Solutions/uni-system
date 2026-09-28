import { capLetter, SUPPLEMENTARY_CAP } from 'src/grades/letter-grade';
import {
  canonicalJson,
  totalsOf,
  yearTotalsOf,
  type ResultCell,
  type ResultCourse,
} from './result-sheet';

const course = (curriculumId: string, hours: number): ResultCourse => ({
  sNo: 1,
  curriculumId,
  code: null,
  name: curriculumId,
  hours,
});

const cell = (
  curriculumId: string,
  patch: Partial<ResultCell>,
): ResultCell => ({
  curriculumId,
  state: 'marked',
  mark: 80,
  letter: 'A',
  resit: null,
  ...patch,
});

describe('totalsOf', () => {
  const courses = [course('a', 3), course('b', 2), course('c', 3)];

  it('weights each letter by its hours', () => {
    const totals = totalsOf(
      [
        cell('a', { letter: 'A' }),
        cell('b', { letter: 'C' }),
        cell('c', { letter: 'F', mark: 20 }),
      ],
      courses,
      false,
    );
    // 4*3 + 2*2 + 0*3 = 16 over 8 hours
    expect(totals).toEqual({ ch: 8, gp: 16, gpa: 2 });
  });

  it('leaves out missing marks, open cheating cases and substitutes', () => {
    const totals = totalsOf(
      [
        cell('a', { letter: 'B' }),
        cell('b', { state: 'incomplete', mark: null, letter: null }),
        cell('c', { state: 'substitute', mark: null, letter: null }),
      ],
      courses,
      false,
    );
    expect(totals).toEqual({ ch: 3, gp: 9, gpa: 3 });
    const cheating = totalsOf(
      [cell('a', { state: 'cheatingPending', mark: null, letter: null })],
      courses,
      false,
    );
    expect(cheating).toEqual({ ch: 0, gp: 0, gpa: null });
  });

  it('counts a resit only on resit sheets', () => {
    const cells = [
      cell('a', {
        letter: 'F',
        mark: 30,
        resit: { kind: 'supplementary', mark: 90, letter: 'C' },
      }),
      cell('c', {
        state: 'substitute',
        mark: null,
        letter: null,
        resit: { kind: 'substitute', mark: 85, letter: 'A' },
      }),
    ];
    expect(totalsOf(cells, courses, false)).toEqual({ ch: 3, gp: 0, gpa: 0 });
    expect(totalsOf(cells, courses, true)).toEqual({ ch: 6, gp: 18, gpa: 3 });
  });
});

describe('yearTotalsOf', () => {
  it('sums hours and points and averages the semester GPAs', () => {
    expect(
      yearTotalsOf([
        { ch: 16, gp: 54, gpa: 3.38 },
        { ch: 14, gp: 42, gpa: 3 },
      ]),
    ).toEqual({ ch: 30, gp: 96, gpa: 3.19 });
  });

  it('averages only the semesters that have a GPA', () => {
    expect(
      yearTotalsOf([
        { ch: 0, gp: 0, gpa: null },
        { ch: 10, gp: 25, gpa: 2.5 },
      ]),
    ).toEqual({ ch: 10, gp: 25, gpa: 2.5 });
  });
});

describe('capLetter', () => {
  it('drops a better letter to the supplementary cap and keeps a worse one', () => {
    expect(capLetter('A', SUPPLEMENTARY_CAP)).toBe('C');
    expect(capLetter('C+', SUPPLEMENTARY_CAP)).toBe('C');
    expect(capLetter('C', SUPPLEMENTARY_CAP)).toBe('C');
    expect(capLetter('D', SUPPLEMENTARY_CAP)).toBe('D');
    expect(capLetter('F', SUPPLEMENTARY_CAP)).toBe('F');
  });
});

describe('canonicalJson', () => {
  it('ignores key order', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: null }] })).toBe(
      canonicalJson({ a: [{ c: null, d: 2 }], b: 1 }),
    );
  });
});
