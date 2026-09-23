import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
	AcademicCapIcon,
	ArrowLeftStartOnRectangleIcon,
	Bars3Icon,
	BookOpenIcon,
	ChevronDownIcon,
	ClipboardDocumentListIcon,
	LanguageIcon,
	UsersIcon,
	UserCircleIcon,
} from "@heroicons/react/24/outline";
import useAuth from "../../auth/useAuth";
import useFaculties from "../../hooks/useFaculties";

const HOVER_DELAY = 130; // ms — expand/collapse delay on mouse enter/leave

const BASE_PATH = "/dashboards/grades";

type Section = {
	id: "curriculum" | "students" | "grades" | "users";
	icon: typeof BookOpenIcon;
	// sections only some roles may reach
	adminOnly?: boolean;
};

const SECTIONS: Section[] = [
	{ id: "curriculum", icon: BookOpenIcon },
	{ id: "students", icon: AcademicCapIcon },
	{ id: "grades", icon: ClipboardDocumentListIcon },
	{ id: "users", icon: UsersIcon, adminOnly: true },
];

const SUB_OPTIONS = ["list", "entry"] as const;

// sections with an option of their own beyond the shared list/entry pair
const EXTRA_OPTIONS: Partial<Record<Section["id"], string[]>> = {
	students: ["import"],
};

// §18.3 — 44px tall, 12px horizontal padding, 8px gap
const navItemClass =
	"flex h-11 w-full items-center gap-3 rounded-sm px-3 transition-colors duration-200 ease-out hover:bg-primary-hover";

const SideNav = () => {
	const { t, i18n } = useTranslation();
	const { pathname } = useLocation();
	const { user, logout } = useAuth();
	// the API rejects these routes for anyone else; the nav just hides the door
	const sections = SECTIONS.filter((s) => !s.adminOnly || user?.role === "admin");
	const { lockedFaculty } = useFaculties();

	// hovering expands on pointer devices; `pinned` is the tap/keyboard path,
	// because §36 forbids hover being the only way to reach functionality
	const [hovered, setHovered] = useState(false);
	const [pinned, setPinned] = useState(false);
	const expanded = hovered || pinned;

	// open the section that contains the current route by default
	const [openSections, setOpenSections] = useState<string[]>(() =>
		SECTIONS.filter((s) => pathname.startsWith(`${BASE_PATH}/${s.id}`)).map((s) => s.id),
	);

	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	// after choosing a page the nav steps aside; the pointer must leave and re-enter to reopen it
	const collapse = () => {
		clearTimeout(timer.current);
		setHovered(false);
		setPinned(false);
	};

	const scheduleHovered = (value: boolean) => {
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setHovered(value), HOVER_DELAY);
	};

	const toggleSection = (id: string) => {
		setOpenSections((prev) =>
			prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
		);
	};

	const lang = i18n.language === "ar" ? "ar" : "en";
	// admins are not tied to a faculty, so the line is theirs to omit
	const facultyName = lockedFaculty?.name[lang] ?? "";

	const toggleLanguage = () => {
		void i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");
	};

	return (
		// the placeholder reserves the collapsed width; the expanded nav overlays the page instead of pushing it
		<div className="relative h-full w-16 shrink-0">
			<aside
				dir={i18n.dir()}
				onMouseEnter={() => scheduleHovered(true)}
				onMouseLeave={() => scheduleHovered(false)}
				// keyboard users get the same reveal as pointer users; a mouse click
				// also focuses its target, so only keyboard (focus-visible) focus pins
				onFocusCapture={(e) => {
					if (e.target.matches(":focus-visible")) setPinned(true);
				}}
				// focus moving out of the nav (tab away, click the page) closes it
				onBlurCapture={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPinned(false);
				}}
				className={`absolute inset-y-0 start-0 z-20 flex flex-col overflow-hidden bg-accent-deep text-surface transition-[width] duration-200 ease-out ${
					expanded ? "w-64" : "w-16"
				}`}
			>
				<button
					type="button"
					onClick={() => setPinned((prev) => !prev)}
					aria-expanded={expanded}
					aria-label={t("gradesNav.toggleMenu")}
					className={`m-2 ${navItemClass}`}
				>
					<Bars3Icon className="size-6 shrink-0" />
				</button>

				<div className="mx-2 mb-2 flex items-center gap-3 border-b border-primary-hover px-3 pb-4">
					<UserCircleIcon className="size-8 shrink-0" />
					<div
						className={`min-w-0 transition-opacity duration-200 ease-out ${
							expanded ? "opacity-100" : "opacity-0"
						}`}
					>
						<p className="truncate text-body-sm font-medium">{user?.name}</p>
						<p className="truncate text-caption text-accent-soft">
							{user ? t(`roles.${user.role}`) : ""}
						</p>
						{facultyName && (
							<p className="truncate text-caption text-accent-soft">{facultyName}</p>
						)}
					</div>
				</div>

				<nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
					{sections.map(({ id, icon: Icon }) => {
						const isOpen = openSections.includes(id);
						const showOptions = expanded && isOpen;

						return (
							<div key={id} className="pb-2">
								<button
									type="button"
									onClick={() => toggleSection(id)}
									aria-expanded={isOpen}
									className={navItemClass}
								>
									<Icon className="size-6 shrink-0" />
									{expanded && (
										<>
											<span className="flex-1 truncate text-start text-navigation">
												{t(`gradesNav.${id}`)}
											</span>
											<ChevronDownIcon
												className={`size-4 shrink-0 transition-transform duration-200 ease-out ${
													isOpen ? "rotate-180" : ""
												}`}
											/>
										</>
									)}
								</button>

								{/* animate height via grid rows; inert keeps hidden links out of tab order */}
								<div
									inert={!showOptions}
									className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
										showOptions ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
									}`}
								>
									<ul className="flex flex-col gap-1 overflow-hidden ps-9 pt-1">
										{[...SUB_OPTIONS, ...(EXTRA_OPTIONS[id] ?? [])].map((option) => (
											<li key={option}>
												{/* §32 — active item: light surface, deep accent text, heavier weight */}
												<NavLink
													to={`${BASE_PATH}/${id}/${option}`}
													onClick={collapse}
													className={({ isActive }) =>
														`flex h-11 items-center truncate rounded-sm px-3 text-navigation transition-colors duration-200 ease-out ${
															isActive
																? "border-s-2 border-primary bg-background font-semibold text-accent-deep"
																: "hover:bg-primary-hover"
														}`
													}
												>
													{t(`gradesNav.${option}`)}
												</NavLink>
											</li>
										))}
									</ul>
								</div>
							</div>
						);
					})}
				</nav>

				<button type="button" onClick={toggleLanguage} className={`mx-2 ${navItemClass}`}>
					<LanguageIcon className="size-6 shrink-0" />
					{expanded && (
						<span className="truncate text-start text-navigation">
							{t("gradesNav.switchLanguage")}
						</span>
					)}
				</button>

				<button
					type="button"
					onClick={() => void logout()}
					className={`m-2 ${navItemClass}`}
				>
					{/* the icon points out of the app, so it mirrors with the layout */}
					<ArrowLeftStartOnRectangleIcon className="size-6 shrink-0 rtl:-scale-x-100" />
					{expanded && (
						<span className="truncate text-start text-navigation">{t("gradesNav.logout")}</span>
					)}
				</button>
			</aside>
		</div>
	);
};

export default SideNav;
