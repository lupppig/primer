import { Handle, Position, NodeResizer } from 'reactflow';
import { Copy, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TECH_COMPONENTS } from '../../utils/iconMap';
import { useStore } from '../../store/useStore';

export default function TechNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
	const componentType = data.originalType || data.label;
	const TechEntry = TECH_COMPONENTS.find((t) => t.type === componentType);
	const Icon = TechEntry?.icon;
	const color = TechEntry?.color || '#3caff6';

	const simulation = useStore(state => state.simulation);
	const duplicateNode = useStore(state => state.duplicateNode);
	const deleteNode = useStore(state => state.deleteNode);
	const updateNodeData = useStore(state => state.updateNodeData);
	const [menuOpen, setMenuOpen] = useState(false);

	// Ensure fields have defaults for UI binding
	const capacityRps = data.capacity_rps ?? 1000;
	const baseLatencyMs = data.base_latency_ms ?? 10;
	const rateLimitRps = data.rate_limit_rps ?? '';

	// Auto-close menu if the node is deselected
	useEffect(() => {
		if (!selected) setMenuOpen(false);
	}, [selected]);

	const isBottleneck = simulation.isSimulating && simulation.activeBottlenecks.includes(id);
	const activeColor = isBottleneck ? '#ff3344' : color;

	// Node metrics during simulation
	const nodeMetrics = simulation.isSimulating ? (simulation.nodeMetrics[id] || {}) : {};
	const effectiveRps = nodeMetrics.effective_rps || 0;
	const utilization = nodeMetrics.utilization || 0;

	// Dynamic pulse speed based on network utilization
	let pulseSpeed = '2s';
	if (simulation.isSimulating) {
		const duration = Math.max(0.3, 2.0 - utilization * 1.7);
		pulseSpeed = `${duration}s`;
	}

	// Base classes for handles to handle hover and selection states
	const handleClasses = `w-2 h-2 rounded-full border border-white/20 bg-[var(--color-panel)] transition-all duration-200 hover:scale-150 hover:bg-[var(--color-primary)] active:bg-[var(--color-primary)] z-10 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`;

	return (
		<>
			<NodeResizer
				color="var(--color-primary)"
				isVisible={selected}
				minWidth={44}
				minHeight={44}
				handleStyle={{ width: 4, height: 4, border: 'none', borderRadius: '1px' }}
				lineStyle={{ border: '1px solid var(--color-primary)' }}
			/>
			<div
				className="relative group w-full h-full min-w-[44px] min-h-[44px] flex flex-col items-center justify-center cursor-pointer"
				onClick={() => setMenuOpen(!menuOpen)}
			>
				{/* Dropdown Action Menu */}
				{menuOpen && !simulation.isSimulating && (
					<div
						className="absolute -top-40 left-1/2 -translate-x-1/2 z-50 flex flex-col bg-[#0f111a] border border-[#2a2f40] rounded-lg shadow-2xl p-2 gap-2 min-w-[160px]"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Configuration Inputs */}
						<div className="flex flex-col gap-1.5 pb-2 border-b border-[#2a2f40]">
							<div className="flex justify-between items-center text-[10px] text-white">
								<span className="text-[var(--color-text-muted)]">Capacity (RPS)</span>
								<input
									type="number"
									className="bg-[#1f2330] rounded px-1.5 py-0.5 outline-none w-16 text-right"
									value={capacityRps}
									onChange={(e) => updateNodeData(id, { capacity_rps: Number(e.target.value) })}
								/>
							</div>
							<div className="flex justify-between items-center text-[10px] text-white">
								<span className="text-[var(--color-text-muted)]">Latency (ms)</span>
								<input
									type="number"
									className="bg-[#1f2330] rounded px-1.5 py-0.5 outline-none w-16 text-right"
									value={baseLatencyMs}
									onChange={(e) => updateNodeData(id, { base_latency_ms: Number(e.target.value) })}
								/>
							</div>
							<div className="flex justify-between items-center text-[10px] text-white">
								<span className="text-[var(--color-text-muted)]">Rate Limit</span>
								<input
									type="number"
									placeholder="None"
									className="bg-[#1f2330] rounded px-1.5 py-0.5 outline-none w-16 text-right placeholder-[#2a2f40]"
									value={rateLimitRps}
									onChange={(e) => updateNodeData(id, { rate_limit_rps: e.target.value === '' ? null : Number(e.target.value) })}
								/>
							</div>
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-1">
							<button
								onClick={() => { duplicateNode(id); setMenuOpen(false); }}
								className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1a1c23] rounded transition-colors w-full"
								title="Duplicate Node"
							>
								<Copy className="w-3.5 h-3.5 text-blue-400" />
								Duplicate
							</button>
							<button
								onClick={() => { deleteNode(id); setMenuOpen(false); }}
								className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-400/10 rounded transition-colors w-full"
								title="Delete Node"
							>
								<Trash2 className="w-3.5 h-3.5" />
								Delete
							</button>
						</div>
					</div>
				)}

				{/* Top Handle */}
				<Handle
					type="target"
					position={Position.Top}
					id="top"
					className={handleClasses}
				/>
				{/* Left Handle */}
				<Handle
					type="target"
					position={Position.Left}
					id="left"
					className={handleClasses}
				/>

				<div
					className={`w-full h-full rounded-lg flex items-center justify-center relative transition-all duration-300 bg-[#0f111a] border border-[#2a2f40] ${simulation.isSimulating ? 'animate-pulse' : ''}`}
					style={{
						// Solid background, neon border, and box-shadow glow
						boxShadow: isBottleneck ? `0 0 15px 2px ${activeColor}40` : `0 0 10px 1px ${activeColor}20`,
						borderColor: isBottleneck ? activeColor : `${activeColor}40`,
						animationDuration: simulation.isSimulating ? pulseSpeed : 'none'
					}}
				>
					{Icon ? (
						<Icon
							className="w-3/5 h-3/5 z-10 filter drop-shadow-md group-hover:scale-110 transition-transform duration-200"
							style={{ color: activeColor, filter: `drop-shadow(0 0 6px ${activeColor})` }}
						/>
					) : (
						<div className="w-3/5 h-3/5 bg-[var(--color-border)] rounded-sm opacity-50" /> /* Fallback */
					)}
				</div>

				{/* Label - visible on hover or when selected */}
				<div className={`absolute -bottom-6 whitespace-nowrap transition-opacity pointer-events-none z-20 ${selected || simulation.isSimulating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
					<div className="px-1 py-0.5 rounded bg-[#090a0f]/80 backdrop-blur-sm border border-[#1f2330] flex items-center gap-1 shadow-md">
						<p className="text-[10px] uppercase tracking-wider font-bold text-white/90 drop-shadow-md">{data.label}</p>
						{simulation.isSimulating && (
							<span className={`text-[9px] font-mono px-1 rounded-sm ${isBottleneck ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-[#3caff6]'}`}>
								{Math.round(effectiveRps)}/s
							</span>
						)}
					</div>
				</div>

				{/* Rate Limit Badge */}
				{data.rate_limit_rps && (
					<div className="absolute -top-2 -right-2 bg-amber-500/90 backdrop-blur text-black text-[8px] font-bold px-1 rounded z-30 shadow-sm border border-black/20" title={`Rate Limited to ${data.rate_limit_rps} RPS`}>
						{data.rate_limit_rps}/s
					</div>
				)}

				{/* Right Handle */}
				<Handle
					type="source"
					position={Position.Right}
					id="right"
					className={handleClasses}
				/>
				{/* Bottom Handle */}
				<Handle
					type="source"
					position={Position.Bottom}
					id="bottom"
					className={handleClasses}
				/>
			</div>
		</>
	);
}
