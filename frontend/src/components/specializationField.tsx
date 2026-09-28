import { useTranslation } from "react-i18next";
import FormField from "./formField";
import { inputClass } from "../styles/form";
import type { Faculty } from "../types/faculty";

type SpecializationFieldProps = {
	id?: string;
	faculties: Faculty[];
	facultyId: string;
	value: string;
	onChange: (value: string) => void;
	/** Offers "no specialization" (students); a major must name one. */
	allowNone: boolean;
	/** An i18n key. */
	error?: string;
	/** Shown under the field, e.g. why it's asked for. */
	hint?: string;
};

/** Picks one of the faculty's specializations in a form. */
const SpecializationField = ({
	id = "specializationId",
	faculties,
	facultyId,
	value,
	onChange,
	allowNone,
	error,
	hint,
}: SpecializationFieldProps) => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const specs = faculties.find((f) => f.id === facultyId)?.specializations ?? [];

	return (
		<FormField id={id} label={t("specialization.label")} error={error}>
			<select
				id={id}
				value={value}
				disabled={!facultyId}
				onChange={(e) => onChange(e.target.value)}
				aria-invalid={!!error}
				className={`${inputClass(!!error)} disabled:bg-background disabled:text-primary-hover`}
			>
				<option value="" disabled={!allowNone}>
					{!facultyId
						? t("specialization.chooseFacultyFirst")
						: allowNone
							? t("specialization.none")
							: t("specialization.choose")}
				</option>
				{specs.map((spec) => (
					<option key={spec.id} value={spec.id}>
						{spec.name[lang]}
					</option>
				))}
			</select>
			{facultyId && !specs.length && (
				<p className="text-body-sm text-primary-hover">{t("specialization.facultyHasNone")}</p>
			)}
			{hint && <p className="text-body-sm text-primary-hover">{hint}</p>}
		</FormField>
	);
};

export default SpecializationField;
