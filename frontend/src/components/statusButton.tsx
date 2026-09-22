import {
	XCircleIcon,
	ExclamationTriangleIcon,
	CheckCircleIcon,
} from "@heroicons/react/24/outline";

/** The three tracked attendance states for a student in a given session. */
export type StudentStatus = "absent" | "cheating_case" | "attended";

type StatusConfig = {
	label: string;
	icon: typeof XCircleIcon;
	hoverText: string;
};

// Order matters: this is the cycle sequence when the button is clicked.
const STATUS_ORDER: StudentStatus[] = ["absent", "cheating_case", "attended"];

const STATUS_CONFIG: Record<StudentStatus, StatusConfig> = {
	absent: {
		label: "Absent",
		icon: XCircleIcon,
		hoverText: "text-muted-foreground",
	},
	cheating_case: {
		label: "Cheating case",
		icon: ExclamationTriangleIcon,
		hoverText: "text-error",
	},
	attended: {
		label: "Attended",
		icon: CheckCircleIcon,
		hoverText: "text-success",
	},
};

/**
 * Returns the status that follows the given one in the fixed cycle
 * absent -> cheating_case -> attended -> absent.
 * @param current - the status to advance from.
 * @returns the next status in the cycle.
 */
export const getNextStatus = (current: StudentStatus): StudentStatus => {
	const currentIndex = STATUS_ORDER.indexOf(current);
	return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
};

type StatusButtonProps = {
	status: StudentStatus;
	onChange: (next: StudentStatus) => void;
};

/**
 * Icon button that shows a student's current status and, on click,
 * advances to the next status in the cycle via `onChange`.
 * @param status - the status currently displayed.
 * @param onChange - called with the next status when the button is clicked.
 */
const StatusButton = ({ status, onChange }: StatusButtonProps) => {
	const config = STATUS_CONFIG[status];
	const Icon = config.icon;

	const handleClick = () => onChange(getNextStatus(status));

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-label={config.label}
			title={config.label}
			className={`rounded-xs p-2 text-foreground transition-colors duration-150 ease-out hover:bg-background ${config.hoverText}`}
		>
			<Icon className="size-5" />
		</button>
	);
};

export default StatusButton;
