import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FONT } from '../theme';
import { PrimerLogo } from './PrimerLogo';

interface BottomBarProps {
	designName?: string;
	trafficType?: string;
	trafficLabel?: string;
	simSpeed?: string;
	isSimulating?: boolean;
	burnRate?: number;
	/** Frame offset to animate click on Simulate */
	simulateClickFrame?: number;
}

/**
 * Accurate recreation of the real Primer bottom bar from Canvas.tsx.
 *
 * Layout (left to right):
 * 🏠 Home | 🔵 Design Name | TRAFFIC PATTERN [FLAT/STEP/SPIKE] | SIM SPEED [1x slider] | ⚙ 💬 | BURN RATE $0.00 | ▶ Simulate | 💾 Save
 *
 * Positioned at bottom-center (Panel position="bottom-center" in real code).
 */
export const BottomBar: React.FC<BottomBarProps> = ({
	designName = 'Untitled',
	trafficType = 'FLAT',
	trafficLabel = '1.5K RPS',
	simSpeed = '1x',
	isSimulating = false,
	burnRate = 0,
	simulateClickFrame,
}) => {
	const frame = useCurrentFrame();
	const clicked = simulateClickFrame !== undefined && frame > simulateClickFrame;
	const showSim = isSimulating || clicked;

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 24,
				left: '50%',
				transform: 'translateX(-50%)',
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				background: 'rgba(15,17,26,0.95)',
				backdropFilter: 'blur(12px)',
				border: `1px solid ${COLORS.border}`,
				padding: '8px 12px',
				borderRadius: 16,
				zIndex: 50,
			}}
		>
			{/* Home button */}
			<div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 14 }}>
				🏠
			</div>

			<div style={{ width: 1, height: 16, background: COLORS.border, margin: '0 2px' }} />

			{/* Design name with blue dot */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6 }}>
				<div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
				<span style={{ fontFamily: FONT.body, fontSize: 13, color: COLORS.textMain, fontWeight: 500 }}>{designName}</span>
			</div>

			<div style={{ width: 1, height: 16, background: COLORS.border }} />

			{/* Traffic Pattern */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px', borderRight: `1px solid ${COLORS.border}`, paddingRight: 16 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
					<span style={{ fontSize: 9, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT.body }}>Traffic Pattern</span>
					<span style={{ fontSize: 9, fontFamily: FONT.mono, fontWeight: 700, color: '#60a5fa' }}>{trafficType}</span>
				</div>
				<div style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '2px 8px', fontSize: 11, color: COLORS.textMain, fontFamily: FONT.body, textAlign: 'center' }}>
					{trafficLabel}
				</div>
			</div>

			{/* Sim Speed */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 100, padding: '0 8px' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<span style={{ fontSize: 9, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT.body }}>Sim Speed</span>
					<span style={{ fontSize: 9, fontFamily: FONT.mono, fontWeight: 700, color: '#60a5fa' }}>{simSpeed}</span>
				</div>
				{/* Slider visual */}
				<div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4, position: 'relative' }}>
					<div style={{ position: 'absolute', left: '10%', top: -2, width: 8, height: 8, borderRadius: '50%', background: '#60a5fa' }} />
				</div>
			</div>

			{/* Settings + Comments */}
			<div style={{ display: 'flex', gap: 2, padding: '0 4px' }}>
				<div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 12 }}>⚙</div>
				<div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 12 }}>💬</div>
			</div>

			<div style={{ width: 1, height: 16, background: COLORS.border }} />

			{/* Burn Rate (only during sim) */}
			{showSim && (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', borderRight: `1px solid ${COLORS.border}` }}>
					<span style={{ fontSize: 8, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT.body }}>Burn Rate</span>
					<span style={{ fontSize: 11, color: '#4ade80', fontFamily: FONT.mono, fontWeight: 700 }}>$ {burnRate.toFixed(4)}</span>
				</div>
			)}

			{/* Simulate button */}
			<div
				style={{
					background: showSim ? '#ef4444' : '#3caff6',
					color: COLORS.white,
					padding: '6px 14px',
					borderRadius: 8,
					fontSize: 12,
					fontFamily: FONT.body,
					fontWeight: 600,
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					boxShadow: !showSim ? '0 4px 12px rgba(60,175,246,0.2)' : '0 4px 12px rgba(239,68,68,0.2)',
				}}
			>
				{showSim ? '■ Stop Sim' : '▶ Simulate'}
			</div>

			{/* Save button */}
			<div
				style={{
					background: 'transparent',
					border: `1px solid ${COLORS.border}50`,
					color: COLORS.textMain,
					padding: '6px 14px',
					borderRadius: 8,
					fontSize: 12,
					fontFamily: FONT.body,
					fontWeight: 500,
					display: 'flex',
					alignItems: 'center',
					gap: 6,
				}}
			>
				💾 Save
			</div>
		</div>
	);
};
