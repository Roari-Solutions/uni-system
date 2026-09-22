import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../lib/api";
import type { AuthUser } from "../types/auth";
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
		// login only sets the cookies; the profile comes from /auth/me
		await api.post("/auth/login", { email, password });
		const { data } = await api.get<AuthUser>("/auth/me");
		setUser(data);
		setStatus("authed");
	}, []);

	const logout = useCallback(async () => {
		try {
			await api.post("/auth/logout");
		} finally {
			// drop the local session even if the request failed
			setUser(null);
			setStatus("anon");
		}
	}, []);

	const value = useMemo(
		() => ({
			user,
			status,
			login,
			logout,
			// admins work across every faculty; everyone else is pinned to their own
			facultyLocked: user !== null && user.role !== "admin",
			facultyId: user?.facultyId ?? null,
		}),
		[user, status, login, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
