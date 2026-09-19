import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import useFaculties from "../../../hooks/useFaculties";
import { fetchStudent } from "../../../api/students";
import { fetchStudentYearGrades, type StudentYearGrade } from "../../../api/grades";
import type { Student } from "../../../types/student";
import { cardClass } from "../../../styles/form";
import { SEMESTERS } from "../../../utils/academicYears";

// one label/value pair of the registered data
const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
	<div className="flex flex-col gap-1">
		<dt className="text-body-sm font-medium text-accent-deep">{label}</dt>
		<dd className="text-body-md text-foreground">{children}</dd>
	</div>
);

const StudentDetails = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { studentId = "" } = useParams();
	const { faculties } = useFaculties();

	const [student, setStudent] = useState<Student | null>(null);
	const [grades, setGrades] = useState<StudentYearGrade[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		Promise.all([fetchStudent(studentId), fetchStudentYearGrades(studentId)])
			.then(([studentRow, gradeRows]) => {
				if (cancelled) return;
				setStudent(studentRow);
				setGrades(gradeRows);
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
	}, [studentId]);

	const facultyName = (id: string) => faculties.find((f) => f.id === id)?.name[lang] ?? "";

	const columns: Column<StudentYearGrade>[] = [
		{ key: "name", header: t("studentDetails.columns.curriculum"), render: (g) => g.name[lang] },
		{
			key: "abbreviation",
			header: t("studentDetails.columns.abbreviation"),
			render: (g) => <span dir="ltr">{g.abbreviation}</span>,
		},
		{
			key: "requirementType",
			header: t("studentDetails.columns.requirementType"),
			render: (g) => (g.requirementType ? t(`requirementTypes.${g.requirementType}`) : "—"),
		},
		{
			key: "grade",
			header: t("studentDetails.columns.grade"),
			render: (g) =>
				g.grade === null ? (
					<span className="text-primary-hover">{t("studentDetails.notEntered")}</span>
				) : (
					<span className="font-semibold">{g.grade}</span>
				),
		},
		{
			key: "status",
			header: t("studentDetails.columns.status"),
			render: (g) => (g.status ? t(`grade.statuses.${g.status}`) : "—"),
		},
	];

	return (
		<div>
			<Link
				to="../list"
				relative="path"
				className="mb-6 inline-flex items-center gap-2 text-body-sm font-medium text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep"
			>
				{/* §20 — the arrow points back in either reading direction */}
				<ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
				{t("studentDetails.back")}
			</Link>

			<h1 className="mb-2 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{student ? student.name[lang] : t("studentDetails.title")}
			</h1>
			{student && <p className="mb-8 ps-4 text-body-sm text-foreground">{student.uniNumber}</p>}

			{failed && (
				<p role="alert" className="mb-6 text-body-sm text-error">
					{t("common.loadFailed")}
				</p>
			)}
			{loading && !student && <p className="text-body-md text-foreground">{t("common.loading")}</p>}

			{student && (
				<>
					<section aria-labelledby="registeredData" className={`mb-10 ${cardClass}`}>
						<h2 id="registeredData" className="mb-6 text-heading-5 text-accent-deep">
							{t("studentDetails.registeredData")}
						</h2>
						<dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
							<Detail label={t("studentDetails.fields.nameAr")}>{student.name.ar}</Detail>
							<Detail label={t("studentDetails.fields.nameEn")}>
								<span dir="ltr">{student.name.en}</span>
							</Detail>
							<Detail label={t("studentDetails.fields.uniNumber")}>{student.uniNumber}</Detail>
							<Detail label={t("studentDetails.fields.nationality")}>
								{t(`student.nationalities.${student.nationality}`)}
							</Detail>
							{student.nationality === "foreign" ? (
								<Detail label={t("studentDetails.fields.passportNumber")}>{student.passportNumber || "—"}</Detail>
							) : (
								<Detail label={t("studentDetails.fields.nationalId")}>{student.nationalId || "—"}</Detail>
							)}
							<Detail label={t("studentDetails.fields.faculty")}>{facultyName(student.facultyId)}</Detail>
							<Detail label={t("studentDetails.fields.level")}>{t(`student.levels.${student.level}`)}</Detail>
							<Detail label={t("studentDetails.fields.acceptanceYear")}>{student.acceptanceYear}</Detail>
							<Detail label={t("studentDetails.fields.acceptanceType")}>
								{t(`student.acceptanceTypes.${student.acceptanceType}`)}
							</Detail>
							<Detail label={t("studentDetails.fields.status")}>
								{student.status ? t(`student.statuses.${student.status}`) : "—"}
							</Detail>
						</dl>
					</section>

					<section aria-labelledby="yearGrades">
						<h2 id="yearGrades" className="mb-6 text-heading-4 text-accent-deep">
							{t("studentDetails.yearGrades", { year: t(`student.levels.${student.level}`) })}
						</h2>
						<div className="flex flex-col gap-8">
							{SEMESTERS.map((semester) => (
								<div key={semester}>
									<h3 className="mb-4 text-heading-5 text-accent-deep">{t(`semesters.${semester}`)}</h3>
									<DataTable
										columns={columns}
										rows={grades.filter((g) => g.semester === semester)}
										getRowId={(g) => g.curriculumId}
										emptyText={t("studentDetails.noCurriculums")}
									/>
								</div>
							))}
						</div>
					</section>
				</>
			)}
		</div>
	);
};

export default StudentDetails;
