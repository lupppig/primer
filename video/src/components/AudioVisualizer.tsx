import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

/**
 * Procedural ambient audio using the Web Audio API rendered to a canvas.
 * Since we can't include an MP3 file without external assets, this creates
 * a visual "audio waveform" visualization that appears in the corner,
 * giving the video an "alive" feel with breathing animations.
 *
 * For actual audio playback in the final render, use:
 *   <Audio src={staticFile('bgm.mp3')} volume={0.3} />
 * Place the audio file in video/public/bgm.mp3
 */
export const AudioVisualizer: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const barCount = 12;
	const barWidth = 3;
	const maxHeight = 16;
	const gap = 2;

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 75,
				right: 16,
				display: 'flex',
				alignItems: 'flex-end',
				gap,
				height: maxHeight,
				opacity: 0.5,
				zIndex: 40,
			}}
		>
			{Array.from({ length: barCount }, (_, i) => {
				const phase = (frame / fps) * 3 + i * 0.6;
				const height = (Math.sin(phase) * 0.4 + 0.5) * maxHeight;
				return (
					<div
						key={i}
						style={{
							width: barWidth,
							height: Math.max(2, height),
							background: '#3caff6',
							borderRadius: 1,
							opacity: 0.6 + Math.sin(phase) * 0.3,
						}}
					/>
				);
			})}
		</div>
	);
};
