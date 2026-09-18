export const ROLES = ["admin", "data-entry"] as const;
export type Role = (typeof ROLES)[number];

/** The authenticated user, as GET /auth/me returns them. */
export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: Role;
	// null for admins, who are not tied to a single faculty
	facultyId: string | null;
};
