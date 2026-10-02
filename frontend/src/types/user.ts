import type { Role } from "./auth";

/** A user as the admin views consume them; never carries a password. */
export type ManagedUser = {
	id: string;
	name: string;
	// the login identifier, stored in users.email; not required to be an address
	email: string;
	roles: string[];
	facultyId: string | null;
	phone: string | null;
	suspended: boolean;
	/** The signed-in admin may change this user's roles. */
	canEditRoles: boolean;
	/** The signed-in admin may change the account itself (name, login, password, suspension). */
	canEditAccount: boolean;
};

/** A role the signed-in admin sees on others; `assignable` when they may grant it. */
export type AssignableRole = {
	id: string;
	name: string;
	assignable: boolean;
};

export type { Role };
