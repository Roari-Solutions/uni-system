import { useTranslation } from "react-i18next";
import { CheckBadgeIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { ResultStatus } from "../../types/result";

/** Pending or approved; §39 — the icon and words carry the state, not the colour alone. */
const ResultStatusTag = ({ status }: { status: ResultStatus }) => {
	const { t } = useTranslation();
	const Icon = status === "approved" ? CheckBadgeIcon : ClockIcon;
	return (
		<span
			className={`inline-flex items-center gap-1 whitespace-nowrap text-body-sm font-medium ${
				status === "approved" ? "text-accent-deep" : "text-primary-hover"
			}`}
		>
			<Icon className="size-4 shrink-0" aria-hidden />
			{t(`results.statuses.${status}`)}
		</span>
	);
};

export default ResultStatusTag;
