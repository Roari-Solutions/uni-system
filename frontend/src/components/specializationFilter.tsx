import { useTranslation } from "react-i18next";
import FilterSelect from "./filterSelect";
import type { Faculty } from "../types/faculty";
import { WITHOUT_SPECIALIZATION } from "../types/faculty";
import { specializationChoices } from "../utils/specializations";

type SpecializationFilterProps = {
	id?: string;
	faculties: Faculty[];
	/** The faculty chosen in the same filter bar; "" offers every faculty's. */
	facultyId: string;
	value: string;
	onChange: (value: string) => void;
};

/**
 * Narrows a list to one specialization, or to the rows without one (to find
 * what still needs one). A faculty without specializations shows no filter.
 */
const SpecializationFilter = ({
	id = "specializationFilter",
	faculties,
	facultyId,
	value,
	onChange,
}: SpecializationFilterProps) => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const choices = specializationChoices(faculties, facultyId, lang);
	if (!choices.length) return null;

	return (
		<FilterSelect
			id={id}
			label={t("specialization.label")}
			value={value}
			onChange={onChange}
			allLabel={t("specialization.all")}
			options={[...choices, { value: WITHOUT_SPECIALIZATION, label: t("specialization.without") }]}
		/>
	);
};

export default SpecializationFilter;
