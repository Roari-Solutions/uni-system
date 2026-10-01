import { SPECIALIZATION_FILTER, takesCurriculum } from './specialization';

describe('takesCurriculum', () => {
  const economics = 'spec-economics';
  const accounting = 'spec-accounting';
  const electrical = 'dept-electrical';
  const mechanical = 'dept-mechanical';
  const power = 'spec-power'; // under electrical

  const track = (departmentId: string | null, specializationId: string | null) => ({
    departmentId,
    specializationId,
  });
  const major = (departmentId: string | null, specializationId: string | null) => ({
    requirementType: 'major' as const,
    departmentId,
    specializationId,
  });

  it('gives university and faculty requirements to everyone', () => {
    for (const requirementType of ['university', 'faculty', null] as const) {
      const shared = { requirementType, departmentId: null, specializationId: null };
      expect(takesCurriculum(track(null, null), shared)).toBe(true);
      expect(takesCurriculum(track(null, economics), shared)).toBe(true);
      expect(takesCurriculum(track(electrical, power), shared)).toBe(true);
    }
  });

  it("gives a specialization's major only to its students", () => {
    expect(takesCurriculum(track(null, economics), major(null, economics))).toBe(true);
    expect(takesCurriculum(track(null, accounting), major(null, economics))).toBe(false);
    // a student without a specialization takes no specialization-tied major
    expect(takesCurriculum(track(null, null), major(null, economics))).toBe(false);
    // being in the specialization's department is not enough
    expect(takesCurriculum(track(electrical, null), major(null, power))).toBe(false);
    expect(takesCurriculum(track(electrical, power), major(null, power))).toBe(true);
  });

  it("gives a department's major to all its students, with or without a specialization", () => {
    expect(takesCurriculum(track(electrical, null), major(electrical, null))).toBe(true);
    expect(takesCurriculum(track(electrical, power), major(electrical, null))).toBe(true);
    expect(takesCurriculum(track(mechanical, null), major(electrical, null))).toBe(false);
    // a student outside every department takes no department-tied major
    expect(takesCurriculum(track(null, null), major(electrical, null))).toBe(false);
    expect(takesCurriculum(track(null, economics), major(electrical, null))).toBe(false);
  });

  it('keeps a major tied to neither for the whole faculty', () => {
    expect(takesCurriculum(track(null, null), major(null, null))).toBe(true);
    expect(takesCurriculum(track(null, economics), major(null, null))).toBe(true);
    expect(takesCurriculum(track(electrical, power), major(null, null))).toBe(true);
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
