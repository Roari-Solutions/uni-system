import { Link, Navigate, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { EyeIcon } from "@heroicons/react/24/outline";
import PageBackdrop from "../../../components/pageBackdrop";
import type { Column } from "../../../components/dataTable";
import DataTable from "../../../components/paginatedDataTable";
import useFaculties from "../../../hooks/useFaculties";
import type { Faculty } from "../../../types/faculty";
import { smallSecondaryButtonClass } from "../../../styles/form";
import FillPage from "../../../components/fillPage";

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
			render: (f) =>
				f.abbreviation ? (
					<span
						dir="ltr"
						className="inline-block rounded-md bg-quote/40 px-2.5 py-0.5 text-body-sm font-semibold text-muted-foreground">
						{f.abbreviation}
					</span>
				) : (
					<span dir="ltr">—</span>
				),
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
		<FillPage>
			<PageBackdrop />
			<h1 className="mb-4 shrink-0 border-s-3 border-accent ps-4 text-heading-4 text-muted-foreground md:text-heading-3">
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
		</FillPage>
	);
	
};

export default FacultyIndex;
