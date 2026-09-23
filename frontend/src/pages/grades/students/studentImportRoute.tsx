import { lazy, Suspense } from "react";

// the sheet parser this page pulls in is large, so it loads only when opened
const StudentImport = lazy(() => import("./studentImport"));

const StudentImportRoute = () => (
	<Suspense fallback={null}>
		<StudentImport />
	</Suspense>
);

export default StudentImportRoute;
