import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import CanvasPage from './pages/CanvasPage.tsx';
import { useAuthStore } from './store/useAuthStore';
import './index.css';

function Root() {
	const checkAuth = useAuthStore(state => state.checkAuth);
	const isLoading = useAuthStore(state => state.isLoading);

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	if (isLoading) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-[var(--color-canvas)]">
				<div className="w-8 h-8 rounded-full border-4 border-[var(--color-primary)] border-t-transparent animate-spin" />
			</div>
		);
	}

	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to="/login" replace />} />
				<Route path="/login" element={<Login />} />
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/canvas" element={<CanvasPage />} />
			</Routes>
		</BrowserRouter>
	);
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Root />
	</StrictMode>
);
