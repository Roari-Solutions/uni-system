import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import ColumnToggle from "../../../components/columnToggle";
import ConfirmDialog from "../../../components/confirmDialog";
import DataTable, { type Column } from "../../../components/dataTable";
import DeleteButton from "../../../components/deleteButton";
import FilterSelect from "../../../components/filterSelect";
import SearchField from "../../../components/searchField";
import SetSpecializationDialog, {
	type SpecializationTarget,
} from "../../../components/setSpecializationDialog";
import SpecializationFilter from "../../../components/specializationFilter";
import StudentOrderSelect from "../../../components/studentOrderSelect";
import useFaculties from "../../../hooks/useFaculties";
import { deleteStudent, fetchStudents, setStudentsSpecialization } from "../../../api/students";
import type { Student } from "../../../types/student";
import { WITHOUT_SPECIALIZATION } from "../../../types/faculty";
import { smallSecondaryButtonClass } from "../../../styles/form";
import { ACCEPTANCE_YEARS, STUDY_LEVELS } from "../../../utils/academicYears";
import { specializationName } from "../../../utils/specializations";
import { orderStudents, type StudentOrder } from "../../../utils/studentOrder";

// columns that can't be hidden
const ALWAYS_VISIBLE = ["select", "name", "actions"];

// the students whose specialization is being set, and the faculty offering it
type Setting = { facultyId: string; targets: SpecializationTarget[] };

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
	const [specializationId, setSpecializationId] = useState("");
	const [search, setSearch] = useState("");
	const [order, setOrder] = useState<StudentOrder>("");
	// ticked students, for setting one specialization on all of them
	const [selected, setSelected] = useState<string[]>([]);
	const [setting, setSetting] = useState<Setting | null>(null);
	// bumped after a change, so the list reloads
	const [reloadKey, setReloadKey] = useState(0);
	const [notice, setNotice] = useState<string | null>(null);
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
			specializationId: specializationId || undefined,
			q: search.trim() || undefined,
		})
			.then((rows) => {
				if (cancelled) return;
				setStudents(rows);
				// a ticked student the filters no longer show is let go
				setSelected((prev) => prev.filter((id) => rows.some((row) => row.id === id)));
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
	}, [effectiveFacultyId, level, acceptanceYear, specializationId, search, reloadKey]);

	// a filter's specialization belongs to its faculty, so a new faculty drops it
	const changeFaculty = (id: string) => {
		setFacultyId(id);
		setSpecializationId("");
		setSelected([]);
	};

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
	const hasSpecializations = (id: string) =>
		(faculties.find((f) => f.id === id)?.specializations.length ?? 0) > 0;
	// ticking many needs one faculty in view: a specialization belongs to one
	const selectable = !!effectiveFacultyId && hasSpecializations(effectiveFacultyId);
	const selectableRows = students.filter((s) => s.standing !== "dismissed");
	const allSelected = selectableRows.length > 0 && selectableRows.every((s) => selected.includes(s.id));
	const ordered = orderStudents(students, order, lang, (s) => ({ name: s.name[lang], uniNumber: s.uniNumber }));
	const missing = students.filter((s) => !s.specializationId && hasSpecializations(s.facultyId)).length;

	const toggleSelected = (id: string) =>
		setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

	const targetOf = (s: Student): SpecializationTarget => ({
		id: s.id,
		name: s.name[lang],
		specializationId: s.specializationId,
	});

	const saveSpecialization = async (value: string | null, confirmOrphans: boolean) => {
		if (!setting) return;
		const report = await setStudentsSpecialization(
			setting.targets.map((target) => target.id),
			value,
			confirmOrphans,
		);
		setNotice(
			report.skipped.length
				? t("specialization.savedWithSkips", { updated: report.updated, skipped: report.skipped.length })
				: t("specialization.saved", { count: report.updated }),
		);
		setSelected([]);
		setReloadKey((k) => k + 1);
	};

	const columns: Column<Student>[] = [
		...(selectable
			? [
					{
						key: "select",
						header: t("specialization.selectAll"),
						headerContent: (
							<input
								type="checkbox"
								checked={allSelected}
								onChange={() =>
									setSelected(allSelected ? [] : selectableRows.map((s) => s.id))
								}
								aria-label={t("specialization.selectAll")}
								className="size-5 accent-primary"
							/>
						),
						render: (s: Student) =>
							s.standing === "dismissed" ? null : (
								<input
									type="checkbox"
									checked={selected.includes(s.id)}
									onChange={() => toggleSelected(s.id)}
									aria-label={t("specialization.selectFor", { name: s.name[lang] })}
									className="size-5 accent-primary"
								/>
							),
					},
				]
			: []),
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
		{
			key: "specialization",
			header: t("specialization.label"),
			render: (s) =>
				s.specializationId ? (
					specializationName(faculties, s.specializationId, lang)
				) : // once it's set, the edit form is where it changes
				hasSpecializations(s.facultyId) && s.standing !== "dismissed" ? (
					<button
						type="button"
						onClick={() => setSetting({ facultyId: s.facultyId, targets: [targetOf(s)] })}
						aria-label={t("specialization.setFor", { name: s.name[lang] })}
						className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
					>
						{t("specialization.set")}
					</button>
				) : (
					"—"
				),
		},
		{ key: "status", header: t("studentList.columns.status"), render: (s) => (s.status ? t(`student.statuses.${s.status}`) : "—") },
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
					onChange={changeFaculty}
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
				<SpecializationFilter
					faculties={faculties}
					facultyId={effectiveFacultyId}
					value={specializationId}
					onChange={setSpecializationId}
				/>
				<StudentOrderSelect id="studentOrder" value={order} onChange={setOrder} />

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
			{notice && (
				<p role="status" className="mb-6 text-body-sm text-primary-hover">
					{notice}
				</p>
			)}

			{/* what still needs a specialization, one click from the list of it */}
			{missing > 0 && specializationId !== WITHOUT_SPECIALIZATION && (
				<div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border-s-3 border-primary bg-accent-soft/30 p-4">
					<p className="text-body-md text-foreground">{t("specialization.missingStudents", { count: missing })}</p>
					{effectiveFacultyId && (
						<button
							type="button"
							onClick={() => setSpecializationId(WITHOUT_SPECIALIZATION)}
							className={smallSecondaryButtonClass}
						>
							{t("specialization.showMissing")}
						</button>
					)}
				</div>
			)}

			{selectable && selected.length > 0 && (
				<div className="mb-4 flex flex-wrap items-center gap-3">
					<p className="text-body-md text-foreground">{t("specialization.selected", { count: selected.length })}</p>
					<button
						type="button"
						onClick={() =>
							setSetting({
								facultyId: effectiveFacultyId,
								targets: students.filter((s) => selected.includes(s.id)).map(targetOf),
							})
						}
						className={smallSecondaryButtonClass}
					>
						{t("specialization.setSelected")}
					</button>
					<button type="button" onClick={() => setSelected([])} className={smallSecondaryButtonClass}>
						{t("specialization.clearSelection")}
					</button>
				</div>
			)}

			<DataTable
				columns={columns.filter((col) => !hiddenColumns.includes(col.key))}
				rows={ordered}
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

			{setting && (
				<SetSpecializationDialog
					open
					title={
						setting.targets.length === 1
							? t("specialization.setFor", { name: setting.targets[0].name })
							: t("specialization.setSelected")
					}
					faculties={faculties}
					facultyId={setting.facultyId}
					targets={setting.targets}
					allowNone
					onSave={saveSpecialization}
					onClose={() => setSetting(null)}
				/>
			)}
		</div>
	);
};

export default StudentList;
