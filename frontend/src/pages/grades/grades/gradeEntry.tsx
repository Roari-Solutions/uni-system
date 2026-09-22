import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import FilterSelect from "../../../components/filterSelect";
import useFaculties from "../../../hooks/useFaculties";
import { fetchCurriculums } from "../../../api/curriculums";
import type { Curriculum } from "../../../types/curriculum";
import { smallSecondaryButtonClass } from "../../../styles/form";
import { SEMESTERS, STUDY_LEVELS } from "../../../utils/academicYears";
import StatusButton from "../../../components/statusButton";

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

	// a locked caller only ever sees their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchCurriculums({
			facultyId: effectiveFacultyId || undefined,
			academicYear: academicYear ? Number(academicYear) : undefined,
			semester: semester ? Number(semester) : undefined,
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
	}, [effectiveFacultyId, academicYear, semester]);

	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";

	const columns: Column<Curriculum>[] = [
		{ key: "name", header: t("gradeEntry.columns.name"), render: (c) => c.name[lang] },
		{ key: "abbreviation", header: t("gradeEntry.columns.abbreviation"), render: (c) => c.abbreviation },
		{ key: "faculty", header: t("gradeEntry.columns.faculty"), render: (c) => facultyName(c.facultyId) },
		{ key: "academicYear", header: t("gradeEntry.columns.academicYear"), render: (c) => t(`student.levels.${c.academicYear}`) },
		{ key: "semester", header: t("gradeEntry.columns.semester"), render: (c) => t(`semesters.${c.semester}`) },
		{
	key: "status",
	header: "Status",
	render: (c) => (
		<StatusButton status="attended" onChange={() => {}} />
	),
},
		{
			key: "actions",
			header: t("common.actions"),
			render: (c) => (
				<Link
					to={c.id}
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
		<div>
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("gradeEntry.title")}
			</h1>

			<div className="mb-6 flex flex-wrap gap-6">
				<FilterSelect
					id="facultyFilter"
					label={t("gradeEntry.faculty")}
					value={effectiveFacultyId}
					onChange={setFacultyId}
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
				emptyText={loading ? t("common.loading") : t("gradeEntry.empty")}
			/>
		</div>
	);
};

export default GradeEntry;
