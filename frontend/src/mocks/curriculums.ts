import type { Curriculum } from "../types/curriculum";
import { ACADEMIC_YEARS } from "../utils/academicYears";

// TODO: replace mock data with the curriculums API
export const CURRICULUMS: Curriculum[] = [
	{ id: "1", name: { en: "Computer Engineering", ar: "هندسة الحاسوب" }, facultyId: "eng", abbreviation: "CE", academicYear: ACADEMIC_YEARS[2] },
	{ id: "2", name: { en: "Civil Engineering", ar: "الهندسة المدنية" }, facultyId: "eng", abbreviation: "CIV", academicYear: ACADEMIC_YEARS[1] },
	{ id: "3", name: { en: "Mathematics", ar: "الرياضيات" }, facultyId: "sci", abbreviation: "MATH", academicYear: ACADEMIC_YEARS[2] },
	{ id: "4", name: { en: "Physics", ar: "الفيزياء" }, facultyId: "sci", abbreviation: "PHYS", academicYear: ACADEMIC_YEARS[3] },
	{ id: "5", name: { en: "General Medicine", ar: "الطب العام" }, facultyId: "med", abbreviation: "MED", academicYear: ACADEMIC_YEARS[2] },
];
