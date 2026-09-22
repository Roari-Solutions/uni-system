import { useId, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export type SearchOption = {
	id: string;
	label: string;
};

type SearchSelectProps = {
	id?: string;
	query: string;
	onQueryChange: (query: string) => void;
	// results for the current query — supplied by the parent (e.g. from an API call)
	options: SearchOption[];
	onSelect: (option: SearchOption) => void;
	placeholder?: string;
	noResultsText: string;
	invalid?: boolean;
};

const SearchSelect = ({
	id,
	query,
	onQueryChange,
	options,
	onSelect,
	placeholder,
	noResultsText,
	invalid,
}: SearchSelectProps) => {
	const [open, setOpen] = useState(false);
	const listId = useId();

	const select = (option: SearchOption) => {
		onSelect(option);
		setOpen(false);
	};

	return (
		<div className="relative">
			<MagnifyingGlassIcon className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-primary-hover" />
			<input
				id={id}
				type="text"
				role="combobox"
				aria-expanded={open}
				aria-controls={listId}
				aria-autocomplete="list"
				aria-invalid={invalid}
				autoComplete="off"
				value={query}
				placeholder={placeholder}
				onChange={(e) => {
					onQueryChange(e.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onBlur={() => setOpen(false)}
				className={`h-12 w-full rounded-sm border bg-surface pe-4 ps-12 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 ${
					invalid ? "border-error" : "border-border"
				}`}
			/>

			{open && query.trim() !== "" && (
				<ul
					id={listId}
					role="listbox"
					className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-sm border border-border bg-surface py-2 text-foreground shadow-lg"
				>
					{options.length === 0 ? (
						<li className="px-4 py-2 text-body-sm">{noResultsText}</li>
					) : (
						options.map((option) => (
							<li
								key={option.id}
								role="option"
								aria-selected={false}
								// mousedown fires before the input's blur, so the click isn't lost
								onMouseDown={(e) => {
									e.preventDefault();
									select(option);
								}}
								className="cursor-pointer px-4 py-2 transition-colors duration-150 ease-out hover:bg-background"
							>
								{option.label}
							</li>
						))
					)}
				</ul>
			)}
		</div>
	);
};

export default SearchSelect;
