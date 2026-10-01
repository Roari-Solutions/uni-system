import { useTranslation } from "react-i18next";
import FormField from "./formField";
import { inputClass } from "../styles/form";
import type { Faculty } from "../types/faculty";

type DepartmentFieldProps = {
	id?: string;
	faculties: Faculty[];
	facultyId: string;
	value: string;
	onChange: (value: string) => void;
	/** Set by the chosen specialization, so it can't be picked on its own. */
	locked?: boolean;
	/** An i18n key. */
	error?: string;
	/** Shown under the field, e.g. why it's asked for. */
	hint?: string;
};

/**
 * Picks one of the faculty's departments in a form, or none. A faculty without
 * departments shows no field.
 */
const DepartmentField = ({
	id = "departmentId",
	faculties,
	facultyId,
	value,
	onChange,
	locked,
	error,
	hint,
}: DepartmentFieldProps) => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const departments = faculties.find((f) => f.id === facultyId)?.departments ?? [];
	if (!departments.length) return null;

	return (
		<FormField id={id} label={t("department.label")} error={error}>
			<select
				id={id}
				value={value}
				disabled={locked}
				onChange={(e) => onChange(e.target.value)}
				aria-invalid={!!error}
				className={`${inputClass(!!error)} disabled:bg-background disabled:text-primary-hover`}
			>
				<option value="">{t("department.none")}</option>
				{departments.map((department) => (
					<option key={department.id} value={department.id}>
						{department.name[lang]}
					</option>
				))}
			</select>
			{hint && <p className="text-body-sm text-primary-hover">{hint}</p>}
		</FormField>
	);
};

export default DepartmentField;
