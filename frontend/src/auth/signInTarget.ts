import { LOGIN_PORTAL, PORTAL_HOME, portalHref } from "../portals";
import type { DomainPortal } from "../types/auth";

/** Where someone goes once signed in. */
export type SignInTarget =
	| { kind: "path"; to: string }
	| { kind: "url"; to: string }
	| { kind: "choose" }
	| { kind: "none" };

/** The dashboard a path belongs to, so a bounced visitor can be sent back to it. */
const PATH_PORTAL: [prefix: string, portal: DomainPortal][] = [
	["/dashboards/grades", "grades"],
	["/print/", "grades"],
	["/dashboards/cms", "cms"],
];

const toTarget = (href: string): SignInTarget =>
	href.startsWith("/") ? { kind: "path", to: href } : { kind: "url", to: href };

/**
 * A dedicated portal opens its own dashboard. The general staff portal sends
 * someone with one dashboard straight to it and lets someone with several
 * choose; a dashboard not built yet is never offered.
 */
export const signInTarget = (portals: DomainPortal[], from?: string): SignInTarget => {
	if (LOGIN_PORTAL !== "staff") {
		const home = PORTAL_HOME[LOGIN_PORTAL];
		return home ? { kind: "path", to: from ?? home } : { kind: "none" };
	}

	// back to where the guard bounced them from, if it is theirs to open here
	const owner = from && PATH_PORTAL.find(([prefix]) => from.startsWith(prefix))?.[1];
	if (from && owner && portals.includes(owner) && portalHref(owner)?.startsWith("/")) {
		return { kind: "path", to: from };
	}

	const open = portals.filter((p) => portalHref(p) !== null);
	if (open.length === 0) return { kind: "none" };
	if (open.length === 1) return toTarget(portalHref(open[0])!);
	return { kind: "choose" };
};
