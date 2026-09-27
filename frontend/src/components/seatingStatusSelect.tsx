import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import {
	XCircleIcon,
	ExclamationTriangleIcon,
	CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { SEATING_STATUSES, type SeatingStatus } from "../types/grade";

/** Icon and colour per status; §39 — the icon and label carry the meaning, not the colour alone. */
const STATUS_STYLE: Record<SeatingStatus, { icon: typeof CheckCircleIcon; text: string }> = {
	attended: { icon: CheckCircleIcon, text: "text-success" },
	cheating: { icon: ExclamationTriangleIcon, text: "text-error" },
	absent: { icon: XCircleIcon, text: "text-foreground" },
};

type SeatingStatusSelectProps = {
	id: string;
	value: SeatingStatus;
	onChange: (next: SeatingStatus) => void;
	/** Names the student this row belongs to, for screen readers. */
	label: string;
	disabled?: boolean;
	/** Lets a sheet treat Enter here like Enter in the row's mark field. */
	onKeyDown?: (e: KeyboardEvent<HTMLSelectElement>) => void;
};

/**
 * Picks how a student sat an exam. Collapsed it shows only the chosen status;
 * the three options appear on open.
 */
const SeatingStatusSelect = ({
	id,
	value,
	onChange,
	label,
	disabled,
	onKeyDown,
}: SeatingStatusSelectProps) => {
	const { t } = useTranslation();

	return (
		<select
			id={id}
			value={value}
			disabled={disabled}
			onChange={(e) => onChange(e.target.value as SeatingStatus)}
			onKeyDown={onKeyDown}
			aria-label={label}
			// §31 sizing, cut to the 36px row height the sheet's controls use
			className={`h-9 rounded-sm border border-border bg-surface px-3 text-body-sm font-medium outline-none focus:border-primary focus:ring-3 focus:ring-primary/25 disabled:bg-background disabled:text-primary-hover ${STATUS_STYLE[value].text}`}
		>
			{SEATING_STATUSES.map((status) => (
				<option key={status} value={status} className="text-foreground">
					{t(`seatingStatuses.${status}`)}
				</option>
			))}
		</select>
	);
};

/** The same status as read-only text, for rows that are already saved. */
export const SeatingStatusTag = ({ status }: { status: SeatingStatus | null }) => {
	const { t } = useTranslation();
	if (status === null) return <span className="text-primary-hover">—</span>;

	const { icon: Icon, text } = STATUS_STYLE[status];
	return (
		<span className={`inline-flex items-center gap-1 whitespace-nowrap ${text}`}>
			<Icon className="size-4 shrink-0" aria-hidden />
			{t(`seatingStatuses.${status}`)}
		</span>
	);
};

export default SeatingStatusSelect;
