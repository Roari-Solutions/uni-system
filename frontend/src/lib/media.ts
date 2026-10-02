/**
 * Stored media URLs are paths on the API's host (/images/<hash>.jpg). With the
 * API on its own host they are resolved against it; same-origin otherwise (the
 * dev server proxies them).
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
const API_ORIGIN = /^https?:\/\//.test(API_URL) ? new URL(API_URL).origin : "";

export const mediaUrl = (value: string): string =>
	!value || /^https?:\/\//.test(value) ? value : `${API_ORIGIN}${value}`;

/** The public website, for "view on website" links; unset hides them. */
export const WEBSITE_URL = ((import.meta.env.VITE_WEBSITE_URL as string | undefined) ?? "").replace(/\/$/, "");
