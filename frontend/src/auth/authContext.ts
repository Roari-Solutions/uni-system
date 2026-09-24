import { createContext } from "react";
import type { AuthUser } from "../types/auth";

export type AuthStatus = "loading" | "authed" | "anon";

export type AuthContextValue = {
	user: AuthUser | null;
	status: AuthStatus;
	/** Resolves once the session is established; throws on bad credentials. */
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	/** Re-reads the signed-in user, after their own name or login changed. */
	reloadUser: () => Promise<void>;
	/** True when the caller is scoped to a single faculty they cannot change. */
	facultyLocked: boolean;
	/** The faculty a data-entry employee is bound to; null for admins. */
	facultyId: string | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
