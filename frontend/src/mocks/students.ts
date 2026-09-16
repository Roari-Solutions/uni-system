import type { Student } from "../types/student";
import { ACCEPTANCE_YEARS } from "../utils/academicYears";

// TODO: replace mock data with the students API
export const STUDENTS: Student[] = [
	{ id: "1", name: { en: "Omar Hassan", ar: "عمر حسن" }, uniNumber: "20230145", acceptanceYear: ACCEPTANCE_YEARS[3], acceptanceType: "general", level: 4, facultyId: "eng", status: "success" },
	{ id: "2", name: { en: "Sara Mahmoud", ar: "سارة محمود" }, uniNumber: "20240312", acceptanceYear: ACCEPTANCE_YEARS[2], acceptanceType: "special", level: 3, facultyId: "eng", status: "repeat" },
	{ id: "3", name: { en: "Yousef Khalid", ar: "يوسف خالد" }, uniNumber: "20250078", acceptanceYear: ACCEPTANCE_YEARS[1], acceptanceType: "vacancies", level: 2, facultyId: "sci", status: null },
	{ id: "4", name: { en: "Mariam Ali", ar: "مريم علي" }, uniNumber: "20260021", acceptanceYear: ACCEPTANCE_YEARS[0], acceptanceType: "teachersChildren", level: 1, facultyId: "sci", status: null },
	{ id: "5", name: { en: "Khaled Ibrahim", ar: "خالد إبراهيم" }, uniNumber: "20210456", acceptanceYear: ACCEPTANCE_YEARS[5], acceptanceType: "general", level: 6, facultyId: "med", status: "success" },
	{ id: "6", name: { en: "Noor Abdullah", ar: "نور عبدالله" }, uniNumber: "20230589", acceptanceYear: ACCEPTANCE_YEARS[3], acceptanceType: "special", level: 4, facultyId: "med", status: "success" },
	{ id: "7", name: { en: "Hamza Saleh", ar: "حمزة صالح" }, uniNumber: "20240133", acceptanceYear: ACCEPTANCE_YEARS[2], acceptanceType: "general", level: 3, facultyId: "sci", status: "repeat" },
];
