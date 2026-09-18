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
		<div className="flex w-full flex-col gap-2 sm:w-64">
			<label htmlFor={id} className="text-body-sm font-medium text-accent-deep">
				{label}
			</label>
			<select
				id={id}
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(e.target.value)}
				className="h-12 w-full rounded-sm border border-border bg-surface px-4 text-body-md text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background disabled:text-primary-hover"
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
