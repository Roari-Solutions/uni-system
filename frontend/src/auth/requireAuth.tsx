import { Navigate, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import useAuth from "./useAuth";

/** Gates the dashboard: anonymous visitors are sent to the login page. */
const RequireAuth = () => {
	const { status } = useAuth();
	const { t } = useTranslation();
	const location = useLocation();

	if (status === "loading") {
		return (
			<div
				role="status"
				className="flex h-svh items-center justify-center bg-background text-body-md text-foreground"
			>
				{t("common.loading")}
			</div>
		);
	}

	if (status === "anon") {
		// remember where they were headed so login can send them back
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}

	return <Outlet />;
};

export default RequireAuth;
