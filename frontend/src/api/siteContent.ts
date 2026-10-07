import api from "../lib/api";
import type { EditablePage, PageSummary, Revision } from "../types/siteContent";

/** Page keys contain slashes (`colleges/law`); each segment is encoded on its own. */
const keyPath = (key: string) => key.split("/").map(encodeURIComponent).join("/");

export const fetchPages = async (): Promise<PageSummary[]> => {
	const { data } = await api.get<PageSummary[]>("/cms/pages");
	return data;
};

export const fetchPage = async (key: string): Promise<EditablePage> => {
	const { data } = await api.get<EditablePage>(`/cms/pages/${keyPath(key)}`);
	return data;
};

/**
 * Saves the whole page as its next version. Fails with 400 INVALID_CONTENT (and
 * the issues) when it doesn't fit the page's structure, and with 409
 * STALE_VERSION when someone else saved since `version` was loaded. Returns the
 * content as saved, which can differ from what was sent (map links are converted).
 */
export const savePage = async (
	key: string,
	content: Record<string, unknown>,
	version: number,
): Promise<{ key: string; version: number; content: Record<string, unknown> }> => {
	const { data } = await api.put<{ key: string; version: number; content: Record<string, unknown> }>(`/cms/pages/${keyPath(key)}`, {
		content,
		version,
	});
	return data;
};

export const fetchRevisions = async (key: string): Promise<Revision[]> => {
	const { data } = await api.get<Revision[]>(`/cms/revisions/${keyPath(key)}`);
	return data;
};

export const fetchRevision = async (
	id: string,
): Promise<Revision & { content: Record<string, unknown> }> => {
	const { data } = await api.get<Revision & { content: Record<string, unknown> }>(`/cms/revision/${id}`);
	return data;
};

/** Stores an image or PDF and returns the URL to place in the field. */
export const uploadMedia = async (file: File): Promise<string> => {
	const body = new FormData();
	body.append("file", file);
	const { data } = await api.post<{ url: string }>("/cms/media", body);
	return data.url;
};
