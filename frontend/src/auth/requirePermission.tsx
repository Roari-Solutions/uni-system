import { Navigate, Outlet } from "react-router";
import useAuth from "./useAuth";

type RequirePermissionProps = {
	/** Holding any one of these opens the branch. */
	anyOf: string[];
	/** Where someone without it is sent instead. */
	fallback: string;
};

/**
 * Gates a branch of a dashboard on its permissions. This mirrors the API, which
 * enforces the same rule — the UI only avoids showing a door that would not open.
 */
const RequirePermission = ({ anyOf, fallback }: RequirePermissionProps) => {
	const { status, can } = useAuth();

	if (status !== "authed") return null;
	if (!anyOf.some((permission) => can(permission))) return <Navigate to={fallback} replace />;

	return <Outlet />;
};

export default RequirePermission;
