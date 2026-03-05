import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import CanvasPage from './pages/CanvasPage.tsx';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';

export default function App() {
	const checkAuth = useAuthStore(state => state.checkAuth);
	const isLoading = useAuthStore(state => state.isLoading);
	const theme = useThemeStore(state => state.theme);

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	useEffect(() => {
		const root = window.document.documentElement;

		const applyTheme = () => {
			root.classList.remove('light', 'dark');
			if (theme === 'system') {
				const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
				root.classList.add(systemTheme);
			} else {
				root.classList.add(theme);
			}
		};

		applyTheme();

		if (theme === 'system') {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			const handleChange = () => applyTheme();
			mediaQuery.addEventListener('change', handleChange);
			return () => mediaQuery.removeEventListener('change', handleChange);
		}
	}, [theme]);

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
				<Route path="/" element={<Home />} />
				<Route path="/login" element={<Login />} />
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/canvas" element={<CanvasPage />} />
			</Routes>
		</BrowserRouter>
	);
}
