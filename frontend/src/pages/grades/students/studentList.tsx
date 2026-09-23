import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import ColumnToggle from "../../../components/columnToggle";
import ConfirmDialog from "../../../components/confirmDialog";
import DataTable, { type Column } from "../../../components/dataTable";
import DeleteButton from "../../../components/deleteButton";
import FilterSelect from "../../../components/filterSelect";
import SearchField from "../../../components/searchField";
import useFaculties from "../../../hooks/useFaculties";
import { deleteStudent, fetchStudents } from "../../../api/students";
import { STUDENT_STANDINGS, type Student, type StudentStanding } from "../../../types/student";
import { StandingTag } from "../../../components/standingTag";
import { ACCEPTANCE_YEARS, STUDY_LEVELS } from "../../../utils/academicYears";

// columns that can't be hidden
const ALWAYS_VISIBLE = ["name", "actions"];

const StudentList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { faculties, locked, lockedFacultyId } = useFaculties();

	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [level, setLevel] = useState("");
	const [facultyId, setFacultyId] = useState("");
	const [acceptanceYear, setAcceptanceYear] = useState("");
	const [standing, setStanding] = useState<StudentStanding | "">("");
	const [search, setSearch] = useState("");
	const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
	const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

	// a locked caller only ever sees their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchStudents({
			facultyId: effectiveFacultyId || undefined,
			level: level ? Number(level) : undefined,
			acceptanceYear: acceptanceYear || undefined,
			standing: standing || undefined,
			q: search.trim() || undefined,
		})
			.then((rows) => {
				if (cancelled) return;
				setStudents(rows);
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [effectiveFacultyId, level, acceptanceYear, standing, search]);

	const toggleColumn = (key: string) => {
		setHiddenColumns((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
		);
	};

	const confirmDelete = async () => {
		if (!pendingDelete) return;
		const target = pendingDelete;
		setPendingDelete(null);
		try {
			await deleteStudent(target.id);
			setStudents((prev) => prev.filter((s) => s.id !== target.id));
		} catch {
			setFailed(true);
		}
	};

	const navigate = useNavigate();
	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";

	const columns: Column<Student>[] = [
		{
			key: "name",
			header: t("studentList.columns.name"),
			// the row is clickable; the link is the keyboard and screen-reader way in
			render: (s) => (
				<Link
					to={`../${s.id}`}
					className="font-medium text-accent-deep underline-offset-4 transition-colors duration-150 ease-out hover:text-primary-hover hover:underline"
				>
					{s.name[lang]}
				</Link>
			),
		},
		{
			key: "nameEn",
			header: t("studentList.columns.nameEn"),
			// Latin text needs its own direction inside the RTL table
			render: (s) => <span dir="ltr">{s.name.en}</span>,
		},
		{ key: "uniNumber", header: t("studentList.columns.uniNumber"), render: (s) => s.uniNumber },
		{ key: "nationality", header: t("studentList.columns.nationality"), render: (s) => t(`student.nationalities.${s.nationality}`) },
		{ key: "nationalId", header: t("studentList.columns.nationalId"), render: (s) => s.nationalId || "—" },
		{ key: "passportNumber", header: t("studentList.columns.passportNumber"), render: (s) => s.passportNumber || "—" },
		{ key: "acceptanceYear", header: t("studentList.columns.acceptanceYear"), render: (s) => s.acceptanceYear },
		{ key: "acceptanceType", header: t("studentList.columns.acceptanceType"), render: (s) => t(`student.acceptanceTypes.${s.acceptanceType}`) },
		{ key: "level", header: t("studentList.columns.level"), render: (s) => t(`student.levels.${s.level}`) },
		{ key: "faculty", header: t("studentList.columns.faculty"), render: (s) => facultyName(s.facultyId) },
		{ key: "status", header: t("studentList.columns.status"), render: (s) => (s.status ? t(`student.statuses.${s.status}`) : "—") },
		{
			key: "standing",
			header: t("studentList.columns.standing"),
			render: (s) => <StandingTag standing={s.standing} suspensionYears={s.suspensionYears} />,
		},
		{
			key: "actions",
			header: t("common.actions"),
			// a frozen record is kept until an admin reinstates the student
			render: (s) =>
				s.standing !== "active" ? null : (
					<DeleteButton
						label={t("common.deleteItem", { name: s.name[lang] })}
						onClick={() => setPendingDelete(s)}
					/>
				),
		},
	];

	return (
		<div>
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("studentList.title")}
			</h1>

			<div className="mb-6 flex flex-wrap items-end gap-6">
				<SearchField
					id="studentSearch"
					label={t("studentList.filters.search")}
					placeholder={t("studentList.filters.searchPlaceholder")}
					value={search}
					onChange={setSearch}
				/>
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
					value={effectiveFacultyId}
					onChange={setFacultyId}
					allLabel={t("studentList.filters.allFaculties")}
					options={faculties.map((f) => ({ value: f.id, label: f.name[lang] }))}
					disabled={locked}
				/>
				<FilterSelect
					id="acceptanceYearFilter"
					label={t("studentList.filters.acceptanceYear")}
					value={acceptanceYear}
					onChange={setAcceptanceYear}
					allLabel={t("studentList.filters.allAcceptanceYears")}
					options={ACCEPTANCE_YEARS.map((year) => ({ value: year, label: year }))}
				/>
				<FilterSelect
					id="standingFilter"
					label={t("studentList.filters.standing")}
					value={standing}
					onChange={(value) => setStanding(value as StudentStanding | "")}
					allLabel={t("studentList.filters.allStandings")}
					options={STUDENT_STANDINGS.map((st) => ({ value: st, label: t(`student.standings.${st}`) }))}
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

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}

			<DataTable
				columns={columns.filter((col) => !hiddenColumns.includes(col.key))}
				rows={students}
				getRowId={(s) => s.id}
				onRowClick={(s) => void navigate(`../${s.id}`)}
				emptyText={loading ? t("common.loading") : t("studentList.empty")}
			/>

			<ConfirmDialog
				open={pendingDelete !== null}
				title={t("studentList.deleteTitle")}
				message={t("studentList.deleteMessage", { name: pendingDelete?.name[lang] })}
				confirmLabel={t("common.delete")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void confirmDelete()}
				onCancel={() => setPendingDelete(null)}
			/>
		</div>
	);
};

export default StudentList;
