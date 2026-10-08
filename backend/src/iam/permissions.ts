/**
 * What a role lets its holder do. The names live in the `permissions` table and
 * roles are granted them through `role_permissions`; migrations 0015 and 0017
 * seed the grants below, and code checks permissions, never role names.
 */
export const PERMISSIONS = {
  /** Enter the grades and results system. */
  grades: 'domain.grades',
  /** Work across every faculty in it, not just one's own. */
  gradesAllFaculties: 'grades.all-faculties',
  /** Lift a student's suspension or dismissal. */
  studentsReinstate: 'students.reinstate',
  /** Manage the grades system's data-entry users. */
  usersManageGrades: 'users.manage.grades',
  /** Edit the website's content. */
  cms: 'domain.cms',
  /** Manage the website's content managers. */
  usersManageCms: 'users.manage.cms',
  /** Manage every user and assign every role, in every domain. */
  usersManageAll: 'users.manage.all',
  /** Domains that have a sign-in portal but no system yet. */
  management: 'domain.management',
  teachers: 'domain.teachers',
  students: 'domain.students',
  lms: 'domain.lms',
  medical: 'medical.form',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** The roles that exist today. */
export const ROLES = {
  /** Runs the grades and results system. */
  admin: 'admin',
  dataEntry: 'data-entry',
  /** Runs the website's content: edits it and manages content managers. */
  cmsAdmin: 'cms-admin',
  contentManager: 'site-content-employee',
  /** Manages every domain's users and roles. */
  superAdmin: 'super-admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES = Object.values(ROLES);

/** The grants the migrations seed; kept here as the reference for what each role means. */
export const ROLE_GRANTS: Record<Role, readonly Permission[]> = {
  [ROLES.admin]: [
    PERMISSIONS.grades,
    PERMISSIONS.gradesAllFaculties,
    PERMISSIONS.studentsReinstate,
    PERMISSIONS.medical,
    PERMISSIONS.usersManageGrades,
  ],
  [ROLES.dataEntry]: [PERMISSIONS.grades],
  [ROLES.cmsAdmin]: [PERMISSIONS.cms, PERMISSIONS.usersManageCms],
  [ROLES.contentManager]: [PERMISSIONS.cms],
  [ROLES.superAdmin]: [
    PERMISSIONS.medical,
    PERMISSIONS.usersManageAll,
    PERMISSIONS.grades,
    PERMISSIONS.gradesAllFaculties,
    PERMISSIONS.studentsReinstate,
    PERMISSIONS.cms,
  ],
};

/**
 * Whose accounts each user-management permission reaches. A manager sees the
 * users who hold a role in `sees`, sees only those roles on them, and may grant
 * or remove only the roles in `assigns`; a user's other roles stay untouched.
 */
export const USER_SCOPES: {
  permission: Permission;
  sees: Role[];
  assigns: Role[];
}[] = [
  {
    permission: PERMISSIONS.usersManageGrades,
    sees: [ROLES.admin, ROLES.dataEntry],
    assigns: [ROLES.dataEntry],
  },
  {
    permission: PERMISSIONS.usersManageCms,
    sees: [ROLES.cmsAdmin, ROLES.contentManager],
    assigns: [ROLES.contentManager],
  },
  {
    permission: PERMISSIONS.usersManageAll,
    sees: ALL_ROLES,
    assigns: ALL_ROLES,
  },
];

/** The roles these permissions let one see and assign on other users. */
export function userScopeOf(permissions: ReadonlySet<string>) {
  const scopes = USER_SCOPES.filter((s) => permissions.has(s.permission));
  return {
    sees: new Set<string>(scopes.flatMap((s) => s.sees)),
    assigns: new Set<string>(scopes.flatMap((s) => s.assigns)),
  };
}

/** The permissions that open the users screen at all. */
export const USER_MANAGEMENT = USER_SCOPES.map((s) => s.permission);
