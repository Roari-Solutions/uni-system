import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import SearchSelect, { type SearchOption } from "../../../components/searchSelect";
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

const inputClass = (invalid: boolean) =>
	`w-full rounded-md border bg-white px-3 py-2 text-palette-6 outline-none focus:ring-2 focus:ring-palette-4 ${
		invalid ? "border-red-600" : "border-palette-2"
	}`;

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
				className="flex flex-col gap-5 rounded-lg border border-palette-2 bg-white p-6"
			>
				<Field id="name" label={t("curriculumEntry.name")} error={errors.name?.[0]}>
					<input
						id="name"
						type="text"
						value={form.name}
						onChange={(e) => setField("name", e.target.value)}
						aria-invalid={!!errors.name}
						className={inputClass(!!errors.name)}
					/>
				</Field>

				<Field id="faculty" label={t("curriculumEntry.faculty")} error={errors.facultyId?.[0]}>
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
				</Field>

				<Field
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
				</Field>

				<Field
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
				</Field>

				<button
					type="submit"
					className="self-start rounded-md bg-palette-6 px-5 py-2 font-medium text-palette-1 hover:bg-palette-5"
				>
					{t("curriculumEntry.submit")}
				</button>
			</form>
		</div>
	);
};

type FieldProps = {
	id: string;
	label: string;
	error?: string;
	children: ReactNode;
};

const Field = ({ id, label, error, children }: FieldProps) => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className="font-medium text-palette-6">
				{label}
			</label>
			{children}
			{error && <p className="text-sm text-red-600">{t(error)}</p>}
		</div>
	);
};

export default CurriculumEntry;
