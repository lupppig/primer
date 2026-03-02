import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme';

interface CursorAnimationProps {
	/** Keyframes: array of { frame, x, y } positions */
	path: { frame: number; x: number; y: number }[];
	clicking?: boolean;
	clickAtFrame?: number;
}

export const CursorAnimation: React.FC<CursorAnimationProps> = ({ path, clickAtFrame }) => {
	const frame = useCurrentFrame();

	if (path.length < 2) return null;

	const frames = path.map((p) => p.frame);
	const xs = path.map((p) => p.x);
	const ys = path.map((p) => p.y);

	const x = interpolate(frame, frames, xs, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
	const y = interpolate(frame, frames, ys, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

	const isClicking = clickAtFrame !== undefined && Math.abs(frame - clickAtFrame) < 4;
	const cursorScale = isClicking ? 0.85 : 1;

	const opacity = interpolate(frame, [frames[0], frames[0] + 5], [0, 1], { extrapolateRight: 'clamp' });

	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: 24,
				height: 24,
				opacity,
				transform: `scale(${cursorScale})`,
				transition: 'transform 0.1s',
				zIndex: 1000,
				pointerEvents: 'none',
			}}
		>
			{/* SVG Cursor */}
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
				<path
					d="M5 3L19 12L12 13L9 20L5 3Z"
					fill={COLORS.white}
					stroke={COLORS.black}
					strokeWidth={1.5}
					strokeLinejoin="round"
				/>
			</svg>
			{/* Click ripple */}
			{isClicking && (
				<div
					style={{
						position: 'absolute',
						top: -8,
						left: -8,
						width: 40,
						height: 40,
						borderRadius: '50%',
						border: `2px solid ${COLORS.primary}`,
						opacity: 0.6,
						animation: 'ping 0.3s ease-out',
					}}
				/>
			)}
		</div>
	);
};
