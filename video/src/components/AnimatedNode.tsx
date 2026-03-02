import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { COLORS, FONT } from '../theme';
import type { NodeData } from '../types';

interface AnimatedNodeProps {
	node: NodeData;
	delay?: number;
	showMetrics?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
	api: '🖥',
	db: '🔷',
	cache: '⚡',
	queue: '📨',
	lb: '⚖',
	cdn: '🌐',
	firewall: '🛡',
	external: '🔗',
	storage: '💿',
};

/**
 * Animated node component that matches the real Primer TechNode UI exactly:
 * - Uppercase label + type badge
 * - "⚡ READY FOR SIMULATION" in idle state
 * - CPU LOAD bar + MEMORY when simulating (matches simulator_run.png)
 * - THROUGHPUT + LATENCY for load balancers
 * - HIT RATE + MEMORY for caches
 * - Red border + glow for bottleneck state
 */
export const AnimatedNode: React.FC<AnimatedNodeProps> = ({ node, delay = 0, showMetrics = false }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const delayedFrame = Math.max(0, frame - delay);
	const scale = spring({ frame: delayedFrame, fps, from: 0, to: 1, durationInFrames: 20 });
	const opacity = interpolate(delayedFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

	const color = node.color || COLORS.primary;
	const isBottleneck = node.metrics?.status === 'bottleneck';
	const isFailed = node.metrics?.status === 'failed';

	const borderColor = isBottleneck || isFailed ? COLORS.red : `${COLORS.border}`;
	const bgColor = isBottleneck ? 'rgba(239,68,68,0.05)' : COLORS.panelBgAlt;

	const utilization = node.metrics?.utilization ?? 0;
	const cpuPercent = Math.round(utilization * 100);

	return (
		<div
			style={{
				position: 'absolute',
				left: node.x,
				top: node.y,
				width: 200,
				opacity,
				transform: `scale(${scale})`,
				transformOrigin: 'center',
			}}
		>
			<div
				style={{
					background: bgColor,
					border: `2px solid ${borderColor}`,
					borderRadius: 12,
					overflow: 'hidden',
					boxShadow: isBottleneck ? `0 0 20px ${COLORS.redGlow}` : '0 4px 12px rgba(0,0,0,0.3)',
				}}
			>
				{/* Header: Icon + Label + Status dot */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						padding: '10px 12px',
						gap: 8,
					}}
				>
					<div
						style={{
							width: 28,
							height: 28,
							borderRadius: 8,
							background: `${color}20`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 14,
						}}
					>
						{TYPE_ICONS[node.type] || '⬡'}
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							style={{
								fontSize: 11,
								fontWeight: 800,
								color: COLORS.textMain,
								fontFamily: FONT.body,
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{node.label}
						</div>
						<div
							style={{
								fontSize: 8,
								fontFamily: FONT.body,
								color: COLORS.textDimmed,
								textTransform: 'uppercase',
								letterSpacing: '0.08em',
							}}
						>
							{node.type === 'api' ? 'AWS EC2' : node.type === 'db' ? 'POSTGRESQL' : node.type === 'cache' ? 'REDIS' : node.type === 'queue' ? 'APACHE KAFKA' : node.type === 'lb' ? 'HAPROXY' : node.type === 'external' ? 'EXTERNAL' : node.type.toUpperCase()}
						</div>
					</div>
					{/* Status dot */}
					<div
						style={{
							width: 8,
							height: 8,
							borderRadius: '50%',
							background: isBottleneck || isFailed ? COLORS.red : COLORS.green,
							boxShadow: isBottleneck ? `0 0 6px ${COLORS.red}` : `0 0 6px ${COLORS.green}80`,
						}}
					/>
				</div>

				{/* Metrics body */}
				<div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${COLORS.border}40` }}>
					{showMetrics && node.metrics ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
							{/* CPU LOAD bar — matches real screenshot exactly */}
							{(node.type === 'api' || node.type === 'lb' || node.type === 'firewall' || node.type === 'cdn') && (
								<div>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
										<span style={{ fontSize: 8, fontFamily: FONT.body, color: COLORS.textDimmed, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>CPU Load</span>
										<span style={{ fontSize: 10, fontFamily: FONT.mono, color: cpuPercent > 100 ? COLORS.red : cpuPercent > 80 ? COLORS.yellow : COLORS.textMain, fontWeight: 800 }}>
											{cpuPercent}%
										</span>
									</div>
									<div style={{ height: 4, background: '#1a1c23', borderRadius: 4, overflow: 'hidden' }}>
										<div style={{ height: '100%', width: `${Math.min(100, cpuPercent)}%`, background: cpuPercent > 100 ? COLORS.red : cpuPercent > 80 ? COLORS.yellow : COLORS.primary, borderRadius: 4 }} />
									</div>
								</div>
							)}

							{/* Memory */}
							{(node.type === 'api' || node.type === 'lb') && (
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<span style={{ fontSize: 8, fontFamily: FONT.body, color: COLORS.textDimmed, textTransform: 'uppercase', fontWeight: 700 }}>Memory</span>
									<span style={{ fontSize: 10, fontFamily: FONT.mono, color: COLORS.textMain, fontWeight: 700 }}>
										{(utilization * 8).toFixed(1)} GB
									</span>
								</div>
							)}

							{/* Throughput + Latency for LB */}
							{node.type === 'lb' && (
								<>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<span style={{ fontSize: 8, fontFamily: FONT.body, color: COLORS.textDimmed, textTransform: 'uppercase', fontWeight: 700 }}>Throughput</span>
										<span style={{ fontSize: 10, fontFamily: FONT.mono, color: COLORS.primary, fontWeight: 800 }}>
											{formatNumber(node.metrics.rps)} rps
										</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<span style={{ fontSize: 8, fontFamily: FONT.body, color: COLORS.textDimmed, textTransform: 'uppercase', fontWeight: 700 }}>Latency</span>
										<span style={{ fontSize: 10, fontFamily: FONT.mono, color: node.metrics.latency > 100 ? COLORS.red : COLORS.textMain, fontWeight: 700 }}>
											{Math.round(node.metrics.latency)}ms
										</span>
									</div>
								</>
							)}

							{/* Hit Rate for cache */}
							{node.type === 'cache' && (
								<>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<span style={{ fontSize: 8, fontFamily: FONT.body, color: COLORS.textDimmed, textTransform: 'uppercase', fontWeight: 700 }}>Hit Rate</span>
										<span style={{ fontSize: 10, fontFamily: FONT.mono, color: COLORS.textMain, fontWeight: 800 }}>
											{Math.round(utilization * 100)}%
										</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<span style={{ fontSize: 8, fontFamily: FONT.body, color: COLORS.textDimmed, textTransform: 'uppercase', fontWeight: 700 }}>Memory</span>
										<span style={{ fontSize: 10, fontFamily: FONT.mono, color: COLORS.textMain, fontWeight: 700 }}>
											{(utilization * 16).toFixed(1)}GB
										</span>
									</div>
								</>
							)}

							{/* Queue depth */}
							{node.type === 'queue' && node.metrics.queueDepth !== undefined && (
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<span style={{ fontSize: 8, fontFamily: FONT.body, color: COLORS.textDimmed, textTransform: 'uppercase', fontWeight: 700 }}>Queue Depth</span>
									<span style={{ fontSize: 10, fontFamily: FONT.mono, color: COLORS.textMain, fontWeight: 700 }}>
										{formatNumber(node.metrics.queueDepth)}
									</span>
								</div>
							)}
						</div>
					) : (
						<div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: COLORS.textDimmed, fontFamily: FONT.body, textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 600 }}>
							⚡ Ready for simulation
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

function formatNumber(val: number): string {
	if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
	if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
	return Math.round(val).toString();
}
