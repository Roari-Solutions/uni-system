import { useState } from "react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "../../../components/confirmDialog";
import DataTable, { type Column } from "../../../components/dataTable";
import DeleteButton from "../../../components/deleteButton";
import FilterSelect from "../../../components/filterSelect";
import { CURRICULUMS } from "../../../mocks/curriculums";
import { FACULTIES } from "../../../mocks/faculties";
import type { Curriculum } from "../../../types/curriculum";
import { ACADEMIC_YEARS } from "../../../utils/academicYears";

const CurriculumList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";

	const [curriculums, setCurriculums] = useState(CURRICULUMS);
	const [facultyId, setFacultyId] = useState("");
	const [academicYear, setAcademicYear] = useState("");
	const [pendingDelete, setPendingDelete] = useState<Curriculum | null>(null);

	const facultyName = (id: string) =>
		FACULTIES.find((f) => f.id === id)?.name[lang] ?? "";

	const confirmDelete = () => {
		if (!pendingDelete) return;
		// TODO: call the delete curriculum API before removing the row
		setCurriculums((prev) => prev.filter((c) => c.id !== pendingDelete.id));
		setPendingDelete(null);
	};

	const rows = curriculums.filter(
		(c) =>
			(!facultyId || c.facultyId === facultyId) &&
			(!academicYear || c.academicYear === academicYear),
	);

	const columns: Column<Curriculum>[] = [
		{ key: "name", header: t("curriculumList.columns.name"), render: (c) => c.name[lang] },
		{ key: "faculty", header: t("curriculumList.columns.faculty"), render: (c) => facultyName(c.facultyId) },
		{ key: "abbreviation", header: t("curriculumList.columns.abbreviation"), render: (c) => c.abbreviation },
		{ key: "academicYear", header: t("curriculumList.columns.academicYear"), render: (c) => c.academicYear },
		{
			key: "actions",
			header: t("common.actions"),
			render: (c) => (
				<DeleteButton
					label={t("common.deleteItem", { name: c.name[lang] })}
					onClick={() => setPendingDelete(c)}
				/>
			),
		},
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

			<ConfirmDialog
				open={pendingDelete !== null}
				title={t("curriculumList.deleteTitle")}
				message={t("curriculumList.deleteMessage", { name: pendingDelete?.name[lang] })}
				confirmLabel={t("common.delete")}
				cancelLabel={t("common.cancel")}
				onConfirm={confirmDelete}
				onCancel={() => setPendingDelete(null)}
			/>
		</div>
	);
};

export default CurriculumList;
