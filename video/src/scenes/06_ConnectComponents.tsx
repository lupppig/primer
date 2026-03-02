import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FONT } from '../theme';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { BottomBar } from '../components/BottomBar';
import { AnimatedNode } from '../components/AnimatedNode';
import { AnimatedEdge } from '../components/AnimatedEdge';
import type { NodeData } from '../types';

/**
 * Scene 6: Connecting components with traffic edges.
 */
export const ConnectComponents: React.FC = () => {
	const frame = useCurrentFrame();

	const nodes: NodeData[] = [
		{ id: 'lb', label: 'Load Balancer', type: 'lb', x: 700, y: 80, color: '#8C4FFF' },
		{ id: 'api', label: 'App-Server', type: 'api', x: 550, y: 280, color: '#3caff6' },
		{ id: 'cache', label: 'Redis', type: 'cache', x: 950, y: 280, color: '#DC382D' },
		{ id: 'queue', label: 'Kafka', type: 'queue', x: 550, y: 500, color: '#FF6600' },
		{ id: 'db', label: 'PostgreSQL', type: 'db', x: 750, y: 700, color: '#4169E1' },
		{ id: 'stripe', label: 'Stripe API', type: 'external', x: 300, y: 500, color: '#635BFF' },
	];

	const edges = [
		{ x1: 800, y1: 140, x2: 650, y2: 270, at: 40, desc: 'Load Balancer → App Server (HTTP)' },
		{ x1: 650, y1: 340, x2: 960, y2: 320, at: 100, desc: 'App Server → Redis (cache reads)' },
		{ x1: 650, y1: 340, x2: 650, y2: 490, at: 160, desc: 'App Server → Kafka (order events)' },
		{ x1: 650, y1: 560, x2: 780, y2: 690, at: 220, desc: 'Kafka → PostgreSQL (persist)' },
		{ x1: 560, y1: 340, x2: 420, y2: 490, at: 280, desc: 'App Server → Stripe (payments)' },
		{ x1: 960, y1: 340, x2: 860, y2: 690, at: 340, desc: 'Redis → PostgreSQL (cache miss)' },
	];

	const currentEdge = edges.find(e => frame >= e.at && frame < e.at + 55);

	const narration = frame < 30
		? 'Now let\'s connect these services with traffic flows.'
		: frame < 90
			? 'Drag from Load Balancer → App Server to create an HTTP traffic edge.'
			: frame < 150
				? 'Connect App Server → Redis for cache reads.'
				: frame < 210
					? 'Connect App Server → Kafka for order events.'
					: frame < 280
						? 'Connect Kafka → PostgreSQL to persist processed orders.'
						: frame < 340
							? 'Connect App Server → Stripe for payment processing.'
							: 'Connect Redis → PostgreSQL as cache-miss fallback. All done!';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}25 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}25 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.5 }} />

			<FloatingToolbar activeTool="select" />
			<BottomBar designName="Ticket Booking" trafficType="FLAT" trafficLabel="1K RPS" simSpeed="1x" />

			{/* Edges */}
			{edges.map((e, i) => frame >= e.at && <AnimatedEdge key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} color={COLORS.primary} animated={false} delay={e.at} />)}

			{/* Nodes */}
			{nodes.map(n => <AnimatedNode key={n.id} node={n} delay={0} />)}

			{/* Current connection badge */}
			{currentEdge && (
				<div style={{ position: 'absolute', top: 20, right: 20, background: COLORS.panelBg, border: `1px solid ${COLORS.primary}40`, borderRadius: 12, padding: '10px 14px', zIndex: 10 }}>
					<div style={{ fontSize: 9, fontWeight: 700, color: COLORS.primary, textTransform: 'uppercase', fontFamily: FONT.body, marginBottom: 2 }}>Connecting:</div>
					<div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMain, fontFamily: FONT.body }}>{currentEdge.desc}</div>
				</div>
			)}

			{/* Progress */}
			<div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, zIndex: 10 }}>
				{edges.map((e, i) => <div key={i} style={{ width: 24, height: 3, borderRadius: 2, background: frame >= e.at ? COLORS.primary : COLORS.border }} />)}
			</div>

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 70 }}>
				<div style={{ background: 'rgba(9,10,15,0.95)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px', maxWidth: 750 }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>{narration}</span>
				</div>
			</div>
		</div>
	);
};
