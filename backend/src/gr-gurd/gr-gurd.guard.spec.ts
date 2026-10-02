import { PERMISSIONS, ROLE_GRANTS, ROLES } from 'src/iam/permissions';
import { grCallerOf } from './gr-gurd.guard';

const grantsOf = (...roles: string[]) =>
  new Set(roles.flatMap((r) => ROLE_GRANTS[r]));

describe('grCallerOf', () => {
  it('lets an admin work across faculties and reinstate students', () => {
    expect(grCallerOf(grantsOf(ROLES.admin), null)).toEqual({
      allFaculties: true,
      canReinstate: true,
    });
  });

  it('pins data entry to their faculty', () => {
    expect(grCallerOf(grantsOf(ROLES.dataEntry), 'f1')).toEqual({
      allFaculties: false,
      facultyId: 'f1',
      canReinstate: false,
    });
  });

  it('refuses data entry without a faculty', () => {
    expect(grCallerOf(grantsOf(ROLES.dataEntry), null)).toBeNull();
  });

  it('refuses anyone without the grades domain', () => {
    expect(grCallerOf(grantsOf(ROLES.contentManager), 'f1')).toBeNull();
    expect(
      grCallerOf(new Set([PERMISSIONS.gradesAllFaculties]), null),
    ).toBeNull();
  });

  it('gives a data-entry user who is also a content manager the same grades access', () => {
    expect(
      grCallerOf(grantsOf(ROLES.dataEntry, ROLES.contentManager), 'f1'),
    ).toEqual(grCallerOf(grantsOf(ROLES.dataEntry), 'f1'));
  });
});
