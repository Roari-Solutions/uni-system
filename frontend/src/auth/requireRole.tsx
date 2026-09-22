import { Navigate, Outlet } from "react-router";
import useAuth from "./useAuth";
import type { Role } from "../types/auth";

type RequireRoleProps = {
	allow: Role[];
};

/**
 * Gates a branch of the dashboard on the caller's role. This mirrors the API,
 * which enforces the same rule in AdminGuard — the UI only avoids showing a
 * door that would not open.
 */
const RequireRole = ({ allow }: RequireRoleProps) => {
	const { user, status } = useAuth();

	if (status !== "authed" || !user) return null;

	if (!allow.includes(user.role)) {
		return <Navigate to="/dashboards/grades/students/list" replace />;
	}

	return <Outlet />;
};

export default RequireRole;
