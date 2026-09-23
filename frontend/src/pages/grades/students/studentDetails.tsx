import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import DataTable, { type Column } from "../../../components/dataTable";
import useFaculties from "../../../hooks/useFaculties";
import { fetchStudent } from "../../../api/students";
import {
	fetchStudentGpas,
	fetchStudentYearGrades,
	updateGrade,
	type StudentGpas,
	type StudentYearGrade,
} from "../../../api/grades";
import { SeatingStatusTag } from "../../../components/seatingStatusSelect";
import ResolveCheatingDialog, {
	type CheatingResolution,
} from "../../../components/resolveCheatingDialog";
import EditGradeDialog, { type GradeEdit } from "../../../components/editGradeDialog";
import ConfirmDialog from "../../../components/confirmDialog";
import { smallSecondaryButtonClass } from "../../../styles/form";
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
	const [gpas, setGpas] = useState<StudentGpas | null>(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	// the cheating curriculum being decided, if any
	const [resolving, setResolving] = useState<StudentYearGrade | null>(null);
	// the row being edited, then the edit waiting to be confirmed
	const [editing, setEditing] = useState<StudentYearGrade | null>(null);
	const [pending, setPending] = useState<{ row: StudentYearGrade; edit: GradeEdit } | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		Promise.all([
			fetchStudent(studentId),
			fetchStudentYearGrades(studentId),
			fetchStudentGpas(studentId),
		])
			.then(([studentRow, gradeRows, gpaRows]) => {
				if (cancelled) return;
				setStudent(studentRow);
				setGrades(gradeRows);
				setGpas(gpaRows);
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

	const semesterGpa = (semester: number) =>
		gpas?.semesters.find((s) => s.semester === semester) ?? null;

	// a GPA stands only once every curriculum behind it carries a mark
	const missingIn = (rows: StudentYearGrade[]) => rows.some((g) => g.grade === null);
	const semesterMissing = (semester: number) =>
		missingIn(grades.filter((g) => g.semester === semester));
	const yearMissing = () => missingIn(grades);

	const awaitsDecision = (g: StudentYearGrade) =>
		g.seatingStatus === "cheating" && !g.cheatingResolved;

	const reload = async () => {
		const [gradeRows, gpaRows] = await Promise.all([
			fetchStudentYearGrades(studentId),
			fetchStudentGpas(studentId),
		]);
		setGrades(gradeRows);
		setGpas(gpaRows);
	};

	// the edit is written only once the second dialog confirms it
	const handleEditConfirm = async () => {
		if (!pending?.row.gradeId) return;
		setSaving(true);
		try {
			await updateGrade(pending.row.gradeId, {
				grade: pending.edit.grade,
				seatingStatus: pending.edit.seatingStatus,
			});
			await reload();
			setPending(null);
		} catch {
			setFailed(true);
		} finally {
			setSaving(false);
		}
	};

	const handleResolve = async ({ outcome }: CheatingResolution) => {
		if (!resolving?.gradeId) return;
		setSaving(true);
		try {
			await updateGrade(
				resolving.gradeId,
				outcome === "accept"
					? { seatingStatus: "attended" }
					: { seatingStatus: "cheating", grade: 0, cheatingResolved: true },
			);
			await reload();
			setResolving(null);
		} catch {
			setFailed(true);
		} finally {
			setSaving(false);
		}
	};

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
			key: "letter",
			header: t("studentDetails.columns.letter"),
			render: (g) => (g.letter ? <span dir="ltr" className="font-semibold">{g.letter}</span> : "—"),
		},
		{
			key: "actions",
			header: t("common.actions"),
			// only a curriculum that carries a mark can have it edited
			render: (g) =>
				g.gradeId === null ? null : (
					<button
						type="button"
						onClick={() => setEditing(g)}
						aria-label={t("editGrade.actionFor", { name: g.name[lang] })}
						className={smallSecondaryButtonClass}
					>
						{t("editGrade.action")}
					</button>
				),
		},
		{
			key: "seatingStatus",
			header: t("studentDetails.columns.seatingStatus"),
			render: (g) => (
				<div className="flex flex-col items-start gap-1">
					<SeatingStatusTag status={g.seatingStatus} />
					{awaitsDecision(g) && (
						<>
							<span className="text-body-sm text-error">{t("resolveCheating.pending")}</span>
							<button
								type="button"
								onClick={() => setResolving(g)}
								aria-label={t("resolveCheating.actionFor", { name: g.name[lang] })}
								className={smallSecondaryButtonClass}
							>
								{t("resolveCheating.action")}
							</button>
						</>
					)}
				</div>
			),
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
						<div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
							<h2 id="yearGrades" className="text-heading-4 text-accent-deep">
								{t("studentDetails.yearGrades", { year: t(`student.levels.${student.level}`) })}
							</h2>
							{yearMissing() ? (
								<p className="text-body-md text-primary-hover">
									{t("studentDetails.missingGrades")}
								</p>
							) : (
								gpas?.annual != null && (
									<p className="text-body-md text-foreground">
										{t("studentDetails.annualGpa")}{" "}
										<span dir="ltr" className="text-heading-5 font-semibold text-accent-deep">
											{gpas.annual.toFixed(2)}
										</span>
									</p>
								)
							)}
						</div>
						<div className="flex flex-col gap-8">
							{SEMESTERS.map((semester) => (
								<div key={semester}>
									<div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
										<h3 className="text-heading-5 text-accent-deep">{t(`semesters.${semester}`)}</h3>
										{semesterMissing(semester) ? (
											<p className="text-body-sm text-primary-hover">
												{t("studentDetails.missingGrades")}
											</p>
										) : (
											semesterGpa(semester) && (
												<p className="text-body-sm text-foreground">
													{t("studentDetails.semesterGpa")}{" "}
													<span dir="ltr" className="font-semibold">
														{semesterGpa(semester)?.gpa.toFixed(2)}
													</span>
													{semesterGpa(semester)?.status && (
														<>
															{" · "}
															<span
																className={
																	semesterGpa(semester)?.status === "pass"
																		? "text-success"
																		: "text-error"
																}
															>
																{t(`gpaStatuses.${semesterGpa(semester)?.status ?? "pass"}`)}
															</span>
														</>
													)}
												</p>
											)
										)}
									</div>
									<DataTable
										columns={columns}
										rows={grades.filter((g) => g.semester === semester)}
										getRowId={(g) => g.curriculumId}
										emptyText={t("studentDetails.noCurriculums")}
										// §39 — the tint repeats what the status cell already says
										rowClassName={(g) => (awaitsDecision(g) ? "bg-error/8" : "")}
									/>
								</div>
							))}
						</div>
					</section>
				</>
			)}

			<EditGradeDialog
				open={editing !== null}
				curriculumName={editing ? editing.name[lang] : ""}
				grade={editing?.grade ?? null}
				seatingStatus={editing?.seatingStatus ?? null}
				onSave={(edit) => {
					if (editing) setPending({ row: editing, edit });
					setEditing(null);
				}}
				onCancel={() => setEditing(null)}
			/>

			<ConfirmDialog
				open={pending !== null}
				title={t("editGrade.confirmTitle")}
				message={
					pending
						? t("editGrade.confirmMessage", {
								name: pending.row.name[lang],
								fromGrade: pending.row.grade ?? "—",
								fromStatus: t(`seatingStatuses.${pending.row.seatingStatus ?? "attended"}`),
								toGrade: pending.edit.grade,
								toStatus: t(`seatingStatuses.${pending.edit.seatingStatus}`),
							})
						: ""
				}
				confirmLabel={saving ? t("common.saving") : t("editGrade.confirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void handleEditConfirm()}
				onCancel={() => setPending(null)}
			/>

			<ResolveCheatingDialog
				open={resolving !== null}
				curriculumName={resolving ? resolving.name[lang] : ""}
				grade={resolving?.grade ?? null}
				saving={saving}
				onResolve={(resolution) => void handleResolve(resolution)}
				onCancel={() => setResolving(null)}
			/>
		</div>
	);
};

export default StudentDetails;
