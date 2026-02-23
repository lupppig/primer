import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { useStore } from '../../store/useStore';

export default function TrafficEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	style = {},
	animated = false,
	markerEnd,
	data,
	selected
}: EdgeProps) {
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	const simulation = useStore(state => state.simulation);
	const updateEdgeProtocol = useStore(state => state.updateEdgeProtocol);

	const protocol = data?.protocol || 'HTTP';

	// We want the default edge to be subtle, and animated edge to be bright and moving.
	const strokeColor = style?.stroke || '#3caff6';
	let baseStrokeWidth = Number(style?.strokeWidth || 1.5);

	// Different styles strictly based on the explicit protocol connection type
	let dashArray = '4 8'; // HTTP default (Standard dashed)
	let animDuration = data?.simDuration ?? 1.5;
	let protocolFilter = `drop-shadow(0 0 5px ${strokeColor})`;

	if (protocol === 'WebSocket') {
		dashArray = '0'; // Solid glowing pipe
		baseStrokeWidth += 1;
		protocolFilter = `drop-shadow(0 0 8px ${strokeColor}) drop-shadow(0 0 15px ${strokeColor})`;
	} else if (protocol === 'UDP') {
		dashArray = '2 15'; // Very sparse, fast dots
		animDuration = Math.max(0.1, animDuration * 0.5); // UDP is visually "faster"
	} else if (protocol === 'gRPC') {
		dashArray = '8 4'; // Longer dashes
	}

	return (
		<>
			{/* Base subtle edge */}
			<BaseEdge
				id={id}
				path={edgePath}
				markerEnd={markerEnd}
				style={{
					...style,
					stroke: protocol === 'WebSocket' && !simulation.isSimulating ? '#5048e580' : '#2a2f40',
					strokeWidth: baseStrokeWidth,
					strokeDasharray: protocol === 'WebSocket' && !simulation.isSimulating ? '0' : undefined
				}}
			/>

			{/* Animated Traffic Overlay */}
			{simulation.isSimulating && animated && (
				<>
					<path
						d={edgePath}
						fill="none"
						className="animate-flow-dash"
						stroke={strokeColor}
						strokeWidth={Number(baseStrokeWidth) + 0.5}
						strokeDasharray={dashArray}
						style={{
							filter: protocolFilter,
							animation: protocol === 'WebSocket' ? 'none' : `flow ${animDuration}s linear infinite reverse`
						}}
					/>

					{/* Highlight Packet indicating flow direction (Skip for WebSockets as it's a solid pipe) */}
					{protocol !== 'WebSocket' && (
						<circle r="4" fill={strokeColor} style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}>
							<animateMotion
								dur={`${animDuration}s`}
								repeatCount="indefinite"
								path={edgePath}
							/>
						</circle>
					)}
				</>
			)}

			{/* Edge Protocol Select Label */}
			{selected && !simulation.isSimulating && (
				<EdgeLabelRenderer>
					<div
						style={{
							position: 'absolute',
							transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
							pointerEvents: 'all',
						}}
						className="nodrag nopan z-50 bg-[#0f111a] border border-[#2a2f40] rounded shadow-xl p-1 flex items-center gap-2"
					>
						<select
							className="bg-transparent text-xs text-white font-mono outline-none cursor-pointer p-0.5 rounded hover:bg-[#1a1c23]"
							value={protocol}
							onChange={(e) => updateEdgeProtocol(id, e.target.value as any)}
						>
							<option value="HTTP">HTTP</option>
							<option value="gRPC">gRPC</option>
							<option value="WebSocket">WebSocket</option>
							<option value="UDP">UDP</option>
						</select>
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
}
