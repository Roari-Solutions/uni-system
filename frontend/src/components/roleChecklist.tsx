import { useTranslation } from "react-i18next";
import type { AssignableRole } from "../types/user";

type RoleChecklistProps = {
	id: string;
	label: string;
	roles: AssignableRole[];
	value: string[];
	onChange: (roles: string[]) => void;
	// i18n key of the error message
	error?: string;
	disabled?: boolean;
	hint?: string;
};

/** Picks one or more roles; a user may hold several (e.g. data entry and site content). */
const RoleChecklist = ({ id, label, roles, value, onChange, error, disabled, hint }: RoleChecklistProps) => {
	const { t } = useTranslation();

	const toggle = (name: string, checked: boolean) =>
		onChange(checked ? [...value, name] : value.filter((r) => r !== name));

	return (
		<fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-error` : undefined}>
			<legend className="mb-2 text-body-sm font-medium text-accent-deep">{label}</legend>
			{roles.map((role) => (
				<label
					key={role.id}
					className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-4 text-body-md text-foreground has-[:checked]:border-primary has-[:checked]:bg-background has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
				>
					<input
						type="checkbox"
						name={id}
						value={role.name}
						checked={value.includes(role.name)}
						disabled={disabled}
						onChange={(e) => toggle(role.name, e.target.checked)}
						className="size-4 accent-primary"
					/>
					{t(`roles.${role.name}`)}
				</label>
			))}
			{hint && <p className="text-body-sm text-primary-hover">{hint}</p>}
			{/* §39 — the message carries the meaning, not the colour alone */}
			{error && (
				<p id={`${id}-error`} className="text-body-sm text-error">
					{t(error)}
				</p>
			)}
		</fieldset>
	);
};

export default RoleChecklist;
