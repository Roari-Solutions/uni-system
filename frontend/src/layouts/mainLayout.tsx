import { Outlet } from "react-router"
import NavBar from "../components/navBar";
import Footer from "../components/footer";

const MainLayout = () => {

	return (
		<main className="h-svh flex flex-col ">
		  <NavBar />
		  <Outlet />
		  <Footer />
		</main>
	);
}

export default MainLayout;
