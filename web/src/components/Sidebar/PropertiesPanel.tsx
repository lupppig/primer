import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Input } from '../Common/Input';
import { Button } from '../Common/Button';
import { Plus, Minus, BarChart3, Settings2, ShieldAlert, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import type { Node, Edge } from 'reactflow';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from 'recharts';

export default function PropertiesPanel() {
	const { nodes, edges, setNodes, simulation } = useStore();
	const [activeTab, setActiveTab] = useState<'config' | 'resilience' | 'scaling' | 'metrics'>('config');

	// Find the currently selected node or edge
	const selectedNode = nodes.find(n => n.selected) as Node | undefined;
	const selectedEdge = edges.find(e => e.selected) as Edge | undefined;

	// Reset to config tab if selection changes
	const lastSelectedId = typeof window !== 'undefined' ? (window as any)._lastSelectedId : undefined;
	if (selectedNode?.id !== lastSelectedId || selectedEdge?.id !== lastSelectedId) {
		if (typeof window !== 'undefined') (window as any)._lastSelectedId = selectedNode?.id || selectedEdge?.id;
		// We don't want to trigger a re-render loop here, so we only reset if it's different
		// Actually, standard react pattern is to use useEffect for this.
	}

	// Helper to update specific data field on the selected node
	const updateNodeData = (field: string, value: any) => {
		if (!selectedNode) return;

		const updatedNodes = nodes.map(n => {
			if (n.id === selectedNode.id) {
				return {
					...n,
					data: {
						...n.data,
						[field]: value
					}
				};
			}
			return n;
		});

		setNodes(updatedNodes);

		// If simulation is active, hot-reloading happens automatically via store subscribers if implemented,
		// or we can explicitly call actions. In current Primer, most components read from store.
	};

	const updateEdgeData = (field: string, value: any) => {
		if (!selectedEdge) return;
		useStore.getState().updateEdgeData(selectedEdge.id, { [field]: value });
	};

	if (!selectedNode && !selectedEdge) {
		return (
			<div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)] p-8 text-center ml-2">
				Click on any component or connection to view its properties here.
			</div>
		);
	}

	const renderContent = () => {
		if (selectedEdge) {
			const trafficPercent = selectedEdge.data?.traffic_percent !== undefined ? selectedEdge.data.traffic_percent : 1.0;
			return (
				<div className="space-y-4">
					<div className="space-y-1.5 border-b border-[var(--color-border)] pb-4 mb-2">
						<label className="text-sm font-medium text-white flex justify-between tracking-wide">
							Traffic Split
							<span className="text-[var(--color-text-muted)] text-xs font-normal">{(trafficPercent * 100).toFixed(0)}%</span>
						</label>
						<div className="flex items-center gap-3">
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={trafficPercent}
								onChange={(e) => updateEdgeData('traffic_percent', parseFloat(e.target.value))}
								className="w-full h-1.5 bg-[#1a1c23] rounded-lg appearance-none cursor-pointer accent-[#3caff6]"
							/>
						</div>
						<p className="text-xs text-[var(--color-text-muted)] mt-2">
							Percentage of request fan-out from the source component flowing down this specific path.
						</p>
					</div>
				</div>
			);
		}

		if (selectedNode?.type === 'textNode') {
			const fontSize = selectedNode.data.fontSize ?? 14;
			return (
				<div className="space-y-4">
					<div className="space-y-1.5">
						<label className="text-sm font-medium text-white flex justify-between">
							Font Size
							<span className="text-[var(--color-text-muted)] text-xs font-normal">px</span>
						</label>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('fontSize', Math.max(8, fontSize - 2))}
							>
								<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
							<Input
								type="number"
								value={fontSize}
								onChange={(e) => updateNodeData('fontSize', parseInt(e.target.value) || 14)}
								className="bg-[#0f1115] text-center px-1"
								min={8}
							/>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('fontSize', Math.min(128, fontSize + 2))}
							>
								<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
						</div>
					</div>
				</div>
			);
		}

		if (selectedNode?.type === 'groupNode') {
			const labelValue = selectedNode.data.label || '';
			return (
				<div className="space-y-4">
					<div className="space-y-1.5 border-b border-[var(--color-border)] pb-4 mb-2">
						<label className="text-sm font-medium text-white flex justify-between">
							Group Name
						</label>
						<Input
							type="text"
							value={labelValue}
							placeholder="e.g. Database Cluster"
							onChange={(e) => updateNodeData('label', e.target.value)}
							className="bg-[#0f1115] px-2"
						/>
						<p className="text-xs text-[var(--color-text-muted)]">Display name rendered on the canvas.</p>
					</div>
				</div>
			);
		}

		if (activeTab === 'resilience') {
			const resConfig = selectedNode?.data?.resilience_config || {
				circuit_breaker_enabled: false,
				failure_threshold_pct: 50,
				recovery_timeout_ticks: 10,
				min_request_threshold: 10
			};

			const updateResConfig = (field: string, value: any) => {
				updateNodeData('resilience_config', { ...resConfig, [field]: value });
			};

			return (
				<div className="space-y-6">
					<div className="flex items-center justify-between bg-[#1a1c23]/50 p-3 rounded-xl border border-[var(--color-border)]/50">
						<div>
							<span className="text-sm font-medium text-white block">Circuit Breaker</span>
							<span className="text-[10px] text-[var(--color-text-muted)] tracking-tight">Prevent cascading failures</span>
						</div>
						<button
							onClick={() => updateResConfig('circuit_breaker_enabled', !resConfig.circuit_breaker_enabled)}
							className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${resConfig.circuit_breaker_enabled ? 'bg-[#3caff6]' : 'bg-[#2d313a]'}`}
						>
							<span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${resConfig.circuit_breaker_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
						</button>
					</div>

					<div className={`space-y-5 transition-opacity ${resConfig.circuit_breaker_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-[var(--color-text-muted)] flex justify-between uppercase tracking-wider">
								Failure Threshold
								<span className="text-white font-bold">{resConfig.failure_threshold_pct}%</span>
							</label>
							<input
								type="range"
								min="5"
								max="95"
								step="5"
								value={resConfig.failure_threshold_pct}
								onChange={(e) => updateResConfig('failure_threshold_pct', parseInt(e.target.value))}
								className="w-full h-1.5 bg-[#1a1c23] rounded-lg appearance-none cursor-pointer accent-[#3caff6]"
							/>
							<p className="text-[10px] text-[var(--color-text-muted)]">Circuit trips if error rate exceeds this percentage.</p>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-medium text-[var(--color-text-muted)] flex justify-between uppercase tracking-wider">
								Recovery Timeout
								<span className="text-white font-bold">{resConfig.recovery_timeout_ticks} ticks</span>
							</label>
							<div className="flex items-center gap-1">
								<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateResConfig('recovery_timeout_ticks', Math.max(1, resConfig.recovery_timeout_ticks - 1))}>
									<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
								</Button>
								<Input type="number" value={resConfig.recovery_timeout_ticks} onChange={(e) => updateResConfig('recovery_timeout_ticks', parseInt(e.target.value) || 1)} className="bg-[#0f1115] text-center px-1" />
								<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateResConfig('recovery_timeout_ticks', resConfig.recovery_timeout_ticks + 1)}>
									<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
								</Button>
							</div>
							<p className="text-[10px] text-[var(--color-text-muted)]">Wait time before attempting recovery.</p>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-medium text-[var(--color-text-muted)] flex justify-between uppercase tracking-wider">
								Min Request Volume
								<span className="text-white font-bold">{resConfig.min_request_threshold} RPS</span>
							</label>
							<Input
								type="number"
								value={resConfig.min_request_threshold}
								onChange={(e) => updateResConfig('min_request_threshold', parseInt(e.target.value) || 1)}
								className="bg-[#0f1115] px-2 h-8"
							/>
							<p className="text-[10px] text-[var(--color-text-muted)]">Minimum traffic needed to trigger evaluation.</p>
						</div>
					</div>
				</div>
			);
		}

		if (activeTab === 'scaling') {
			const scalingConfig = selectedNode?.data?.scaling_config || {
				enabled: false,
				min_replicas: 1,
				max_replicas: 10,
				target_utilization: 0.7,
				scale_up_cooldown_ticks: 5,
				scale_down_cooldown_ticks: 10
			};

			const updateScalingConfig = (field: string, value: any) => {
				updateNodeData('scaling_config', { ...scalingConfig, [field]: value });
			};

			return (
				<div className="space-y-6">
					<div className="flex items-center justify-between bg-[#1a1c23]/50 p-3 rounded-xl border border-[var(--color-border)]/50 text-[11px]">
						<div>
							<span className="text-[12px] font-medium text-white block">Intelligent Scaling</span>
							<span className="text-[var(--color-text-muted)] tracking-tight">Reactive Horizontal Scaling</span>
						</div>
						<button
							onClick={() => updateScalingConfig('enabled', !scalingConfig.enabled)}
							className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${scalingConfig.enabled ? 'bg-[#3caff6]' : 'bg-[#2d313a]'}`}
						>
							<span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${scalingConfig.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
						</button>
					</div>

					<div className={`space-y-5 transition-opacity ${scalingConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
						<div className="space-y-1.5">
							<label className="text-[10px] font-medium text-[var(--color-text-muted)] flex justify-between uppercase tracking-wider">
								Target Utilization
								<span className="text-white font-bold">{(scalingConfig.target_utilization * 100).toFixed(0)}%</span>
							</label>
							<input
								type="range"
								min="0.1"
								max="1.0"
								step="0.05"
								value={scalingConfig.target_utilization}
								onChange={(e) => updateScalingConfig('target_utilization', parseFloat(e.target.value))}
								className="w-full h-1.5 bg-[#1a1c23] rounded-lg appearance-none cursor-pointer accent-[#3caff6]"
							/>
							<p className="text-[10px] text-[var(--color-text-muted)]">Scale up when utilization exceeds this limit.</p>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Min Replicas</label>
								<Input type="number" value={scalingConfig.min_replicas} onChange={(e) => updateScalingConfig('min_replicas', parseInt(e.target.value) || 1)} className="bg-[#0f1115] px-2 h-8 text-[11px]" />
							</div>
							<div className="space-y-1.5">
								<label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Max Replicas</label>
								<Input type="number" value={scalingConfig.max_replicas} onChange={(e) => updateScalingConfig('max_replicas', parseInt(e.target.value) || 1)} className="bg-[#0f1115] px-2 h-8 text-[11px]" />
							</div>
						</div>

						<div className="space-y-1.5">
							<label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Cooldown Ticks (Up/Down)</label>
							<div className="flex gap-2">
								<Input type="number" value={scalingConfig.scale_up_cooldown_ticks} onChange={(e) => updateScalingConfig('scale_up_cooldown_ticks', parseInt(e.target.value) || 0)} className="bg-[#0f1115] px-2 h-8 text-[11px]" title="Scale Up Cooldown" />
								<Input type="number" value={scalingConfig.scale_down_cooldown_ticks} onChange={(e) => updateScalingConfig('scale_down_cooldown_ticks', parseInt(e.target.value) || 0)} className="bg-[#0f1115] px-2 h-8 text-[11px]" title="Scale Down Cooldown" />
							</div>
						</div>
					</div>
				</div>
			);
		}

		if (activeTab === 'metrics') {
			const nodeHistory = simulation.history[selectedNode?.id || ''] || [];
			return (
				<div className="space-y-6">
					<div>
						<h5 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Throughput (RPS)</h5>
						<div className="h-40 w-full bg-black/20 rounded-lg border border-[var(--color-border)]/30 p-2">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={nodeHistory}>
									<CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
									<XAxis dataKey="time" hide />
									<YAxis stroke="#666" fontSize={10} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
									<Tooltip
										contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #333', fontSize: '10px' }}
										itemStyle={{ color: '#3caff6' }}
									/>
									<Line
										type="monotone"
										dataKey="effective_rps"
										stroke="#3caff6"
										strokeWidth={2}
										dot={false}
										isAnimationActive={false}
									/>
									<Line
										type="monotone"
										dataKey="incoming_rps"
										stroke="#555"
										strokeWidth={1}
										strokeDasharray="4 4"
										dot={false}
										isAnimationActive={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div>
						<h5 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Latency (ms)</h5>
						<div className="h-40 w-full bg-black/20 rounded-lg border border-[var(--color-border)]/30 p-2">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={nodeHistory}>
									<CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
									<XAxis dataKey="time" hide />
									<YAxis stroke="#666" fontSize={10} />
									<Tooltip
										contentStyle={{ backgroundColor: '#0f111a', border: '1px solid #333', fontSize: '10px' }}
										itemStyle={{ color: '#fbbf24' }}
									/>
									<Line
										type="monotone"
										dataKey="latency"
										stroke="#fbbf24"
										strokeWidth={2}
										dot={false}
										isAnimationActive={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>

					{!simulation.isSimulating && nodeHistory.length === 0 && (
						<div className="text-center py-8">
							<p className="text-xs text-[var(--color-text-muted)]">No active telemetry. Start simulation to see real-time charts.</p>
						</div>
					)}
				</div>
			);
		}

		// Defaults for Tech Nodes (Config Tab)
		const capacity = selectedNode?.data?.capacity_rps ?? 1000;
		const replicas = selectedNode?.data?.replicas ?? 1;
		const latency = selectedNode?.data?.base_latency_ms ?? 10;
		const queueSize = selectedNode?.data?.queue_size ?? 5000;
		const displayLabel = selectedNode?.data?.label || 'Component';
		const labelValue = selectedNode?.data?.label || '';
		const isQueue = ['kafka', 'rabbitmq', 'sqs', 'queue'].some(q => displayLabel.toLowerCase().includes(q));

		return (
			<div className="space-y-4">
				<div className="space-y-1.5 border-b border-[var(--color-border)] pb-4 mb-2">
					<label className="text-sm font-medium text-white flex justify-between">
						Component Name
					</label>
					<Input
						type="text"
						value={labelValue}
						placeholder="e.g. primary-db"
						onChange={(e) => updateNodeData('label', e.target.value)}
						className="bg-[#0f1115] px-2"
					/>
				</div>

				<div className="space-y-1.5">
					<label className="text-sm font-medium text-white flex justify-between">
						Base Capacity
						<span className="text-[var(--color-text-muted)] text-xs font-normal">RPS</span>
					</label>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('capacity_rps', Math.max(1, capacity - 100))}>
							<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
						</Button>
						<Input type="number" value={capacity} onChange={(e) => updateNodeData('capacity_rps', parseInt(e.target.value) || 0)} className="bg-[#0f1115] text-center px-1" min={1} />
						<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('capacity_rps', capacity + 100)}>
							<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
						</Button>
					</div>
				</div>

				<div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
					<label className="text-sm font-medium text-white flex justify-between">
						Rate Limit
						<span className="text-[var(--color-text-muted)] text-xs font-normal">RPS</span>
					</label>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('rate_limit_rps', Math.max(0, (selectedNode?.data?.rate_limit_rps || 100) - 10))}>
							<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
						</Button>
						<Input type="number" value={selectedNode?.data?.rate_limit_rps || ''} placeholder="None" onChange={(e) => updateNodeData('rate_limit_rps', e.target.value === '' ? null : parseInt(e.target.value))} className="bg-[#0f1115] text-center px-1" min={0} />
						<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('rate_limit_rps', (selectedNode?.data?.rate_limit_rps || 0) + 10)}>
							<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
						</Button>
					</div>
				</div>

				<div className="space-y-1.5">
					<label className="text-sm font-medium text-white flex justify-between">
						Replicas
						<span className="text-[var(--color-text-muted)] text-xs font-normal">Instances</span>
					</label>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('replicas', Math.max(1, replicas - 1))}>
							<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
						</Button>
						<Input type="number" value={replicas} onChange={(e) => updateNodeData('replicas', parseInt(e.target.value) || 1)} className="bg-[#0f1115] text-center px-1" min={1} />
						<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('replicas', replicas + 1)}>
							<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
						</Button>
					</div>
				</div>

				<div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
					<label className="text-sm font-medium text-white flex justify-between">
						Base Latency
						<span className="text-[var(--color-text-muted)] text-xs font-normal">ms</span>
					</label>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('base_latency_ms', Math.max(0, latency - 5))}>
							<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
						</Button>
						<Input type="number" value={latency} onChange={(e) => updateNodeData('base_latency_ms', parseInt(e.target.value) || 0)} className="bg-[#0f1115] text-center px-1" min={0} />
						<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('base_latency_ms', latency + 5)}>
							<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
						</Button>
					</div>
				</div>

				{isQueue && (
					<div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
						<label className="text-sm font-medium text-white flex justify-between">
							Queue Size
						</label>
						<div className="flex items-center gap-1">
							<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('queue_size', Math.max(100, queueSize - 1000))}>
								<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
							<Input type="number" value={queueSize} onChange={(e) => updateNodeData('queue_size', parseInt(e.target.value) || 0)} className="bg-[#0f1115] text-center px-1" min={100} />
							<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#1a1c23] border border-transparent hover:border-[#333]" onClick={() => updateNodeData('queue_size', queueSize + 1000)}>
								<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
						</div>
					</div>
				)}
			</div>
		);
	};

	const displayLabel = selectedNode?.data?.label || (selectedEdge ? 'Connection' : 'Properties');

	return (
		<div className="p-4 flex flex-col h-full pl-10">
			<div className="flex items-center justify-between mb-6">
				<h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
					{displayLabel}
				</h4>

				{selectedNode && selectedNode.type === 'techNode' && (
					<div className="flex bg-[#1a1c23] rounded-lg p-0.5">
						<button
							onClick={() => setActiveTab('config')}
							className={`p-1.5 rounded-md transition-all ${activeTab === 'config' ? 'bg-[#3caff6] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
							title="Configuration"
						>
							<Settings2 className="w-3.5 h-3.5" />
						</button>
						<button
							onClick={() => setActiveTab('resilience')}
							className={`p-1.5 rounded-md transition-all ${activeTab === 'resilience' ? 'bg-[#3caff6] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
							title="Resilience Policy"
						>
							<ShieldAlert className="w-3.5 h-3.5" />
						</button>
						<button
							onClick={() => setActiveTab('scaling')}
							className={`p-1.5 rounded-md transition-all ${activeTab === 'scaling' ? 'bg-[#3caff6] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
							title="Scaling Policy"
						>
							<Zap className="w-3.5 h-3.5" />
						</button>
						<button
							onClick={() => setActiveTab('metrics')}
							className={`p-1.5 rounded-md transition-all ${activeTab === 'metrics' ? 'bg-[#3caff6] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
							title="Real-time Metrics"
						>
							<BarChart3 className="w-3.5 h-3.5" />
						</button>
					</div>
				)}
			</div>

			<div className="flex-1 overflow-y-auto">
				{renderContent()}
			</div>
		</div>
	);
}

