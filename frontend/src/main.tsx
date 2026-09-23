import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import "./i18n";
import './index.css'
import AuthProvider from './auth/authProvider';
import RequireAuth from './auth/requireAuth';
import RequireRole from './auth/requireRole';
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
import UserList from './pages/admin/userList';
import UserEntry from './pages/admin/userEntry';

const router = createBrowserRouter([
	{ path: "/", element: <Navigate to="/dashboards/grades/students/list" replace /> },
	{ path: "/login", element: <Login /> },
	{
		// everything below requires a session
		element: <RequireAuth />,
		children: [
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
								],
							},
							{
								path: "grades",
								children: [
									{ path: "list", element: <GradeList /> },
									{ path: "entry", element: <GradeEntry /> },
									{ path: "entry/:curriculumId", element: <GradeSheet /> },
								],
							},
							{
								// admin only; AdminGuard enforces the same rule on the API
								element: <RequireRole allow={["admin"]} />,
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
	},
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
