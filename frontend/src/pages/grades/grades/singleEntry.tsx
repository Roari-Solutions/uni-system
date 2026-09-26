import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { EyeIcon, NoSymbolIcon, PauseCircleIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import FilterSelect from "../../../components/filterSelect";
import SearchField from "../../../components/searchField";
import useFaculties from "../../../hooks/useFaculties";
import { fetchStudents } from "../../../api/students";
import type { Student } from "../../../types/student";
import { smallSecondaryButtonClass } from "../../../styles/form";
import { SEMESTERS, STUDY_LEVELS } from "../../../utils/academicYears";

// step one of single entry: pick the student whose grades are being entered
const SingleEntry = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const navigate = useNavigate();
	const { faculties, locked, lockedFacultyId } = useFaculties();

	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [search, setSearch] = useState("");
	const [facultyId, setFacultyId] = useState("");
	const [level, setLevel] = useState("");
	// students carry no semester, so this one narrows the sheet the student opens into
	const [semester, setSemester] = useState("");

	// a locked caller only ever sees their own faculty
	const effectiveFacultyId = locked ? (lockedFacultyId ?? "") : facultyId;

	useEffect(() => {
		let cancelled = false;
		// state changes live in the callbacks: the effect body itself stays sync-free
		fetchStudents({
			facultyId: effectiveFacultyId || undefined,
			level: level ? Number(level) : undefined,
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
	}, [effectiveFacultyId, level, search]);

	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";
	const sheetPath = (s: Student) => (semester ? `${s.id}?semester=${semester}` : s.id);

	const columns: Column<Student>[] = [
		{ key: "uniNumber", header: t("singleEntry.columns.uniNumber"), render: (s) => s.uniNumber },
		{
			key: "name",
			header: t("singleEntry.columns.name"),
			render: (s) => (
				<div className="flex flex-col items-start gap-1">
					<span>{s.name[lang]}</span>
					{/* §39 — the icon and words say the record is frozen, not the colour alone */}
					{s.standing !== "active" && (
						<span className="inline-flex items-center gap-1 text-body-sm text-error">
							{s.standing === "dismissed" ? (
								<NoSymbolIcon className="size-4" aria-hidden />
							) : (
								<PauseCircleIcon className="size-4" aria-hidden />
							)}
							{t(`singleEntry.standings.${s.standing}`)}
						</span>
					)}
				</div>
			),
		},
		{ key: "faculty", header: t("singleEntry.columns.faculty"), render: (s) => facultyName(s.facultyId) },
		{ key: "level", header: t("singleEntry.columns.level"), render: (s) => t(`student.levels.${s.level}`) },
		{
			key: "actions",
			header: t("common.actions"),
			// a frozen record takes no marks, so its sheet only shows them
			render: (s) => {
				const frozen = s.standing !== "active";
				const Icon = frozen ? EyeIcon : PencilSquareIcon;
				return (
					<Link
						to={sheetPath(s)}
						aria-label={t(frozen ? "singleEntry.viewGradesFor" : "singleEntry.enterGradesFor", {
							name: s.name[lang],
						})}
						className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
					>
						<Icon className="size-4" aria-hidden />
						{t(frozen ? "singleEntry.viewGrades" : "singleEntry.enterGrades")}
					</Link>
				);
			},
		},
	];

	return (
		<div>
			<h1 className="mb-8 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("singleEntry.title")}
			</h1>

			<div className="mb-6 flex flex-wrap items-end gap-6">
				<SearchField
					id="singleEntrySearch"
					label={t("singleEntry.search")}
					placeholder={t("singleEntry.searchPlaceholder")}
					value={search}
					onChange={setSearch}
				/>
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
					value={level}
					onChange={setLevel}
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
				rows={students}
				getRowId={(s) => s.id}
				onRowClick={(s) => void navigate(sheetPath(s))}
				emptyText={loading ? t("common.loading") : t("singleEntry.empty")}
			/>
		</div>
	);
};

export default SingleEntry;
