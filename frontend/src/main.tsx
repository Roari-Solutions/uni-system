import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import "./i18n";
import './index.css'
import AuthProvider from './auth/authProvider';
import RequireAuth from './auth/requireAuth';
import GradesLayout from './layouts/grades/gradesLayout';
import Login from './pages/auth/login';
import CurriculumEntry from './pages/grades/curriculum/curriculumEntry';
import CurriculumList from './pages/grades/curriculum/curriculumList';
import StudentList from './pages/grades/students/studentList';
import StudentEntry from './pages/grades/students/studentEntry';
import GradeList from './pages/grades/grades/gradeList';
import GradeEntry from './pages/grades/grades/gradeEntry';

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
								],
							},
							{
								path: "students",
								children: [
									{ path: "list", element: <StudentList /> },
									{ path: "entry", element: <StudentEntry /> },
								],
							},
							{
								path: "grades",
								children: [
									{ path: "list", element: <GradeList /> },
									{ path: "entry", element: <GradeEntry /> },
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
