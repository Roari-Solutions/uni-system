import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import ConfirmDialog from "../../../components/confirmDialog";
import DataTable, { type Column } from "../../../components/dataTable";
import DeleteButton from "../../../components/deleteButton";
import FilterSelect from "../../../components/filterSelect";
import SearchField from "../../../components/searchField";
import useAuth from "../../../auth/useAuth";
import useFaculties from "../../../hooks/useFaculties";
import { deleteCurriculum, fetchCurriculums } from "../../../api/curriculums";
import type { Curriculum } from "../../../types/curriculum";
import { SEMESTERS, STUDY_LEVELS } from "../../../utils/academicYears";
import { REQUIREMENT_TYPES, type RequirementType } from "../../../types/requirementType";

const CurriculumList = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { faculties, locked, lockedFacultyId } = useFaculties();
	const { user } = useAuth();

	const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [facultyId, setFacultyId] = useState("");
	const [academicYear, setAcademicYear] = useState("");
	const [semester, setSemester] = useState("");
	const [requirementType, setRequirementType] = useState<RequirementType | "">("");
	const [search, setSearch] = useState("");
	const [pendingDelete, setPendingDelete] = useState<Curriculum | null>(null);

	// a locked caller only ever sees their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchCurriculums({
			facultyId: effectiveFacultyId || undefined,
			academicYear: academicYear ? Number(academicYear) : undefined,
			semester: semester ? Number(semester) : undefined,
			requirementType: requirementType || undefined,
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
	}, [effectiveFacultyId, academicYear, semester, requirementType, search]);

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
			key: "requirementType",
			header: t("curriculumList.columns.requirementType"),
			// curriculums from before requirement types have none recorded
			render: (c) => (c.requirementType ? t(`requirementTypes.${c.requirementType}`) : t("curriculumList.notSet")),
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
					{(c.requirementType !== "university" || user?.role === "admin") && (
						<Link
							to={`../${c.id}/edit`}
							aria-label={t("curriculumList.editItem", { name: c.name[lang] })}
							title={t("curriculumList.editItem", { name: c.name[lang] })}
							className="rounded-xs p-2 text-foreground transition-colors duration-150 ease-out hover:bg-background hover:text-primary-hover"
						>
							<PencilSquareIcon className="size-5" aria-hidden />
						</Link>
					)}
					<DeleteButton
						label={t("common.deleteItem", { name: c.name[lang] })}
						onClick={() => setPendingDelete(c)}
					/>
				</div>
			),
		},
	];

	return (
		<div>
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("curriculumList.title")}
			</h1>

			<div className="mb-6 flex flex-wrap items-end gap-6">
				<SearchField
					id="curriculumSearch"
					label={t("curriculumList.search")}
					placeholder={t("curriculumList.searchPlaceholder")}
					value={search}
					onChange={setSearch}
				/>
				<FilterSelect
					id="facultyFilter"
					label={t("curriculumList.faculty")}
					value={effectiveFacultyId}
					onChange={setFacultyId}
					allLabel={t("curriculumList.allFaculties")}
					options={faculties.map((f) => ({ value: f.id, label: f.name[lang] }))}
					disabled={locked}
				/>
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
			</div>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}

			<DataTable
				columns={columns}
				rows={curriculums}
				getRowId={(c) => c.id}
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
		</div>
	);
};

export default CurriculumList;
