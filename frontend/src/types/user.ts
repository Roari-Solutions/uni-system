import type { Role } from "./auth";

/** A user as the admin views consume them; never carries a password. */
export type ManagedUser = {
	id: string;
	name: string;
	// the login identifier, stored in users.email; not required to be an address
	email: string;
	role: string;
	facultyId: string | null;
	phone: string | null;
	suspended: boolean;
};

export type AssignableRole = {
	id: string;
	name: string;
};

export type { Role };
