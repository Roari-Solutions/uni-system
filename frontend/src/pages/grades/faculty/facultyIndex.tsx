import { Link, Navigate, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { EyeIcon } from "@heroicons/react/24/outline";
import PageBackdrop from "../../../components/pageBackdrop";
import type { Column } from "../../../components/dataTable";
import DataTable from "../../../components/paginatedDataTable";
import useFaculties from "../../../hooks/useFaculties";
import type { Faculty } from "../../../types/faculty";
import { smallSecondaryButtonClass } from "../../../styles/form";

/**
 * The faculty tab's way in: an admin picks a faculty; a data-entry employee
 * belongs to one, so they go straight to it.
 */
const FacultyIndex = () => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const navigate = useNavigate();
	const { faculties, loading, locked, lockedFacultyId } = useFaculties();

	if (locked && lockedFacultyId) return <Navigate to={`../${lockedFacultyId}`} relative="path" replace />;

	const columns: Column<Faculty>[] = [
		{ key: "name", header: t("faculty.columns.name"), render: (f) => f.name[lang] },
		{
			key: "abbreviation",
			header: t("faculty.columns.abbreviation"),
			render: (f) => <span dir="ltr">{f.abbreviation ?? "—"}</span>,
		},
		{
			key: "departments",
			header: t("faculty.columns.departments"),
			render: (f) =>
				f.departments.length
					? f.departments.map((d) => d.name[lang]).join("، ")
					: t("faculty.noDepartments"),
		},
		{
			key: "specializations",
			header: t("faculty.columns.specializations"),
			render: (f) =>
				f.specializations.length
					? f.specializations.map((s) => s.name[lang]).join("، ")
					: t("faculty.noSpecializations"),
		},
		{
			key: "actions",
			header: t("common.actions"),
			render: (f) => (
				<Link
					to={`../${f.id}`}
					relative="path"
					aria-label={t("faculty.openFor", { name: f.name[lang] })}
					className={`whitespace-nowrap ${smallSecondaryButtonClass}`}
				>
					<EyeIcon className="size-4" aria-hidden />
					{t("faculty.open")}
				</Link>
			),
		},
	];

		return (
		<div className="relative isolate flex h-full min-h-0 flex-col">
			<PageBackdrop />
			<h1 className="mb-4 shrink-0 border-s-3 border-primary ps-4 text-heading-3 text-accent-deep">
				{t("faculty.title")}
			</h1>
			<DataTable
				paginated={false}
				columns={columns}
				rows={faculties}
				getRowId={(f) => f.id}
				onRowClick={(f) => void navigate(`../${f.id}`, { relative: "path" })}
				emptyText={loading ? t("common.loading") : t("faculty.empty")}
			/>
		</div>
	);


	
};

export default FacultyIndex;
