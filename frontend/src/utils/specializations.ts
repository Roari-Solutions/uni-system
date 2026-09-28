import type { Faculty, Specialization } from "../types/faculty";

type Lang = "ar" | "en";

/** A specialization's name, or "" when it isn't among these faculties'. */
export const specializationName = (faculties: Faculty[], id: string | null, lang: Lang) => {
	if (!id) return "";
	for (const faculty of faculties) {
		const found = faculty.specializations.find((s) => s.id === id);
		if (found) return found.name[lang];
	}
	return "";
};

/**
 * The specializations a picker offers: the faculty's own, or every faculty's
 * (each named with its faculty) when none is chosen yet.
 */
export const specializationChoices = (
	faculties: Faculty[],
	facultyId: string,
	lang: Lang,
): { value: string; label: string }[] => {
	const label = (faculty: Faculty, spec: Specialization) =>
		facultyId ? spec.name[lang] : `${faculty.name[lang]} · ${spec.name[lang]}`;
	return faculties
		.filter((f) => !facultyId || f.id === facultyId)
		.flatMap((f) => f.specializations.map((spec) => ({ value: spec.id, label: label(f, spec) })));
};
