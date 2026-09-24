import api from "../lib/api";
import type { AuthUser } from "../types/auth";

/** The signed-in user's own changes; the current password is required for any of them. */
export type AccountChanges = {
	name?: string;
	// the login identifier, stored in users.email
	email?: string;
	newPassword?: string;
	currentPassword: string;
};

/**
 * Fails with 400 WRONG_PASSWORD when the current password doesn't match, and
 * with 409 when someone else already holds the login.
 */
export const updateAccount = async (changes: AccountChanges): Promise<AuthUser> => {
	const { data } = await api.patch<AuthUser>("/auth/me", changes);
	return data;
};
