import { useTranslation } from "react-i18next";
import {
	ExclamationCircleIcon,
	NoSymbolIcon,
	PauseCircleIcon,
} from "@heroicons/react/24/outline";
import type { StudentStanding, SuspensionYears } from "../types/student";

// §4.2 — disciplinary states share the error token; §39 — each keeps its own icon and words
const tagClass = "inline-flex items-center gap-1 whitespace-nowrap text-body-sm text-error";

/** A student's standing; an active student shows the plain word, uncoloured. */
export const StandingTag = ({
	standing,
	suspensionYears,
}: {
	standing: StudentStanding;
	suspensionYears: SuspensionYears | null;
}) => {
	const { t } = useTranslation();

	if (standing === "active") return <span>{t("student.standings.active")}</span>;
	if (standing === "dismissed") {
		return (
			<span className={tagClass}>
				<NoSymbolIcon className="size-4 shrink-0" aria-hidden />
				{t("student.standings.dismissed")}
			</span>
		);
	}
	return (
		<span className={tagClass}>
			<PauseCircleIcon className="size-4 shrink-0" aria-hidden />
			{t(`student.suspendedFor.${suspensionYears ?? 1}`)}
		</span>
	);
};

/** The penalties recorded on one decided cheating case; nothing when there are none. */
export const PenaltyTags = ({
	warning,
	suspensionYears,
	dismissal,
}: {
	warning: boolean;
	suspensionYears: SuspensionYears | null;
	dismissal: boolean;
}) => {
	const { t } = useTranslation();
	if (!warning && !suspensionYears && !dismissal) return null;

	return (
		<ul className="flex flex-col gap-1" aria-label={t("penalties.label")}>
			{warning && (
				<li className={tagClass}>
					<ExclamationCircleIcon className="size-4 shrink-0" aria-hidden />
					{t("penalties.warning")}
				</li>
			)}
			{suspensionYears && (
				<li className={tagClass}>
					<PauseCircleIcon className="size-4 shrink-0" aria-hidden />
					{t(`penalties.suspension.${suspensionYears}`)}
				</li>
			)}
			{dismissal && (
				<li className={tagClass}>
					<NoSymbolIcon className="size-4 shrink-0" aria-hidden />
					{t("penalties.dismissal")}
				</li>
			)}
		</ul>
	);
};
