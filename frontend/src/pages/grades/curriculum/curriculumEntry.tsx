import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import FormField from "../../../components/formField";
import SearchSelect, { type SearchOption } from "../../../components/searchSelect";
import { formCardClass, inputClass, submitButtonClass } from "../../../styles/form";
import { ACADEMIC_YEARS } from "../../../utils/academicYears";

// messages are i18n keys, translated when rendered
const curriculumSchema = z.object({
	name: z.string().trim().min(1, "curriculumEntry.errors.required"),
	facultyId: z.string().min(1, "curriculumEntry.errors.required"),
	abbreviation: z
		.string()
		.trim()
		.min(1, "curriculumEntry.errors.required")
		.max(10, "curriculumEntry.errors.abbreviationTooLong"),
	academicYear: z.string().min(1, "curriculumEntry.errors.required"),
});

type CurriculumForm = z.infer<typeof curriculumSchema>;
type FormErrors = Partial<Record<keyof CurriculumForm, string[]>>;

const EMPTY_FORM: CurriculumForm = {
	name: "",
	facultyId: "",
	abbreviation: "",
	academicYear: "",
};

const CurriculumEntry = () => {
	const { t } = useTranslation();

	const [form, setForm] = useState<CurriculumForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<FormErrors>({});
	const [facultyQuery, setFacultyQuery] = useState("");
	// TODO: fill from the faculties search API using facultyQuery
	const facultyOptions: SearchOption[] = [];

	const setField = <K extends keyof CurriculumForm>(key: K, value: CurriculumForm[K]) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const result = curriculumSchema.safeParse(form);
		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		setErrors({});
		// TODO: send result.data to the API
	};

	return (
		<div className="mx-auto max-w-xl">
			<h1 className="mb-6 text-2xl font-semibold text-palette-6">
				{t("curriculumEntry.title")}
			</h1>

			<form
				noValidate
				onSubmit={handleSubmit}
				className={formCardClass}
			>
				<FormField id="name" label={t("curriculumEntry.name")} error={errors.name?.[0]}>
					<input
						id="name"
						type="text"
						value={form.name}
						onChange={(e) => setField("name", e.target.value)}
						aria-invalid={!!errors.name}
						className={inputClass(!!errors.name)}
					/>
				</FormField>

				<FormField id="faculty" label={t("curriculumEntry.faculty")} error={errors.facultyId?.[0]}>
					<SearchSelect
						id="faculty"
						query={facultyQuery}
						onQueryChange={(query) => {
							setFacultyQuery(query);
							// typing invalidates any previous selection
							setField("facultyId", "");
						}}
						options={facultyOptions}
						onSelect={(option) => {
							setFacultyQuery(option.label);
							setField("facultyId", option.id);
						}}
						placeholder={t("curriculumEntry.facultyPlaceholder")}
						noResultsText={t("curriculumEntry.noResults")}
						invalid={!!errors.facultyId}
					/>
				</FormField>

				<FormField
					id="abbreviation"
					label={t("curriculumEntry.abbreviation")}
					error={errors.abbreviation?.[0]}
				>
					<input
						id="abbreviation"
						type="text"
						value={form.abbreviation}
						onChange={(e) => setField("abbreviation", e.target.value)}
						aria-invalid={!!errors.abbreviation}
						className={inputClass(!!errors.abbreviation)}
					/>
				</FormField>

				<FormField
					id="academicYear"
					label={t("curriculumEntry.academicYear")}
					error={errors.academicYear?.[0]}
				>
					<select
						id="academicYear"
						value={form.academicYear}
						onChange={(e) => setField("academicYear", e.target.value)}
						aria-invalid={!!errors.academicYear}
						className={inputClass(!!errors.academicYear)}
					>
						<option value="" disabled>
							{t("curriculumEntry.selectYear")}
						</option>
						{ACADEMIC_YEARS.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</FormField>

				<button
					type="submit"
					className={submitButtonClass}
				>
					{t("curriculumEntry.submit")}
				</button>
			</form>
		</div>
	);
};

export default CurriculumEntry;
