import { useState } from "react";
import { useTranslation } from "react-i18next";
import DataTable, { type Column } from "../../../components/dataTable";
import FilterSelect from "../../../components/filterSelect";
import { CURRICULUMS } from "../../../mocks/curriculums";
import { FACULTIES } from "../../../mocks/faculties";
import { GRADES } from "../../../mocks/grades";
import { STUDENTS } from "../../../mocks/students";
import { GRADE_STATUSES, type Grade } from "../../../types/grade";

const GradeList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";

	const [facultyId, setFacultyId] = useState("");
	const [curriculumId, setCurriculumId] = useState("");
	const [status, setStatus] = useState("");

	const student = (g: Grade) => STUDENTS.find((s) => s.id === g.studentId);
	const facultyName = (id?: string) => FACULTIES.find((f) => f.id === id)?.name[lang] ?? "";
	const curriculumName = (id: string) => CURRICULUMS.find((c) => c.id === id)?.name[lang] ?? "";

	// only offer curriculums of the selected faculty
	const curriculumOptions = CURRICULUMS.filter((c) => !facultyId || c.facultyId === facultyId);

	const changeFaculty = (id: string) => {
		setFacultyId(id);
		// drop a curriculum selection that doesn't belong to the new faculty
		if (id && CURRICULUMS.find((c) => c.id === curriculumId)?.facultyId !== id) {
			setCurriculumId("");
		}
	};

	const rows = GRADES.filter(
		(g) =>
			(!facultyId || student(g)?.facultyId === facultyId) &&
			(!curriculumId || g.curriculumId === curriculumId) &&
			(!status || g.status === status),
	);

	const columns: Column<Grade>[] = [
		{ key: "name", header: t("gradeList.columns.name"), render: (g) => student(g)?.name[lang] },
		{ key: "uniNumber", header: t("gradeList.columns.uniNumber"), render: (g) => student(g)?.uniNumber },
		{ key: "faculty", header: t("gradeList.columns.faculty"), render: (g) => facultyName(student(g)?.facultyId) },
		{ key: "curriculum", header: t("gradeList.columns.curriculum"), render: (g) => curriculumName(g.curriculumId) },
		{ key: "grade", header: t("gradeList.columns.grade"), render: (g) => g.grade },
		{ key: "status", header: t("gradeList.columns.status"), render: (g) => t(`grade.statuses.${g.status}`) },
	];

	return (
		<div>
			<h1 className="mb-6 text-2xl font-semibold text-palette-6">
				{t("gradeList.title")}
			</h1>

			<div className="mb-4 flex flex-wrap gap-4">
				<FilterSelect
					id="facultyFilter"
					label={t("gradeList.filters.faculty")}
					value={facultyId}
					onChange={changeFaculty}
					allLabel={t("gradeList.filters.allFaculties")}
					options={FACULTIES.map((f) => ({ value: f.id, label: f.name[lang] }))}
				/>
				<FilterSelect
					id="curriculumFilter"
					label={t("gradeList.filters.curriculum")}
					value={curriculumId}
					onChange={setCurriculumId}
					allLabel={t("gradeList.filters.allCurriculums")}
					options={curriculumOptions.map((c) => ({ value: c.id, label: c.name[lang] }))}
				/>
				<FilterSelect
					id="statusFilter"
					label={t("gradeList.filters.status")}
					value={status}
					onChange={setStatus}
					allLabel={t("gradeList.filters.allStatuses")}
					options={GRADE_STATUSES.map((s) => ({ value: s, label: t(`grade.statuses.${s}`) }))}
				/>
			</div>

			<DataTable
				columns={columns}
				rows={rows}
				getRowId={(g) => g.id}
				emptyText={t("gradeList.empty")}
			/>
		</div>
	);
};

export default GradeList;
