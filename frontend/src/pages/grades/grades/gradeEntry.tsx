import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import type { Column } from "../../../components/dataTable";
import DataTable from "../../../components/paginatedDataTable";
import FillPage from "../../../components/fillPage";
import PageBackdrop from "../../../components/pageBackdrop";
import FilterSelect from "../../../components/filterSelect";
import DepartmentFilter from "../../../components/departmentFilter";
import SpecializationFilter from "../../../components/specializationFilter";
import { placementName } from "../../../utils/specializations";
import useFaculties from "../../../hooks/useFaculties";
import { fetchCurriculums } from "../../../api/curriculums";
import type { Curriculum } from "../../../types/curriculum";
import { smallSecondaryButtonClass } from "../../../styles/form";
import { SEMESTERS, STUDY_LEVELS } from "../../../utils/academicYears";

// step one of grade entry: pick the curriculum whose grades are being entered
const GradeEntry = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { faculties, locked, lockedFacultyId } = useFaculties();

	const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [facultyId, setFacultyId] = useState("");
	const [academicYear, setAcademicYear] = useState("");
	const [semester, setSemester] = useState("");
	const [specializationId, setSpecializationId] = useState("");
	const [departmentId, setDepartmentId] = useState("");

	// a locked caller only ever sees their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchCurriculums({
			facultyId: effectiveFacultyId || undefined,
			academicYear: academicYear ? Number(academicYear) : undefined,
			semester: semester ? Number(semester) : undefined,
			specializationId: specializationId || undefined,
			departmentId: departmentId || undefined,
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
	}, [effectiveFacultyId, academicYear, semester, specializationId, departmentId]);

	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";

	const columns: Column<Curriculum>[] = [
		{ key: "name", header: t("gradeEntry.columns.name"), render: (c) => c.name[lang] },
		{ key: "abbreviation", header: t("gradeEntry.columns.abbreviation"), render: (c) => c.abbreviation },
		{ key: "faculty", header: t("gradeEntry.columns.faculty"), render: (c) => facultyName(c.facultyId) },
		{ key: "academicYear", header: t("gradeEntry.columns.academicYear"), render: (c) => t(`student.levels.${c.academicYear}`) },
		{ key: "semester", header: t("gradeEntry.columns.semester"), render: (c) => t(`semesters.${c.semester}`) },
		{
			key: "specialization",
			header: t("specialization.label"),
			// only a major belongs to one (or to a department); the rest are shared by the faculty
			render: (c) =>
				c.requirementType !== "major"
					? t("specialization.shared")
					: placementName(faculties, c.departmentId, c.specializationId, lang) || "—",
		},
		{
			key: "actions",
			header: t("common.actions"),
			render: (c) => (
				<Link
					// the sheet lists the students of the faculty this row belongs to
					to={`${c.id}?facultyId=${c.facultyId}`}
					aria-label={t("gradeEntry.enterGradesFor", { name: c.name[lang] })}
					className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
				>
					<PencilSquareIcon className="size-4" aria-hidden />
					{t("gradeEntry.enterGrades")}
				</Link>
			),
		},
	];

	return (
		<FillPage>
			<PageBackdrop />
			<h1 className="mb-4 shrink-0 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("gradeEntry.title")}
			</h1>

			<div className="mb-6 flex shrink-0 flex-wrap gap-6">
				<FilterSelect
					id="facultyFilter"
					label={t("gradeEntry.faculty")}
					value={effectiveFacultyId}
					onChange={(id) => {
						setFacultyId(id);
						// a specialization and department belong to their faculty
						setSpecializationId("");
						setDepartmentId("");
					}}
					allLabel={t("gradeEntry.allFaculties")}
					options={faculties.map((f) => ({ value: f.id, label: f.name[lang] }))}
					disabled={locked}
				/>
				<FilterSelect
					id="yearFilter"
					label={t("gradeEntry.academicYear")}
					value={academicYear}
					onChange={setAcademicYear}
					allLabel={t("gradeEntry.allYears")}
					options={STUDY_LEVELS.map((l) => ({ value: String(l), label: t(`student.levels.${l}`) }))}
				/>
				<FilterSelect
					id="semesterFilter"
					label={t("gradeEntry.semester")}
					value={semester}
					onChange={setSemester}
					allLabel={t("gradeEntry.allSemesters")}
					options={SEMESTERS.map((s) => ({ value: String(s), label: t(`semesters.${s}`) }))}
				/>
				<DepartmentFilter
					faculties={faculties}
					facultyId={effectiveFacultyId}
					value={departmentId}
					onChange={setDepartmentId}
				/>
				<SpecializationFilter
					faculties={faculties}
					facultyId={effectiveFacultyId}
					value={specializationId}
					onChange={setSpecializationId}
				/>
			</div>

			{failed && (
				<p role="alert" className="mb-6 text-body-sm shrink-0 text-error">
					{t("common.loadFailed")}
				</p>
			)}

			<DataTable
				columns={columns}
				rows={curriculums}
				// a university requirement is listed once per faculty, all under one id
				getRowId={(c) => `${c.id}:${c.facultyId}`}
				emptyText={loading ? t("common.loading") : t("gradeEntry.empty")}
			/>
		</FillPage>
	);
};

export default GradeEntry;
