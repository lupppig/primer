import { useEffect } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import type { SimulationHistoryRun } from '../../store/useAnalysisStore';
import { useDesignStore } from '../../store/useDesignStore';
import { Button } from '../Common/Button';
import { Calendar, Clock, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from 'recharts';

export default function HistoryPanel() {
	const { currentDesign } = useDesignStore();
	const { runs, isLoading, error, fetchHistory, selectedRun, fetchRunDetails } = useAnalysisStore();

	useEffect(() => {
		if (currentDesign?.id) {
			fetchHistory(currentDesign.id);
		}
	}, [currentDesign?.id, fetchHistory]);

	const handleSelectRun = (run: SimulationHistoryRun) => {
		useAnalysisStore.setState({ selectedRun: run });
		fetchRunDetails(run.id);
	};

	if (isLoading && runs.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-12 text-center text-[var(--color-text-muted)]">
				<Loader2 className="w-8 h-8 animate-spin mb-4 text-[var(--color-primary)] opacity-50" />
				<p className="text-sm">Fetching historical logs...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-8 text-center">
				<AlertCircle className="w-10 h-10 text-red-500/50 mx-auto mb-4" />
				<h4 className="text-white font-medium mb-1">Failed to load history</h4>
				<p className="text-xs text-[var(--color-text-muted)] mb-4">{error}</p>
				<Button size="sm" variant="outline" onClick={() => currentDesign?.id && fetchHistory(currentDesign.id)}>
					Retry
				</Button>
			</div>
		);
	}

	if (runs.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-12 text-center">
				<div className="w-16 h-16 bg-[#1a1c23] rounded-full flex items-center justify-center mb-4">
					<Clock className="w-8 h-8 text-[var(--color-text-muted)] opacity-20" />
				</div>
				<h4 className="text-white font-medium mb-2">No Simulation History</h4>
				<p className="text-xs text-[var(--color-text-muted)] max-w-[200px]">
					Run a simulation to see past performance logs and benchmarks here.
				</p>
			</div>
		);
	}

	if (selectedRun) {
		return (
			<div className="flex flex-col h-full bg-[#090a0f]">
				<div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-black/40">
					<Button variant="ghost" size="sm" className="h-7 px-2 -ml-1 hover:bg-white/5" onClick={() => useAnalysisStore.setState({ selectedRun: null })}>
						<ChevronRight className="w-4 h-4 rotate-180 mr-1" />
						Back
					</Button>
					<span className="text-[10px] font-mono text-[var(--color-text-muted)]">{selectedRun.id.split('-')[0]}</span>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-6">
					<div>
						<h4 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Run Summary</h4>
						<div className="grid grid-cols-2 gap-3">
							<div className="bg-[#1a1c23]/50 p-3 rounded-xl border border-[var(--color-border)]/50">
								<span className="text-[10px] text-[var(--color-text-muted)] uppercase block mb-1">Peak Load</span>
								<span className="text-lg font-bold text-white">{selectedRun.total_rps_peak.toLocaleString()} <span className="text-xs font-normal opacity-50">RPS</span></span>
							</div>
							<div className="bg-[#1a1c23]/50 p-3 rounded-xl border border-[var(--color-border)]/50">
								<span className="text-[10px] text-[var(--color-text-muted)] uppercase block mb-1">Avg Latency</span>
								<span className="text-lg font-bold text-yellow-500">{selectedRun.avg_latency.toFixed(1)} <span className="text-xs font-normal opacity-50">ms</span></span>
							</div>
						</div>
					</div>

					<div>
						<h4 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Historical Throughput</h4>
						<div className="h-44 w-full bg-black/20 rounded-lg border border-[var(--color-border)]/30 p-2">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={useAnalysisStore.getState().selectedRunTicks}>
									<CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
									<XAxis dataKey="tick_index" hide />
									<YAxis stroke="#666" fontSize={10} />
									<Tooltip
										contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #333', fontSize: '10px' }}
									/>
									<Line
										type="monotone"
										dataKey={(d: any) => d.metrics?.graph_metrics?.total_throughput || 0}
										name="Total RPS"
										stroke="#3caff6"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div className="pt-4 border-t border-[var(--color-border)]/30">
						<div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
							<span>Started: {format(new Date(selectedRun.start_time), 'yyyy-MM-dd HH:mm:ss')}</span>
							<span className="capitalize px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">{selectedRun.status}</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full bg-[#090a0f]">
			<div className="p-4 space-y-3 overflow-y-auto">
				{runs.map((run: any) => (
					<button
						key={run.id}
						onClick={() => handleSelectRun(run)}
						className={`w-full text-left p-3 rounded-xl border transition-all group ${(selectedRun as any)?.id === run.id
							? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-[0_0_15px_rgba(60,175,246,0.1)]'
							: 'bg-[#0f111a] border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/50 hover:bg-[#161821]'
							}`}
					>
						<div className="flex items-start justify-between mb-2">
							<div className="flex items-center gap-2">
								<div className={`w-2 h-2 rounded-full ${run.status === 'completed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
								<span className="text-[10px] font-bold text-white uppercase tracking-wider">
									{run.status === 'completed' ? 'Simulation Run' : 'Active Run'}
								</span>
							</div>
							<span className="text-[10px] text-[var(--color-text-muted)] font-mono">
								{run.id.split('-')[0]}
							</span>
						</div>

						<div className="flex items-center gap-4 mb-3">
							<div className="flex flex-col">
								<span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-tighter">Peak RPS</span>
								<span className="text-sm font-semibold text-white">{run.total_rps_peak.toLocaleString()}</span>
							</div>
							<div className="w-px h-6 bg-[var(--color-border)]/50" />
							<div className="flex flex-col">
								<span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-tighter">Avg Latency</span>
								<span className="text-sm font-semibold text-yellow-400">{run.avg_latency.toFixed(1)}ms</span>
							</div>
						</div>

						<div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
							<div className="flex items-center gap-1.5">
								<Calendar className="w-3 h-3" />
								{format(new Date(run.start_time), 'MMM d, HH:mm')}
							</div>
							<ChevronRight className={`w-3 h-3 transition-transform ${(selectedRun as any)?.id === run.id ? 'translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
						</div>
					</button>
				))}
			</div>

			{runs.length > 5 && (
				<div className="p-4 border-t border-[var(--color-border)] mt-auto bg-black/20">
					<p className="text-[10px] text-[var(--color-text-muted)] text-center italic">
						Showing last 10 simulation runs
					</p>
				</div>
			)}
		</div>
	);
}

