import { Handle, Position, NodeResizer } from 'reactflow';
import { Copy, Trash2, Flame, AlertTriangle, Layers, Zap, ShieldAlert, ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TECH_COMPONENTS } from '../../utils/iconMap';
import { useStore } from '../../store/useStore';

export default function TechNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
	const componentType = (data.originalType || data.label || '').toLowerCase();
	const [isEditing, setIsEditing] = useState(false);
	const [labelValue, setLabelValue] = useState(data.label || 'Service');
	const inputRef = useRef<HTMLInputElement>(null);

	// Fuzzy matching for icons
	let TechEntry = TECH_COMPONENTS.find((t) => t.type.toLowerCase() === componentType);
	if (!TechEntry) {
		TechEntry = TECH_COMPONENTS.find((t) => {
			const type = t.type.toLowerCase();
			return componentType.includes(type) || type.includes(componentType);
		});
	}

	const Icon = TechEntry?.icon || Layers;
	const color = TechEntry?.color || '#3caff6';

	const simulation = useStore(state => state.simulation);
	const duplicateNode = useStore(state => state.duplicateNode);
	const deleteNode = useStore(state => state.deleteNode);
	const toggleNodeFailure = useStore(state => state.toggleNodeFailure);
	const updateNodeData = useStore(state => state.updateNodeData);

	useEffect(() => {
		if (!selected && isEditing) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsEditing(false);
		}
	}, [selected, isEditing]);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const isFailed = (simulation.chaosNodes || []).includes(id);
	const isBottleneck = simulation.isSimulating && (simulation.activeBottlenecks || []).includes(id);
	const nodeMetrics = simulation.isSimulating ? (simulation.nodeMetrics[id] || {}) : {};
	const isTripped = nodeMetrics.status === 'tripped';
	const isDegraded = nodeMetrics.status === 'degraded';
	const scalingStatus = nodeMetrics.scaling_status || 'idle';
	const isScalingUp = scalingStatus === 'scaling_up';
	const isScalingDown = scalingStatus === 'scaling_down';

	// RED THEMED FAILURE/BOTTLENECK, ORANGE THEMED CIRCUIT TRIP
	let statusColor = isFailed || isBottleneck ? '#ef4444' : color;
	if (isTripped) statusColor = '#f97316'; // Orange for tripped
	else if (isDegraded) statusColor = '#fbbf24'; // Yellow-Orange for half-open/degraded

	let borderColor = isFailed || isBottleneck ? '#ef4444' : (selected ? color : '#2a2f40');
	if (isTripped) borderColor = '#f97316';
	else if (isDegraded) borderColor = '#fbbf24';

	const utilization = nodeMetrics.utilization || 0;
	const effectiveRps = nodeMetrics.effective_rps || 0;
	const latency = nodeMetrics.latency || 0;

	const handleRename = () => {
		updateNodeData(id, { label: labelValue });
		setIsEditing(false);
	};

	// Determine component category for specialized metrics
	const isDb = ['db', 'postgres', 'sql', 'mongo', 'rds', 'cassandra', 'database', 'storage'].some(d => componentType.includes(d));
	const isCache = ['redis', 'memcached', 'cache', 'cdn', 'cloudflare'].some(c => componentType.includes(c));
	const isLb = ['elb', 'load balancer', 'nginx', 'ha', 'gateway', 'proxy', 'api gateway'].some(l => componentType.includes(l));
	const isQueue = ['kafka', 'rabbitmq', 'sqs', 'queue', 'dlq'].some(q => componentType.includes(q));
	const isFirewall = ['firewall', 'shield', 'security', 'waf'].some(f => componentType.includes(f));
	const isCdn = ['cdn', 'cloudflare', 'cloudfront', 'edge'].some(c => componentType.includes(c));
	const isStorage = ['storage', 'disk', 's3', 'bucket', 'nas', 'san'].some(s => componentType.includes(s));
	const isDlq = componentType.includes('dlq') || componentType.includes('dead letter');
	const isSplitter = componentType.includes('splitter') || componentType.includes('canary');
	const isExternal = data.type === 'external' || componentType.includes('external') || componentType.includes('stripe') || componentType.includes('auth0');

	const handleClasses = `w-2 h-2 rounded-full border border-white/20 bg-[var(--color-panel)] transition-all duration-200 hover:scale-150 hover:bg-[var(--color-primary)] active:bg-[var(--color-primary)] z-10 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`;

	return (
		<>
			<NodeResizer
				color={statusColor}
				isVisible={selected && !isEditing}
				minWidth={180}
				minHeight={80}
				handleStyle={{ width: 6, height: 6, border: 'none', borderRadius: '2px' }}
			/>

			<div
				className={`relative group w-full h-full bg-[#0f111a]/95 backdrop-blur-sm border-2 rounded-xl shadow-2xl transition-all duration-300 flex flex-col overflow-hidden ${isFailed ? 'grayscale-[0.8] opacity-80' : ''} ${isExternal ? 'border-dashed' : ''}`}
				style={{
					borderColor: isExternal && !selected ? '#f59e0b50' : borderColor,
					boxShadow: isTripped ? '0 0 25px -5px #f9731680' : (isBottleneck || isFailed ? '0 0 20px -5px #ef444460' : (selected ? `0 0 15px -5px ${color}40` : 'none'))
				}}
				onDoubleClick={() => setIsEditing(true)}
			>
				{/* External Badge */}
				{isExternal && (
					<div className="absolute top-0 right-0 bg-orange-500 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-bl-lg shadow-lg z-20 uppercase tracking-widest border-l border-b border-[#2a2f40]/50">
						Ext Provider
					</div>
				)}
				{/* Top Handle */}
				<Handle type="target" position={Position.Top} id="top" className={handleClasses} />
				<Handle type="target" position={Position.Left} id="left" className={handleClasses} />

				{/* Header Section */}
				<div className="p-3 border-b border-[#2a2f40]/50 flex items-center justify-between bg-white/[0.02]">
					<div className="flex items-center gap-2 overflow-hidden">
						<div
							className="p-1.5 rounded-lg flex items-center justify-center shrink-0"
							style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
						>
							<Icon size={18} />
						</div>

						<div className="flex flex-col min-w-0">
							{isEditing ? (
								<input
									ref={inputRef}
									className="bg-[#1a1c2e] text-[11px] font-bold text-white px-1 py-0.5 rounded outline-none border border-blue-500/50 w-full"
									value={labelValue}
									onChange={(e) => setLabelValue(e.target.value)}
									onBlur={handleRename}
									onKeyDown={(e) => e.key === 'Enter' && handleRename()}
								/>
							) : (
								<span className="text-[11px] font-bold text-slate-100 truncate uppercase tracking-tight">
									{data.label}
								</span>
							)}
							<span className="text-[8px] text-slate-500 uppercase font-medium truncate tracking-widest">
								{TechEntry?.type || 'Node'}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0 ml-2">
						{isScalingUp && <ChevronUp size={12} className="text-blue-400 animate-bounce" />}
						{isScalingDown && <ChevronDown size={12} className="text-blue-400 animate-bounce" />}
						{isTripped && <ShieldAlert size={12} className="text-orange-500 animate-pulse" />}
						{isBottleneck && <AlertTriangle size={12} className="text-red-500 animate-pulse" />}
						<div
							className={`size-1.5 rounded-full ${isFailed || isBottleneck ? 'bg-red-500 animate-pulse' : (isTripped ? 'bg-orange-500 animate-pulse' : (isDegraded ? 'bg-yellow-400' : 'bg-green-500'))}`}
						/>
					</div>
				</div>

				{/* Metrics Content */}
				<div className="p-3 flex-1 flex flex-col justify-center gap-2">
					{!simulation.isSimulating ? (
						<div className="flex items-center gap-2 text-[9px] text-slate-500 italic opacity-60 uppercase font-mono tracking-tighter">
							<Zap size={10} /> Ready for simulation
						</div>
					) : (
						<>
							{/* Specialized Metrics View */}
							{isLb ? (
								<div className="flex flex-col gap-1">
									<MetricRow label="Throughput" value={`${Math.round(effectiveRps)} rps`} trend="up" color={statusColor} />
									<MetricRow label="Latency" value={`${Math.round(latency)}ms`} trend="down" color="#fbbf24" />
								</div>
							) : isCdn ? (
								<div className="flex flex-col gap-1">
									<MetricRow label="Edge Hit Rate" value={`${Math.round(85 + (utilization * 10))}%`} color="#F38020" />
									<MetricRow label="Egress" value={`${Math.round(effectiveRps)}/s`} color="#3caff6" />
								</div>
							) : isFirewall ? (
								<div className="flex flex-col gap-1">
									<MetricRow label="Filtered" value={numberFormat(nodeMetrics.dropped_requests || 0)} color="#ef4444" />
									<MetricRow label="Allowed" value={numberFormat(effectiveRps)} color="#10b981" />
								</div>
							) : isStorage ? (
								<div className="flex flex-col gap-1">
									<MetricRow label="IOPS Use" value={`${Math.round(utilization * 100)}%`} color="#64748B" />
									<MetricRow label="Throughput" value={`${(utilization * 250).toFixed(0)}MB/s`} color="#3b82f6" />
								</div>
							) : isDb ? (
								<div className="flex flex-col gap-1">
									<MetricRow label="IOPS" value={numberFormat(effectiveRps * 1.5)} color="#10b981" />
									<MetricRow label="Conns" value={`${Math.round(utilization * 128)}/200`} color="#6366f1" />
								</div>
							) : isCache ? (
								<div className="flex flex-col gap-1">
									<MetricRow label="Hit Rate" value={`${Math.round(95 - (utilization * 15))}%`} color="#f43f5e" />
									<MetricRow label="Memory" value={`${(utilization * 8).toFixed(1)}GB`} color="#ec4899" />
								</div>
							) : isQueue ? (
								<div className="flex flex-col gap-1">
									<MetricRow label={isDlq ? "DLQ Depth" : "Q Depth"} value={numberFormat(nodeMetrics.queue_depth || 0)} color={isDlq ? "#f87171" : "#e879f9"} />
									<MetricRow label="Msg Rate" value={`${Math.round(effectiveRps)}/s`} color="#38bdf8" />
								</div>
							) : isSplitter ? (
								<div className="flex flex-col gap-1">
									<MetricRow label="Mode" value="Probabilistic" color="#3b82f6" />
									<MetricRow label="Egress" value={`${Math.round(effectiveRps)}/s`} color="#10b981" />
								</div>
							) : (
								/* Default Compute/Service metrics */
								<div className="flex flex-col gap-1.5">
									<div>
										<div className="flex justify-between text-[8px] text-slate-400 mb-0.5 uppercase font-medium">
											<span>CPU Load</span>
											<span className={utilization > 0.8 ? 'text-red-400 font-bold' : ''}>{Math.round(utilization * 100)}%</span>
										</div>
										<div className="h-1 bg-[#1a1c2e] rounded-full overflow-hidden">
											<div
												className="h-full transition-all duration-300"
												style={{ width: `${utilization * 100}%`, backgroundColor: utilization > 0.8 ? '#ef4444' : color }}
											/>
										</div>
									</div>
									<div className="flex justify-between items-center text-[9px] font-mono">
										<span className="text-slate-500 uppercase text-[8px]">Memory</span>
										<span className="text-slate-300">{(2 + utilization * 4).toFixed(1)} GB</span>
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Selection/Action Menu Hover */}
				{/* Selection/Action Menu Hover */}
				{selected && !isEditing && (
					<div className="absolute top-1 right-8 flex items-center gap-1 bg-[#0f111a] border border-[#2a2f40] px-1.5 py-0.5 rounded shadow-xl">
						<div className="flex items-center gap-1.5 mr-2 px-1 border-r border-[#2a2f40]">
							<span className="text-[9px] text-slate-500 font-bold uppercase">Repl</span>
							<input
								type="number"
								className="bg-transparent text-[9px] text-blue-400 font-mono w-8 outline-none"
								value={data.replicas === 0 ? '' : (data.replicas || 1)}
								onChange={(e) => updateNodeData(id, { replicas: e.target.value === '' ? 1 : (parseInt(e.target.value) || 1) })}
							/>
						</div>
						<button onClick={() => duplicateNode(id)} className="p-1 hover:text-blue-400 transition-colors text-slate-400" title="Duplicate"><Copy size={11} /></button>
						<button onClick={() => toggleNodeFailure(id)} className={`p-1 transition-colors ${isFailed ? 'text-green-500' : 'text-orange-500'}`} title={isFailed ? "Recover" : "Chaos"}>
							<Flame size={11} className={isFailed ? '' : 'animate-bounce'} />
						</button>
						<button onClick={() => deleteNode(id)} className="p-1 hover:text-red-500 transition-colors text-slate-400" title="Delete"><Trash2 size={11} /></button>
					</div>
				)}

				{/* Insights Tooltip (Hover) */}
				<AnimatePresence>
					{simulation.isSimulating && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							whileHover={{ opacity: 1, y: 0 }}
							className="absolute -top-32 left-0 w-full min-w-[200px] z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
						>
							<div className="bg-[#0f111a] border border-[#2a2f40] p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col gap-2">
								<div className="flex justify-between items-center border-b border-[#2a2f40] pb-1.5 mb-1">
									<h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Node Insight</h4>
									<div className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${nodeMetrics.bottleneck ? 'bg-red-500/10 text-red-500' : (isTripped ? 'bg-orange-500/10 text-orange-500' : (scalingStatus !== 'idle' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-500'))}`}>
										{nodeMetrics.bottleneck ? 'Congested' : (isTripped ? 'Tripped' : (scalingStatus !== 'idle' ? scalingStatus.replace('_', ' ') : 'Healthy'))}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
									<TooltipRow label="Raw Ingress" value={`${Math.round(nodeMetrics.incoming_rps || 0)}/s`} />
									<TooltipRow label="Replicas" value={nodeMetrics.replica_count || 1} />
									<TooltipRow label="Drop Rate" value={`${Math.round((nodeMetrics.dropped_requests || 0))} pks`} color={nodeMetrics.dropped_requests > 0 ? '#ef4444' : undefined} />
									<TooltipRow label="Retry RPS" value={Math.round(nodeMetrics.retry_rps || 0)} color={nodeMetrics.budget_exhausted ? '#a855f7' : undefined} />
								</div>

								{(nodeMetrics.failure_reason || nodeMetrics.budget_exhausted) && (
									<div className={`mt-1 p-1.5 border rounded text-[9px] font-medium ${nodeMetrics.budget_exhausted ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
										{nodeMetrics.budget_exhausted ? '⚡ Mesh: Retry Budget Exhausted' : `Reason: ${nodeMetrics.failure_reason}`}
									</div>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Bottom Handles */}
				<Handle type="source" position={Position.Right} id="right" className={handleClasses} />
				<Handle type="source" position={Position.Bottom} id="bottom" className={handleClasses} />
			</div>
		</>
	);
}

function TooltipRow({ label, value, color }: { label: string, value: string | number, color?: string }) {
	return (
		<div className="flex justify-between items-center text-[9px]">
			<span className="text-slate-500 uppercase tracking-tighter">{label}</span>
			<span className="font-mono text-slate-300 font-bold" style={{ color }}>{value}</span>
		</div>
	);
}

function MetricRow({ label, value, color }: { label: string, value: string, trend?: 'up' | 'down', color: string }) {
	return (
		<div className="flex justify-between items-center text-[9px] group/row">
			<span className="text-slate-500 uppercase font-medium text-[8px] tracking-tight">{label}</span>
			<span className="font-bold font-mono tracking-tighter" style={{ color }}>{value}</span>
		</div>
	);
}

function numberFormat(val: number) {
	if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
	if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
	return Math.round(val).toString();
}
