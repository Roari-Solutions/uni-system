import { useEffect } from "react";
import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import SideNav from "./sideNav";

const GradesLayout = () => {
	const { i18n } = useTranslation();

	// keep document direction and language in sync with the selected language
	useEffect(() => {
		document.documentElement.dir = i18n.dir();
		document.documentElement.lang = i18n.language;
	}, [i18n, i18n.language]);

	return (
		<main className="flex h-svh">
			<SideNav />
			<div className="flex-1 overflow-auto bg-palette-1 p-8">
				<Outlet />
			</div>
		</main>
	);
};

export default GradesLayout;
