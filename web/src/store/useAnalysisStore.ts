import { create } from 'zustand';
import { api } from '../lib/api';

export type SimulationHistoryRun = {
	id: string;
	design_id: string;
	start_time: string;
	end_time: string | null;
	total_rps_peak: number;
	avg_latency: number;
	status: string;
};

export type SimulationTickData = {
	id: string;
	run_id: string;
	tick_index: number;
	metrics: any;
	created_at: string;
};

type AnalysisState = {
	runs: SimulationHistoryRun[];
	selectedRun: SimulationHistoryRun | null;
	selectedRunTicks: SimulationTickData[];
	isLoading: boolean;
	error: string | null;

	fetchHistory: (designId: string) => Promise<void>;
	fetchRunDetails: (runId: string) => Promise<void>;
	clearSelection: () => void;
};

export const useAnalysisStore = create<AnalysisState>((set) => ({
	runs: [],
	selectedRun: null,
	selectedRunTicks: [],
	isLoading: false,
	error: null,

	fetchHistory: async (designId: string) => {
		set({ isLoading: true, error: null });
		try {
			const response = await api.get(`/simulation/history/${designId}`);
			set({ runs: response.data, isLoading: false });
		} catch (error: any) {
			set({ error: error.message, isLoading: false });
		}
	},

	fetchRunDetails: async (runId: string) => {
		set({ isLoading: true, error: null });
		try {
			const response = await api.get(`/simulation/history/run/${runId}`);
			set({ selectedRunTicks: response.data, isLoading: false });
		} catch (error: any) {
			set({ error: error.message, isLoading: false });
		}
	},

	clearSelection: () => {
		set({ selectedRun: null, selectedRunTicks: [] });
	}
}));
