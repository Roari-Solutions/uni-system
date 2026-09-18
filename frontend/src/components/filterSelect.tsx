export type FilterOption = {
	value: string;
	label: string;
};

type FilterSelectProps = {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	// label of the empty option that disables the filter
	allLabel: string;
	options: FilterOption[];
	// a locked filter keeps its value and drops the "all" option
	disabled?: boolean;
};

const FilterSelect = ({
	id,
	label,
	value,
	onChange,
	allLabel,
	options,
	disabled,
}: FilterSelectProps) => {
	return (
		<div className="flex w-full flex-col gap-1.5 sm:w-64">
			<label htmlFor={id} className="font-medium text-palette-6">
				{label}
			</label>
			<select
				id={id}
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(e.target.value)}
				className="w-full rounded-md border border-palette-2 bg-white px-3 py-2 text-palette-6 outline-none focus:ring-2 focus:ring-palette-4 disabled:bg-palette-1 disabled:text-palette-5"
			>
				{!disabled && <option value="">{allLabel}</option>}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
};

export default FilterSelect;
