import { create } from 'zustand';
import { api } from '../lib/api';

export type User = {
	id: string;
	email: string;
	username: string;
	provider: string;
	avatar_url?: string;
	is_active: boolean;
	created_at: string;
};

type AuthState = {
	user: User | null;
	isLoading: boolean;
	error: string | null;
	logout: () => Promise<void>;
	clearError: () => void;
	checkAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	isLoading: false,
	error: null,

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
