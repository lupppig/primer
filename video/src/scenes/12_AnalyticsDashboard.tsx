import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

/**
 * Scene 12: Analytics Dashboard — matches real HistoricalDashboard.tsx exactly.
 *
 * Layout:
 * - Header: ← Back | 📊 Historical Simulation Analysis | ticks sampled | Total Cost
 * - 4 stat cards row: Peak Throughput, Avg Latency, Error Rate, System Reliability
 * - 2/3 AreaChart "System-wide Traffic Composition" | 1/3 "Failure Hotspots" bar chart
 * - Bottom row: Node Drill-down line chart | Cost Accumulation waveform
 */
export const AnalyticsDashboard: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const fadeIn = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });

	const stats = [
		{ label: 'Peak Throughput', value: '8,000', unit: 'RPS', icon: '📊', iconColor: '#3caff6' },
		{ label: 'Avg. Latency', value: '6264.95', unit: 'ms', icon: '🕐', iconColor: '#fbbf24' },
		{ label: 'Error Rate', value: '36.00%', unit: '', icon: '⚠', iconColor: '#f87171' },
		{ label: 'System Reliability', value: '99.9%', unit: '', icon: '⚡', iconColor: '#4ade80' },
	];

	const hotspots = [
		{ name: 'App-Server', width: 82, color: '#3caff6' },
		{ name: 'Redis', width: 55, color: '#a855f7' },
		{ name: 'Load Balancer', width: 35, color: '#fbbf24' },
	];

	// Generate fake area chart data points for traffic composition
	const chartDataPoints = Array.from({ length: 30 }, (_, i) => {
		const successRps = 3000 + Math.sin(i * 0.3) * 800 + i * 150;
		const droppedRps = Math.max(0, i > 15 ? (i - 15) * 200 + Math.random() * 100 : 0);
		return { time: i, success: successRps, dropped: droppedRps };
	});

	const maxRps = Math.max(...chartDataPoints.map(d => d.success + d.dropped));
	const chartWidth = 700;
	const chartHeight = 160;

	const narration = frame < 50
		? 'After the simulation, click the green Analytics icon in the left toolbar.'
		: frame < 140
			? 'The dashboard shows Peak Throughput, Latency, Error Rate, and Reliability.'
			: 'The Traffic Composition chart and Failure Hotspots show where to focus fixes.';

	return (
		<div style={{ width: '100%', height: '100%', background: '#0a0b0f', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
			{/* Header — matches real HistoricalDashboard */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}50`, background: '#0f1115', opacity: fadeIn }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					{/* Back button */}
					<div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 16 }}>←</div>
					<div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<span style={{ color: '#3caff6', fontSize: 16 }}>📊</span>
							<h2 style={{ fontFamily: FONT.heading, fontSize: 18, fontWeight: 700, color: COLORS.textMain, margin: 0 }}>Historical Simulation Analysis</h2>
						</div>
						<p style={{ fontFamily: FONT.body, fontSize: 11, color: COLORS.textMuted, margin: 0 }}>Post-simulation telemetry and bottleneck diagnostics</p>
					</div>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1c23', padding: '6px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}50` }}>
						<span style={{ color: '#60a5fa', fontSize: 12 }}>🕐</span>
						<span style={{ fontSize: 11, fontFamily: FONT.mono, color: COLORS.textMain }}>29 ticks sampled</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
						<span style={{ color: '#4ade80', fontSize: 12 }}>💰</span>
						<span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>Total Cost: $0.00</span>
					</div>
				</div>
			</div>

			{/* Main content with scroll */}
			<div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden' }}>
				{/* 4 Stat Cards — grid-cols-4 */}
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, opacity: fadeIn }}>
					{stats.map((s, i) => (
						<div key={s.label} style={{
							background: '#0f1115',
							borderRadius: 14,
							padding: 16,
							border: `1px solid ${COLORS.border}50`,
							opacity: interpolate(frame, [15 + i * 8, 30 + i * 8], [0, 1], { extrapolateRight: 'clamp' }),
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
								<span style={{ fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em', fontFamily: FONT.body }}>{s.label}</span>
								<span style={{ fontSize: 14, color: s.iconColor }}>{s.icon}</span>
							</div>
							<div style={{ fontSize: 26, fontWeight: 800, color: COLORS.textMain, fontFamily: FONT.mono }}>
								{s.value} <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textMuted }}>{s.unit}</span>
							</div>
						</div>
					))}
				</div>

				{/* Charts row: lg:grid-cols-3 — traffic chart 2/3, failure hotspots 1/3 */}
				<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, flex: 1 }}>
					{/* Traffic Composition AreaChart */}
					<div style={{ background: '#0f1115', borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}50`, opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: 'clamp' }) }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
							<span style={{ color: '#3caff6', fontSize: 14 }}>📊</span>
							<h3 style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>System-wide Traffic Composition</h3>
						</div>
						{/* Legend */}
						<div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: COLORS.textMuted }}>
								<div style={{ width: 10, height: 3, borderRadius: 2, background: '#3caff6' }} /> Successful RPS
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: COLORS.textMuted }}>
								<div style={{ width: 10, height: 3, borderRadius: 2, background: '#f87171' }} /> Dropped RPS
							</div>
						</div>
						{/* SVG Area Chart */}
						<svg width={chartWidth} height={chartHeight} style={{ overflow: 'visible' }}>
							{/* Grid lines */}
							{[0.25, 0.5, 0.75, 1].map(y => (
								<line key={y} x1={0} y1={chartHeight * (1 - y)} x2={chartWidth} y2={chartHeight * (1 - y)} stroke="#1a1c23" strokeWidth={1} strokeDasharray="3 3" />
							))}
							{/* Successful area with gradient fill */}
							<defs>
								<linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#3caff6" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#3caff6" stopOpacity={0} />
								</linearGradient>
								<linearGradient id="gradDropped" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#f87171" stopOpacity={0} />
								</linearGradient>
							</defs>
							{/* Success area */}
							<path
								d={`M ${chartDataPoints.map((d, i) => `${(i / (chartDataPoints.length - 1)) * chartWidth} ${chartHeight - (d.success / maxRps) * chartHeight}`).join(' L ')} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`}
								fill="url(#gradSuccess)"
								stroke="#3caff6"
								strokeWidth={2}
							/>
							{/* Dropped area (stacked on top) */}
							<path
								d={`M ${chartDataPoints.map((d, i) => `${(i / (chartDataPoints.length - 1)) * chartWidth} ${chartHeight - ((d.success + d.dropped) / maxRps) * chartHeight}`).join(' L ')} L ${chartDataPoints.map((d, i) => `${((chartDataPoints.length - 1 - i) / (chartDataPoints.length - 1)) * chartWidth} ${chartHeight - (chartDataPoints[chartDataPoints.length - 1 - i].success / maxRps) * chartHeight}`).join(' L ')} Z`}
								fill="url(#gradDropped)"
								stroke="#f87171"
								strokeWidth={1.5}
							/>
							{/* X-axis labels */}
							{[0, 10, 20, 29].map(i => (
								<text key={i} x={(i / 29) * chartWidth} y={chartHeight + 14} fontSize={9} fill="#555" fontFamily={FONT.mono}>T+{i}s</text>
							))}
						</svg>
					</div>

					{/* Failure Hotspots BarChart */}
					<div style={{ background: '#0f1115', borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}50`, opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: 'clamp' }) }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
							<span style={{ color: '#f87171', fontSize: 14 }}>⚠</span>
							<h3 style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Failure Hotspots</h3>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
							{hotspots.map((h, i) => (
								<div key={h.name} style={{ opacity: interpolate(frame, [90 + i * 12, 105 + i * 12], [0, 1], { extrapolateRight: 'clamp' }) }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
										<span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT.body }}>{h.name}</span>
										<span style={{ fontSize: 10, color: h.color, fontFamily: FONT.mono, fontWeight: 700 }}>{h.width}%</span>
									</div>
									<div style={{ height: 24, background: '#1a1c23', borderRadius: 6, overflow: 'hidden' }}>
										<div style={{ height: '100%', width: `${h.width}%`, background: h.color, borderRadius: '0 6px 6px 0', opacity: 0.8 }} />
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 70 }}>
				<div style={{ background: 'rgba(9,10,15,0.95)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px', maxWidth: 700 }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>{narration}</span>
				</div>
			</div>
		</div>
	);
};
