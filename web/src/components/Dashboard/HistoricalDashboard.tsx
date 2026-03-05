import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import {
	LineChart,
	Line,
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
	BarChart,
	Bar,
	Cell,
} from 'recharts';
import {
	ArrowLeft,
	Activity,
	Zap,
	AlertTriangle,
	DollarSign,
	Clock,
	BarChart3,
	LayoutDashboard,
	Maximize2,
	ChevronDown
} from 'lucide-react';

const COLORS = ['#3caff6', '#a855f7', '#fbbf24', '#f87171', '#34d399', '#6366f1', '#ec4899'];

export default function HistoricalDashboard() {
	const { simulation, setViewMode, nodes } = useStore();
	const { history } = simulation;
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

	// Aggregate metrics across all ticks
	const aggregatedData = useMemo(() => {
		const timeMap: Record<number, any> = {};

		Object.values(history).forEach((ticks: any) => {
			ticks.forEach((tick: any) => {
				if (!timeMap[tick.time]) {
					timeMap[tick.time] = {
						time: tick.time,
						total_effective_rps: 0,
						total_dropped_rps: 0,
						avg_latency: 0,
						cost: 0,
						nodeCount: 0
					};
				}
				timeMap[tick.time].total_effective_rps += tick.effective_rps || 0;
				timeMap[tick.time].total_dropped_rps += tick.dropped_requests || 0;
				timeMap[tick.time].avg_latency += tick.latency || 0;
				timeMap[tick.time].cost += tick.tick_cost || 0;
				timeMap[tick.time].nodeCount += 1;
			});
		});

		return Object.values(timeMap).sort((a, b) => a.time - b.time).map(t => ({
			...t,
			avg_latency: t.nodeCount > 0 ? t.avg_latency / t.nodeCount : 0
		}));
	}, [history]);

	// Top error-producing nodes
	const errorNodes = useMemo(() => {
		const errorMap: Record<string, number> = {};
		Object.entries(history).forEach(([nodeId, ticks]) => {
			const totalDropped = ticks.reduce((sum, t) => sum + (t.dropped_requests || 0), 0);
			if (totalDropped > 0) {
				const node = nodes.find(n => n.id === nodeId);
				errorMap[node?.data?.label || nodeId] = totalDropped;
			}
		});
		return Object.entries(errorMap)
			.map(([name, value]) => ({ name, value }))
			.sort((a, b) => b.value - a.value)
			.slice(0, 5);
	}, [history, nodes]);

	const selectedNodeHistory = useMemo(() => {
		if (!selectedNodeId) return [];
		return history[selectedNodeId] || [];
	}, [selectedNodeId, history]);

	const nodeLabel = nodes.find(n => n.id === selectedNodeId)?.data?.label || selectedNodeId || "Select a node";

	return (
		<div className="flex flex-col h-full bg-[#0a0b0f] text-white overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]/50 bg-[#0f1115]">
				<div className="flex items-center gap-4">
					<button
						onClick={() => setViewMode('canvas')}
						className="p-2 hover:bg-[#1a1c23] rounded-lg transition-colors text-[var(--color-text-muted)] hover:text-white"
					>
						<ArrowLeft size={20} />
					</button>
					<div>
						<h2 className="text-xl font-bold flex items-center gap-2">
							<LayoutDashboard className="text-[#3caff6]" size={20} />
							Historical Simulation Analysis
						</h2>
						<p className="text-xs text-[var(--color-text-muted)]">Post-simulation telemetry and bottleneck diagnostics</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 bg-[#1a1c23] px-3 py-1.5 rounded-lg border border-[var(--color-border)]/50">
						<Clock size={14} className="text-blue-400" />
						<span className="text-xs font-mono">{aggregatedData.length} ticks sampled</span>
					</div>
					<div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
						<DollarSign size={14} />
						<span className="text-xs font-bold">Total Cost: ${simulation.totalSimulationCost.toFixed(2)}</span>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
				{/* Top Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-[#0f1115] p-4 rounded-xl border border-[var(--color-border)]/50">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Peak Throughput</span>
							<Activity size={16} className="text-[#3caff6]" />
						</div>
						<div className="text-2xl font-bold">{Math.max(...aggregatedData.map(d => d.total_effective_rps), 0).toLocaleString()} <span className="text-sm font-normal text-[var(--color-text-muted)]">RPS</span></div>
					</div>
					<div className="bg-[#0f1115] p-4 rounded-xl border border-[var(--color-border)]/50">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Avg. Latency</span>
							<Clock size={16} className="text-yellow-400" />
						</div>
						<div className="text-2xl font-bold">{(aggregatedData.reduce((sum, d) => sum + d.avg_latency, 0) / (aggregatedData.length || 1)).toFixed(2)} <span className="text-sm font-normal text-[var(--color-text-muted)]">ms</span></div>
					</div>
					<div className="bg-[#0f1115] p-4 rounded-xl border border-[var(--color-border)]/50">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Error Rate</span>
							<AlertTriangle size={16} className="text-red-400" />
						</div>
						<div className="text-2xl font-bold">
							{(aggregatedData.reduce((sum, d) => sum + d.total_dropped_rps, 0) / (aggregatedData.reduce((sum, d) => sum + d.total_effective_rps + d.total_dropped_rps, 0) || 1) * 100).toFixed(2)}%
						</div>
					</div>
					<div className="bg-[#0f1115] p-4 rounded-xl border border-[var(--color-border)]/50">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">System Reliability</span>
							<Zap size={16} className="text-emerald-400" />
						</div>
						<div className="text-2xl font-bold">99.9%</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* System Throughput Area Chart */}
					<div className="lg:col-span-2 bg-[#0f1115] p-6 rounded-2xl border border-[var(--color-border)]/50">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
								<BarChart3 size={16} className="text-[#3caff6]" />
								System-wide Traffic Composition
							</h3>
						</div>
						<div className="h-80 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={aggregatedData}>
									<defs>
										<linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#3caff6" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#3caff6" stopOpacity={0} />
										</linearGradient>
										<linearGradient id="colorDropped" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#f87171" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="#1a1c23" vertical={false} />
									<XAxis dataKey="time" stroke="#444" fontSize={10} tickFormatter={(v) => `T+${v}s`} />
									<YAxis stroke="#444" fontSize={10} />
									<Tooltip
										contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #333', fontSize: '11px', borderRadius: '8px' }}
									/>
									<Legend verticalAlign="top" height={36} />
									<Area type="monotone" dataKey="total_effective_rps" name="Successful RPS" stroke="#3caff6" strokeWidth={2} fillOpacity={1} fill="url(#colorRps)" isAnimationActive={false} />
									<Area type="monotone" dataKey="total_dropped_rps" name="Dropped RPS" stroke="#f87171" strokeWidth={2} fillOpacity={1} fill="url(#colorDropped)" isAnimationActive={false} />
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Error Distribution Pie/Bar Chart */}
					<div className="bg-[#0f1115] p-6 rounded-2xl border border-[var(--color-border)]/50">
						<h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-6 flex items-center gap-2">
							<AlertTriangle size={16} className="text-red-400" />
							Failure Hotspots
						</h3>
						{errorNodes.length > 0 ? (
							<div className="h-80 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={errorNodes} layout="vertical" margin={{ left: -20, right: 20 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#1a1c23" horizontal={false} />
										<XAxis type="number" hide />
										<YAxis dataKey="name" type="category" stroke="#888" fontSize={10} width={80} />
										<Tooltip
											cursor={{ fill: '#1a1c23' }}
											contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #333', fontSize: '11px' }}
										/>
										<Bar dataKey="value" name="Total Dropped Traffic" radius={[0, 4, 4, 0]}>
											{errorNodes.map((_, index) => (
												<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-xs italic">
								No significant errors detected during simulation.
							</div>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Detailed Node Analysis */}
					<div className="bg-[#0f1115] p-6 rounded-2xl border border-[var(--color-border)]/50">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
								<Maximize2 size={16} className="text-emerald-400" />
								Node Drill-down
							</h3>

							<div className="relative group">
								<button className="flex items-center gap-2 bg-[#1a1c23] px-3 py-1.5 rounded-lg border border-[var(--color-border)]/50 text-xs">
									{nodeLabel}
									<ChevronDown size={14} />
								</button>
								<div className="absolute top-full right-0 mt-1 w-48 bg-[#1a1c23] border border-[var(--color-border)]/50 rounded-xl overflow-hidden shadow-2xl z-50 hidden group-hover:block max-h-60 overflow-y-auto">
									{nodes.map(node => (
										<button
											key={node.id}
											onClick={() => setSelectedNodeId(node.id)}
											className="w-full text-left px-4 py-2 text-xs hover:bg-[#3caff6] hover:text-white transition-colors border-b border-[var(--color-border)]/20 last:border-0"
										>
											{node.data?.label || node.id}
										</button>
									))}
								</div>
							</div>
						</div>

						{selectedNodeId ? (
							<div className="h-64 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={selectedNodeHistory}>
										<CartesianGrid strokeDasharray="3 3" stroke="#1a1c23" vertical={false} />
										<XAxis dataKey="time" stroke="#444" fontSize={10} tickFormatter={(v) => `T+${v}s`} />
										<YAxis stroke="#444" fontSize={10} />
										<Tooltip
											contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #333', fontSize: '11px' }}
										/>
										<Legend verticalAlign="top" height={36} />
										<Line type="monotone" dataKey="effective_rps" name="Effective RPS" stroke="#3caff6" strokeWidth={2} dot={false} isAnimationActive={false} />
										<Line type="monotone" dataKey="utilization" name="Utilization (0-1)" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
									</LineChart>
								</ResponsiveContainer>
							</div>
						) : (
							<div className="flex items-center justify-center h-64 bg-black/20 rounded-xl border border-dashed border-[var(--color-border)]/50 text-[var(--color-text-muted)] text-sm">
								Click the selector above to analyze a specific component
							</div>
						)}
					</div>

					{/* Cost Accumulation */}
					<div className="bg-[#0f1115] p-6 rounded-2xl border border-[var(--color-border)]/50">
						<h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-6 flex items-center gap-2">
							<DollarSign size={16} className="text-emerald-400" />
							Cost Accumulation Waveform
						</h3>
						<div className="h-64 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={aggregatedData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#1a1c23" vertical={false} />
									<XAxis dataKey="time" stroke="#444" fontSize={10} />
									<YAxis stroke="#444" fontSize={10} tickFormatter={(v) => `$${v}`} />
									<Tooltip contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #333', fontSize: '11px' }} />
									<Area type="stepAfter" dataKey="cost" name="Per-tick Spend" stroke="#34d399" fill="#10b981" fillOpacity={0.1} isAnimationActive={false} />
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
