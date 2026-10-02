import { useTranslation } from "react-i18next";
import { ArrowLeftStartOnRectangleIcon } from "@heroicons/react/24/outline";
import useAuth from "../../auth/useAuth";
import { staffLoginHref } from "../../portals";
import type { DomainPortal } from "../../types/auth";
import { cardClass, secondaryButtonClass } from "../../styles/form";

/**
 * Shown on a dashboard to someone signed in without its domain. A dedicated
 * portal does not send them on to their own dashboard; it says where to go.
 */
const NoAccess = ({ portal }: { portal: DomainPortal }) => {
	const { t } = useTranslation();
	const { user, logout } = useAuth();

	return (
		<main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
			<div className={`w-full max-w-md ${cardClass}`}>
				<h1 className="mb-2 text-heading-4 text-accent-deep">{t("noAccess.title")}</h1>
				<p className="mb-6 text-body-md text-foreground">
					{t("noAccess.message", { name: user?.name ?? "", portal: t(`portals.${portal}.name`) })}
				</p>
				<div className="flex flex-wrap items-center gap-4">
					<a
						href={staffLoginHref()}
						className="text-body-md font-semibold text-primary-hover underline-offset-4 hover:text-accent-deep hover:underline"
					>
						{t("login.staffPortal")}
					</a>
					<button type="button" onClick={() => void logout()} className={`gap-2 ${secondaryButtonClass}`}>
						<ArrowLeftStartOnRectangleIcon className="size-5 rtl:-scale-x-100" aria-hidden />
						{t("gradesNav.logout")}
					</button>
				</div>
			</div>
		</main>
	);
};

export default NoAccess;
