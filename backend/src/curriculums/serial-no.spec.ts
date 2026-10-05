import { compareCurriculums, type Orderable } from './serial-no';

const c = (
  curriculumId: string,
  requirementType: Orderable['requirementType'],
  code: string | null,
): Orderable => ({ curriculumId, requirementType, code });

const order = (rows: Orderable[]) =>
  [...rows].sort(compareCurriculums).map((r) => r.curriculumId);

describe('compareCurriculums', () => {
  it('puts university, then faculty, then specialization requirements first', () => {
    expect(
      order([
        c('major', 'major', 'ITSE1101'),
        c('faculty', 'faculty', 'ITIT1101'),
        c('university', 'university', 'UTEN1101'),
      ]),
    ).toEqual(['university', 'faculty', 'major']);
  });

  it('orders each type by abbreviation', () => {
    expect(
      order([
        c('f3', 'faculty', 'ITIT1103'),
        c('u2', 'university', 'UTEN1102'),
        c('f1', 'faculty', 'ITIT1101'),
        c('u1', 'university', 'UTAR1101'),
        c('f2', 'faculty', 'ITCS1102'),
      ]),
    ).toEqual(['u1', 'u2', 'f2', 'f1', 'f3']);
  });

  it('puts curriculums without a type, then without an abbreviation, last', () => {
    expect(
      order([
        c('untyped', null, 'AAAA1101'),
        c('no-code', 'major', null),
        c('major', 'major', 'ZZZZ1101'),
      ]),
    ).toEqual(['major', 'no-code', 'untyped']);
  });

  it('breaks ties by id, so the order never depends on row order', () => {
    const rows = [c('b', 'faculty', 'ITIT1101'), c('a', 'faculty', 'ITIT1101')];
    expect(order(rows)).toEqual(['a', 'b']);
    expect(order([...rows].reverse())).toEqual(['a', 'b']);
  });
});
