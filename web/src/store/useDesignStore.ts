import { create } from 'zustand';
import { api } from '../lib/api';

export type DesignMeta = {
	id: string;
	name: string;
	description: string | null;
	version: number;
	updated_at: string;
};

// Represents the full payload loaded into the canvas
export type DesignPayload = DesignMeta & {
	nodes: any[];
	edges: any[];
};

type DesignState = {
	designs: DesignMeta[];
	currentDesign: DesignPayload | null;
	isLoading: boolean;
	error: string | null;

	fetchDesigns: () => Promise<void>;
	createDesign: (name: string, description?: string) => Promise<string>;
	loadDesign: (id: string) => Promise<void>;
	saveDesign: (id: string, nodes: any[], edges: any[], version: number) => Promise<void>;
	deleteDesign: (id: string) => Promise<void>;
};

export const useDesignStore = create<DesignState>((set) => ({
	designs: [],
	currentDesign: null,
	isLoading: false,
	error: null,

	fetchDesigns: async () => {
		set({ isLoading: true, error: null });
		try {
			const response = await api.get('/canvas/my-designs');
			set({ designs: response.data, isLoading: false });
		} catch (error: any) {
			set({ error: error.message, isLoading: false });
		}
	},

	createDesign: async (name, description) => {
		set({ isLoading: true, error: null });
		try {
			const response = await api.post('/canvas/design', {
				name,
				description,
				nodes: [],
				edges: []
			});
			// Add to list and return ID
			set((state) => ({
				designs: [response.data, ...state.designs],
				isLoading: false
			}));
			return response.data.id;
		} catch (error: any) {
			set({ error: error.message, isLoading: false });
			throw error;
		}
	},

	loadDesign: async (id: string) => {
		set({ isLoading: true, error: null });
		try {
			const response = await api.get(`/canvas/design/${id}`);
			set({ currentDesign: response.data, isLoading: false });
		} catch (error: any) {
			set({ error: error.message, isLoading: false });
		}
	},

	saveDesign: async (id: string, nodes: any[], edges: any[], currentVersion: number) => {
		try {
			const response = await api.put(`/canvas/design/${id}`, {
				nodes,
				edges,
				version: currentVersion
			});
			// Optionally update currentDesign state with new version
			set((state) => ({
				currentDesign: state.currentDesign ? {
					...state.currentDesign,
					version: response.data.version,
					updated_at: response.data.updated_at
				} : null
			}));
		} catch (error: any) {
			// Handle optimistic lock errors silently or trigger a toast in the UI
			console.error("Failed to save design", error);
			throw error;
		}
	},

	deleteDesign: async (id: string) => {
		set({ isLoading: true, error: null });
		try {
			await api.delete(`/canvas/design/${id}`);
			set((state) => ({
				designs: state.designs.filter(d => d.id !== id),
				isLoading: false
			}));
		} catch (error: any) {
			set({ error: error.message, isLoading: false });
			throw error;
		}
	}
}));
