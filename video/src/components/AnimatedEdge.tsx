import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme';

interface AnimatedEdgeProps {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	color?: string;
	animated?: boolean;
	delay?: number;
	label?: string;
}

export const AnimatedEdge: React.FC<AnimatedEdgeProps> = ({
	x1, y1, x2, y2,
	color = COLORS.primary,
	animated = false,
	delay = 0,
	label,
}) => {
	const frame = useCurrentFrame();
	const delayedFrame = Math.max(0, frame - delay);
	const opacity = interpolate(delayedFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

	// Dash animation offset
	const dashOffset = animated ? -((frame * 3) % 60) : 0;

	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.sqrt(dx * dx + dy * dy);
	const midX = (x1 + x2) / 2;
	const midY = (y1 + y2) / 2;

	return (
		<>
			<svg
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					pointerEvents: 'none',
					opacity,
				}}
			>
				<line
					x1={x1}
					y1={y1}
					x2={x2}
					y2={y2}
					stroke={color}
					strokeWidth={2.5}
					strokeDasharray={animated ? '8 6' : 'none'}
					strokeDashoffset={dashOffset}
					strokeLinecap="round"
				/>
				{/* Arrow head */}
				<circle cx={x2} cy={y2} r={4} fill={color} />
			</svg>
			{label && (
				<div
					style={{
						position: 'absolute',
						left: midX - 30,
						top: midY - 12,
						background: COLORS.panelBg,
						border: `1px solid ${COLORS.border}`,
						borderRadius: 6,
						padding: '2px 8px',
						fontSize: 9,
						fontFamily: "'Inter', sans-serif",
						color: COLORS.textMuted,
						opacity,
					}}
				>
					{label}
				</div>
			)}
		</>
	);
};
