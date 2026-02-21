import { BaseEdge, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

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
}: EdgeProps) {
	const [edgePath] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	const strokeColor = style?.stroke || '#3caff6';

	return (
		<>
			<BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />

			{animated && (
				<circle r="4" fill={strokeColor} style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}>
					<animateMotion
						dur="1s"
						repeatCount="indefinite"
						path={edgePath}
					/>
				</circle>
			)}
		</>
	);
}
