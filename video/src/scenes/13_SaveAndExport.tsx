import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

/**
 * Scene 13: Saving and exporting your design.
 */
export const SaveAndExport: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const fadeIn = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });

	const formats = [
		{ id: 'PNG', desc: 'High quality image', icon: '🖼' },
		{ id: 'JPEG', desc: 'Compressed image', icon: '🖼' },
		{ id: 'PDF', desc: 'Vector document', icon: '📄' },
		{ id: 'SVG', desc: 'Scalable vector', icon: '📐' },
		{ id: 'GIF', desc: '6s simulation animation', icon: '🎬' },
	];

	const selectedIdx = Math.min(Math.floor(frame / 30), formats.length - 1);

	const narration = frame < 50
		? 'Click "Save" in the top bar to save your design.'
		: frame < 100
			? 'To export, click the Export icon in the left toolbar.'
			: 'Choose PNG for a diagram, or GIF to record a 6-second simulation animation.';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}20 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}20 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.2 }} />

			<div style={{ background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 14, width: 320, overflow: 'hidden', opacity: fadeIn, boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
				<div style={{ padding: 14, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
					<span style={{ fontSize: 14 }}>⬇</span>
					<span style={{ fontFamily: FONT.heading, fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>Export Project</span>
				</div>
				<div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
					{formats.map((fmt, i) => {
						const isSelected = i === selectedIdx;
						return (
							<div key={fmt.id} style={{
								display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8,
								background: isSelected ? `${COLORS.primary}10` : 'transparent',
								border: `1px solid ${isSelected ? `${COLORS.primary}40` : 'transparent'}`,
								opacity: interpolate(frame, [i * 5 + 20, i * 5 + 30], [0, 1], { extrapolateRight: 'clamp' }),
							}}>
								<div style={{ width: 24, height: 24, borderRadius: 6, background: isSelected ? COLORS.primary : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: isSelected ? COLORS.white : COLORS.textMuted }}>
									{fmt.icon}
								</div>
								<div>
									<div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? COLORS.textMain : COLORS.textMuted, fontFamily: FONT.body }}>{fmt.id}</div>
									<div style={{ fontSize: 9, color: COLORS.textDimmed, fontFamily: FONT.body }}>{fmt.desc}</div>
								</div>
							</div>
						);
					})}
					<div style={{ background: COLORS.primary, color: COLORS.white, padding: '8px 14px', borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 600, fontFamily: FONT.body, marginTop: 4 }}>⬇ Start Export</div>
				</div>
			</div>

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
				<div style={{ background: 'rgba(9,10,15,0.9)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px', maxWidth: 700 }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>{narration}</span>
				</div>
			</div>
		</div>
	);
};
