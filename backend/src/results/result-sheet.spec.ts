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
  it('sums hours and points and weighs the GPA by hours (GP / CH)', () => {
    // a plain average of 3.00 and 2.00 would give 2.50
    expect(
      yearTotalsOf([
        { ch: 15, gp: 45, gpa: 3 },
        { ch: 21, gp: 42, gpa: 2 },
      ]),
    ).toEqual({ ch: 36, gp: 87, gpa: 2.42 });
  });

  it('a semester with no counted hours adds nothing', () => {
    expect(
      yearTotalsOf([
        { ch: 0, gp: 0, gpa: null },
        { ch: 10, gp: 25, gpa: 2.5 },
      ]),
    ).toEqual({ ch: 10, gp: 25, gpa: 2.5 });
  });

  it('is null when no hours count in either semester', () => {
    expect(
      yearTotalsOf([
        { ch: 0, gp: 0, gpa: null },
        { ch: 0, gp: 0, gpa: null },
      ]).gpa,
    ).toBeNull();
  });
});

describe('cumulativeGpaOf', () => {
  it('weighs every semester to date by its hours', () => {
    // two earlier semesters, then this year's totals
    expect(
      cumulativeGpaOf([
        { gp: 48, ch: 16 },
        { gp: 35, ch: 14 },
        { gp: 87, ch: 36 },
      ]),
    ).toBe(2.58);
  });

  it('is null when no hours count yet', () => {
    expect(cumulativeGpaOf([])).toBeNull();
    expect(cumulativeGpaOf([{ gp: 0, ch: 0 }])).toBeNull();
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
