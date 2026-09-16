import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ACADEMIC_YEARS } from "../../../utils/academicYears";

type Localized = { en: string; ar: string };

type Faculty = {
	id: string;
	name: Localized;
};

type Curriculum = {
	id: string;
	name: Localized;
	facultyId: string;
	abbreviation: string;
	academicYear: string;
};

// TODO: replace mock data with the faculties and curriculums APIs
const FACULTIES: Faculty[] = [
	{ id: "eng", name: { en: "Faculty of Engineering", ar: "كلية الهندسة" } },
	{ id: "sci", name: { en: "Faculty of Science", ar: "كلية العلوم" } },
	{ id: "med", name: { en: "Faculty of Medicine", ar: "كلية الطب" } },
];

const CURRICULUMS: Curriculum[] = [
	{ id: "1", name: { en: "Computer Engineering", ar: "هندسة الحاسوب" }, facultyId: "eng", abbreviation: "CE", academicYear: ACADEMIC_YEARS[2] },
	{ id: "2", name: { en: "Civil Engineering", ar: "الهندسة المدنية" }, facultyId: "eng", abbreviation: "CIV", academicYear: ACADEMIC_YEARS[1] },
	{ id: "3", name: { en: "Mathematics", ar: "الرياضيات" }, facultyId: "sci", abbreviation: "MATH", academicYear: ACADEMIC_YEARS[2] },
	{ id: "4", name: { en: "Physics", ar: "الفيزياء" }, facultyId: "sci", abbreviation: "PHYS", academicYear: ACADEMIC_YEARS[3] },
	{ id: "5", name: { en: "General Medicine", ar: "الطب العام" }, facultyId: "med", abbreviation: "MED", academicYear: ACADEMIC_YEARS[2] },
];

const selectClass =
	"w-full rounded-md border border-palette-2 bg-white px-3 py-2 text-palette-6 outline-none focus:ring-2 focus:ring-palette-4";

const CurriculumList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";

	const [facultyId, setFacultyId] = useState("");
	const [academicYear, setAcademicYear] = useState("");

	const facultyName = (id: string) =>
		FACULTIES.find((f) => f.id === id)?.name[lang] ?? "";

	const rows = CURRICULUMS.filter(
		(c) =>
			(!facultyId || c.facultyId === facultyId) &&
			(!academicYear || c.academicYear === academicYear),
	);

	const columns = ["name", "faculty", "abbreviation", "academicYear"] as const;

	return (
		<div>
			<h1 className="mb-6 text-2xl font-semibold text-palette-6">
				{t("curriculumList.title")}
			</h1>

			<div className="mb-4 flex flex-wrap gap-4">
				<div className="flex w-full flex-col gap-1.5 sm:w-64">
					<label htmlFor="facultyFilter" className="font-medium text-palette-6">
						{t("curriculumList.faculty")}
					</label>
					<select
						id="facultyFilter"
						value={facultyId}
						onChange={(e) => setFacultyId(e.target.value)}
						className={selectClass}
					>
						<option value="">{t("curriculumList.allFaculties")}</option>
						{FACULTIES.map((f) => (
							<option key={f.id} value={f.id}>
								{f.name[lang]}
							</option>
						))}
					</select>
				</div>

				<div className="flex w-full flex-col gap-1.5 sm:w-64">
					<label htmlFor="yearFilter" className="font-medium text-palette-6">
						{t("curriculumList.academicYear")}
					</label>
					<select
						id="yearFilter"
						value={academicYear}
						onChange={(e) => setAcademicYear(e.target.value)}
						className={selectClass}
					>
						<option value="">{t("curriculumList.allYears")}</option>
						{ACADEMIC_YEARS.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="overflow-x-auto rounded-lg border border-palette-2 bg-white">
				<table className="w-full text-start text-palette-6">
					<thead className="bg-palette-6 text-palette-1">
						<tr>
							{columns.map((col) => (
								<th key={col} scope="col" className="px-4 py-3 text-start font-semibold">
									{t(`curriculumList.columns.${col}`)}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-palette-2">
						{rows.length === 0 ? (
							<tr>
								<td colSpan={columns.length} className="px-4 py-6 text-center">
									{t("curriculumList.empty")}
								</td>
							</tr>
						) : (
							rows.map((c) => (
								<tr key={c.id} className="hover:bg-palette-1">
									<td className="px-4 py-3">{c.name[lang]}</td>
									<td className="px-4 py-3">{facultyName(c.facultyId)}</td>
									<td className="px-4 py-3">{c.abbreviation}</td>
									<td className="px-4 py-3">{c.academicYear}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default CurriculumList;
