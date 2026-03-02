import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

/**
 * Scene 9: Setting up the traffic pattern before simulating.
 */
export const SetupTraffic: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const fadeIn = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });

	const dropdownOpen = frame > 60 && frame < 200;
	const patterns = ['Flat', 'Spike', 'Step Function'];
	const selectedIdx = frame < 140 ? -1 : 2; // Select "Step Function" at frame 140

	const baseRps = frame > 200 ? interpolate(frame, [200, 230], [0, 1500], { extrapolateRight: 'clamp' }) : 0;
	const peakRps = frame > 240 ? interpolate(frame, [240, 270], [0, 10000], { extrapolateRight: 'clamp' }) : 0;

	// SVG step curve
	const curveWidth = 300;
	const curveHeight = 80;

	const narration = frame < 50
		? 'Before simulating, we need to define our traffic pattern. Click "Load Profile" in the top bar.'
		: frame < 130
			? 'You\'ll see three options: Flat, Spike, and Step Function.'
			: frame < 200
				? 'Select "Step Function" — this simulates a permanent increase in traffic.'
				: frame < 250
					? 'Set Base RPS to 1,500 — our normal traffic level.'
					: 'Set Peak RPS to 10,000. Traffic will jump permanently from 1,500 to 10,000.';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}20 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}20 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.2 }} />

			{/* Top bar with Load Profile highlighted */}
			<div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, background: `${COLORS.panelBg}F0`, border: `1px solid ${COLORS.border}`, padding: '6px 14px', borderRadius: 14, opacity: fadeIn, zIndex: 5 }}>
				<span style={{ fontSize: 12, color: COLORS.textMain, fontFamily: FONT.body }}>• Ticket Booking</span>
				<div style={{ width: 1, height: 14, background: COLORS.border }} />
				<div style={{ display: 'flex', flexDirection: 'column', background: frame > 40 ? `${COLORS.primary}10` : 'transparent', padding: '2px 8px', borderRadius: 6, border: frame > 40 ? `1px solid ${COLORS.primary}40` : '1px solid transparent' }}>
					<span style={{ fontSize: 8, color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Load Profile</span>
					<span style={{ fontSize: 10, color: COLORS.primary, fontFamily: FONT.mono }}>{selectedIdx >= 0 ? 'STEP' : 'FLAT'}</span>
				</div>
				<div style={{ width: 1, height: 14, background: COLORS.border }} />
				<span style={{ fontSize: 10, color: COLORS.primary, fontFamily: FONT.mono }}>1.5K RPS</span>
				<div style={{ width: 1, height: 14, background: COLORS.border }} />
				<div style={{ background: COLORS.primary, color: COLORS.white, padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600 }}>▶ Simulate</div>
			</div>

			{/* Main content: Traffic config card */}
			<div style={{ background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, width: 440, opacity: fadeIn }}>
				<h3 style={{ fontFamily: FONT.heading, fontSize: 18, fontWeight: 700, color: COLORS.textMain, margin: 0, marginBottom: 20 }}>Traffic Pattern</h3>

				{/* Pattern selector */}
				<div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
					{patterns.map((p, i) => {
						const isSelected = i === selectedIdx;
						const isVisible = dropdownOpen || isSelected;
						return isVisible ? (
							<div key={p} style={{
								flex: 1,
								padding: '10px 8px',
								borderRadius: 8,
								textAlign: 'center',
								fontSize: 12,
								fontWeight: 600,
								fontFamily: FONT.body,
								background: isSelected ? `${COLORS.primary}15` : COLORS.panelBgAlt,
								border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
								color: isSelected ? COLORS.primary : COLORS.textMuted,
							}}>
								{p}
							</div>
						) : null;
					})}
				</div>

				{/* Step curve visualization */}
				{selectedIdx === 2 && (
					<div style={{ marginBottom: 24, opacity: interpolate(frame, [140, 160], [0, 1], { extrapolateRight: 'clamp' }) }}>
						<svg width={curveWidth} height={curveHeight} style={{ overflow: 'visible' }}>
							{[0.25, 0.5, 0.75].map(y => (
								<line key={y} x1={0} y1={curveHeight * y} x2={curveWidth} y2={curveHeight * y} stroke={COLORS.border} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
							))}
							<path d={`M 0 ${curveHeight * 0.7} L ${curveWidth * 0.4} ${curveHeight * 0.7} L ${curveWidth * 0.4} ${curveHeight * 0.15} L ${curveWidth} ${curveHeight * 0.15}`} fill="none" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
							<span style={{ fontSize: 9, color: COLORS.textDimmed, fontFamily: FONT.body }}>1,500 RPS</span>
							<span style={{ fontSize: 9, color: COLORS.primary, fontFamily: FONT.body, fontWeight: 700 }}>10,000 RPS</span>
						</div>
					</div>
				)}

				{/* Base RPS input */}
				<div style={{ marginBottom: 16, opacity: interpolate(frame, [195, 210], [0, 1], { extrapolateRight: 'clamp' }) }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
						<span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMain, fontFamily: FONT.body }}>Base RPS</span>
					</div>
					<div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${frame > 200 && frame < 240 ? COLORS.primary : COLORS.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, color: COLORS.textMain, fontFamily: FONT.mono, fontWeight: 700 }}>
						{Math.round(baseRps).toLocaleString() || '—'}
					</div>
				</div>

				{/* Peak RPS input */}
				<div style={{ opacity: interpolate(frame, [235, 250], [0, 1], { extrapolateRight: 'clamp' }) }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
						<span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMain, fontFamily: FONT.body }}>Peak RPS</span>
					</div>
					<div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${frame > 240 ? COLORS.primary : COLORS.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, color: COLORS.primary, fontFamily: FONT.mono, fontWeight: 700 }}>
						{Math.round(peakRps).toLocaleString() || '—'}
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
