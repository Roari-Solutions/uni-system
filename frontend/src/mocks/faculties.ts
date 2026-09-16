export type Localized = { en: string; ar: string };

export type Faculty = {
	id: string;
	name: Localized;
};

// TODO: replace with the faculties API
export const FACULTIES: Faculty[] = [
	{ id: "eng", name: { en: "Faculty of Engineering", ar: "كلية الهندسة" } },
	{ id: "sci", name: { en: "Faculty of Science", ar: "كلية العلوم" } },
	{ id: "med", name: { en: "Faculty of Medicine", ar: "كلية الطب" } },
];
