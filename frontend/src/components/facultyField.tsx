import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import FormField from "./formField";
import SearchSelect, { type SearchOption } from "./searchSelect";
import useFaculties from "../hooks/useFaculties";
import { inputClass } from "../styles/form";

type FacultyFieldProps = {
	label: string;
	placeholder: string;
	noResultsText: string;
	value: string;
	onChange: (facultyId: string) => void;
	error?: string;
	/** Locks the field with a reason of the caller's own, e.g. a curriculum every faculty offers. */
	fixed?: { note: string; text: string };
};

/**
 * The faculty picker shared by the entry forms.
 *
 * Admins search the full list. A data-entry employee belongs to exactly one
 * faculty, so the field shows that faculty and is not editable — the value is
 * reported upward as soon as it is known.
 */
const FacultyField = ({
	label,
	placeholder,
	noResultsText,
	value,
	onChange,
	error,
	fixed,
}: FacultyFieldProps) => {
	const { t, i18n } = useTranslation();
	const lang = i18n.language === "ar" ? "ar" : "en";
	const { faculties, locked, lockedFaculty, lockedFacultyId } = useFaculties();
	const [query, setQuery] = useState("");

	// a locked caller never picks: adopt their faculty as soon as it is known
	useEffect(() => {
		if (locked && lockedFacultyId && value !== lockedFacultyId) {
			onChange(lockedFacultyId);
		}
	}, [locked, lockedFacultyId, value, onChange]);

	if (fixed) {
		return (
			<FormField id="faculty" label={label} error={error}>
				<input
					id="faculty"
					type="text"
					readOnly
					disabled
					value={fixed.text}
					className={`${inputClass(false)} disabled:bg-background disabled:text-primary-hover`}
				/>
				<p className="text-body-sm text-primary-hover">{fixed.note}</p>
			</FormField>
		);
	}

	if (locked) {
		return (
			<FormField id="faculty" label={label} error={error}>
				<input
					id="faculty"
					type="text"
					readOnly
					disabled
					value={lockedFaculty ? lockedFaculty.name[lang] : t("common.loading")}
					className={`${inputClass(false)} disabled:bg-background disabled:text-primary-hover`}
				/>
				<p className="text-body-sm text-primary-hover">{t("common.facultyLocked")}</p>
			</FormField>
		);
	}

	const options: SearchOption[] = faculties
		.filter((faculty) =>
			query.trim() === ""
				? true
				: faculty.name[lang].toLowerCase().includes(query.trim().toLowerCase()),
		)
		.map((faculty) => ({ id: faculty.id, label: faculty.name[lang] }));

	return (
		<FormField id="faculty" label={label} error={error}>
			<SearchSelect
				id="faculty"
				query={query}
				onQueryChange={(next) => {
					setQuery(next);
					// typing invalidates any previous selection
					onChange("");
				}}
				options={options}
				onSelect={(option) => {
					setQuery(option.label);
					onChange(option.id);
				}}
				placeholder={placeholder}
				noResultsText={noResultsText}
				invalid={!!error}
			/>
		</FormField>
	);
};

export default FacultyField;
