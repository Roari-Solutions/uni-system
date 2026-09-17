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
			<MagnifyingGlassIcon className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-palette-5" />
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
				className={`w-full rounded-md border bg-white py-2 pe-3 ps-10 text-palette-6 outline-none focus:ring-2 focus:ring-palette-4 ${
					invalid ? "border-red-600" : "border-palette-2"
				}`}
			/>

			{open && query.trim() !== "" && (
				<ul
					id={listId}
					role="listbox"
					className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-palette-2 bg-white py-1 text-palette-6"
				>
					{options.length === 0 ? (
						<li className="px-3 py-2 text-sm">{noResultsText}</li>
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
								className="cursor-pointer px-3 py-2 hover:bg-palette-1"
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
