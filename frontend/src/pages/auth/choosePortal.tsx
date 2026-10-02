import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
	ArrowLeftStartOnRectangleIcon,
	ChevronRightIcon,
	ClipboardDocumentListIcon,
	GlobeAltIcon,
} from "@heroicons/react/24/outline";
import useAuth from "../../auth/useAuth";
import { portalHref } from "../../portals";
import type { DomainPortal } from "../../types/auth";
import { cardClass, secondaryButtonClass } from "../../styles/form";

const ICONS: Partial<Record<DomainPortal, typeof GlobeAltIcon>> = {
	grades: ClipboardDocumentListIcon,
	cms: GlobeAltIcon,
};

/** After the general staff sign-in, someone with several dashboards picks one. */
const ChoosePortal = () => {
	const { t } = useTranslation();
	const { status, user, logout } = useAuth();

	if (status !== "authed" || !user) return <Navigate to="/login" replace />;

	const open = user.portals
		.map((portal) => ({ portal, href: portalHref(portal) }))
		.filter((p): p is { portal: DomainPortal; href: string } => p.href !== null);

	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
			<div className="w-full max-w-md">
				<h1 className="mb-2 text-heading-3 text-accent-deep">{t("choosePortal.title")}</h1>
				<p className="mb-6 text-body-md text-primary-hover">
					{t("choosePortal.subtitle", { name: user.name })}
				</p>

				<ul className={`flex flex-col gap-3 ${cardClass}`}>
					{open.map(({ portal, href }) => {
						const Icon = ICONS[portal] ?? GlobeAltIcon;
						return (
							<li key={portal}>
								{/* a plain link: another portal may live on another host */}
								<a
									href={href}
									className="flex min-h-14 items-center gap-4 rounded-sm border border-border-subtle px-4 py-3 transition-colors duration-200 ease-out hover:border-border-accent hover:bg-background"
								>
									<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent-deep">
										<Icon className="size-5" aria-hidden />
									</span>
									<span className="flex-1">
										<span className="block text-body-md font-semibold text-foreground">
											{t(`portals.${portal}.name`)}
										</span>
										<span className="block text-body-sm text-primary-hover">
											{t(`portals.${portal}.description`)}
										</span>
									</span>
									<ChevronRightIcon className="size-5 shrink-0 text-accent-deep rtl:-scale-x-100" aria-hidden />
								</a>
							</li>
						);
					})}
				</ul>

				<button type="button" onClick={() => void logout()} className={`mt-6 gap-2 ${secondaryButtonClass}`}>
					<ArrowLeftStartOnRectangleIcon className="size-5 rtl:-scale-x-100" aria-hidden />
					{t("gradesNav.logout")}
				</button>
			</div>
		</main>
	);
};

export default ChoosePortal;
