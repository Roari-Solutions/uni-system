import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
	AcademicCapIcon,
	ArrowLeftStartOnRectangleIcon,
	BookOpenIcon,
	ChevronDownIcon,
	ClipboardDocumentListIcon,
	LanguageIcon,
	UserCircleIcon,
} from "@heroicons/react/24/outline";
import useAuth from "../../auth/useAuth";
import useFaculties from "../../hooks/useFaculties";

const HOVER_DELAY = 130; // ms — expand/collapse delay on mouse enter/leave

const BASE_PATH = "/dashboards/grades";

type Section = {
	id: "curriculum" | "students" | "grades";
	icon: typeof BookOpenIcon;
};

const SECTIONS: Section[] = [
	{ id: "curriculum", icon: BookOpenIcon },
	{ id: "students", icon: AcademicCapIcon },
	{ id: "grades", icon: ClipboardDocumentListIcon },
];

const SUB_OPTIONS = ["list", "entry"] as const;

const SideNav = () => {
	const { t, i18n } = useTranslation();
	const { pathname } = useLocation();
	const { user, logout } = useAuth();
	const { lockedFaculty } = useFaculties();

	const [expanded, setExpanded] = useState(false);
	// open the section that contains the current route by default
	const [openSections, setOpenSections] = useState<string[]>(() =>
		SECTIONS.filter((s) => pathname.startsWith(`${BASE_PATH}/${s.id}`)).map((s) => s.id),
	);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const scheduleExpanded = (value: boolean) => {
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setExpanded(value), HOVER_DELAY);
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
		i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");
	};

	return (
		// the placeholder reserves the collapsed width; the expanded nav overlays the page instead of pushing it
		<div className="relative h-full w-16 shrink-0">
			<aside
				dir={i18n.dir()}
				onMouseEnter={() => scheduleExpanded(true)}
				onMouseLeave={() => scheduleExpanded(false)}
				className={`absolute inset-y-0 start-0 z-20 flex flex-col overflow-hidden bg-palette-6 text-palette-1 transition-[width] duration-200 ${
					expanded ? "w-64" : "w-16"
				}`}
			>
				<div className="m-2 flex items-center gap-3 border-b border-palette-5 px-2 pb-3 pt-1">
					<UserCircleIcon className="size-8 shrink-0" />
					<div
						className={`min-w-0 transition-opacity duration-200 ${
							expanded ? "opacity-100" : "opacity-0"
						}`}
					>
						<p className="truncate font-medium">{user?.name}</p>
						<p className="truncate text-sm">{user ? t(`roles.${user.role}`) : ""}</p>
						{facultyName && <p className="truncate text-sm">{facultyName}</p>}
					</div>
				</div>

				<nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
					{SECTIONS.map(({ id, icon: Icon }) => {
						const isOpen = openSections.includes(id);
						const showOptions = expanded && isOpen;

						return (
							<div key={id} className="pb-2">
								<button
									type="button"
									onClick={() => toggleSection(id)}
									aria-expanded={isOpen}
									className="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-palette-5"
								>
									<Icon className="size-6 shrink-0" />
									{expanded && (
										<>
											<span className="flex-1 truncate text-start">
												{t(`gradesNav.${id}`)}
											</span>
											<ChevronDownIcon
												className={`size-4 shrink-0 transition-transform duration-200 ${
													isOpen ? "rotate-180" : ""
												}`}
											/>
										</>
									)}
								</button>

								{/* animate height via grid rows; inert keeps hidden links out of tab order */}
								<div
									inert={!showOptions}
									className={`grid transition-[grid-template-rows,opacity] duration-200 ${
										showOptions ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
									}`}
								>
									<ul className="flex flex-col gap-1 overflow-hidden ps-9 pt-1">
										{SUB_OPTIONS.map((option) => (
											<li key={option}>
												<NavLink
													to={`${BASE_PATH}/${id}/${option}`}
													className={({ isActive }) =>
														`block truncate rounded-md px-3 py-1.5 text-sm ${
															isActive
																? "bg-palette-4 text-palette-6"
																: "hover:bg-palette-5"
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

				<button
					type="button"
					onClick={toggleLanguage}
					className="mx-2 flex items-center gap-3 rounded-md px-3 py-2 hover:bg-palette-5"
				>
					<LanguageIcon className="size-6 shrink-0" />
					{expanded && (
						<span className="truncate text-start">{t("gradesNav.switchLanguage")}</span>
					)}
				</button>

				<button
					type="button"
					onClick={() => void logout()}
					className="m-2 flex items-center gap-3 rounded-md px-3 py-2 hover:bg-palette-5"
				>
					{/* the icon points out of the app, so it mirrors with the layout */}
					<ArrowLeftStartOnRectangleIcon className="size-6 shrink-0 rtl:-scale-x-100" />
					{expanded && <span className="truncate text-start">{t("gradesNav.logout")}</span>}
				</button>
			</aside>
		</div>
	);
};

export default SideNav;
