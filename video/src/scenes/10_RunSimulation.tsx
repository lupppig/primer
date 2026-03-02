import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FONT } from '../theme';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { BottomBar } from '../components/BottomBar';
import { AnimatedNode } from '../components/AnimatedNode';
import { AnimatedEdge } from '../components/AnimatedEdge';
import type { NodeData } from '../types';

/**
 * Scene 10: Running the first simulation.
 * Matches real Canvas.tsx: bottom bar shows "Stop Sim" + Burn Rate,
 * System Alert appears at top-right during bottleneck (Panel position="top-right" in real code).
 */
export const RunSimulation: React.FC = () => {
	const frame = useCurrentFrame();

	const clickSimAt = 50;
	const simStarted = frame > clickSimAt;
	const simFrame = Math.max(0, frame - clickSimAt);

	const ramp = (base: number, speed: number) => Math.min(0.98, base + simFrame * speed);
	const apiUtil = ramp(0.15, 0.006);
	const dbUtil = ramp(0.2, 0.007);
	const lbUtil = ramp(0.1, 0.003);

	const nodes: NodeData[] = [
		{
			id: 'lb', label: 'Load Balancer', type: 'lb', x: 700, y: 80, color: '#8C4FFF',
			metrics: simStarted ? { utilization: lbUtil, rps: 500 + simFrame * 8, latency: 3 + lbUtil * 60, replicas: 1, status: lbUtil > 0.9 ? 'bottleneck' : 'healthy' } : undefined
		},
		{
			id: 'api', label: 'App-Server', type: 'api', x: 550, y: 280, color: '#3caff6',
			metrics: simStarted ? { utilization: apiUtil, rps: 400 + simFrame * 6, latency: 15 + apiUtil * 120, replicas: 3, status: apiUtil > 0.9 ? 'bottleneck' : 'healthy' } : undefined
		},
		{
			id: 'cache', label: 'Redis', type: 'cache', x: 950, y: 280, color: '#DC382D',
			metrics: simStarted ? { utilization: ramp(0.6, 0.003), rps: 300 + simFrame * 5, latency: 2, replicas: 1, status: 'healthy' } : undefined
		},
		{
			id: 'queue', label: 'Kafka', type: 'queue', x: 550, y: 500, color: '#FF6600',
			metrics: simStarted ? { utilization: ramp(0.1, 0.002), rps: 200 + simFrame * 3, latency: 5, replicas: 1, queueDepth: Math.round(simFrame * 10), status: 'healthy' } : undefined
		},
		{
			id: 'db', label: 'PostgreSQL', type: 'db', x: 750, y: 700, color: '#4169E1',
			metrics: simStarted ? { utilization: dbUtil, rps: 150 + simFrame * 4, latency: 20 + dbUtil * 350, replicas: 1, status: dbUtil > 0.88 ? 'bottleneck' : 'healthy' } : undefined
		},
		{
			id: 'stripe', label: 'Stripe API', type: 'external', x: 300, y: 500, color: '#635BFF',
			metrics: simStarted ? { utilization: 0.25, rps: 80 + simFrame, latency: 150, replicas: 1, status: 'healthy' } : undefined
		},
	];

	const edgeColor = (util: number) => util > 0.9 ? COLORS.red : util > 0.7 ? COLORS.yellow : COLORS.primary;
	const burnRate = simFrame * 0.0012;
	const bottleneckActive = apiUtil > 0.88;

	const narration = frame < 40
		? 'Everything is set. Click "Simulate" in the bottom bar.'
		: frame < 100
			? 'Simulation started! Watch the metrics appear on each node.'
			: frame < 200
				? 'Edge colors shift: blue for healthy, yellow for warning, red for overloaded.'
				: bottleneckActive
					? 'The App-Server is at ' + Math.round(apiUtil * 100) + '% CPU — bottleneck detected!'
					: 'Metrics update in real time as traffic flows through the system.';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}25 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}25 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.5 }} />

			<FloatingToolbar activeTool="select" />
			<BottomBar
				designName="Ticket Booking"
				trafficType="STEP"
				trafficLabel="1.5K → 10K"
				simSpeed="1x"
				isSimulating={simStarted}
				burnRate={burnRate}
				simulateClickFrame={clickSimAt}
			/>

			{/* Edges */}
			<AnimatedEdge x1={800} y1={140} x2={650} y2={270} color={edgeColor(lbUtil)} animated={simStarted} delay={0} />
			<AnimatedEdge x1={650} y1={340} x2={960} y2={320} color={edgeColor(ramp(0.6, 0.003))} animated={simStarted} delay={0} />
			<AnimatedEdge x1={650} y1={340} x2={650} y2={490} color={edgeColor(ramp(0.1, 0.002))} animated={simStarted} delay={0} />
			<AnimatedEdge x1={650} y1={560} x2={780} y2={690} color={edgeColor(dbUtil)} animated={simStarted} delay={0} />
			<AnimatedEdge x1={560} y1={340} x2={420} y2={490} color={COLORS.primary} animated={simStarted} delay={0} />
			<AnimatedEdge x1={960} y1={340} x2={860} y2={690} color={edgeColor(dbUtil)} animated={simStarted} delay={0} />

			{/* Nodes */}
			{nodes.map(n => <AnimatedNode key={n.id} node={n} delay={0} showMetrics={simStarted} />)}

			{/* System Alert — top-right, matches real Canvas.tsx Panel position="top-right" */}
			{bottleneckActive && (
				<div style={{
					position: 'absolute',
					top: 64,
					right: 16,
					width: 260,
					background: '#0f111a',
					border: '1px solid rgba(255,51,68,0.5)',
					borderRadius: 14,
					padding: 16,
					boxShadow: '0 0 20px rgba(255,51,68,0.2)',
					opacity: interpolate(apiUtil, [0.88, 0.92], [0, 1], { extrapolateRight: 'clamp' }),
					zIndex: 10,
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', marginBottom: 8 }}>
						<span style={{ fontSize: 14 }}>📊</span>
						<h3 style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 600, color: '#ef4444', margin: 0 }}>System Alert</h3>
					</div>
					<p style={{ fontFamily: FONT.body, fontSize: 12, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>
						Bottleneck detected at <strong style={{ color: COLORS.textMain }}>App-Server</strong> due to high concurrency.
						Current LOAD: <strong style={{ color: COLORS.textMain }}>{Math.round(400 + simFrame * 6).toLocaleString()} RPS</strong>.
					</p>
				</div>
			)}

			{/* Cursor pointing at Simulate button before click */}
			{frame > 20 && frame < clickSimAt + 10 && (
				<div style={{
					position: 'absolute',
					left: interpolate(frame, [20, 45], [800, 960], { extrapolateRight: 'clamp' }),
					bottom: interpolate(frame, [20, 45], [200, 38], { extrapolateRight: 'clamp' }),
					opacity: interpolate(frame, [20, 30], [0, 1], { extrapolateRight: 'clamp' }),
					zIndex: 100,
				}}>
					<svg width="20" height="20" viewBox="0 0 24 24"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" strokeWidth={1.5} strokeLinejoin="round" /></svg>
				</div>
			)}

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 70 }}>
				<div style={{ background: 'rgba(9,10,15,0.95)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px', maxWidth: 700 }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>{narration}</span>
				</div>
			</div>
		</div>
	);
};
