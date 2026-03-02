import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

/**
 * Scene 11: Fix the bottleneck — scale up replicas and enable auto-scaling.
 */
export const FixBottleneck: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const fadeIn = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });

	const replicaValue = frame > 80 ? interpolate(frame, [80, 120], [1, 5], { extrapolateRight: 'clamp' }) : 1;
	const autoScaleEnabled = frame > 180;
	const cpuAfterFix = frame > 240 ? interpolate(frame, [240, 300], [250, 65], { extrapolateRight: 'clamp' }) : 250;
	const latencyAfterFix = frame > 240 ? interpolate(frame, [240, 300], [400, 25], { extrapolateRight: 'clamp' }) : 400;

	const narration = frame < 70
		? 'Our App-Server is at 250% CPU — way overloaded. Let\'s fix it.'
		: frame < 170
			? 'In the Properties panel, increase Replicas from 1 to 5.'
			: frame < 240
				? 'Or enable Auto-Scaling with Target Utilization at 70% and Max Replicas at 10.'
				: 'Much better! CPU dropped to ' + Math.round(cpuAfterFix) + '% and latency is ' + Math.round(latencyAfterFix) + 'ms.';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, display: 'flex', position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}20 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}20 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.2 }} />

			{/* Left: Before/After metrics */}
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, opacity: fadeIn }}>
				{/* Before */}
				<div style={{ background: `${COLORS.red}08`, border: `1px solid ${COLORS.red}40`, borderRadius: 14, padding: 20, width: 320, opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }) }}>
					<div style={{ fontSize: 10, fontWeight: 700, color: COLORS.red, textTransform: 'uppercase', fontFamily: FONT.body, marginBottom: 10 }}>⚠ Before — Bottleneck</div>
					<div style={{ display: 'flex', justifyContent: 'space-around' }}>
						<div style={{ textAlign: 'center' }}>
							<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.red, fontFamily: FONT.mono }}>250%</div>
							<div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase' }}>CPU Load</div>
						</div>
						<div style={{ textAlign: 'center' }}>
							<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.red, fontFamily: FONT.mono }}>400ms</div>
							<div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase' }}>Latency</div>
						</div>
						<div style={{ textAlign: 'center' }}>
							<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textMain, fontFamily: FONT.mono }}>1</div>
							<div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase' }}>Replica</div>
						</div>
					</div>
				</div>

				{/* After */}
				{frame > 240 && (
					<div style={{ background: `${COLORS.green}08`, border: `1px solid ${COLORS.green}40`, borderRadius: 14, padding: 20, width: 320, opacity: interpolate(frame, [240, 260], [0, 1], { extrapolateRight: 'clamp' }) }}>
						<div style={{ fontSize: 10, fontWeight: 700, color: COLORS.green, textTransform: 'uppercase', fontFamily: FONT.body, marginBottom: 10 }}>✓ After — Fixed</div>
						<div style={{ display: 'flex', justifyContent: 'space-around' }}>
							<div style={{ textAlign: 'center' }}>
								<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.green, fontFamily: FONT.mono }}>{Math.round(cpuAfterFix)}%</div>
								<div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase' }}>CPU Load</div>
							</div>
							<div style={{ textAlign: 'center' }}>
								<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.green, fontFamily: FONT.mono }}>{Math.round(latencyAfterFix)}ms</div>
								<div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase' }}>Latency</div>
							</div>
							<div style={{ textAlign: 'center' }}>
								<div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textMain, fontFamily: FONT.mono }}>5</div>
								<div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase' }}>Replicas</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Right: Properties panel with Scaling config */}
			<div style={{ width: 340, background: COLORS.panelBg, borderLeft: `1px solid ${COLORS.border}`, padding: 20, opacity: fadeIn }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${COLORS.border}` }}>
					<span style={{ fontSize: 14 }}>⚙️</span>
					<span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 700, color: COLORS.textMain }}>Properties</span>
				</div>

				{/* Config tab */}
				<div style={{ marginBottom: 20 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
						<span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMain, fontFamily: FONT.body }}>Replicas</span>
						<span style={{ fontSize: 9, color: COLORS.textMuted }}>Instances</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<div style={{ background: COLORS.border, borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: COLORS.textMain }}>−</div>
						<div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: `1px solid ${frame > 70 && frame < 130 ? COLORS.primary : COLORS.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, color: COLORS.textMain, fontFamily: FONT.mono, fontWeight: 700, textAlign: 'center' }}>
							{Math.round(replicaValue)}
						</div>
						<div style={{ background: COLORS.border, borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: COLORS.textMain }}>+</div>
					</div>
				</div>

				{/* Scaling tab */}
				<div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, opacity: interpolate(frame, [140, 160], [0, 1], { extrapolateRight: 'clamp' }) }}>
					<div style={{ fontSize: 10, fontWeight: 700, color: COLORS.primary, textTransform: 'uppercase', fontFamily: FONT.body, marginBottom: 12 }}>📈 Auto-Scaling</div>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
						<span style={{ fontSize: 12, color: COLORS.textMain, fontFamily: FONT.body }}>Enable Auto-Scaling</span>
						<div style={{ width: 36, height: 20, borderRadius: 10, background: autoScaleEnabled ? COLORS.green : COLORS.border, display: 'flex', alignItems: 'center', padding: 2 }}>
							<div style={{ width: 16, height: 16, borderRadius: '50%', background: COLORS.white, marginLeft: autoScaleEnabled ? 16 : 0 }} />
						</div>
					</div>
					{autoScaleEnabled && (
						<>
							<div style={{ marginBottom: 10 }}>
								<span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONT.body }}>Target Utilization</span>
								<div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '6px 10px', marginTop: 4, fontSize: 12, fontFamily: FONT.mono, color: COLORS.textMain }}>70%</div>
							</div>
							<div>
								<span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONT.body }}>Max Replicas</span>
								<div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '6px 10px', marginTop: 4, fontSize: 12, fontFamily: FONT.mono, color: COLORS.textMain }}>10</div>
							</div>
						</>
					)}
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
