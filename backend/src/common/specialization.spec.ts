import { SPECIALIZATION_FILTER, takesCurriculum } from './specialization';

describe('takesCurriculum', () => {
  const economics = 'spec-economics';
  const accounting = 'spec-accounting';

  it('gives university and faculty requirements to everyone', () => {
    for (const requirementType of ['university', 'faculty', null] as const) {
      expect(
        takesCurriculum(null, { requirementType, specializationId: null }),
      ).toBe(true);
      expect(
        takesCurriculum(economics, { requirementType, specializationId: null }),
      ).toBe(true);
    }
  });

  it("gives a specialization's major only to its students", () => {
    const major = {
      requirementType: 'major' as const,
      specializationId: economics,
    };
    expect(takesCurriculum(economics, major)).toBe(true);
    expect(takesCurriculum(accounting, major)).toBe(false);
    // a student without a specialization takes no specialization-tied major
    expect(takesCurriculum(null, major)).toBe(false);
  });

  it('keeps a major not tied to a specialization yet for the whole faculty', () => {
    const major = { requirementType: 'major' as const, specializationId: null };
    expect(takesCurriculum(null, major)).toBe(true);
    expect(takesCurriculum(economics, major)).toBe(true);
  });
});

describe('SPECIALIZATION_FILTER', () => {
  it('takes an id or "none"', () => {
    expect(SPECIALIZATION_FILTER.test('none')).toBe(true);
    expect(
      SPECIALIZATION_FILTER.test('3cd8bf26-490e-429a-8764-037bb253d325'),
    ).toBe(true);
    expect(SPECIALIZATION_FILTER.test('all')).toBe(false);
  });
});
