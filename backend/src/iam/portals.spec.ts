import { ROLE_GRANTS, ROLES, userScopeOf } from 'src/iam/permissions';
import { canEnter, portalsFor } from './portals';

const grantsOf = (...roles: string[]) =>
  new Set(roles.flatMap((r) => ROLE_GRANTS[r]));

describe('canEnter', () => {
  it('lets a student into the LMS and the students portal, not the staff one', () => {
    const student = grantsOf(ROLES.student);
    expect(canEnter('lms', student)).toBe(true);
    expect(canEnter('students', student)).toBe(true);
    expect(canEnter('staff', student)).toBe(false);
  });

  it('counts the LMS as staff for teachers and LMS admins', () => {
    expect(canEnter('staff', grantsOf(ROLES.teacher))).toBe(true);
    expect(canEnter('staff', grantsOf(ROLES.lmsAdmin))).toBe(true);
    expect(canEnter('lms', grantsOf(ROLES.teacher))).toBe(true);
  });

  it('keeps grades staff out of the LMS', () => {
    expect(canEnter('lms', grantsOf(ROLES.dataEntry))).toBe(false);
    expect(portalsFor(grantsOf(ROLES.dataEntry))).toEqual(['grades']);
  });
});

describe('userScopeOf', () => {
  it('lets an LMS admin grant only the teacher role', () => {
    const scope = userScopeOf(grantsOf(ROLES.lmsAdmin));
    expect([...scope.assigns]).toEqual([ROLES.teacher]);
  });

  it('keeps student accounts out of the super admin users screen', () => {
    const scope = userScopeOf(grantsOf(ROLES.superAdmin));
    expect(scope.sees.has(ROLES.student)).toBe(false);
    expect(scope.assigns.has(ROLES.teacher)).toBe(true);
  });
});
