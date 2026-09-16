import { useState } from "react";
import { useTranslation } from "react-i18next";
import DataTable, { type Column } from "../../../components/dataTable";
import FilterSelect from "../../../components/filterSelect";
import { FACULTIES, type Localized } from "../../../mocks/faculties";
import { ACADEMIC_YEARS } from "../../../utils/academicYears";

type Curriculum = {
	id: string;
	name: Localized;
	facultyId: string;
	abbreviation: string;
	academicYear: string;
};

// TODO: replace mock data with the curriculums API
const CURRICULUMS: Curriculum[] = [
	{ id: "1", name: { en: "Computer Engineering", ar: "هندسة الحاسوب" }, facultyId: "eng", abbreviation: "CE", academicYear: ACADEMIC_YEARS[2] },
	{ id: "2", name: { en: "Civil Engineering", ar: "الهندسة المدنية" }, facultyId: "eng", abbreviation: "CIV", academicYear: ACADEMIC_YEARS[1] },
	{ id: "3", name: { en: "Mathematics", ar: "الرياضيات" }, facultyId: "sci", abbreviation: "MATH", academicYear: ACADEMIC_YEARS[2] },
	{ id: "4", name: { en: "Physics", ar: "الفيزياء" }, facultyId: "sci", abbreviation: "PHYS", academicYear: ACADEMIC_YEARS[3] },
	{ id: "5", name: { en: "General Medicine", ar: "الطب العام" }, facultyId: "med", abbreviation: "MED", academicYear: ACADEMIC_YEARS[2] },
];

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

	const columns: Column<Curriculum>[] = [
		{ key: "name", header: t("curriculumList.columns.name"), render: (c) => c.name[lang] },
		{ key: "faculty", header: t("curriculumList.columns.faculty"), render: (c) => facultyName(c.facultyId) },
		{ key: "abbreviation", header: t("curriculumList.columns.abbreviation"), render: (c) => c.abbreviation },
		{ key: "academicYear", header: t("curriculumList.columns.academicYear"), render: (c) => c.academicYear },
	];

	return (
		<div>
			<h1 className="mb-6 text-2xl font-semibold text-palette-6">
				{t("curriculumList.title")}
			</h1>

			<div className="mb-4 flex flex-wrap gap-4">
				<FilterSelect
					id="facultyFilter"
					label={t("curriculumList.faculty")}
					value={facultyId}
					onChange={setFacultyId}
					allLabel={t("curriculumList.allFaculties")}
					options={FACULTIES.map((f) => ({ value: f.id, label: f.name[lang] }))}
				/>
				<FilterSelect
					id="yearFilter"
					label={t("curriculumList.academicYear")}
					value={academicYear}
					onChange={setAcademicYear}
					allLabel={t("curriculumList.allYears")}
					options={ACADEMIC_YEARS.map((year) => ({ value: year, label: year }))}
				/>
			</div>

			<DataTable
				columns={columns}
				rows={rows}
				getRowId={(c) => c.id}
				emptyText={t("curriculumList.empty")}
			/>
		</div>
	);
};

export default CurriculumList;
