import React from 'react';
import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	spring,
	Easing,
	Sequence,
} from 'remotion';

/* ═══════════════════════════════════════════════════════════════════
   MOVY DESIGN — Cinematic 3D Drag-and-Drop Whiteboard
   A single monolithic ticket-booking system designed in Primer.
   Style reference: LinkedIn collaborative-whiteboard flyover.
   ═══════════════════════════════════════════════════════════════════ */

// ── Palette ──────────────────────────────────────────────────────────
const C = {
	bg: '#080b12',
	dotGrid: '#1a1f2e',
	card: '#111827',
	cardHover: '#151c2c',
	border: '#1e293b',
	borderLit: '#3b82f6',
	white: '#f1f5f9',
	muted: '#64748b',
	blue: '#3b82f6',
	blueGlow: 'rgba(59,130,246,0.25)',
	cyan: '#06b6d4',
	green: '#10b981',
	red: '#ef4444',
	amber: '#f59e0b',
	purple: '#8b5cf6',
	pink: '#ec4899',
	indigo: '#6366f1',
};

// ── Architecture Nodes ───────────────────────────────────────────────
interface NodeDef {
	id: string;
	label: string;
	sub: string;
	icon: string;
	color: string;
	// Final resting position on the canvas (in canvas-space, 1400×900)
	x: number;
	y: number;
}

const NODES: NodeDef[] = [
	{ id: 'lb', label: 'LOAD BALANCER', sub: 'HAProxy · Round Robin', icon: '⚖️', color: C.purple, x: 700, y: 100 },
	{ id: 'movy', label: 'MOVY APP SERVER', sub: 'Node.js · Express Monolith', icon: '🎬', color: C.blue, x: 700, y: 340 },
	{ id: 'redis', label: 'REDIS', sub: 'Seat-Lock Cache · 2ms TTL', icon: '⚡', color: C.red, x: 280, y: 580 },
	{ id: 'pg', label: 'POSTGRESQL', sub: 'Tickets · Bookings · Users', icon: '🗄️', color: C.green, x: 700, y: 580 },
	{ id: 'stripe', label: 'STRIPE API', sub: 'Payments · Webhooks', icon: '💳', color: C.pink, x: 1120, y: 580 },
];

// ── Edges ────────────────────────────────────────────────────────────
interface EdgeDef { from: string; to: string; protocol: string }
const EDGES: EdgeDef[] = [
	{ from: 'lb', to: 'movy', protocol: 'HTTP' },
	{ from: 'movy', to: 'redis', protocol: 'TCP' },
	{ from: 'movy', to: 'pg', protocol: 'SQL' },
	{ from: 'movy', to: 'stripe', protocol: 'HTTPS' },
];

// ── Timeline (30 fps) ───────────────────────────────────────────────
const FPS = 30;
const TOTAL = 900; // 30 seconds

// Each node "drag-and-drop" sequence
const DROP = {
	cursorEnter: 20,   // cursor appears
	lb: { grab: 40, drop: 80 },
	movy: { grab: 110, drop: 160 },
	redis: { grab: 190, drop: 240 },
	pg: { grab: 270, drop: 320 },
	stripe: { grab: 350, drop: 400 },
};

const EDGE_START = 430;
const EDGE_GAP = 35;

const SIM_START = 600;
const SIM_RAMP = 700;
const SIM_PEAK = 780;
const OUTRO = 820;

// ── Helpers ──────────────────────────────────────────────────────────
function getNode(id: string) { return NODES.find(n => n.id === id)!; }

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Cubic bezier point helper
function bezierPt(t: number, p0: number, p1: number, p2: number, p3: number) {
	const u = 1 - t;
	return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// ═════════════════════════════════════════════════════════════════════
// DOT-GRID BACKGROUND
// ═════════════════════════════════════════════════════════════════════
const DotGrid: React.FC = () => {
	const dots: React.ReactNode[] = [];
	const spacing = 30;
	for (let row = 0; row < 32; row++) {
		for (let col = 0; col < 48; col++) {
			dots.push(
				<circle
					key={`${row}-${col}`}
					cx={col * spacing}
					cy={row * spacing}
					r={1}
					fill={C.dotGrid}
				/>
			);
		}
	}
	return (
		<svg width={1440} height={960} style={{ position: 'absolute', top: 0, left: 0 }}>
			{dots}
		</svg>
	);
};

// ═════════════════════════════════════════════════════════════════════
// ARCHITECTURE NODE CARD
// ═════════════════════════════════════════════════════════════════════
const NodeCard: React.FC<{
	node: NodeDef;
	frame: number;
	grabFrame: number;
	dropFrame: number;
	simulating: boolean;
	isBottleneck: boolean;
}> = ({ node, frame, grabFrame, dropFrame, simulating, isBottleneck }) => {
	const { fps } = useVideoConfig();
	if (frame < grabFrame) return null;

	// The node starts off-canvas at the "toolbar" position, then drags to its target
	const toolbarX = -60;
	const toolbarY = 300;

	const isDragging = frame >= grabFrame && frame < dropFrame;
	const isDropped = frame >= dropFrame;

	let posX = toolbarX;
	let posY = toolbarY;
	let currentScale = 0.85;
	let shadow = `0 2px 10px rgba(0,0,0,0.3)`;
	let borderCol = C.border;

	if (isDragging) {
		// Smooth drag from toolbar to target
		const t = interpolate(frame, [grabFrame, dropFrame], [0, 1], {
			extrapolateRight: 'clamp',
			easing: Easing.inOut(Easing.cubic),
		});
		posX = lerp(toolbarX, node.x, t);
		posY = lerp(toolbarY, node.y, t);
		currentScale = interpolate(t, [0, 0.5, 1], [0.85, 1.05, 1.0]);
		shadow = `0 12px 40px rgba(0,0,0,0.6), 0 0 30px ${node.color}44`;
		borderCol = node.color;
	}

	if (isDropped) {
		const landSpring = spring({
			frame: frame - dropFrame,
			fps,
			config: { damping: 10, stiffness: 200, mass: 0.6 },
		});
		posX = node.x;
		posY = node.y;
		const bounce = interpolate(landSpring, [0, 1], [1.08, 1.0]);
		currentScale = bounce;
		shadow = `0 4px 20px rgba(0,0,0,0.4)`;
		borderCol = simulating ? C.blue : C.border;
	}

	if (isBottleneck) {
		borderCol = C.red;
		shadow = `0 0 30px rgba(239,68,68,0.5), 0 4px 20px rgba(0,0,0,0.5)`;
	}

	// Simulation metrics
	const cpu = simulating ? interpolate(frame, [SIM_START, SIM_RAMP, SIM_PEAK],
		node.id === 'movy' ? [8, 62, 97] : [5, 25, 35], { extrapolateRight: 'clamp' }) : 0;
	const throughput = simulating ? interpolate(frame, [SIM_START, SIM_RAMP, SIM_PEAK],
		node.id === 'movy' ? [200, 4800, 9600] : (node.id === 'pg' ? [100, 2000, 4200] : [50, 1200, 2800]),
		{ extrapolateRight: 'clamp' }) : 0;
	const latency = simulating ? interpolate(frame, [SIM_START, SIM_RAMP, SIM_PEAK],
		node.id === 'movy' ? [15, 120, 860] : [5, 30, 45], { extrapolateRight: 'clamp' }) : 0;

	return (
		<div style={{
			position: 'absolute',
			left: posX - 110,
			top: posY - 50,
			width: 220,
			transform: `scale(${currentScale})`,
			transformOrigin: 'center center',
			zIndex: isDragging ? 50 : 10,
			filter: isDragging ? 'brightness(1.1)' : 'none',
		}}>
			<div style={{
				background: C.card,
				border: `1.5px solid ${borderCol}`,
				borderRadius: 14,
				padding: '12px 14px',
				boxShadow: shadow,
				backdropFilter: 'blur(8px)',
			}}>
				{/* Header */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					<div style={{
						width: 32, height: 32, borderRadius: 8,
						background: `${node.color}18`,
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						fontSize: 18,
					}}>
						{node.icon}
					</div>
					<div>
						<div style={{
							fontSize: 10.5, fontWeight: 800, color: C.white,
							letterSpacing: '0.06em', fontFamily: 'Inter, system-ui, sans-serif',
						}}>
							{node.label}
						</div>
						<div style={{
							fontSize: 8, color: C.muted, fontWeight: 500,
							fontFamily: 'Inter, system-ui, sans-serif', marginTop: 1,
						}}>
							{node.sub}
						</div>
					</div>
				</div>

				{/* Metrics (visible during simulation) */}
				{simulating && isDropped && (node.id === 'movy' || node.id === 'pg' || node.id === 'redis') && (
					<div style={{
						marginTop: 10, paddingTop: 8,
						borderTop: `1px solid ${C.border}`,
						display: 'flex', flexDirection: 'column', gap: 4,
					}}>
						{/* CPU Bar */}
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>
								<span style={{ color: C.muted }}>CPU</span>
								<span style={{ color: cpu > 85 ? C.red : cpu > 55 ? C.amber : C.green, fontWeight: 700 }}>
									{Math.round(cpu)}%
								</span>
							</div>
							<div style={{ height: 3, borderRadius: 2, background: '#1e293b', marginTop: 2 }}>
								<div style={{
									height: '100%', borderRadius: 2,
									width: `${Math.min(cpu, 100)}%`,
									background: cpu > 85 ? C.red : cpu > 55 ? C.amber : C.green,
								}} />
							</div>
						</div>
						{/* Throughput */}
						<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>
							<span style={{ color: C.muted }}>RPS</span>
							<span style={{ color: C.cyan, fontWeight: 700 }}>{Math.round(throughput).toLocaleString()}</span>
						</div>
						{/* Latency */}
						<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>
							<span style={{ color: C.muted }}>LATENCY</span>
							<span style={{ color: latency > 500 ? C.red : latency > 100 ? C.amber : C.green, fontWeight: 700 }}>
								{Math.round(latency)}ms
							</span>
						</div>
						{/* Hit Rate for Redis */}
						{node.id === 'redis' && (
							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>
								<span style={{ color: C.muted }}>HIT RATE</span>
								<span style={{ color: C.green, fontWeight: 700 }}>
									{Math.round(interpolate(frame, [SIM_START, SIM_RAMP], [0, 82], { extrapolateRight: 'clamp' }))}%
								</span>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Bottleneck badge */}
			{isBottleneck && (
				<div style={{
					position: 'absolute', top: -10, right: -10,
					background: C.red, color: '#fff',
					fontSize: 7, fontWeight: 900, padding: '3px 8px',
					borderRadius: 6, fontFamily: 'Inter, system-ui, sans-serif',
					letterSpacing: '0.08em',
					boxShadow: '0 2px 10px rgba(239,68,68,0.5)',
				}}>
					⚠ BOTTLENECK
				</div>
			)}
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// EDGE (Bezier Connector)
// ═════════════════════════════════════════════════════════════════════
const EdgeLine: React.FC<{
	edge: EdgeDef;
	frame: number;
	drawStart: number;
	simulating: boolean;
}> = ({ edge, frame, drawStart, simulating }) => {
	if (frame < drawStart) return null;

	const fromN = getNode(edge.from);
	const toN = getNode(edge.to);

	const x1 = fromN.x, y1 = fromN.y + 50;
	const x2 = toN.x, y2 = toN.y - 50;
	const cx1 = x1, cy1 = y1 + (y2 - y1) * 0.45;
	const cx2 = x2, cy2 = y2 - (y2 - y1) * 0.45;

	const prog = interpolate(frame - drawStart, [0, 30], [0, 1], {
		extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
	});

	const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
	const edgeCol = simulating ? C.blue : C.indigo;
	const labelOpacity = interpolate(frame - drawStart, [20, 35], [0, 1], { extrapolateRight: 'clamp' });

	// Traffic dots
	const dots: React.ReactNode[] = [];
	if (simulating) {
		for (let i = 0; i < 4; i++) {
			const t = ((frame % 50) / 50 + i * 0.25) % 1;
			const dx = bezierPt(t, x1, cx1, cx2, x2);
			const dy = bezierPt(t, y1, cy1, cy2, y2);
			dots.push(
				<circle key={i} cx={dx} cy={dy} r={2.5} fill={edgeCol} opacity={0.85}>
					<animate attributeName="r" values="2;3.5;2" dur="0.6s" repeatCount="indefinite" />
				</circle>
			);
		}
	}

	// Label position
	const lx = (x1 + x2) / 2 + (x2 !== x1 ? (x2 > x1 ? 25 : -25) : 0);
	const ly = (y1 + y2) / 2;

	return (
		<svg style={{ position: 'absolute', top: 0, left: 0, width: 1440, height: 960, pointerEvents: 'none', zIndex: 5 }}>
			{/* Glow line */}
			<path d={pathD} fill="none" stroke={edgeCol} strokeWidth={4} strokeOpacity={0.1}
				strokeDasharray={`${prog * 600}`} strokeDashoffset={0} />
			{/* Main line */}
			<path d={pathD} fill="none" stroke={edgeCol} strokeWidth={1.5} strokeOpacity={0.7}
				strokeDasharray={`${prog * 600}`} strokeDashoffset={0} />
			{/* Traffic dots */}
			{dots}
			{/* Protocol label */}
			<foreignObject x={lx - 30} y={ly - 10} width={60} height={20} opacity={labelOpacity}>
				<div style={{
					background: 'rgba(17,24,39,0.9)', border: `1px solid ${C.border}`,
					borderRadius: 4, padding: '2px 6px', fontSize: 7,
					fontFamily: 'JetBrains Mono, monospace', color: C.muted,
					textAlign: 'center', whiteSpace: 'nowrap',
				}}>
					{edge.protocol}
				</div>
			</foreignObject>
		</svg>
	);
};

// ═════════════════════════════════════════════════════════════════════
// ANIMATED CURSOR
// ═════════════════════════════════════════════════════════════════════
const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
	if (frame < DROP.cursorEnter) return null;

	// Keyframes: cursor follows a path visiting each node's toolbar-to-drop
	type KF = { f: number; x: number; y: number };
	const kfs: KF[] = [
		{ f: DROP.cursorEnter, x: -80, y: 300 },
		{ f: DROP.lb.grab, x: -40, y: 280 },
		{ f: DROP.lb.drop - 5, x: 700, y: 100 },
		{ f: DROP.lb.drop + 15, x: 720, y: 130 },
		{ f: DROP.movy.grab - 10, x: -40, y: 300 },
		{ f: DROP.movy.grab, x: -40, y: 320 },
		{ f: DROP.movy.drop - 5, x: 700, y: 340 },
		{ f: DROP.movy.drop + 15, x: 720, y: 370 },
		{ f: DROP.redis.grab - 10, x: -40, y: 340 },
		{ f: DROP.redis.grab, x: -40, y: 340 },
		{ f: DROP.redis.drop - 5, x: 280, y: 580 },
		{ f: DROP.redis.drop + 15, x: 300, y: 600 },
		{ f: DROP.pg.grab - 10, x: -40, y: 360 },
		{ f: DROP.pg.grab, x: -40, y: 360 },
		{ f: DROP.pg.drop - 5, x: 700, y: 580 },
		{ f: DROP.pg.drop + 15, x: 720, y: 610 },
		{ f: DROP.stripe.grab - 10, x: -40, y: 380 },
		{ f: DROP.stripe.grab, x: -40, y: 380 },
		{ f: DROP.stripe.drop - 5, x: 1120, y: 580 },
		{ f: DROP.stripe.drop + 15, x: 1140, y: 610 },
		// After drops, cursor idles then moves to simulate button
		{ f: EDGE_START, x: 900, y: 400 },
		{ f: SIM_START - 30, x: 780, y: 850 },
		{ f: SIM_START, x: 780, y: 850 },
		{ f: SIM_START + 15, x: 900, y: 400 },
		{ f: OUTRO, x: 900, y: 400 },
	];

	let x = kfs[0].x, y = kfs[0].y;
	for (let i = 0; i < kfs.length - 1; i++) {
		if (frame >= kfs[i].f && frame <= kfs[i + 1].f) {
			const t = interpolate(frame, [kfs[i].f, kfs[i + 1].f], [0, 1], {
				extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
			});
			x = lerp(kfs[i].x, kfs[i + 1].x, t);
			y = lerp(kfs[i].y, kfs[i + 1].y, t);
			break;
		}
		if (frame > kfs[i + 1].f) { x = kfs[i + 1].x; y = kfs[i + 1].y; }
	}

	// Determine if grabbing
	const isGrabbing = (
		(frame >= DROP.lb.grab && frame < DROP.lb.drop) ||
		(frame >= DROP.movy.grab && frame < DROP.movy.drop) ||
		(frame >= DROP.redis.grab && frame < DROP.redis.drop) ||
		(frame >= DROP.pg.grab && frame < DROP.pg.drop) ||
		(frame >= DROP.stripe.grab && frame < DROP.stripe.drop)
	);

	const fadeOut = interpolate(frame, [OUTRO, OUTRO + 20], [1, 0], { extrapolateRight: 'clamp' });

	return (
		<div style={{ position: 'absolute', left: x, top: y, zIndex: 100, pointerEvents: 'none', opacity: fadeOut }}>
			{/* SVG Cursor */}
			<svg width={18} height={22} viewBox="0 0 18 22" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
				<path d={isGrabbing
					? "M2 0 L16 9 L9 9 L12 18 L8 20 L5 11 L2 14 Z"
					: "M0 0 L16 11 L7 11 L7 20 L0 20 Z"
				} fill={C.blue} stroke="#fff" strokeWidth={1} />
			</svg>
			{/* Name tag */}
			<div style={{
				background: C.blue, color: '#fff', fontSize: 8, fontWeight: 700,
				padding: '2px 8px', borderRadius: 4, marginTop: -4, marginLeft: 14,
				fontFamily: 'Inter, system-ui, sans-serif', whiteSpace: 'nowrap',
				boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
			}}>
				You
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// FLOATING TOOLBAR (left side — component palette)
// ═════════════════════════════════════════════════════════════════════
const Toolbar: React.FC<{ frame: number }> = ({ frame }) => {
	const { fps } = useVideoConfig();
	const slideIn = spring({
		frame: Math.max(0, frame - 10), fps,
		config: { damping: 14, stiffness: 100, mass: 0.8 }
	});
	const x = interpolate(slideIn, [0, 1], [-80, 16]);

	const tools = [
		{ icon: '🖱️', label: 'Select' },
		{ icon: '📦', label: 'Components', active: frame >= DROP.lb.grab && frame < DROP.stripe.drop + 30 },
		{ icon: '🔗', label: 'Connect', active: frame >= EDGE_START && frame < SIM_START },
		{ icon: '✏️', label: 'Draw' },
		{ icon: '💬', label: 'Comment' },
	];

	return (
		<div style={{
			position: 'absolute', left: x, top: '50%', transform: 'translateY(-50%)', zIndex: 60,
		}}>
			<div style={{
				background: 'rgba(17,24,39,0.95)', border: `1px solid ${C.border}`,
				borderRadius: 12, padding: '8px 6px', display: 'flex', flexDirection: 'column',
				gap: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
			}}>
				{tools.map((t, i) => (
					<div key={i} style={{
						width: 36, height: 36, borderRadius: 8, display: 'flex',
						alignItems: 'center', justifyContent: 'center', fontSize: 16,
						background: t.active ? `${C.blue}22` : 'transparent',
						border: t.active ? `1px solid ${C.blue}44` : '1px solid transparent',
						cursor: 'pointer',
					}}>
						{t.icon}
					</div>
				))}
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// BOTTOM CONTROL BAR
// ═════════════════════════════════════════════════════════════════════
const BottomBar: React.FC<{ frame: number; rps: number }> = ({ frame, rps }) => {
	const { fps } = useVideoConfig();
	const slideUp = spring({
		frame: Math.max(0, frame - 15), fps,
		config: { damping: 14, stiffness: 80, mass: 0.8 }
	});
	const y = interpolate(slideUp, [0, 1], [60, 0]);
	const sim = frame >= SIM_START;

	return (
		<div style={{
			position: 'absolute', bottom: 16 - y, left: '50%', transform: 'translateX(-50%)', zIndex: 70,
		}}>
			<div style={{
				background: 'rgba(17,24,39,0.95)', border: `1px solid ${C.border}`,
				borderRadius: 14, padding: '8px 20px', display: 'flex',
				alignItems: 'center', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
			}}>
				<div style={{ width: 9, height: 9, borderRadius: '50%', background: C.blue }} />
				<span style={{ color: C.white, fontSize: 10, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>
					Movy Ticketing
				</span>
				<div style={{ width: 1, height: 18, background: C.border }} />
				<span style={{ color: C.muted, fontSize: 8.5, fontFamily: 'Inter, system-ui, sans-serif' }}>
					Traffic: Step
				</span>
				<div style={{ width: 1, height: 18, background: C.border }} />
				{sim && (
					<span style={{ color: C.amber, fontSize: 8.5, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
						${(rps * 0.00015).toFixed(2)}/hr
					</span>
				)}
				<div style={{
					background: sim ? C.red : C.green, color: '#fff', fontSize: 9,
					fontWeight: 700, padding: '5px 14px', borderRadius: 8,
					fontFamily: 'Inter, system-ui, sans-serif',
					boxShadow: sim ? '0 0 12px rgba(239,68,68,0.3)' : '0 0 12px rgba(16,185,129,0.3)',
				}}>
					{sim ? '■ Stop' : '▶ Simulate'}
				</div>
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// COMMENT BUBBLE
// ═════════════════════════════════════════════════════════════════════
const Bubble: React.FC<{
	frame: number; appear: number; x: number; y: number; text: string; duration?: number;
}> = ({ frame, appear, x, y, text, duration = 110 }) => {
	const { fps } = useVideoConfig();
	if (frame < appear) return null;
	const local = frame - appear;
	const scale = spring({ frame: local, fps, config: { damping: 11, stiffness: 160, mass: 0.5 } });
	const opacity = interpolate(local, [0, 8, duration - 20, duration], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

	return (
		<div style={{
			position: 'absolute', left: x, top: y,
			transform: `scale(${scale})`, transformOrigin: 'bottom left',
			opacity, zIndex: 55,
		}}>
			<div style={{
				background: 'rgba(17,24,39,0.95)', border: `1px solid ${C.blue}88`,
				borderRadius: 10, padding: '8px 12px', maxWidth: 200,
				fontSize: 9.5, color: C.white, fontFamily: 'Inter, system-ui, sans-serif',
				lineHeight: 1.4, boxShadow: `0 0 20px ${C.blueGlow}`,
			}}>
				{text}
			</div>
			{/* Arrow */}
			<div style={{
				width: 0, height: 0, borderLeft: '6px solid transparent',
				borderRight: '6px solid transparent', borderTop: `6px solid ${C.blue}88`,
				marginLeft: 16,
			}} />
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// RPS COUNTER (top-right)
// ═════════════════════════════════════════════════════════════════════
const RPSCounter: React.FC<{ frame: number; rps: number }> = ({ frame, rps }) => {
	if (frame < SIM_START) return null;
	const opacity = interpolate(frame, [SIM_START, SIM_START + 15, OUTRO, OUTRO + 15], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

	return (
		<div style={{ position: 'absolute', top: 24, right: 24, zIndex: 80, opacity }}>
			<div style={{
				background: 'rgba(17,24,39,0.92)', border: `1px solid ${C.border}`,
				borderRadius: 10, padding: '10px 18px',
				boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
			}}>
				<div style={{ fontSize: 8, color: C.muted, fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.1em' }}>
					INCOMING TRAFFIC
				</div>
				<div style={{
					fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
					color: rps > 8000 ? C.red : rps > 4000 ? C.amber : C.blue,
				}}>
					{Math.round(rps).toLocaleString()} <span style={{ fontSize: 12, color: C.muted }}>RPS</span>
				</div>
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// TITLE + OUTRO OVERLAYS
// ═════════════════════════════════════════════════════════════════════
const TitleCard: React.FC<{ frame: number }> = ({ frame }) => {
	const opacity = interpolate(frame, [0, 15, 50, 70], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
	if (opacity <= 0) return null;

	return (
		<div style={{
			position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
			alignItems: 'center', justifyContent: 'center', zIndex: 200, opacity,
		}}>
			<div style={{
				fontSize: 52, fontWeight: 900, color: C.white,
				fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.03em',
				textShadow: '0 4px 40px rgba(0,0,0,0.8)',
			}}>
				Designing <span style={{ color: C.blue }}>Movy</span>
			</div>
			<div style={{
				fontSize: 17, color: C.muted, fontFamily: 'Inter, system-ui, sans-serif',
				marginTop: 10, letterSpacing: '0.02em',
			}}>
				A monolithic ticket booking system — built in Primer
			</div>
		</div>
	);
};

const Outro: React.FC<{ frame: number }> = ({ frame }) => {
	const opacity = interpolate(frame, [OUTRO, OUTRO + 25], [0, 1], { extrapolateRight: 'clamp' });
	if (opacity <= 0) return null;

	return (
		<div style={{
			position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
			alignItems: 'center', justifyContent: 'center', zIndex: 200, opacity,
			background: 'rgba(8,11,18,0.88)',
		}}>
			<div style={{
				fontSize: 34, fontWeight: 900, color: C.white, textAlign: 'center',
				fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.02em', lineHeight: 1.4,
			}}>
				Even a monolith can scale —<br />
				<span style={{ color: C.blue }}>if you design it right.</span>
			</div>
			<div style={{
				marginTop: 20, fontSize: 14, color: C.muted,
				fontFamily: 'Inter, system-ui, sans-serif',
			}}>
				Built with <span style={{ color: C.blue, fontWeight: 700 }}>Primer</span>
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═════════════════════════════════════════════════════════════════════
export const MovyDesign: React.FC = () => {
	const frame = useCurrentFrame();

	const sim = frame >= SIM_START;
	const bottleneck = frame >= SIM_PEAK;

	// ── 3D Camera ──
	const rotX = interpolate(frame,
		[0, 50, 200, 420, SIM_START, SIM_PEAK, OUTRO],
		[50, 25, 15, 10, 8, 12, 20],
		{ extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
	const rotY = interpolate(frame,
		[0, 50, 200, 420, SIM_START, OUTRO],
		[-20, -8, -3, 0, 2, 0],
		{ extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
	const sc = interpolate(frame,
		[0, 50, 200, 420, SIM_START, OUTRO],
		[0.55, 0.78, 0.88, 0.95, 1.0, 0.92],
		{ extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
	const tx = interpolate(frame,
		[0, 50, 200, OUTRO],
		[-120, -20, 0, 0],
		{ extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
	const ty = interpolate(frame,
		[0, 50, 200, 420, OUTRO],
		[120, 50, 10, -30, 0],
		{ extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });

	const rps = sim ? interpolate(frame,
		[SIM_START, SIM_RAMP, SIM_PEAK],
		[500, 5000, 10000],
		{ extrapolateRight: 'clamp' }) : 0;

	return (
		<div style={{
			width: 1920, height: 1080, background: C.bg,
			overflow: 'hidden', position: 'relative',
			fontFamily: 'Inter, system-ui, sans-serif',
		}}>
			{/* Title */}
			<TitleCard frame={frame} />

			{/* 3D Canvas Container */}
			<div style={{
				position: 'absolute', top: '50%', left: '50%',
				width: 1440, height: 960,
				transformOrigin: 'center center',
				perspective: 1400,
			}}>
				<div style={{
					width: '100%', height: '100%',
					transform: `
						translate(-50%, -50%)
						translate(${tx}px, ${ty}px)
						scale(${sc})
						rotateX(${rotX}deg)
						rotateY(${rotY}deg)
					`,
					transformStyle: 'preserve-3d',
					position: 'relative',
				}}>
					{/* Dot grid */}
					<DotGrid />

					{/* Edges */}
					{EDGES.map((e, i) => (
						<EdgeLine key={`${e.from}-${e.to}`} edge={e} frame={frame}
							drawStart={EDGE_START + i * EDGE_GAP} simulating={sim} />
					))}

					{/* Nodes */}
					<NodeCard node={NODES[0]} frame={frame} grabFrame={DROP.lb.grab} dropFrame={DROP.lb.drop} simulating={sim} isBottleneck={false} />
					<NodeCard node={NODES[1]} frame={frame} grabFrame={DROP.movy.grab} dropFrame={DROP.movy.drop} simulating={sim} isBottleneck={bottleneck} />
					<NodeCard node={NODES[2]} frame={frame} grabFrame={DROP.redis.grab} dropFrame={DROP.redis.drop} simulating={sim} isBottleneck={false} />
					<NodeCard node={NODES[3]} frame={frame} grabFrame={DROP.pg.grab} dropFrame={DROP.pg.drop} simulating={sim} isBottleneck={false} />
					<NodeCard node={NODES[4]} frame={frame} grabFrame={DROP.stripe.grab} dropFrame={DROP.stripe.drop} simulating={sim} isBottleneck={false} />

					{/* Cursor */}
					<Cursor frame={frame} />
				</div>
			</div>

			{/* Comment bubbles */}
			<Bubble frame={frame} appear={DROP.lb.drop + 10} x={820} y={170}
				text="⚖️ HAProxy distributes incoming ticket requests across instances." />
			<Bubble frame={frame} appear={DROP.movy.drop + 10} x={820} y={350}
				text="🎬 The monolith handles auth, seat selection, booking, and payment in one process." />
			<Bubble frame={frame} appear={DROP.redis.drop + 10} x={100} y={480}
				text="⚡ Redis locks seats instantly — prevents double-booking race conditions." />
			<Bubble frame={frame} appear={DROP.stripe.drop + 10} x={1000} y={480}
				text="💳 Stripe processes payments via webhooks. External SLA: 99.9%." />
			<Bubble frame={frame} appear={SIM_PEAK} x={820} y={280}
				text="🔴 At 10K RPS the monolith saturates — time to scale horizontally!" duration={120} />

			{/* UI Chrome */}
			<Toolbar frame={frame} />
			<BottomBar frame={frame} rps={rps} />
			<RPSCounter frame={frame} rps={rps} />

			{/* Outro */}
			<Outro frame={frame} />

			{/* Watermark */}
			<div style={{
				position: 'absolute', bottom: 14, right: 22, zIndex: 90,
				opacity: 0.4, fontSize: 10, color: C.muted,
				fontFamily: 'Inter, system-ui, sans-serif',
			}}>
				primer
			</div>
		</div>
	);
};
