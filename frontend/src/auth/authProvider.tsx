import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../lib/api";
import { can as holds, PERMISSIONS, type AuthUser, type DomainPortal } from "../types/auth";
import { LOGIN_PORTAL } from "../portals";
import { AuthContext, type AuthStatus } from "./authContext";

type AuthProviderProps = {
	children: ReactNode;
};

/**
 * Holds the session for the whole dashboard. The cookies are HttpOnly, so the
 * only way to know who is signed in is to ask the API.
 */
const AuthProvider = ({ children }: AuthProviderProps) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [status, setStatus] = useState<AuthStatus>("loading");
	// a session the user ended themselves, as opposed to one that expired
	const [signedOut, setSignedOut] = useState(false);

	// restore the session on mount: a valid cookie survives a page reload
	useEffect(() => {
		let cancelled = false;

		const restore = async () => {
			try {
				const { data } = await api.get<AuthUser>("/auth/me");
				if (cancelled) return;
				setUser(data);
				setStatus("authed");
			} catch {
				if (cancelled) return;
				setUser(null);
				setStatus("anon");
			}
		};

		void restore();
		return () => {
			cancelled = true;
		};
	}, []);

	const login = useCallback(async (email: string, password: string) => {
		// the portal decides who is let in; the API refuses anyone else with a 401
		const { data: result } = await api.post<{ portals: DomainPortal[] }>("/auth/login", {
			email,
			password,
			portal: LOGIN_PORTAL,
		});
		// login only sets the cookies; the profile comes from /auth/me
		const { data } = await api.get<AuthUser>("/auth/me");
		setUser(data);
		setStatus("authed");
		setSignedOut(false);
		return result.portals;
	}, []);

	const reloadUser = useCallback(async () => {
		const { data } = await api.get<AuthUser>("/auth/me");
		setUser(data);
	}, []);

	const logout = useCallback(async () => {
		try {
			await api.post("/auth/logout");
		} finally {
			// drop the local session even if the request failed
			setUser(null);
			setStatus("anon");
			setSignedOut(true);
		}
	}, []);

	const value = useMemo(
		() => ({
			user,
			status,
			login,
			logout,
			reloadUser,
			signedOut,
			// admins work across every faculty; everyone else is pinned to their own
			facultyLocked: user !== null && !holds(user, PERMISSIONS.gradesAllFaculties),
			facultyId: user?.facultyId ?? null,
			can: (permission: string) => holds(user, permission),
		}),
		[user, status, signedOut, login, logout, reloadUser],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
