/**
 * The page schemas the API sends with each page, mirroring
 * backend/src/site-content/schema/fields.ts. A schema fixes a page's structure;
 * the editor only fills in values.
 */

/** Text in both website languages; either half may be empty. */
export type Localized = { ar: string; en: string };

type Base = { label: Localized; help?: Localized };

export type TextField = Base & { type: "text"; multiline?: boolean; optional?: boolean };
export type StringField = Base & {
	type: "string";
	format?: "plain" | "email" | "phone" | "url" | "date";
	optional?: boolean;
};
export type NumberField = Base & { type: "number"; integer?: boolean; optional?: boolean };
export type BooleanField = Base & { type: "boolean" };
export type ImageField = Base & { type: "image"; optional?: boolean };
export type FileField = Base & { type: "file"; optional?: boolean };
export type ChoiceField = Base & { type: "choice"; options: { value: string; label: Localized }[] };
export type GroupField = Base & { type: "group"; fields: Record<string, Field> };
export type ListField = Base & {
	type: "list";
	item: Field;
	itemLabel: Localized;
	length?: number;
	min?: number;
	max?: number;
};

export type Field =
	| TextField
	| StringField
	| NumberField
	| BooleanField
	| ImageField
	| FileField
	| ChoiceField
	| GroupField
	| ListField;

export type PageGroup = "site" | "about" | "leaders" | "units" | "colleges";

/** A page as the list shows it. */
export type PageSummary = {
	key: string;
	template: string;
	group: PageGroup;
	label: Localized;
	/** The website path that shows it; null for content every page shares. */
	path: string | null;
	/** 0 until the page has content in the database. */
	version: number;
	updatedAt: string | null;
	updatedBy: string | null;
};

/** A page as the editor loads it. */
export type EditablePage = PageSummary & {
	schema: GroupField;
	content: Record<string, unknown> | null;
};

export type Revision = {
	id: string;
	version: number;
	createdAt: string;
	createdBy: string | null;
};

/** One way submitted content departs from its schema, located by path. */
export type ContentIssue = { path: string; code: string };
