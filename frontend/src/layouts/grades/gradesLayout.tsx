import { Outlet } from "react-router";
import SideNav from "./sideNav";

const GradesLayout = () => {
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
