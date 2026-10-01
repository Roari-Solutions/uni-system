import { useTranslation } from "react-i18next";
import FilterSelect from "./filterSelect";
import type { Faculty } from "../types/faculty";
import { WITHOUT_DEPARTMENT } from "../types/faculty";
import { departmentChoices } from "../utils/specializations";

type DepartmentFilterProps = {
	id?: string;
	faculties: Faculty[];
	/** The faculty chosen in the same filter bar; "" offers every faculty's. */
	facultyId: string;
	value: string;
	onChange: (value: string) => void;
};

/**
 * Narrows a list to one department, or to the rows outside every department
 * (to find what still needs one). A faculty without departments shows no filter.
 */
const DepartmentFilter = ({
	id = "departmentFilter",
	faculties,
	facultyId,
	value,
	onChange,
}: DepartmentFilterProps) => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const choices = departmentChoices(faculties, facultyId, lang);
	if (!choices.length) return null;

	return (
		<FilterSelect
			id={id}
			label={t("department.label")}
			value={value}
			onChange={onChange}
			allLabel={t("department.all")}
			options={[...choices, { value: WITHOUT_DEPARTMENT, label: t("department.without") }]}
		/>
	);
};

export default DepartmentFilter;
