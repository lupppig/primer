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

	if (!edgePath) {
		return null;
	}

	const protocol = data?.protocol || 'HTTP';

	// We want the default edge to be subtle, and animated edge to be bright and moving.
	const strokeColor = style?.stroke || '#3caff6';
	let baseStrokeWidth = parseFloat(String(style?.strokeWidth)) || 1.5;

	let animDuration = data?.simDuration ?? 1.5;

	if (protocol === 'WebSocket') {
		baseStrokeWidth += 1;
	} else if (protocol === 'UDP') {
		animDuration = Math.max(0.1, animDuration * 0.5); // UDP is visually "faster"
	}

	return (
		<>
			{/* Base subtle edge */}
			<BaseEdge
				id={id}
				path={edgePath}
				markerEnd={markerEnd || undefined}
				style={{
					...style,
					stroke: protocol === 'WebSocket' && !simulation.isSimulating ? '#5048e580' : '#2a2f40',
					strokeWidth: baseStrokeWidth,
					strokeDasharray: protocol === 'WebSocket' && !simulation.isSimulating ? '0' : undefined
				}}
			/>

			{/* Animated Traffic Overlay - Multi-Packet Flow */}
			{simulation.isSimulating && animated && ((data?.rps ?? 0) > 0) && (
				<>
					{/* Base Pulse Path */}
					<path
						d={edgePath}
						fill="none"
						stroke={strokeColor}
						strokeWidth={Number(baseStrokeWidth) + 0.2}
						className="opacity-20 translate-z-0"
						style={{ filter: `blur(1px)` }}
					/>

					{/* Multiple Request Packets based on volume */}
					{[...Array(Math.min(12, Math.ceil((data?.rps || 0) / 5000) + 1))].map((_, i, arr) => {
						const delay = (i / arr.length) * animDuration;
						// Speed is adjusted by simSpeed
						const adjustedDuration = animDuration / simulation.simSpeed;
						const packetSize = Math.min(6, 2 + (data?.rps / 20000));

						return (
							<circle
								key={`${id}-packet-${i}`}
								r={packetSize}
								fill={strokeColor}
								className="pointer-events-none"
								style={{
									filter: `drop-shadow(0 0 ${packetSize * 1.5}px ${strokeColor})`,
								}}
							>
								<animateMotion
									dur={`${adjustedDuration}s`}
									repeatCount="indefinite"
									path={edgePath}
									begin={`-${delay}s`}
								/>
							</circle>
						);
					})}
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
