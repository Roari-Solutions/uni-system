import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router'
import "./i18n";
import './index.css'
import AuthProvider from './auth/authProvider';
import RequireAuth from './auth/requireAuth';
import RequirePermission from './auth/requirePermission';
import RequireDomain from './auth/requireDomain';
import { PERMISSIONS } from './types/auth';
import { HOST_PORTAL, PORTAL_HOME, servesPortal } from './portals';
import ChoosePortal from './pages/auth/choosePortal';
import CmsLayout from './layouts/cms/cmsLayout';
import PageList from './pages/cms/pageList';
import PageEditor from './pages/cms/pageEditor';
import GradesLayout from './layouts/grades/gradesLayout';
import Login from './pages/auth/login';
import CurriculumEntry from './pages/grades/curriculum/curriculumEntry';
import CurriculumList from './pages/grades/curriculum/curriculumList';
import StudentList from './pages/grades/students/studentList';
import StudentEntry from './pages/grades/students/studentEntry';
import StudentImportRoute from './pages/grades/students/studentImportRoute';
import StudentDetails from './pages/grades/students/studentDetails';
import GradeList from './pages/grades/grades/gradeList';
import GradeEntry from './pages/grades/grades/gradeEntry';
import GradeSheet from './pages/grades/grades/gradeSheet';
import SingleEntry from './pages/grades/grades/singleEntry';
import StudentGradeSheet from './pages/grades/grades/studentGradeSheet';
import ResultList from './pages/grades/results/resultList';
import ResultDetails from './pages/grades/results/resultDetails';
import ResultPrint from './pages/print/resultPrint';
import FacultyIndex from './pages/grades/faculty/facultyIndex';
import FacultyDetails from './pages/grades/faculty/facultyDetails';
import UserList from './pages/admin/userList';
import UserEntry from './pages/admin/userEntry';
import AccountSettings from './pages/account/accountSettings';

// the grades and results system
const gradesRoutes: RouteObject = {
	element: <RequireDomain portal="grades" permission={PERMISSIONS.grades} />,
	children: [
		// the exported sheet prints alone, outside the dashboard's chrome
		{ path: "/print/results/:resultId", element: <ResultPrint /> },
		{
			path: "/dashboards",
			children: [
				{
					path: "grades",
					element: <GradesLayout />,
					children: [
						{
							path: "curriculum",
							children: [
								{ path: "list", element: <CurriculumList /> },
								{ path: "entry", element: <CurriculumEntry /> },
								{ path: ":curriculumId/edit", element: <CurriculumEntry /> },
							],
						},
						{
							path: "students",
							children: [
								{ path: "list", element: <StudentList /> },
								{ path: "entry", element: <StudentEntry /> },
								{ path: "import", element: <StudentImportRoute /> },
								{ path: ":studentId", element: <StudentDetails /> },
								{ path: ":studentId/edit", element: <StudentEntry /> },
							],
						},
						{
							path: "grades",
							children: [
								{ path: "list", element: <GradeList /> },
								{ path: "entry", element: <GradeEntry /> },
								{ path: "entry/:curriculumId", element: <GradeSheet /> },
								{ path: "single", element: <SingleEntry /> },
								{ path: "single/:studentId", element: <StudentGradeSheet /> },
								{
									path: "results",
									children: [
										{ index: true, element: <ResultList /> },
										{ path: ":resultId", element: <ResultDetails /> },
									],
								},
							],
						},
						{
							// admins pick a faculty; a faculty's data entry goes straight to theirs
							path: "faculty",
							children: [
								{ path: "view", element: <FacultyIndex /> },
								{ path: ":facultyId", element: <FacultyDetails /> },
							],
						},
						// every signed-in user manages their own account here
						{ path: "account", element: <AccountSettings /> },
						{
							// the grades system's users; the API checks the same permissions
							element: (
								<RequirePermission
									anyOf={[PERMISSIONS.usersManageGrades, PERMISSIONS.usersManageAll]}
									fallback={PORTAL_HOME.grades!}
								/>
							),
							children: [
								{
									path: "users",
									children: [
										{ path: "list", element: <UserList /> },
										{ path: "entry", element: <UserEntry /> },
									],
								},
							],
						},
					],
				},
			],
		},
	],
};

// the website's content
const cmsRoutes: RouteObject = {
	path: "/dashboards/cms",
	element: <RequireDomain portal="cms" permission={PERMISSIONS.cms} />,
	children: [
		{
			element: <CmsLayout />,
			children: [
				{ index: true, element: <PageList /> },
				// a page key has slashes of its own (colleges/law)
				{ path: "pages/*", element: <PageEditor /> },
				{ path: "account", element: <AccountSettings /> },
				{
					// the website's users: content managers, for a CMS admin or super admin
					element: (
						<RequirePermission
							anyOf={[PERMISSIONS.usersManageCms, PERMISSIONS.usersManageAll]}
							fallback={PORTAL_HOME.cms!}
						/>
					),
					children: [
						{
							path: "users",
							children: [
								{ path: "list", element: <UserList /> },
								{ path: "entry", element: <UserEntry /> },
							],
						},
					],
				},
			],
		},
	],
};

// a portal's host opens its dashboard; the staff portal (and a single host) starts at sign-in
const home = HOST_PORTAL && HOST_PORTAL !== "staff" ? PORTAL_HOME[HOST_PORTAL] : undefined;

const router = createBrowserRouter([
	{ path: "/", element: <Navigate to={home ?? "/login"} replace /> },
	{ path: "/login", element: <Login /> },
	{
		// everything below requires a session
		element: <RequireAuth />,
		children: [
			// the general staff portal's choice between several dashboards
			...(HOST_PORTAL === null || HOST_PORTAL === "staff"
				? [{ path: "/choose", element: <ChoosePortal /> }]
				: []),
			// each host serves only its own portal's dashboard; a single host serves them all
			...(servesPortal("grades") ? [gradesRoutes] : []),
			...(servesPortal("cms") ? [cmsRoutes] : []),
		],
	},
	{ path: "*", element: <Navigate to="/" replace /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
