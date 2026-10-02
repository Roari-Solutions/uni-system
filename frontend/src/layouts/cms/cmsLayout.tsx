import { NavLink, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import {
	ArrowLeftStartOnRectangleIcon,
	DocumentTextIcon,
	LanguageIcon,
	UserCircleIcon,
	UserPlusIcon,
	UsersIcon,
} from "@heroicons/react/24/outline";
import useAuth from "../../auth/useAuth";
import { PERMISSIONS } from "../../types/auth";

const BASE_PATH = "/dashboards/cms";

// §18.3 — 44px tall, 12px horizontal padding
const navItemClass =
	"flex h-11 w-full items-center gap-3 rounded-sm px-3 text-navigation transition-colors duration-200 ease-out hover:bg-primary-hover";

/** The content manager's dashboard: a short nav beside the page being worked on. */
const CmsLayout = () => {
	const { t, i18n } = useTranslation();
	const { user, logout, can } = useAuth();
	// the API refuses these to anyone else; the nav just hides the door
	const managesUsers = can(PERMISSIONS.usersManageCms) || can(PERMISSIONS.usersManageAll);

	const toggleLanguage = () => {
		void i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");
	};

	const linkClass = ({ isActive }: { isActive: boolean }) =>
		`${navItemClass} ${isActive ? "bg-primary-hover font-semibold" : ""}`;

	return (
		<main className="flex min-h-svh flex-col bg-background md:h-svh md:flex-row">
			<aside
				dir={i18n.dir()}
				className="flex shrink-0 flex-col gap-1 bg-accent-deep p-2 text-surface md:w-60"
			>
				<div className="mb-2 border-b border-primary-hover px-3 pt-2 pb-4">
					<p className="text-body-sm font-semibold">{t("cmsNav.title")}</p>
					<p className="truncate text-caption text-accent-soft">{user?.name}</p>
				</div>
				<nav className="flex flex-row flex-wrap gap-1 md:flex-1 md:flex-col md:flex-nowrap">
					<NavLink to={BASE_PATH} end className={linkClass}>
						<DocumentTextIcon className="size-6 shrink-0" aria-hidden />
						{t("cmsNav.pages")}
					</NavLink>
					{managesUsers && (
						<>
							<NavLink to={`${BASE_PATH}/users/list`} className={linkClass}>
								<UsersIcon className="size-6 shrink-0" aria-hidden />
								{t("cmsNav.users")}
							</NavLink>
							<NavLink to={`${BASE_PATH}/users/entry`} className={linkClass}>
								<UserPlusIcon className="size-6 shrink-0" aria-hidden />
								{t("cmsNav.addUser")}
							</NavLink>
						</>
					)}
					<NavLink to={`${BASE_PATH}/account`} className={linkClass}>
						<UserCircleIcon className="size-6 shrink-0" aria-hidden />
						{t("gradesNav.account")}
					</NavLink>
				</nav>
				<div className="flex flex-row gap-1 md:flex-col">
					<button type="button" onClick={toggleLanguage} className={navItemClass}>
						<LanguageIcon className="size-6 shrink-0" aria-hidden />
						{t("gradesNav.switchLanguage")}
					</button>
					<button type="button" onClick={() => void logout()} className={navItemClass}>
						{/* the icon points out of the app, so it mirrors with the layout */}
						<ArrowLeftStartOnRectangleIcon className="size-6 shrink-0 rtl:-scale-x-100" aria-hidden />
						{t("gradesNav.logout")}
					</button>
				</div>
			</aside>
			{/* §11.2 — container padding steps 16 / 24 / 32px by breakpoint */}
			<div className="flex-1 overflow-auto px-4 py-8 md:px-6 lg:px-8">
				<Outlet />
			</div>
		</main>
	);
};

export default CmsLayout;
