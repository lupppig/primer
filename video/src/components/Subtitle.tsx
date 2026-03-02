import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

interface SubtitleProps {
	text: string;
	startFrame?: number;
	durationFrames?: number;
}

export const Subtitle: React.FC<SubtitleProps> = ({ text }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const fadeIn = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });
	const y = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: 'clamp' });

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 80,
				left: 0,
				right: 0,
				display: 'flex',
				justifyContent: 'center',
				opacity: fadeIn,
				transform: `translateY(${y}px)`,
			}}
		>
			<div
				style={{
					background: 'rgba(9, 10, 15, 0.85)',
					backdropFilter: 'blur(12px)',
					border: `1px solid ${COLORS.borderSubtle}`,
					borderRadius: 16,
					padding: '14px 32px',
					maxWidth: 1200,
				}}
			>
				<span
					style={{
						fontFamily: FONT.body,
						fontSize: 28,
						color: COLORS.textMain,
						lineHeight: 1.4,
						letterSpacing: '-0.02em',
					}}
				>
					{text}
				</span>
			</div>
		</div>
	);
};
