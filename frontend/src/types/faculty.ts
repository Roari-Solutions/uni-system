import type { Localized } from "./localized";

export type Faculty = {
	id: string;
	name: Localized;
	// two letters; the bulk import builds university numbers from them
	abbreviation: string | null;
};
