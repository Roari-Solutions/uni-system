import { useState } from "react";
import { useTranslation } from "react-i18next";
import ColumnToggle from "../../../components/columnToggle";
import ConfirmDialog from "../../../components/confirmDialog";
import DataTable, { type Column } from "../../../components/dataTable";
import DeleteButton from "../../../components/deleteButton";
import FilterSelect from "../../../components/filterSelect";
import { FACULTIES } from "../../../mocks/faculties";
import type { Student } from "../../../types/student";
import { ACCEPTANCE_YEARS, STUDY_LEVELS } from "../../../utils/academicYears";

// TODO: replace mock data with the students API
const STUDENTS: Student[] = [
	{ id: "1", name: { en: "Omar Hassan", ar: "عمر حسن" }, uniNumber: "20230145", acceptanceYear: ACCEPTANCE_YEARS[3], acceptanceType: "general", level: 4, facultyId: "eng", status: "pass" },
	{ id: "2", name: { en: "Sara Mahmoud", ar: "سارة محمود" }, uniNumber: "20240312", acceptanceYear: ACCEPTANCE_YEARS[2], acceptanceType: "special", level: 3, facultyId: "eng", status: "fail" },
	{ id: "3", name: { en: "Yousef Khalid", ar: "يوسف خالد" }, uniNumber: "20250078", acceptanceYear: ACCEPTANCE_YEARS[1], acceptanceType: "vacancies", level: 2, facultyId: "sci", status: null },
	{ id: "4", name: { en: "Mariam Ali", ar: "مريم علي" }, uniNumber: "20260021", acceptanceYear: ACCEPTANCE_YEARS[0], acceptanceType: "teachersChildren", level: 1, facultyId: "sci", status: null },
	{ id: "5", name: { en: "Khaled Ibrahim", ar: "خالد إبراهيم" }, uniNumber: "20210456", acceptanceYear: ACCEPTANCE_YEARS[5], acceptanceType: "general", level: 6, facultyId: "med", status: "pass" },
	{ id: "6", name: { en: "Noor Abdullah", ar: "نور عبدالله" }, uniNumber: "20230589", acceptanceYear: ACCEPTANCE_YEARS[3], acceptanceType: "special", level: 4, facultyId: "med", status: "pass" },
	{ id: "7", name: { en: "Hamza Saleh", ar: "حمزة صالح" }, uniNumber: "20240133", acceptanceYear: ACCEPTANCE_YEARS[2], acceptanceType: "general", level: 3, facultyId: "sci", status: "fail" },
];

// columns that can't be hidden
const ALWAYS_VISIBLE = ["name", "actions"];

const StudentList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";

	const [students, setStudents] = useState(STUDENTS);
	const [level, setLevel] = useState("");
	const [facultyId, setFacultyId] = useState("");
	const [acceptanceYear, setAcceptanceYear] = useState("");
	const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
	const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

	const toggleColumn = (key: string) => {
		setHiddenColumns((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
		);
	};

	const confirmDelete = () => {
		if (!pendingDelete) return;
		// TODO: call the delete student API before removing the row
		setStudents((prev) => prev.filter((s) => s.id !== pendingDelete.id));
		setPendingDelete(null);
	};

	const facultyName = (id: string) =>
		FACULTIES.find((f) => f.id === id)?.name[lang] ?? "";

	const rows = students.filter(
		(s) =>
			(!level || String(s.level) === level) &&
			(!facultyId || s.facultyId === facultyId) &&
			(!acceptanceYear || s.acceptanceYear === acceptanceYear),
	);

	const columns: Column<Student>[] = [
		{ key: "name", header: t("studentList.columns.name"), render: (s) => s.name[lang] },
		{ key: "uniNumber", header: t("studentList.columns.uniNumber"), render: (s) => s.uniNumber },
		{ key: "acceptanceYear", header: t("studentList.columns.acceptanceYear"), render: (s) => s.acceptanceYear },
		{ key: "acceptanceType", header: t("studentList.columns.acceptanceType"), render: (s) => t(`student.acceptanceTypes.${s.acceptanceType}`) },
		{ key: "level", header: t("studentList.columns.level"), render: (s) => t(`student.levels.${s.level}`) },
		{ key: "faculty", header: t("studentList.columns.faculty"), render: (s) => facultyName(s.facultyId) },
		{ key: "status", header: t("studentList.columns.status"), render: (s) => (s.status ? t(`student.statuses.${s.status}`) : "—") },
		{
			key: "actions",
			header: t("common.actions"),
			render: (s) => (
				<DeleteButton
					label={t("common.deleteItem", { name: s.name[lang] })}
					onClick={() => setPendingDelete(s)}
				/>
			),
		},
	];

	return (
		<div>
			<h1 className="mb-6 text-2xl font-semibold text-palette-6">
				{t("studentList.title")}
			</h1>

			<div className="mb-4 flex flex-wrap items-end gap-4">
				<FilterSelect
					id="levelFilter"
					label={t("studentList.filters.level")}
					value={level}
					onChange={setLevel}
					allLabel={t("studentList.filters.allLevels")}
					options={STUDY_LEVELS.map((l) => ({ value: String(l), label: t(`student.levels.${l}`) }))}
				/>
				<FilterSelect
					id="facultyFilter"
					label={t("studentList.filters.faculty")}
					value={facultyId}
					onChange={setFacultyId}
					allLabel={t("studentList.filters.allFaculties")}
					options={FACULTIES.map((f) => ({ value: f.id, label: f.name[lang] }))}
				/>
				<FilterSelect
					id="acceptanceYearFilter"
					label={t("studentList.filters.acceptanceYear")}
					value={acceptanceYear}
					onChange={setAcceptanceYear}
					allLabel={t("studentList.filters.allAcceptanceYears")}
					options={ACCEPTANCE_YEARS.map((year) => ({ value: year, label: year }))}
				/>

				<div className="ms-auto">
					<ColumnToggle
						label={t("studentList.columnsToggle")}
						columns={columns.filter((col) => !ALWAYS_VISIBLE.includes(col.key))}
						hidden={hiddenColumns}
						onToggle={toggleColumn}
					/>
				</div>
			</div>

			<DataTable
				columns={columns.filter((col) => !hiddenColumns.includes(col.key))}
				rows={rows}
				getRowId={(s) => s.id}
				emptyText={t("studentList.empty")}
			/>

			<ConfirmDialog
				open={pendingDelete !== null}
				title={t("studentList.deleteTitle")}
				message={t("studentList.deleteMessage", { name: pendingDelete?.name[lang] })}
				confirmLabel={t("common.delete")}
				cancelLabel={t("common.cancel")}
				onConfirm={confirmDelete}
				onCancel={() => setPendingDelete(null)}
			/>
		</div>
	);
};

export default StudentList;
