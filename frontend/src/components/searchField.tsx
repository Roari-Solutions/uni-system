import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

type SearchFieldProps = {
	id: string;
	label: string;
	placeholder: string;
	/** The token the list is filtered by; the field reports it once typing settles. */
	value: string;
	onChange: (value: string) => void;
};

// long enough that a request isn't sent per keystroke, short enough to feel live
const DEBOUNCE_MS = 300;

/** The search box above a list; it filters the rows the API returns. */
const SearchField = ({ id, label, placeholder, value, onChange }: SearchFieldProps) => {
	const { t } = useTranslation();
	const [draft, setDraft] = useState(value);

	// the parent owns the committed token; this only paces how often it changes
	useEffect(() => {
		if (draft === value) return;

		const timer = setTimeout(() => onChange(draft), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [draft, value, onChange]);

	return (
		<div className="flex w-full flex-col gap-2 sm:w-80">
			<label htmlFor={id} className="text-body-sm font-medium text-accent-deep">
				{label}
			</label>
			<div className="relative">
				{/* §20 — the icon sits on the reading-start side in both directions */}
				<MagnifyingGlassIcon
					className="pointer-events-none absolute inset-y-0 start-4 my-auto size-5 text-primary-hover"
					aria-hidden
				/>
				<input
					id={id}
					type="search"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder={placeholder}
					className="h-12 w-full rounded-sm border border-border bg-surface ps-12 pe-12 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25"
				/>
				{draft && (
					<button
						type="button"
						onClick={() => setDraft("")}
						aria-label={t("common.clearSearch")}
						className="absolute inset-y-0 end-3 my-auto size-7 rounded-xs p-1 text-primary-hover transition-colors duration-150 ease-out hover:text-accent-deep"
					>
						<XMarkIcon className="size-5" aria-hidden />
					</button>
				)}
			</div>
		</div>
	);
};

export default SearchField;
