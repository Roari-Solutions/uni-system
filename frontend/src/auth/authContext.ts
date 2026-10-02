import { createContext } from "react";
import type { AuthUser, DomainPortal } from "../types/auth";

export type AuthStatus = "loading" | "authed" | "anon";

export type AuthContextValue = {
	user: AuthUser | null;
	status: AuthStatus;
	/**
	 * Signs in through this host's portal and resolves with the portals the user
	 * may open; throws (401) on bad credentials or a portal they may not use.
	 */
	login: (email: string, password: string) => Promise<DomainPortal[]>;
	logout: () => Promise<void>;
	/** True after the user signed out themselves, so nothing sends them back where they were. */
	signedOut: boolean;
	/** Re-reads the signed-in user, after their own name or login changed. */
	reloadUser: () => Promise<void>;
	/** True when the caller is scoped to a single faculty they cannot change. */
	facultyLocked: boolean;
	/** The faculty a data-entry employee is bound to; null for staff who span all of them. */
	facultyId: string | null;
	/** Whether the signed-in user holds a permission. */
	can: (permission: string) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
