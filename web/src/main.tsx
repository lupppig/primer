import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import CanvasPage from './pages/CanvasPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/login" replace />} />
				<Route path="/login" element={<Login />} />
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/canvas" element={<CanvasPage />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>
);
