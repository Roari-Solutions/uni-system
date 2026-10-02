import { Outlet } from "react-router";
import useAuth from "./useAuth";
import NoAccess from "../pages/auth/noAccess";
import type { DomainPortal } from "../types/auth";

type RequireDomainProps = {
	portal: DomainPortal;
	/** The domain permission the dashboard needs, e.g. domain.cms. */
	permission: string;
};

/**
 * Gates a whole dashboard. A signed-in user without its domain — someone whose
 * session came from another portal — is told so instead of being redirected,
 * because a dedicated portal never sends anyone on to another dashboard.
 */
const RequireDomain = ({ portal, permission }: RequireDomainProps) => {
	const { status, can } = useAuth();

	if (status !== "authed") return null;
	if (!can(permission)) return <NoAccess portal={portal} />;

	return <Outlet />;
};

export default RequireDomain;
