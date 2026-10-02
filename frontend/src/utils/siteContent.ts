import type { ContentIssue, Field, Localized } from "../types/siteContent";

/** A path into a page's content: keys and list indexes. */
export type Path = (string | number)[];

export const pathKey = (path: Path) => path.join(".");

/** What a new list item starts as: empty, but already the shape its schema demands. */
export const blankValue = (field: Field): unknown => {
	switch (field.type) {
		case "text":
			return { ar: "", en: "" } satisfies Localized;
		case "string":
		case "image":
		case "file":
			return "";
		case "number":
			return field.optional ? null : 0;
		case "boolean":
			return false;
		case "choice":
			return field.options[0]?.value ?? "";
		case "group":
			return Object.fromEntries(Object.entries(field.fields).map(([k, f]) => [k, blankValue(f)]));
		case "list":
			return Array.from({ length: field.length ?? field.min ?? 0 }, () => blankValue(field.item));
	}
};

/** A copy of `root` with the value at `path` replaced; nothing else is touched. */
export const setAt = (root: unknown, path: Path, value: unknown): unknown => {
	if (!path.length) return value;
	const [head, ...rest] = path;
	if (Array.isArray(root)) {
		const copy = [...root];
		copy[head as number] = setAt(root[head as number], rest, value);
		return copy;
	}
	const obj = (root ?? {}) as Record<string, unknown>;
	return { ...obj, [head]: setAt(obj[head as string], rest, value) };
};

/** The server's issues, by path, for each field to find its own. */
export const issuesByPath = (issues: ContentIssue[]): Map<string, string> => {
	const byPath = new Map<string, string>();
	for (const issue of issues) {
		// a language half's issue belongs to its text field
		const path = issue.path.replace(/\.(ar|en)$/, "");
		if (!byPath.has(path)) byPath.set(path, issue.code);
	}
	return byPath;
};

/** Whether a list may gain or lose items, and how many. */
export const listBounds = (field: Extract<Field, { type: "list" }>) =>
	field.length !== undefined
		? { fixed: true, min: field.length, max: field.length }
		: { fixed: false, min: field.min ?? 0, max: field.max ?? Infinity };
