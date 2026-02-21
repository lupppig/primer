import { create } from 'zustand';
import { api } from '../lib/api';

export type User = {
	id: string;
	email: string;
	username: string;
	provider: string;
	is_active: boolean;
	created_at: string;
};

type AuthState = {
	user: User | null;
	isLoading: boolean;
	error: string | null;
	isAuthModalOpen: boolean;
	authView: 'login' | 'signup';

	setAuthModalOpen: (open: boolean) => void;
	setAuthView: (view: 'login' | 'signup') => void;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, username: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	clearError: () => void;
	checkAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoading: false,
	error: null,
	isAuthModalOpen: false,
	authView: 'login',

	setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
	setAuthView: (view) => set({ authView: view }),

	login: async (email, password) => {
		set({ isLoading: true, error: null });
		try {
			const response = await api.post('/auth/login', { email, password });
			set({ user: response.data, isLoading: false });
		} catch (error: any) {
			set({
				error: error.response?.data?.detail || 'Failed to login',
				isLoading: false
			});
			throw error;
		}
	},

	register: async (email, username, password) => {
		set({ isLoading: true, error: null });
		try {
			const response = await api.post('/auth/register', { email, username, password });
			set({ user: response.data, isLoading: false });
		} catch (error: any) {
			set({
				error: error.response?.data?.detail || 'Failed to register',
				isLoading: false
			});
			throw error;
		}
	},

	logout: async () => {
		set({ isLoading: true, error: null });
		try {
			await api.post('/auth/logout');
			set({ user: null, isLoading: false });
		} catch (error: any) {
			set({
				error: error.response?.data?.detail || 'Failed to logout',
				isLoading: false
			});
		}
	},

	checkAuth: async () => {
		set({ isLoading: true });
		try {
			const response = await api.get('/auth/me');
			set({ user: response.data, isLoading: false });
		} catch (error) {
			set({ user: null, isLoading: false });
		}
	},

	clearError: () => set({ error: null })
}));
