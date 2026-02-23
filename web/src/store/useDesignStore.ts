import { create } from 'zustand';
import { api } from '../lib/api';

export type DesignMeta = {
	id: string;
	name: string;
	description: string | null;
	nodes: any[];
	edges: any[];
	version: number;
	updated_at: string;
};

// Represents the full payload loaded into the canvas
export type DesignPayload = DesignMeta & {
	settings: Record<string, any>;
};

type DesignState = {
	designs: DesignMeta[];
	currentDesign: DesignPayload | null;
	isLoading: boolean;
	error: string | null;

	fetchDesigns: () => Promise<void>;
	createDesign: (name: string, description?: string) => Promise<string>;
	loadDesign: (id: string) => Promise<void>;
	saveDesign: (id: string, nodes: any[], edges: any[], settings: Record<string, any>, version: number) => Promise<void>;
	deleteDesign: (id: string) => Promise<void>;
	renameDesign: (id: string, name: string) => Promise<void>;
};

export const useDesignStore = create<DesignState>((set, get) => ({
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
				edges: [],
				settings: {}
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

	saveDesign: async (id: string, nodes: any[], edges: any[], settings: Record<string, any>, currentVersion: number) => {
		const state = get() as DesignState;
		const current = state.currentDesign;
		if (!current || current.id !== id) return;

		// Always use the latest version from the store to prevent stale closure conflicts from timeouts
		const latestVersion = get().currentDesign?.version ?? currentVersion;

		try {
			const response = await api.put(`/canvas/design/${id}`, {
				name: current.name,
				description: current.description,
				nodes,
				edges,
				settings,
				version: latestVersion
			});
			// Update currentDesign state with new version and the latest canvas payload
			set((state) => ({
				currentDesign: state.currentDesign ? {
					...state.currentDesign,
					nodes,
					edges,
					settings,
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
	},

	renameDesign: async (id: string, name: string) => {
		const state = get() as DesignState;
		const current = state.currentDesign;
		if (!current || current.id !== id) return;

		try {
			const response = await api.put(`/canvas/design/${id}`, {
				name,
				nodes: current.nodes,
				edges: current.edges,
				settings: current.settings || {},
				version: current.version
			});

			set((state) => ({
				currentDesign: state.currentDesign ? {
					...state.currentDesign,
					name: response.data.name,
					version: response.data.version
				} : null,
				designs: state.designs.map(d => d.id === id ? { ...d, name: response.data.name, version: response.data.version } : d)
			}));
		} catch (error) {
			console.error("Rename failed", error);
		}
	}
}));
