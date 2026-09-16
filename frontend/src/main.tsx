import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import "./i18n";
import './index.css'
import MainPage from './pages/mainPage'

const router = createBrowserRouter([
	{
		path: "/",
		element: <>Hi</>,
		children: [
			{ index: true, element: <MainPage />},
		],
	},
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
