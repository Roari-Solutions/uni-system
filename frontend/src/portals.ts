import type { DomainPortal, Portal } from "./types/auth";
import { PORTALS } from "./types/auth";

/**
 * Which sign-in portal this page is, decided by the host it is served on.
 *
 * Subdomain mode: each portal has its own host, from VITE_PORTAL_HOSTS
 * ("staff=staff.example.edu,grades=grades.example.edu,...") or, in development,
 * `<portal>.localhost`. A host serves only its own portal's sign-in form and
 * dashboard, and the API must then live on one shared host (VITE_API_URL) so a
 * sign-in on one portal is a session on the others.
 *
 * Single-host mode: any other host (plain localhost, a bare IP) serves the
 * staff sign-in form and every dashboard under its own path.
 */

/** Where each built dashboard starts. Portals missing here have no dashboard yet. */
export const PORTAL_HOME: Partial<Record<DomainPortal, string>> = {
	grades: "/dashboards/grades/students/list",
	cms: "/dashboards/cms",
};

const parseHosts = (raw: string | undefined): Partial<Record<Portal, string>> => {
	const hosts: Partial<Record<Portal, string>> = {};
	for (const pair of (raw ?? "").split(",")) {
		const [portal, host] = pair.split("=").map((s) => s.trim());
		if (host && (PORTALS as readonly string[]).includes(portal)) hosts[portal as Portal] = host;
	}
	return hosts;
};

const CONFIGURED = parseHosts(import.meta.env.VITE_PORTAL_HOSTS as string | undefined);

const portalOfHost = (hostname: string): Portal | null => {
	const configured = (Object.entries(CONFIGURED) as [Portal, string][]).find(([, h]) => h === hostname);
	if (configured) return configured[0];
	const local = /^([a-z]+)\.localhost$/.exec(hostname)?.[1];
	return local && (PORTALS as readonly string[]).includes(local) ? (local as Portal) : null;
};

/** This host's portal, or null in single-host mode. */
export const HOST_PORTAL: Portal | null = portalOfHost(window.location.hostname);

/** The portal whose sign-in rules the login form on this host follows. */
export const LOGIN_PORTAL: Portal = HOST_PORTAL ?? "staff";

/** Whether this host serves the given portal's dashboard. */
export const servesPortal = (portal: DomainPortal): boolean =>
	HOST_PORTAL === null || HOST_PORTAL === portal;

const hostOf = (portal: Portal): string | null => {
	if (CONFIGURED[portal]) return CONFIGURED[portal];
	// in development the portals are siblings under localhost
	if (window.location.hostname.endsWith(".localhost") || window.location.hostname === "localhost") {
		return HOST_PORTAL === null ? null : `${portal}.localhost`;
	}
	return null;
};

/**
 * Where to send someone to open a portal's dashboard: a path on this host when
 * it serves that portal, otherwise the portal's own host. Null when the portal
 * has no dashboard yet.
 */
export const portalHref = (portal: DomainPortal): string | null => {
	const home = PORTAL_HOME[portal];
	if (!home) return null;
	if (servesPortal(portal)) return home;
	const host = hostOf(portal);
	if (!host) return null;
	const { protocol, port } = window.location;
	return `${protocol}//${host}${port ? `:${port}` : ""}${home}`;
};

/** The general staff portal's sign-in page, for someone on the wrong portal. */
export const staffLoginHref = (): string => {
	if (HOST_PORTAL === null || HOST_PORTAL === "staff") return "/login";
	const host = hostOf("staff");
	if (!host) return "/login";
	const { protocol, port } = window.location;
	return `${protocol}//${host}${port ? `:${port}` : ""}/login`;
};
