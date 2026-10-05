import { capLetter, SUPPLEMENTARY_CAP } from 'src/grades/letter-grade';
import {
  canonicalJson,
  cumulativeGpaOf,
  ownSemester,
  totalsOf,
  yearCourses,
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

describe('cumulativeGpaOf', () => {
  it('averages every semester GPA to date', () => {
    // two earlier years and this one: six semesters
    expect(cumulativeGpaOf([3, 3.5, 2.5, 3, 2.61, 2.85])).toBe(2.91);
  });

  it('skips semesters without a GPA, and is null when none has one', () => {
    expect(cumulativeGpaOf([3, null, 2])).toBe(2.5);
    expect(cumulativeGpaOf([null, null])).toBeNull();
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

describe('yearCourses', () => {
  const placed = (curriculumId: string, sNo: number): ResultCourse => ({
    ...course(curriculumId, 3),
    sNo,
  });

  it('puts the first semester first and numbers straight through', () => {
    const columns = yearCourses(
      [placed('a', 1), placed('b', 2)],
      [placed('c', 1), placed('d', 2), placed('e', 3)],
    );
    expect(columns.map((c) => [c.curriculumId, c.sNo, c.semester])).toEqual([
      ['a', 1, 1],
      ['b', 2, 1],
      ['c', 3, 2],
      ['d', 4, 2],
      ['e', 5, 2],
    ]);
  });

  it("tells the sheet's own semester from the one shown for the year", () => {
    const [first, second] = yearCourses([placed('a', 1)], [placed('b', 1)]);
    expect(ownSemester(first, 2)).toBe(false);
    expect(ownSemester(second, 2)).toBe(true);
    // first-semester sheets, and second-semester ones from before, carry no semester
    expect(ownSemester(course('c', 3), 2)).toBe(true);
  });
});
