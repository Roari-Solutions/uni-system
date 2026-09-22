import { Outlet } from "react-router";
import SideNav from "./sideNav";

const GradesLayout = () => {
	return (
		<main className="flex h-svh bg-background">
			<SideNav />
			{/* §11.2 — container padding steps 16 / 24 / 32px by breakpoint */}
			<div className="flex-1 overflow-auto px-4 py-8 md:px-6 lg:px-8">
				{/* dashboard tables use the full width beside the nav; forms narrow themselves */}
				<div className="w-full">
					<Outlet />
				</div>
			</div>
		</main>
	);
};

export default GradesLayout;
