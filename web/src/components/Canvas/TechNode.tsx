import { Handle, Position, NodeResizer } from 'reactflow';
import { TECH_COMPONENTS } from '../../utils/iconMap';
import { useStore } from '../../store/useStore';

export default function TechNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
	const componentType = data.originalType || data.label;
	const TechEntry = TECH_COMPONENTS.find((t) => t.type === componentType);
	const Icon = TechEntry?.icon;
	const color = TechEntry?.color || '#3caff6';

	const simulation = useStore(state => state.simulation);
	const isBottleneck = simulation.isSimulating && simulation.activeBottlenecks.includes(id);
	const activeColor = isBottleneck ? '#ef4444' : color;

	// Base classes for handles to handle hover and selection states
	const handleClasses = `w-2 h-2 rounded-full border border-white/20 bg-[var(--color-panel)] transition-all duration-200 hover:scale-150 hover:bg-[var(--color-primary)] active:bg-[var(--color-primary)] z-10 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`;

	return (
		<>
			<NodeResizer
				color="var(--color-primary)"
				isVisible={selected}
				minWidth={40}
				minHeight={40}
				handleStyle={{ width: 4, height: 4, border: 'none', borderRadius: '1px' }}
				lineStyle={{ border: '1px solid var(--color-primary)' }}
			/>
			<div className="relative group w-full h-full min-w-[40px] min-h-[40px] flex flex-col items-center justify-center cursor-pointer">
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
					className={`w-full h-full rounded-xl flex items-center justify-center relative transition-all duration-200 ${isBottleneck ? 'animate-pulse' : ''}`}
				>
					{Icon ? (
						<Icon className="w-3/4 h-3/4 z-10 filter drop-shadow-md group-hover:drop-shadow-lg transition-all" style={{ color: activeColor }} />
					) : (
						<div className="w-3/4 h-3/4 bg-[var(--color-border)] rounded-md opacity-50" /> /* Fallback */
					)}
					{/* Subtle glow effect behind icon */}
					<div
						className={`absolute inset-0 blur-2xl transition-opacity ${isBottleneck ? 'opacity-50' : 'opacity-10 group-hover:opacity-30'}`}
						style={{ backgroundColor: activeColor }}
					/>
				</div>

				{/* Label - visible on hover or when selected, now natively supports custom Component Names! */}
				<div className={`absolute -bottom-6 whitespace-nowrap transition-opacity pointer-events-none z-20 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
					<div className="px-1 py-0.5 rounded bg-transparent">
						<p className="text-[10px] font-semibold text-white/70 drop-shadow-md">{data.label}</p>
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
