import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FONT } from '../theme';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { BottomBar } from '../components/BottomBar';
import { AnimatedNode } from '../components/AnimatedNode';
import { AnimatedEdge } from '../components/AnimatedEdge';
import type { NodeData } from '../types';

/**
 * Scene 5: Building the full architecture — add components one by one.
 */
export const BuildArchitecture: React.FC = () => {
	const frame = useCurrentFrame();

	const components: { node: NodeData; reason: string; appearAt: number }[] = [
		{ node: { id: 'lb', label: 'Load Balancer', type: 'lb', x: 700, y: 80, color: '#8C4FFF' }, reason: '(already added)', appearAt: 0 },
		{ node: { id: 'api', label: 'App-Server', type: 'api', x: 550, y: 280, color: '#3caff6' }, reason: 'Handles the booking requests from users.', appearAt: 60 },
		{ node: { id: 'cache', label: 'Redis', type: 'cache', x: 950, y: 280, color: '#DC382D' }, reason: 'Caches event data so we don\'t hit the DB every time.', appearAt: 160 },
		{ node: { id: 'queue', label: 'Kafka', type: 'queue', x: 550, y: 500, color: '#FF6600' }, reason: 'Buffers order requests for reliable processing.', appearAt: 260 },
		{ node: { id: 'db', label: 'PostgreSQL', type: 'db', x: 750, y: 700, color: '#4169E1' }, reason: 'Main database — stores all booking data.', appearAt: 360 },
		{ node: { id: 'stripe', label: 'Stripe API', type: 'external', x: 300, y: 500, color: '#635BFF' }, reason: 'External payment provider.', appearAt: 460 },
	];

	const currentIdx = components.findIndex((c, i) => i > 0 && frame >= c.appearAt && frame < c.appearAt + 90);
	const activeComp = currentIdx >= 0 ? components[currentIdx] : components[components.length - 1];

	const narration = frame < 50
		? 'We have our Load Balancer. Now let\'s add the other services.'
		: frame < 150
			? 'Drag an AWS EC2 "App-Server" — this handles booking requests.'
			: frame < 250
				? 'Add a Redis cache — reduces load on the database.'
				: frame < 350
					? 'Add Apache Kafka as a message queue for reliable order processing.'
					: frame < 450
						? 'Add PostgreSQL — our primary database for booking data.'
						: 'Finally, add Stripe API for payments. Architecture complete!';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}25 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}25 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.5 }} />

			<FloatingToolbar activeTool="components" />
			<BottomBar designName="Ticket Booking" trafficType="FLAT" trafficLabel="1K RPS" simSpeed="1x" />

			{/* Nodes — appear staggered */}
			{components.map(c => frame >= c.appearAt && <AnimatedNode key={c.node.id} node={c.node} delay={c.appearAt} />)}

			{/* Component intro badge — top right */}
			{currentIdx >= 0 && (
				<div style={{ position: 'absolute', top: 20, right: 20, background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 16px', maxWidth: 280, zIndex: 10 }}>
					<div style={{ fontSize: 9, fontWeight: 700, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT.body, marginBottom: 4 }}>Now Adding:</div>
					<div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMain, fontFamily: FONT.body }}>{activeComp.node.label}</div>
					<div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT.body, marginTop: 2, lineHeight: 1.5 }}>{activeComp.reason}</div>
				</div>
			)}

			{/* Progress pips */}
			<div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
				{components.map((c, i) => (
					<div key={i} style={{ width: 24, height: 4, borderRadius: 2, background: frame >= c.appearAt ? COLORS.primary : COLORS.border }} />
				))}
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
