/**
 * Data entry works inside one faculty, so it needs one — unless the same user
 * is also an admin, who works across them all. Other roles span every faculty.
 */
export const needsFaculty = (roles: string[]): boolean =>
	roles.includes("data-entry") && !roles.includes("admin");
