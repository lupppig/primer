import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

/**
 * Scene 8: Configuring Redis Cache — hit rate and latency.
 */
export const ConfigureRedis: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const panelOpacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });

	const hitRate = frame > 80 ? interpolate(frame, [80, 120], [50, 80], { extrapolateRight: 'clamp' }) : 50;

	const narration = frame < 60
		? 'Now click on the Redis node to configure the cache.'
		: frame < 140
			? 'Set the Hit Rate to 80% — meaning 80% of reads are served from cache memory.'
			: 'Set Hit Latency to 2ms. This dramatically reduces load on PostgreSQL.';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, display: 'flex', position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}20 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}20 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.2 }} />

			{/* Left: explanation */}
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: panelOpacity }}>
				{/* Mini node */}
				<div style={{ display: 'inline-flex', background: COLORS.panelBgAlt, border: `2px solid #DC382D`, borderRadius: 12, padding: 14, gap: 10, alignItems: 'center', marginBottom: 32 }}>
					<div style={{ width: 28, height: 28, borderRadius: 8, background: '#DC382D20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
					<div>
						<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.textMain, fontFamily: FONT.body, textTransform: 'uppercase' }}>Redis</div>
						<div style={{ fontSize: 8, color: COLORS.textDimmed, textTransform: 'uppercase' }}>REDIS</div>
					</div>
				</div>

				{/* Visual: cache diagram */}
				<div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
					<div style={{ textAlign: 'center' }}>
						<div style={{ fontSize: 32, fontWeight: 800, color: COLORS.green, fontFamily: FONT.mono }}>{Math.round(hitRate)}%</div>
						<div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONT.body, textTransform: 'uppercase', marginTop: 4 }}>Cache Hits</div>
						<div style={{ fontSize: 10, color: COLORS.textDimmed, fontFamily: FONT.body, marginTop: 2 }}>Served from memory (2ms)</div>
					</div>
					<div style={{ width: 1, height: 60, background: COLORS.border }} />
					<div style={{ textAlign: 'center' }}>
						<div style={{ fontSize: 32, fontWeight: 800, color: COLORS.yellow, fontFamily: FONT.mono }}>{Math.round(100 - hitRate)}%</div>
						<div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONT.body, textTransform: 'uppercase', marginTop: 4 }}>Cache Misses</div>
						<div style={{ fontSize: 10, color: COLORS.textDimmed, fontFamily: FONT.body, marginTop: 2 }}>Fall through to PostgreSQL (20ms)</div>
					</div>
				</div>
			</div>

			{/* Right: Properties panel */}
			<div style={{ width: 340, background: COLORS.panelBg, borderLeft: `1px solid ${COLORS.border}`, padding: 20, opacity: panelOpacity }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${COLORS.border}` }}>
					<span style={{ fontSize: 14 }}>⚙️</span>
					<span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 700, color: COLORS.textMain }}>Properties</span>
				</div>

				<div style={{ background: '#DC382D20', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, color: '#DC382D', fontFamily: FONT.body, display: 'inline-block', marginBottom: 16 }}>REDIS</div>

				{/* Hit Rate field */}
				<div style={{ marginBottom: 20, opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' }) }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
						<span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMain, fontFamily: FONT.body }}>Cache Hit Rate</span>
						<span style={{ fontSize: 9, color: COLORS.textMuted }}>%</span>
					</div>
					<div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${frame > 70 ? COLORS.primary : COLORS.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: COLORS.textMain, fontFamily: FONT.mono, fontWeight: 600 }}>
						{Math.round(hitRate)}
					</div>
					{/* Slider visualization */}
					<div style={{ height: 4, background: '#1a1c23', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
						<div style={{ height: '100%', width: `${hitRate}%`, background: '#DC382D', borderRadius: 4 }} />
					</div>
				</div>

				{/* Hit Latency field */}
				<div style={{ opacity: interpolate(frame, [130, 145], [0, 1], { extrapolateRight: 'clamp' }) }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
						<span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMain, fontFamily: FONT.body }}>Hit Latency</span>
						<span style={{ fontSize: 9, color: COLORS.textMuted }}>ms</span>
					</div>
					<div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: COLORS.textMain, fontFamily: FONT.mono, fontWeight: 600 }}>
						2.0
					</div>
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
