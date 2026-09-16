import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import "./i18n";
import './index.css'
import GradesLayout from './layouts/grades/gradesLayout';
import CurriculumEntry from './pages/grades/curriculum/curriculumEntry';
import CurriculumList from './pages/grades/curriculum/curriculumList';
import StudentList from './pages/grades/students/studentList';
import StudentEntry from './pages/grades/students/studentEntry';
import GradeList from './pages/grades/grades/gradeList';

const router = createBrowserRouter([
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
							{ path: "entry" },
						],
					},
				],
			},
		],
	},
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
