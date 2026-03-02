import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FONT } from '../theme';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { BottomBar } from '../components/BottomBar';
import { AnimatedNode } from '../components/AnimatedNode';
import type { NodeData } from '../types';

/**
 * Scene 4: Adding your first component.
 * Click Components tool → see tech palette → highlight HAProxy → drag to canvas.
 */
export const AddFirstComponent: React.FC = () => {
	const frame = useCurrentFrame();

	const popoverVisible = frame > 50 && frame < 260;
	const popoverOpacity = popoverVisible ? interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }) : 0;

	const cats = [
		{ name: 'Compute', items: ['Kubernetes', 'Docker', 'AWS EC2', 'GCP Compute'] },
		{ name: 'Load Balancing', items: ['AWS ELB', 'Cloudflare', 'HAProxy', 'Nginx'] },
		{ name: 'Databases (SQL)', items: ['PostgreSQL', 'MySQL', 'Amazon RDS', 'MariaDB'] },
	];

	const highlightFrame = 120;
	const highlighted = frame > highlightFrame;
	const nodeAppears = frame > 200;

	const lbNode: NodeData = { id: 'lb', label: 'Load Balancer', type: 'lb', x: 700, y: 380, color: '#8C4FFF' };

	const narration = frame < 40
		? 'Click the "Components" tool in the left toolbar.' : frame < 120
			? 'Browse categories: Compute, Databases, Load Balancing, Caching, and more.' : frame < 200
				? 'Find "HAProxy" under Load Balancing — drag it onto the canvas.' :
				'Your first component is on the canvas!';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}25 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}25 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.5 }} />

			<FloatingToolbar activeTool={frame > 35 ? 'components' : 'select'} />
			<BottomBar designName="Ticket Booking" trafficType="FLAT" trafficLabel="1K RPS" simSpeed="1x" />

			{/* Component palette popover — slides out from toolbar */}
			{popoverVisible && (
				<div style={{ position: 'absolute', left: 72, top: '50%', transform: 'translateY(-50%)', width: 240, background: '#13151a', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, opacity: popoverOpacity, zIndex: 55, boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
					<div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 700, color: COLORS.textMain, marginBottom: 14 }}>Tech Components</div>
					{cats.map((cat, ci) => (
						<div key={cat.name} style={{ marginBottom: 16, opacity: interpolate(frame, [55 + ci * 10, 70 + ci * 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
							<div style={{ fontSize: 8, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontFamily: FONT.body }}>{cat.name}</div>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
								{cat.items.map(item => {
									const hl = item === 'HAProxy' && highlighted;
									return (
										<div key={item} style={{
											padding: '7px 4px',
											background: hl ? `${COLORS.primary}12` : '#0f111a',
											border: `1px solid ${hl ? COLORS.primary : COLORS.border}`,
											borderRadius: 7,
											fontSize: 10,
											color: hl ? COLORS.primary : COLORS.textMuted,
											fontFamily: FONT.body,
											textAlign: 'center',
											fontWeight: hl ? 700 : 500,
											cursor: 'grab',
										}}>
											{item}
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Drag animation */}
			{frame > 160 && frame < 210 && (
				<div style={{
					position: 'absolute',
					left: interpolate(frame, [160, 200], [190, 700], { extrapolateRight: 'clamp' }),
					top: interpolate(frame, [160, 200], [450, 380], { extrapolateRight: 'clamp' }),
					opacity: interpolate(frame, [160, 170, 195, 205], [0, 0.7, 0.7, 0], { extrapolateRight: 'clamp' }),
					background: '#13151a',
					border: `1px solid ${COLORS.primary}50`,
					borderRadius: 10,
					padding: '8px 14px',
					fontSize: 11,
					color: COLORS.primary,
					fontFamily: FONT.body,
					fontWeight: 600,
					zIndex: 60,
					boxShadow: `0 8px 24px ${COLORS.primary}20`,
				}}>
					⚖ HAProxy
				</div>
			)}

			{/* Node on canvas */}
			{nodeAppears && <AnimatedNode node={lbNode} delay={200} />}

			{/* Cursor */}
			{frame > 20 && frame < 50 && (
				<div style={{
					position: 'absolute',
					left: interpolate(frame, [20, 42], [200, 38], { extrapolateRight: 'clamp' }),
					top: interpolate(frame, [20, 42], [300, 453], { extrapolateRight: 'clamp' }),
					opacity: interpolate(frame, [20, 28], [0, 1], { extrapolateRight: 'clamp' }),
					zIndex: 100,
				}}>
					<svg width="20" height="20" viewBox="0 0 24 24"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" strokeWidth={1.5} strokeLinejoin="round" /></svg>
				</div>
			)}

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }), zIndex: 70 }}>
				<div style={{ background: 'rgba(9,10,15,0.95)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px', maxWidth: 750 }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>{narration}</span>
				</div>
			</div>
		</div>
	);
};
