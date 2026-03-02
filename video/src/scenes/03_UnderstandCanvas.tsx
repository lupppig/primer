import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { BottomBar } from '../components/BottomBar';

/**
 * Scene 3: Understand the Canvas Layout.
 * Shows the real Primer canvas with:
 * - FloatingToolbar on the left
 * - BottomBar at the bottom-center
 * - Properties panel on the right (dimmed)
 * - Labeled callout annotations explaining each area
 */
export const UnderstandCanvas: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const callouts = [
		{ x: 80, y: 360, label: 'Left Toolbar', desc: 'Select, Text, Shapes, Components, Draw, Comment, Export & Analytics', start: 30, arrow: 'left' as const },
		{ x: 600, y: 860, label: 'Bottom Bar', desc: 'Project name, Traffic Pattern, Sim Speed, Simulate & Save', start: 70, arrow: 'down' as const },
		{ x: 1350, y: 350, label: 'Properties Panel', desc: 'Opens when you click a component on the canvas', start: 110, arrow: 'right' as const },
		{ x: 700, y: 400, label: 'Canvas', desc: 'Your workspace — drag components here to build your architecture', start: 150, arrow: 'none' as const },
	];

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, position: 'relative', overflow: 'hidden' }}>
			{/* Canvas grid — matches ReactFlow Background with Lines variant */}
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}25 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}25 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.5 }} />

			{/* Floating Toolbar (left) */}
			<FloatingToolbar activeTool="select" />

			{/* Properties panel placeholder (right, dimmed) */}
			<div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 300, background: `${COLORS.panelBg}60`, borderLeft: `1px solid ${COLORS.border}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: interpolate(frame, [5, 20], [0, 0.5], { extrapolateRight: 'clamp' }) }}>
				<span style={{ fontFamily: FONT.body, fontSize: 12, color: COLORS.textDimmed, fontStyle: 'italic' }}>Click a component to view properties</span>
			</div>

			{/* Bottom Bar */}
			<BottomBar designName="Untitled Design" trafficType="FLAT" trafficLabel="1K RPS" simSpeed="1x" />

			{/* ReactFlow Controls (bottom-left miniature) */}
			<div style={{ position: 'absolute', bottom: 80, left: 16, display: 'flex', flexDirection: 'column', gap: 1, background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 6, opacity: 0.6 }}>
				{['+', '−', '⊞'].map(c => (
					<div key={c} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: COLORS.textMuted }}>{c}</div>
				))}
			</div>

			{/* MiniMap (bottom-right) */}
			<div style={{ position: 'absolute', bottom: 80, right: 16, width: 120, height: 80, background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 6, opacity: 0.4 }} />

			{/* Callout annotations */}
			{callouts.map((c) => {
				const cOpacity = interpolate(frame, [c.start, c.start + 15], [0, 1], { extrapolateRight: 'clamp' });
				const cY = interpolate(frame, [c.start, c.start + 15], [8, 0], { extrapolateRight: 'clamp' });
				return (
					<div key={c.label} style={{ position: 'absolute', left: c.x, top: c.y, opacity: cOpacity, transform: `translateY(${cY}px)`, zIndex: 60 }}>
						<div style={{ background: COLORS.primary, borderRadius: 8, padding: '7px 14px', display: 'inline-flex', flexDirection: 'column', gap: 2, boxShadow: `0 4px 20px ${COLORS.primary}30` }}>
							<span style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: COLORS.white }}>{c.label}</span>
							<span style={{ fontFamily: FONT.body, fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>{c.desc}</span>
						</div>
					</div>
				);
			})}

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' }), zIndex: 70 }}>
				<div style={{ background: 'rgba(9,10,15,0.95)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px' }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>
						This is your canvas. Let's learn what each part does.
					</span>
				</div>
			</div>
		</div>
	);
};
