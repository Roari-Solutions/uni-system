import type { Department, Faculty, Specialization } from "../types/faculty";

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

/** A department's name, or "" when it isn't among these faculties'. */
export const departmentName = (faculties: Faculty[], id: string | null, lang: Lang) => {
	if (!id) return "";
	for (const faculty of faculties) {
		const found = faculty.departments.find((d) => d.id === id);
		if (found) return found.name[lang];
	}
	return "";
};

/** The department a specialization sits under; null when directly under the faculty (or unknown). */
export const specializationDepartmentId = (faculties: Faculty[], id: string | null): string | null => {
	if (!id) return null;
	for (const faculty of faculties) {
		const found = faculty.specializations.find((s) => s.id === id);
		if (found) return found.departmentId;
	}
	return null;
};

/**
 * The specializations a picker offers: the faculty's own, or every faculty's
 * (each named with its faculty) when none is chosen yet. Where the faculty has
 * departments, each is named with its department too.
 */
export const specializationChoices = (
	faculties: Faculty[],
	facultyId: string,
	lang: Lang,
): { value: string; label: string }[] => {
	const label = (faculty: Faculty, spec: Specialization) => {
		const department = faculty.departments.find((d) => d.id === spec.departmentId);
		const own = department ? `${department.name[lang]} · ${spec.name[lang]}` : spec.name[lang];
		return facultyId ? own : `${faculty.name[lang]} · ${own}`;
	};
	return faculties
		.filter((f) => !facultyId || f.id === facultyId)
		.flatMap((f) => f.specializations.map((spec) => ({ value: spec.id, label: label(f, spec) })));
};

/**
 * The departments a picker offers: the faculty's own, or every faculty's (each
 * named with its faculty) when none is chosen yet.
 */
export const departmentChoices = (
	faculties: Faculty[],
	facultyId: string,
	lang: Lang,
): { value: string; label: string }[] => {
	const label = (faculty: Faculty, department: Department) =>
		facultyId ? department.name[lang] : `${faculty.name[lang]} · ${department.name[lang]}`;
	return faculties
		.filter((f) => !facultyId || f.id === facultyId)
		.flatMap((f) => f.departments.map((d) => ({ value: d.id, label: label(f, d) })));
};

/**
 * Where a student or major sits, named for a table cell: "Department ·
 * Specialization", either one alone, or "" when neither is set.
 */
export const placementName = (
	faculties: Faculty[],
	departmentId: string | null,
	specializationId: string | null,
	lang: Lang,
) => {
	const department = departmentName(
		faculties,
		departmentId ?? specializationDepartmentId(faculties, specializationId),
		lang,
	);
	const specialization = specializationName(faculties, specializationId, lang);
	return [department, specialization].filter(Boolean).join(" · ");
};
