import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { COLORS, FONT } from '../theme';

interface SectionTitleProps {
	title: string;
	subtitle?: string;
	icon?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, icon }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const scale = spring({ frame, fps, from: 0.8, to: 1, durationInFrames: 20 });
	const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });
	const lineWidth = interpolate(frame, [10, 40], [0, 200], { extrapolateRight: 'clamp' });

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				opacity,
				transform: `scale(${scale})`,
			}}
		>
			{icon && (
				<div
					style={{
						fontSize: 48,
						marginBottom: 16,
					}}
				>
					{icon}
				</div>
			)}
			<h2
				style={{
					fontFamily: FONT.heading,
					fontSize: 56,
					fontWeight: 800,
					color: COLORS.textMain,
					letterSpacing: '-0.03em',
					margin: 0,
					textAlign: 'center',
				}}
			>
				{title}
			</h2>
			{subtitle && (
				<p
					style={{
						fontFamily: FONT.body,
						fontSize: 24,
						color: COLORS.textMuted,
						marginTop: 12,
						letterSpacing: '-0.01em',
					}}
				>
					{subtitle}
				</p>
			)}
			<div
				style={{
					width: lineWidth,
					height: 3,
					background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
					marginTop: 20,
					borderRadius: 2,
				}}
			/>
		</div>
	);
};
