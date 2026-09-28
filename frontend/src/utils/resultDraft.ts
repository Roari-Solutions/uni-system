import type { ResultHeader } from "../types/result";

/**
 * What the "new board results" section holds before anything is generated:
 * the batch picked, the students left off, and the header typed so far. Kept
 * in this browser so a refresh or a trip to another page loses none of it.
 * Grade corrections are not here: they are saved to the grades straight away.
 */
export type ResultDraft = {
	facultyId: string;
	level: string;
	byAcceptanceYear: boolean;
	acceptanceYear: string;
	semester: string;
	excluded: string[];
	// null until the header form is edited
	header: ResultHeader | null;
	// a pending result loaded back in for editing; updating it replaces its sheet
	loadedResultId: string | null;
};

export const EMPTY_DRAFT: ResultDraft = {
	facultyId: "",
	level: "",
	byAcceptanceYear: false,
	acceptanceYear: "",
	semester: "",
	excluded: [],
	header: null,
	loadedResultId: null,
};

// one draft per signed-in user, so a shared computer doesn't mix them up
const keyFor = (userId: string) => `uni-system:new-board-result:${userId}`;

const isStrings = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((v) => typeof v === "string");

/** The saved draft, or an empty one when there is none (or storage is unavailable). */
export const loadDraft = (userId: string): ResultDraft => {
	try {
		const raw = localStorage.getItem(keyFor(userId));
		if (!raw) return EMPTY_DRAFT;
		const saved = JSON.parse(raw) as Partial<ResultDraft>;
		// anything that doesn't look right is dropped rather than trusted
		return {
			facultyId: typeof saved.facultyId === "string" ? saved.facultyId : "",
			level: typeof saved.level === "string" ? saved.level : "",
			byAcceptanceYear: saved.byAcceptanceYear === true,
			acceptanceYear: typeof saved.acceptanceYear === "string" ? saved.acceptanceYear : "",
			semester: typeof saved.semester === "string" ? saved.semester : "",
			excluded: isStrings(saved.excluded) ? saved.excluded : [],
			header: saved.header && typeof saved.header === "object" ? saved.header : null,
			loadedResultId: typeof saved.loadedResultId === "string" ? saved.loadedResultId : null,
		};
	} catch {
		return EMPTY_DRAFT;
	}
};

export const saveDraft = (userId: string, draft: ResultDraft) => {
	try {
		localStorage.setItem(keyFor(userId), JSON.stringify(draft));
	} catch {
		// a private window or full storage: the page still works, it just won't remember
	}
};

export const clearDraft = (userId: string) => {
	try {
		localStorage.removeItem(keyFor(userId));
	} catch {
		// nothing stored to clear
	}
};
