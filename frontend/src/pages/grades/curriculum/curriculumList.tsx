import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import ConfirmDialog from "../../../components/confirmDialog";
import DataTable, { type Column } from "../../../components/dataTable";
import DeleteButton from "../../../components/deleteButton";
import FilterSelect from "../../../components/filterSelect";
import SearchField from "../../../components/searchField";
import DepartmentFilter from "../../../components/departmentFilter";
import SetSpecializationDialog, { type PlacementKind } from "../../../components/setSpecializationDialog";
import SpecializationFilter from "../../../components/specializationFilter";
import useAuth from "../../../auth/useAuth";
import { PERMISSIONS } from "../../../types/auth";
import useFaculties from "../../../hooks/useFaculties";
import {
	deleteCurriculum,
	fetchCurriculums,
	setCurriculumDepartment,
	setCurriculumSpecialization,
} from "../../../api/curriculums";
import { WITHOUT_SPECIALIZATION } from "../../../types/faculty";
import { smallSecondaryButtonClass, submitButtonClass } from "../../../styles/form";
import { departmentName, specializationDepartmentId, specializationName } from "../../../utils/specializations";
import type { Curriculum } from "../../../types/curriculum";
import { SEMESTERS, STUDY_LEVELS } from "../../../utils/academicYears";
import { REQUIREMENT_TYPES, type RequirementType } from "../../../types/requirementType";

type CurriculumListProps = {
	/**
	 * Shown on a faculty's tab: fixed to that faculty, without the page title,
	 * and adding or editing opens in place through these instead of a new page.
	 */
	facultyId?: string;
	onAdd?: () => void;
	onEdit?: (curriculum: Curriculum) => void;
	/** Bumped by the tab after a save, so the list reloads. */
	reloadKey?: number;
};

const CurriculumList = ({ facultyId: fixedFacultyId, onAdd, onEdit, reloadKey = 0 }: CurriculumListProps = {}) => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { faculties, locked, lockedFacultyId } = useFaculties();
	const { can } = useAuth();
	const embedded = fixedFacultyId !== undefined;

	const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [facultyId, setFacultyId] = useState("");
	const [academicYear, setAcademicYear] = useState("");
	const [semester, setSemester] = useState("");
	const [requirementType, setRequirementType] = useState<RequirementType | "">("");
	const [search, setSearch] = useState("");
	const [specializationId, setSpecializationId] = useState("");
	const [departmentId, setDepartmentId] = useState("");
	const [pendingDelete, setPendingDelete] = useState<Curriculum | null>(null);
	// the major whose specialization or department is being set
	const [settingFor, setSettingFor] = useState<{ curriculum: Curriculum; kind: PlacementKind } | null>(null);
	const [ownReload, setOwnReload] = useState(0);

	// a faculty's tab fixes it; otherwise a locked caller only ever sees their own
	const effectiveFacultyId = fixedFacultyId ?? (locked ? (lockedFacultyId ?? "") : facultyId);

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchCurriculums({
			facultyId: effectiveFacultyId || undefined,
			academicYear: academicYear ? Number(academicYear) : undefined,
			semester: semester ? Number(semester) : undefined,
			requirementType: requirementType || undefined,
			specializationId: specializationId || undefined,
			departmentId: departmentId || undefined,
			q: search.trim() || undefined,
		})
			.then((rows) => {
				if (cancelled) return;
				setCurriculums(rows);
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
	}, [
		effectiveFacultyId,
		academicYear,
		semester,
		requirementType,
		specializationId,
		departmentId,
		search,
		reloadKey,
		ownReload,
	]);

	const hasSpecializations = (id: string) =>
		(faculties.find((f) => f.id === id)?.specializations.length ?? 0) > 0;
	const hasDepartments = (id: string) => (faculties.find((f) => f.id === id)?.departments.length ?? 0) > 0;
	// majors still waiting for a specialization or department, in what's listed
	const missing = curriculums.filter(
		(c) =>
			c.requirementType === "major" &&
			!c.specializationId &&
			!c.departmentId &&
			(hasSpecializations(c.facultyId) || hasDepartments(c.facultyId)),
	).length;
	const showDepartments = effectiveFacultyId
		? hasDepartments(effectiveFacultyId)
		: faculties.some((f) => f.departments.length > 0);

	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";

	const confirmDelete = async () => {
		if (!pendingDelete) return;
		const target = pendingDelete;
		setPendingDelete(null);
		try {
			await deleteCurriculum(target.id);
			setCurriculums((prev) => prev.filter((c) => c.id !== target.id));
		} catch {
			setFailed(true);
		}
	};

	const columns: Column<Curriculum>[] = [
		{ key: "name", header: t("curriculumList.columns.name"), render: (c) => c.name[lang] },
		{ key: "faculty", header: t("curriculumList.columns.faculty"), render: (c) => facultyName(c.facultyId) },
		{ key: "abbreviation", header: t("curriculumList.columns.abbreviation"), render: (c) => c.abbreviation },
		{ key: "academicYear", header: t("curriculumList.columns.academicYear"), render: (c) => t(`student.levels.${c.academicYear}`) },
		{ key: "semester", header: t("curriculumList.columns.semester"), render: (c) => t(`semesters.${c.semester}`) },
		{
			key: "serialNo",
			header: t("curriculumList.columns.serialNo"),
			// the column number on the results sheets, counted per faculty, year and semester
			render: (c) => <span dir="ltr">{c.serialNo ?? "—"}</span>,
		},
		{
			key: "requirementType",
			header: t("curriculumList.columns.requirementType"),
			// curriculums from before requirement types have none recorded
			render: (c) => (c.requirementType ? t(`requirementTypes.${c.requirementType}`) : t("curriculumList.notSet")),
		},
		...(showDepartments
			? [
					{
						key: "department",
						header: t("department.label"),
						render: (c: Curriculum) => {
							// only a major belongs to a department; the rest are shared by the faculty
							if (c.requirementType !== "major") return t("specialization.shared");
							const id = c.departmentId ?? specializationDepartmentId(faculties, c.specializationId);
							return id ? departmentName(faculties, id, lang) : "—";
						},
					},
				]
			: []),
		{
			key: "specialization",
			header: t("specialization.label"),
			render: (c) => {
				// only a major belongs to a specialization; the rest are shared by the faculty
				if (c.requirementType !== "major") return t("specialization.shared");
				if (c.specializationId) return specializationName(faculties, c.specializationId, lang);
				// a department's major is taken by all its students, whatever their specialization
				if (c.departmentId) return t("department.wholeDepartment");
				// once it's set, the edit form is where it changes
				const actions: PlacementKind[] = [
					...(hasDepartments(c.facultyId) ? (["department"] as const) : []),
					...(hasSpecializations(c.facultyId) ? (["specialization"] as const) : []),
				];
				return actions.length ? (
					<div className="flex flex-wrap gap-2">
						{actions.map((kind) => (
							<button
								key={kind}
								type="button"
								onClick={() => setSettingFor({ curriculum: c, kind })}
								aria-label={t(`${kind}.setFor`, { name: c.name[lang] })}
								className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
							>
								{t(`${kind}.set`)}
							</button>
						))}
					</div>
				) : (
					"—"
				);
			},
		},
		{
			key: "courseHours",
			header: t("curriculumList.columns.courseHours"),
			render: (c) => <span dir="ltr">{c.courseHours}</span>,
		},
		{
			key: "actions",
			header: t("common.actions"),
			render: (c) => (
				<div className="flex items-center gap-1">
					{/* a university requirement spans every faculty, so only an admin edits one */}
					{(c.requirementType !== "university" || can(PERMISSIONS.gradesAllFaculties)) &&
						(onEdit ? (
							<button
								type="button"
								onClick={() => onEdit(c)}
								aria-label={t("curriculumList.editItem", { name: c.name[lang] })}
								title={t("curriculumList.editItem", { name: c.name[lang] })}
								className="rounded-xs p-2 text-foreground transition-colors duration-150 ease-out hover:bg-background hover:text-primary-hover"
							>
								<PencilSquareIcon className="size-5" aria-hidden />
							</button>
						) : (
							<Link
								to={`../${c.id}/edit`}
								aria-label={t("curriculumList.editItem", { name: c.name[lang] })}
								title={t("curriculumList.editItem", { name: c.name[lang] })}
								className="rounded-xs p-2 text-foreground transition-colors duration-150 ease-out hover:bg-background hover:text-primary-hover"
							>
								<PencilSquareIcon className="size-5" aria-hidden />
							</Link>
						))}
					<DeleteButton
						label={t("common.deleteItem", { name: c.name[lang] })}
						onClick={() => setPendingDelete(c)}
					/>
				</div>
			),
		},
	];

	// the faculty column says nothing on a faculty's own tab
	const shownColumns = embedded ? columns.filter((col) => col.key !== "faculty") : columns;

	return (
		<div>
			{!embedded && (
				<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
					{t("curriculumList.title")}
				</h1>
			)}
			{onAdd && (
				<button type="button" onClick={onAdd} className={`mb-6 ${submitButtonClass}`}>
					<PlusIcon className="me-2 size-5" aria-hidden />
					{t("curriculumEntry.title")}
				</button>
			)}

			<div className="mb-6 flex flex-wrap items-end gap-6">
				<SearchField
					id="curriculumSearch"
					label={t("curriculumList.search")}
					placeholder={t("curriculumList.searchPlaceholder")}
					value={search}
					onChange={setSearch}
				/>
				{!embedded && (
					<FilterSelect
						id="facultyFilter"
						label={t("curriculumList.faculty")}
						value={effectiveFacultyId}
						onChange={(id) => {
							setFacultyId(id);
							// a specialization belongs to its faculty
							setSpecializationId("");
							setDepartmentId("");
						}}
						allLabel={t("curriculumList.allFaculties")}
						options={faculties.map((f) => ({ value: f.id, label: f.name[lang] }))}
						disabled={locked}
					/>
				)}
				<FilterSelect
					id="yearFilter"
					label={t("curriculumList.academicYear")}
					value={academicYear}
					onChange={setAcademicYear}
					allLabel={t("curriculumList.allYears")}
					options={STUDY_LEVELS.map((l) => ({ value: String(l), label: t(`student.levels.${l}`) }))}
				/>
				<FilterSelect
					id="semesterFilter"
					label={t("curriculumList.semester")}
					value={semester}
					onChange={setSemester}
					allLabel={t("curriculumList.allSemesters")}
					options={SEMESTERS.map((s) => ({ value: String(s), label: t(`semesters.${s}`) }))}
				/>
				<FilterSelect
					id="requirementTypeFilter"
					label={t("curriculumList.requirementType")}
					value={requirementType}
					onChange={(v) => setRequirementType(v as RequirementType | "")}
					allLabel={t("curriculumList.allRequirementTypes")}
					options={REQUIREMENT_TYPES.map((r) => ({ value: r, label: t(`requirementTypes.${r}`) }))}
				/>
				<DepartmentFilter
					id={embedded ? "facultyCurriculumDepartment" : undefined}
					faculties={faculties}
					facultyId={effectiveFacultyId}
					value={departmentId}
					onChange={setDepartmentId}
				/>
				<SpecializationFilter
					id={embedded ? "facultyCurriculumSpecialization" : undefined}
					faculties={faculties}
					facultyId={effectiveFacultyId}
					value={specializationId}
					onChange={setSpecializationId}
				/>
			</div>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}

			{/* what still needs a specialization, one click from the list of it */}
			{missing > 0 && specializationId !== WITHOUT_SPECIALIZATION && (
				<div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border-s-3 border-primary bg-accent-soft/30 p-4">
					<p className="text-body-md text-foreground">{t("specialization.missingMajors", { count: missing })}</p>
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

			<DataTable
				columns={shownColumns}
				rows={curriculums}
				// a university requirement is listed once per faculty, all under one id
				getRowId={(c) => `${c.id}:${c.facultyId}`}
				emptyText={loading ? t("common.loading") : t("curriculumList.empty")}
			/>

			<ConfirmDialog
				open={pendingDelete !== null}
				title={t("curriculumList.deleteTitle")}
				message={t("curriculumList.deleteMessage", { name: pendingDelete?.name[lang] })}
				confirmLabel={t("common.delete")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void confirmDelete()}
				onCancel={() => setPendingDelete(null)}
			/>

			{settingFor && (
				<SetSpecializationDialog
					open
					kind={settingFor.kind}
					title={t(`${settingFor.kind}.setFor`, { name: settingFor.curriculum.name[lang] })}
					faculties={faculties}
					facultyId={settingFor.curriculum.facultyId}
					targets={[
						{
							id: settingFor.curriculum.id,
							name: settingFor.curriculum.name[lang],
							current:
								settingFor.kind === "department"
									? settingFor.curriculum.departmentId
									: settingFor.curriculum.specializationId,
						},
					]}
					allowNone={false}
					onSave={async (value, confirmOrphans) => {
						if (!value) return;
						if (settingFor.kind === "department") {
							await setCurriculumDepartment(settingFor.curriculum.id, value, confirmOrphans);
						} else {
							await setCurriculumSpecialization(settingFor.curriculum.id, value, confirmOrphans);
						}
						setOwnReload((k) => k + 1);
					}}
					onClose={() => setSettingFor(null)}
				/>
			)}
		</div>
	);
};

export default CurriculumList;
