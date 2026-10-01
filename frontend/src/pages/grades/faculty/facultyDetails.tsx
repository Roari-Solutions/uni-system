import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, PencilSquareIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ConfirmDialog from "../../../components/confirmDialog";
import DataTable, { type Column } from "../../../components/dataTable";
import DeleteButton from "../../../components/deleteButton";
import FormField from "../../../components/formField";
import useAuth from "../../../auth/useAuth";
import CurriculumList from "../curriculum/curriculumList";
import CurriculumEntry from "../curriculum/curriculumEntry";
import {
	createDepartment,
	createSpecialization,
	deleteDepartment,
	deleteSpecialization,
	fetchFaculty,
	updateDepartment,
	updateFaculty,
	updateSpecialization,
} from "../../../api/faculties";
import type { DepartmentUsage, FacultyDetail, SpecializationUsage } from "../../../types/faculty";
import {
	cardClass,
	formCardClass,
	inputClass,
	secondaryButtonClass,
	submitButtonClass,
} from "../../../styles/form";
import { conflictCode } from "../../../utils/apiError";
import { orphanedGradeCount } from "../../../utils/orphanedGrades";

const TABS = ["details", "departments", "specializations", "curriculums"] as const;
type Tab = (typeof TABS)[number];

/** A native dialog around a form, opened while it is mounted. */
const Modal = ({
	title,
	onClose,
	children,
	wide,
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
	wide?: boolean;
}) => {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const dialog = ref.current;
		if (dialog && !dialog.open) dialog.showModal();
	}, []);
	const { t } = useTranslation();
	return (
		<dialog
			ref={ref}
			onClose={onClose}
			aria-label={title}
			className={`m-auto max-h-[90svh] w-full ${wide ? "max-w-2xl" : "max-w-lg"} overflow-y-auto rounded-md border border-border-subtle bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/60`}
		>
			<div className="flex flex-col gap-6 p-6">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-heading-5 text-accent-deep">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label={t("common.cancel")}
						className="rounded-xs p-2 transition-colors duration-150 ease-out hover:bg-background"
					>
						<XMarkIcon className="size-5" aria-hidden />
					</button>
				</div>
				{children}
			</div>
		</dialog>
	);
};

// the specialization being added (no id), renamed or moved; `orphans` asks to confirm a move
type SpecializationEdit = {
	id: string | null;
	ar: string;
	en: string;
	// "" directly under the faculty
	departmentId: string;
	// the department it sits under now, to tell a move from a rename
	was: string;
	error: string | null;
	orphans: number | null;
};

// the department being added (no id) or renamed
type DepartmentEdit = { id: string | null; ar: string; en: string; error: string | null };

/**
 * One faculty: its details, departments, specializations, and curriculums, all
 * managed here. Admins reach every faculty; a faculty's data entry, its own.
 */
const FacultyDetails = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { facultyId = "" } = useParams();
	const { user } = useAuth();

	const [faculty, setFaculty] = useState<FacultyDetail | null>(null);
	const [failed, setFailed] = useState(false);
	const [tab, setTab] = useState<Tab>("details");

	// details form
	const [details, setDetails] = useState({ ar: "", en: "", abbreviation: "" });
	const [detailsError, setDetailsError] = useState<string | null>(null);
	const [detailsSaved, setDetailsSaved] = useState(false);
	const [saving, setSaving] = useState(false);

	// specializations
	const [specEdit, setSpecEdit] = useState<SpecializationEdit | null>(null);
	const [pendingDelete, setPendingDelete] = useState<SpecializationUsage | null>(null);
	const [specError, setSpecError] = useState<string | null>(null);

	// departments
	const [deptEdit, setDeptEdit] = useState<DepartmentEdit | null>(null);
	const [pendingDeptDelete, setPendingDeptDelete] = useState<DepartmentUsage | null>(null);
	const [deptError, setDeptError] = useState<string | null>(null);

	// curriculums: the one being edited in place (null id adds one)
	const [curriculumEdit, setCurriculumEdit] = useState<{ id?: string } | null>(null);
	const [curriculumsReload, setCurriculumsReload] = useState(0);

	const load = useCallback(async () => {
		const row = await fetchFaculty(facultyId);
		setFaculty(row);
		setDetails({ ar: row.name.ar, en: row.name.en, abbreviation: row.abbreviation ?? "" });
		setFailed(false);
	}, [facultyId]);

	useEffect(() => {
		let cancelled = false;
		fetchFaculty(facultyId)
			.then((row) => {
				if (cancelled) return;
				setFaculty(row);
				setDetails({ ar: row.name.ar, en: row.name.en, abbreviation: row.abbreviation ?? "" });
				setFailed(false);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
		};
	}, [facultyId]);

	const saveDetails = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const ar = details.ar.trim();
		const en = details.en.trim();
		const abbreviation = details.abbreviation.trim().toUpperCase();
		if (!ar || !en) {
			setDetailsError("faculty.errors.namesRequired");
			return;
		}
		if (!/^[A-Z]{2}$/.test(abbreviation)) {
			setDetailsError("faculty.errors.abbreviationFormat");
			return;
		}
		setSaving(true);
		setDetailsError(null);
		setDetailsSaved(false);
		try {
			await updateFaculty(facultyId, { name: { ar, en }, abbreviation });
			await load();
			setDetailsSaved(true);
		} catch (err) {
			const code = conflictCode(err);
			setDetailsError(
				code === "NAME_TAKEN"
					? "faculty.errors.nameTaken"
					: code === "ABBREVIATION_TAKEN"
						? "faculty.errors.abbreviationTaken"
						: "common.saveFailed",
			);
		} finally {
			setSaving(false);
		}
	};

	const saveSpecialization = async (confirmOrphans: boolean) => {
		if (!specEdit) return;
		const name = { ar: specEdit.ar.trim(), en: specEdit.en.trim() };
		// both names: the English one prints on the results
		if (!name.ar || !name.en) {
			setSpecEdit({ ...specEdit, error: "specialization.errors.namesRequired" });
			return;
		}
		const departmentId = specEdit.departmentId || null;
		setSaving(true);
		try {
			if (specEdit.id) {
				// a move takes the specialization's students along
				const moved = specEdit.departmentId !== specEdit.was;
				await updateSpecialization(specEdit.id, { name, ...(moved ? { departmentId } : {}) }, confirmOrphans);
			} else {
				await createSpecialization(facultyId, name, departmentId);
			}
			setSpecEdit(null);
			await load();
		} catch (err) {
			const orphans = orphanedGradeCount(err);
			if (orphans !== null) {
				setSpecEdit({ ...specEdit, error: null, orphans });
				return;
			}
			const code = conflictCode(err);
			setSpecEdit({
				...specEdit,
				orphans: null,
				error:
					code === "NAME_TAKEN"
						? "specialization.errors.nameTaken"
						: code === "RESULTS_APPROVED"
							? "department.errors.moveLocked"
							: "common.saveFailed",
			});
		} finally {
			setSaving(false);
		}
	};

	const saveDepartment = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!deptEdit) return;
		const name = { ar: deptEdit.ar.trim(), en: deptEdit.en.trim() };
		// both names: the English one prints on the results
		if (!name.ar || !name.en) {
			setDeptEdit({ ...deptEdit, error: "department.errors.namesRequired" });
			return;
		}
		setSaving(true);
		try {
			if (deptEdit.id) await updateDepartment(deptEdit.id, name);
			else await createDepartment(facultyId, name);
			setDeptEdit(null);
			await load();
		} catch (err) {
			setDeptEdit({
				...deptEdit,
				error: conflictCode(err) === "NAME_TAKEN" ? "department.errors.nameTaken" : "common.saveFailed",
			});
		} finally {
			setSaving(false);
		}
	};

	const confirmDeptDelete = async () => {
		const target = pendingDeptDelete;
		setPendingDeptDelete(null);
		if (!target) return;
		try {
			await deleteDepartment(target.id);
			setDeptError(null);
			await load();
		} catch (err) {
			setDeptError(conflictCode(err) === "IN_USE" ? "department.errors.inUse" : "common.saveFailed");
		}
	};

	const confirmDelete = async () => {
		const target = pendingDelete;
		setPendingDelete(null);
		if (!target) return;
		try {
			await deleteSpecialization(target.id);
			setSpecError(null);
			await load();
		} catch (err) {
			setSpecError(conflictCode(err) === "IN_USE" ? "specialization.errors.inUse" : "common.saveFailed");
		}
	};

	if (failed) {
		return (
			<p role="alert" className="text-body-sm text-error">
				{t("common.loadFailed")}
			</p>
		);
	}
	if (!faculty) {
		return (
			<p role="status" className="text-body-md text-foreground">
				{t("common.loading")}
			</p>
		);
	}

	const hasDepartments = faculty.departments.length > 0;
	const departmentOf = (id: string | null) =>
		faculty.departments.find((d) => d.id === id)?.name[lang] ?? t("department.directlyUnderFaculty");
	const directSpecializations = faculty.specializations.filter((s) => s.departmentId === null).length;

	const deptColumns: Column<DepartmentUsage>[] = [
		{ key: "ar", header: t("department.nameAr"), render: (d) => d.name.ar },
		{ key: "en", header: t("department.nameEn"), render: (d) => <span dir="ltr">{d.name.en}</span> },
		{
			key: "specializations",
			header: t("faculty.columns.specializations"),
			render: (d) => <span dir="ltr">{d.specializationCount}</span>,
		},
		{ key: "students", header: t("faculty.columns.students"), render: (d) => <span dir="ltr">{d.studentCount}</span> },
		{
			key: "curriculums",
			header: t("faculty.columns.curriculums"),
			render: (d) => <span dir="ltr">{d.curriculumCount}</span>,
		},
		{
			key: "actions",
			header: t("common.actions"),
			render: (d) => (
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => setDeptEdit({ id: d.id, ar: d.name.ar, en: d.name.en, error: null })}
						aria-label={t("department.editFor", { name: d.name[lang] })}
						title={t("department.editFor", { name: d.name[lang] })}
						className="rounded-xs p-2 text-foreground transition-colors duration-150 ease-out hover:bg-background hover:text-primary-hover"
					>
						<PencilSquareIcon className="size-5" aria-hidden />
					</button>
					{/* only an unused department can go; the API refuses the rest too */}
					{d.specializationCount === 0 && d.studentCount === 0 && d.curriculumCount === 0 && (
						<DeleteButton
							label={t("common.deleteItem", { name: d.name[lang] })}
							onClick={() => setPendingDeptDelete(d)}
						/>
					)}
				</div>
			),
		},
	];

	const specColumns: Column<SpecializationUsage>[] = [
		{ key: "ar", header: t("specialization.nameAr"), render: (s) => s.name.ar },
		{ key: "en", header: t("specialization.nameEn"), render: (s) => <span dir="ltr">{s.name.en}</span> },
		...(hasDepartments
			? [
					{
						key: "department",
						header: t("department.label"),
						render: (s: SpecializationUsage) => departmentOf(s.departmentId),
					},
				]
			: []),
		{ key: "students", header: t("faculty.columns.students"), render: (s) => <span dir="ltr">{s.studentCount}</span> },
		{
			key: "curriculums",
			header: t("faculty.columns.curriculums"),
			render: (s) => <span dir="ltr">{s.curriculumCount}</span>,
		},
		{
			key: "actions",
			header: t("common.actions"),
			render: (s) => (
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() =>
							setSpecEdit({
								id: s.id,
								ar: s.name.ar,
								en: s.name.en,
								departmentId: s.departmentId ?? "",
								was: s.departmentId ?? "",
								error: null,
								orphans: null,
							})
						}
						aria-label={t("specialization.editFor", { name: s.name[lang] })}
						title={t("specialization.editFor", { name: s.name[lang] })}
						className="rounded-xs p-2 text-foreground transition-colors duration-150 ease-out hover:bg-background hover:text-primary-hover"
					>
						<PencilSquareIcon className="size-5" aria-hidden />
					</button>
					{/* only an unused specialization can go; the API refuses the rest too */}
					{s.studentCount === 0 && s.curriculumCount === 0 && (
						<DeleteButton
							label={t("common.deleteItem", { name: s.name[lang] })}
							onClick={() => setPendingDelete(s)}
						/>
					)}
				</div>
			),
		},
	];

	return (
		<div>
			{user?.role === "admin" && (
				<Link
					to="../view"
					relative="path"
					className="mb-6 inline-flex items-center gap-2 text-body-sm font-medium text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep"
				>
					{/* §20 — the arrow points back in either reading direction */}
					<ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
					{t("faculty.back")}
				</Link>
			)}

			<h1 className="mb-2 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">{faculty.name[lang]}</h1>
			<p className="mb-8 ps-4 text-body-sm text-foreground">
				<span dir="ltr">{faculty.abbreviation}</span>
				{" · "}
				{t("faculty.departmentCount", { count: faculty.departments.length })}
				{" · "}
				{t("faculty.specializationCount", { count: faculty.specializations.length })}
			</p>

			{/* §39 — the selected tab is marked by its state and weight, not colour alone */}
			<div role="tablist" aria-label={t("faculty.title")} className="mb-6 flex flex-wrap gap-2 border-b border-border">
				{TABS.map((id) => (
					<button
						key={id}
						type="button"
						role="tab"
						id={`faculty-tab-${id}`}
						aria-selected={tab === id}
						aria-controls={`faculty-panel-${id}`}
						onClick={() => setTab(id)}
						className={`-mb-px h-11 border-b-2 px-4 text-navigation transition-colors duration-200 ease-out ${
							tab === id
								? "border-primary font-semibold text-accent-deep"
								: "border-transparent text-foreground hover:text-primary-hover"
						}`}
					>
						{t(`faculty.tabs.${id}`)}
					</button>
				))}
			</div>

			<div role="tabpanel" id={`faculty-panel-${tab}`} aria-labelledby={`faculty-tab-${tab}`}>
				{tab === "details" && (
					<form noValidate onSubmit={(e) => void saveDetails(e)} className={`max-w-xl ${formCardClass}`}>
						<FormField id="facultyNameAr" label={t("faculty.fields.nameAr")}>
							<input
								id="facultyNameAr"
								type="text"
								value={details.ar}
								onChange={(e) => setDetails({ ...details, ar: e.target.value })}
								className={inputClass(false)}
							/>
						</FormField>
						<FormField id="facultyNameEn" label={t("faculty.fields.nameEn")}>
							<input
								id="facultyNameEn"
								type="text"
								dir="ltr"
								value={details.en}
								onChange={(e) => setDetails({ ...details, en: e.target.value })}
								className={inputClass(false)}
							/>
						</FormField>
						<FormField id="facultyAbbreviation" label={t("faculty.fields.abbreviation")}>
							<input
								id="facultyAbbreviation"
								type="text"
								dir="ltr"
								maxLength={2}
								value={details.abbreviation}
								onChange={(e) =>
									setDetails({ ...details, abbreviation: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })
								}
								className={inputClass(false)}
							/>
							<p className="text-body-sm text-primary-hover">{t("faculty.abbreviationHint")}</p>
						</FormField>
						{detailsSaved && (
							<p role="status" className="text-body-sm text-primary-hover">
								{t("common.saved")}
							</p>
						)}
						{detailsError && (
							<p role="alert" className="text-body-sm text-error">
								{t(detailsError)}
							</p>
						)}
						<button type="submit" disabled={saving} className={submitButtonClass}>
							{saving ? t("common.saving") : t("faculty.save")}
						</button>
					</form>
				)}

				{tab === "departments" && (
					<div className="flex flex-col gap-6">
						{/* what still sits outside a department in this faculty */}
						{hasDepartments && (faculty.studentsWithoutDepartment > 0 || directSpecializations > 0) && (
							<div className={`flex flex-col gap-2 ${cardClass}`}>
								<h2 className="text-heading-5 text-accent-deep">{t("faculty.missingDepartmentTitle")}</h2>
								{faculty.studentsWithoutDepartment > 0 && (
									<p className="text-body-md">
										{t("department.missingStudents", { count: faculty.studentsWithoutDepartment })}{" "}
										<Link
											to="/dashboards/grades/students/list"
											className="font-medium text-primary-hover underline-offset-4 hover:text-accent-deep hover:underline"
										>
											{t("faculty.goToStudents")}
										</Link>
									</p>
								)}
								{directSpecializations > 0 && (
									<p className="text-body-md">
										{t("department.directSpecializations", { count: directSpecializations })}{" "}
										<button
											type="button"
											onClick={() => setTab("specializations")}
											className="font-medium text-primary-hover underline-offset-4 hover:text-accent-deep hover:underline"
										>
											{t("faculty.goToSpecializations")}
										</button>
									</p>
								)}
							</div>
						)}

						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={() => setDeptEdit({ id: null, ar: "", en: "", error: null })}
								className={submitButtonClass}
							>
								<PlusIcon className="me-2 size-5" aria-hidden />
								{t("department.add")}
							</button>
							<p className="text-body-sm text-primary-hover">{t("department.deleteHint")}</p>
						</div>

						{deptError && (
							<p role="alert" className="text-body-sm text-error">
								{t(deptError)}
							</p>
						)}

						<DataTable
							columns={deptColumns}
							rows={faculty.departments}
							getRowId={(d) => d.id}
							emptyText={t("faculty.noDepartments")}
						/>
					</div>
				)}

				{tab === "specializations" && (
					<div className="flex flex-col gap-6">
						{/* what still needs a specialization in this faculty */}
						{faculty.specializations.length > 0 && (faculty.studentsWithout > 0 || faculty.majorsWithout > 0) && (
							<div className={`flex flex-col gap-2 ${cardClass}`}>
								<h2 className="text-heading-5 text-accent-deep">{t("faculty.missingTitle")}</h2>
								{faculty.studentsWithout > 0 && (
									<p className="text-body-md">
										{t("specialization.missingStudents", { count: faculty.studentsWithout })}{" "}
										<Link
											to="/dashboards/grades/students/list"
											className="font-medium text-primary-hover underline-offset-4 hover:text-accent-deep hover:underline"
										>
											{t("faculty.goToStudents")}
										</Link>
									</p>
								)}
								{faculty.majorsWithout > 0 && (
									<p className="text-body-md">
										{t("specialization.missingMajors", { count: faculty.majorsWithout })}{" "}
										<button
											type="button"
											onClick={() => setTab("curriculums")}
											className="font-medium text-primary-hover underline-offset-4 hover:text-accent-deep hover:underline"
										>
											{t("faculty.goToCurriculums")}
										</button>
									</p>
								)}
							</div>
						)}

						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={() =>
									setSpecEdit({ id: null, ar: "", en: "", departmentId: "", was: "", error: null, orphans: null })
								}
								className={submitButtonClass}
							>
								<PlusIcon className="me-2 size-5" aria-hidden />
								{t("specialization.add")}
							</button>
							<p className="text-body-sm text-primary-hover">{t("specialization.deleteHint")}</p>
						</div>

						{specError && (
							<p role="alert" className="text-body-sm text-error">
								{t(specError)}
							</p>
						)}

						<DataTable
							columns={specColumns}
							rows={faculty.specializations}
							getRowId={(s) => s.id}
							emptyText={t("faculty.noSpecializations")}
						/>
					</div>
				)}

				{tab === "curriculums" && (
					<CurriculumList
						facultyId={facultyId}
						reloadKey={curriculumsReload}
						onAdd={() => setCurriculumEdit({})}
						onEdit={(c) => setCurriculumEdit({ id: c.id })}
					/>
				)}
			</div>

			{specEdit && (
				<Modal
					title={specEdit.id ? t("specialization.edit") : t("specialization.add")}
					onClose={() => setSpecEdit(null)}
				>
					<form
						noValidate
						onSubmit={(e) => {
							e.preventDefault();
							void saveSpecialization(specEdit.orphans !== null);
						}}
						className="flex flex-col gap-6"
					>
						<FormField id="specNameAr" label={t("specialization.nameAr")}>
							<input
								id="specNameAr"
								type="text"
								value={specEdit.ar}
								onChange={(e) => setSpecEdit({ ...specEdit, ar: e.target.value, error: null })}
								className={inputClass(false)}
							/>
						</FormField>
						<FormField id="specNameEn" label={t("specialization.nameEn")}>
							<input
								id="specNameEn"
								type="text"
								dir="ltr"
								value={specEdit.en}
								onChange={(e) => setSpecEdit({ ...specEdit, en: e.target.value, error: null })}
								className={inputClass(false)}
							/>
							<p className="text-body-sm text-primary-hover">{t("specialization.nameEnHint")}</p>
						</FormField>
						{hasDepartments && (
							<FormField id="specDepartment" label={t("department.label")}>
								<select
									id="specDepartment"
									value={specEdit.departmentId}
									onChange={(e) =>
										setSpecEdit({ ...specEdit, departmentId: e.target.value, error: null, orphans: null })
									}
									className={inputClass(false)}
								>
									<option value="">{t("department.directlyUnderFaculty")}</option>
									{faculty.departments.map((d) => (
										<option key={d.id} value={d.id}>
											{d.name[lang]}
										</option>
									))}
								</select>
								{specEdit.id && specEdit.departmentId !== specEdit.was && (
									<p className="text-body-sm text-primary-hover">{t("department.moveHint")}</p>
								)}
							</FormField>
						)}
						{specEdit.orphans !== null && (
							<p role="alert" className="text-body-md">
								{t("department.moveOrphans", { count: specEdit.orphans })}
							</p>
						)}
						{specEdit.error && (
							<p role="alert" className="text-body-sm text-error">
								{t(specEdit.error)}
							</p>
						)}
						<div className="flex justify-end gap-3">
							<button type="button" onClick={() => setSpecEdit(null)} className={secondaryButtonClass}>
								{t("common.cancel")}
							</button>
							<button type="submit" disabled={saving} className={submitButtonClass}>
								{saving
									? t("common.saving")
									: specEdit.orphans !== null
										? t("orphanedGrades.confirm")
										: t("specialization.save")}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{deptEdit && (
				<Modal title={deptEdit.id ? t("department.edit") : t("department.add")} onClose={() => setDeptEdit(null)}>
					<form noValidate onSubmit={(e) => void saveDepartment(e)} className="flex flex-col gap-6">
						<FormField id="deptNameAr" label={t("department.nameAr")}>
							<input
								id="deptNameAr"
								type="text"
								value={deptEdit.ar}
								onChange={(e) => setDeptEdit({ ...deptEdit, ar: e.target.value, error: null })}
								className={inputClass(false)}
							/>
						</FormField>
						<FormField id="deptNameEn" label={t("department.nameEn")}>
							<input
								id="deptNameEn"
								type="text"
								dir="ltr"
								value={deptEdit.en}
								onChange={(e) => setDeptEdit({ ...deptEdit, en: e.target.value, error: null })}
								className={inputClass(false)}
							/>
							<p className="text-body-sm text-primary-hover">{t("department.nameEnHint")}</p>
						</FormField>
						{deptEdit.error && (
							<p role="alert" className="text-body-sm text-error">
								{t(deptEdit.error)}
							</p>
						)}
						<div className="flex justify-end gap-3">
							<button type="button" onClick={() => setDeptEdit(null)} className={secondaryButtonClass}>
								{t("common.cancel")}
							</button>
							<button type="submit" disabled={saving} className={submitButtonClass}>
								{saving ? t("common.saving") : t("department.save")}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{curriculumEdit && (
				<Modal
					wide
					title={curriculumEdit.id ? t("curriculumEntry.editTitle") : t("curriculumEntry.title")}
					onClose={() => setCurriculumEdit(null)}
				>
					<CurriculumEntry
						curriculumId={curriculumEdit.id}
						facultyId={facultyId}
						onSaved={() => {
							setCurriculumEdit(null);
							setCurriculumsReload((k) => k + 1);
							void load();
						}}
					/>
				</Modal>
			)}

			<ConfirmDialog
				open={pendingDelete !== null}
				title={t("specialization.deleteTitle")}
				message={t("specialization.deleteMessage", { name: pendingDelete?.name[lang] ?? "" })}
				confirmLabel={t("common.delete")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void confirmDelete()}
				onCancel={() => setPendingDelete(null)}
			/>

			<ConfirmDialog
				open={pendingDeptDelete !== null}
				title={t("department.deleteTitle")}
				message={t("department.deleteMessage", { name: pendingDeptDelete?.name[lang] ?? "" })}
				confirmLabel={t("common.delete")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => void confirmDeptDelete()}
				onCancel={() => setPendingDeptDelete(null)}
			/>

		</div>
	);
};

export default FacultyDetails;
