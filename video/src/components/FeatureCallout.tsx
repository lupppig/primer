import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { COLORS, FONT } from '../theme';

interface FeatureCalloutProps {
	items: string[];
	delay?: number;
}

export const FeatureCallout: React.FC<FeatureCalloutProps> = ({ items, delay = 0 }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
			}}
		>
			{items.map((item, i) => {
				const itemDelay = delay + i * 8;
				const delayedFrame = Math.max(0, frame - itemDelay);
				const opacity = spring({ frame: delayedFrame, fps, from: 0, to: 1, durationInFrames: 12 });
				const x = interpolate(delayedFrame, [0, 12], [30, 0], { extrapolateRight: 'clamp' });

				return (
					<div
						key={i}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							opacity,
							transform: `translateX(${x}px)`,
						}}
					>
						<div
							style={{
								width: 24,
								height: 24,
								borderRadius: 6,
								background: `${COLORS.primary}15`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 12,
								color: COLORS.primary,
								flexShrink: 0,
							}}
						>
							✓
						</div>
						<span
							style={{
								fontFamily: FONT.body,
								fontSize: 22,
								color: COLORS.textMain,
								letterSpacing: '-0.01em',
							}}
						>
							{item}
						</span>
					</div>
				);
			})}
		</div>
	);
};
