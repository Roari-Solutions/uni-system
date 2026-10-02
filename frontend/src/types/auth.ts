/** The roles that exist today; a user may hold several. */
export const ROLES = ["admin", "data-entry", "cms-admin", "site-content-employee", "super-admin"] as const;
export type Role = (typeof ROLES)[number];

/**
 * What a role lets its holder do. The API checks the same names; the views
 * only use them to avoid showing a door that would not open.
 */
export const PERMISSIONS = {
	grades: "domain.grades",
	gradesAllFaculties: "grades.all-faculties",
	studentsReinstate: "students.reinstate",
	cms: "domain.cms",
	/** Each manages users in its own domain only; `usersManageAll` in every domain. */
	usersManageGrades: "users.manage.grades",
	usersManageCms: "users.manage.cms",
	usersManageAll: "users.manage.all",
} as const;

/** The sign-in portals; every one but `staff` belongs to one domain. */
export const PORTALS = ["staff", "grades", "cms", "management", "teachers", "students", "lms"] as const;
export type Portal = (typeof PORTALS)[number];
export type DomainPortal = Exclude<Portal, "staff">;

/** The authenticated user, as GET /auth/me returns them. */
export type AuthUser = {
	id: string;
	name: string;
	email: string;
	roles: string[];
	permissions: string[];
	/** The domain portals this user may open. */
	portals: DomainPortal[];
	// null for staff who span every faculty
	facultyId: string | null;
};

/** Whether the user holds a permission. */
export const can = (user: AuthUser | null, permission: string): boolean =>
	!!user?.permissions.includes(permission);
