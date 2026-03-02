import React from 'react';
import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	spring,
	Easing,
} from 'remotion';

/* ═══════════════════════════════════════════════════════════════════
   MOVY DESIGN 2D — Authentic Primer Dashboard Replica
   Perfectly matches the dark UI, floating sidebars, and grid from the
   user's actual screenshots.
   ═══════════════════════════════════════════════════════════════════ */

// ── Palette (Exact from user screenshots & Primer UI) ────────────────
const C = {
	bg: '#0b0d14', // Very dark blue/black background
	dotGrid: '#1e2536', // Grid line colors

	panelBg: '#131620', // Floating panel backgrounds
	panelBorder: '#1e2536', // Floating panel borders

	nodeBg: 'rgba(19, 22, 32, 0.95)',
	nodeBorder: '#1e2536',
	headerBg: 'rgba(255, 255, 255, 0.02)',

	white: '#f1f5f9',
	muted: '#64748b',

	// Component Colors (from TechNode.tsx)
	lb: '#8b5cf6', // Purple
	app: '#3caff6', // Blue (Primer Primary)
	redis: '#ec4899', // Pink (Cache)
	pg: '#10b981', // Green (DB)
	stripe: '#f59e0b', // Amber (External)

	// Status Colors
	green: '#10b981',
	red: '#ef4444',
	orange: '#f97316',
};

// ── Architecture Nodes ───────────────────────────────────────────────
interface NodeDef {
	id: string;
	label: string;
	type: string;
	icon: string;
	color: string;
	category: 'compute' | 'lb' | 'db' | 'cache' | 'external';
	x: number;
	y: number;
}

const NODES: NodeDef[] = [
	{ id: 'lb', label: 'HAProxy LB', type: 'Load Balancer', icon: '⚖️', color: C.lb, category: 'lb', x: 900, y: 150 },
	{ id: 'movy', label: 'Movy Server', type: 'Node.js', icon: '🎬', color: C.app, category: 'compute', x: 900, y: 390 },
	{ id: 'redis', label: 'Seat Lock', type: 'Redis', icon: '⚡', color: C.redis, category: 'cache', x: 480, y: 630 },
	{ id: 'pg', label: 'Tickets DB', type: 'PostgreSQL', icon: '🗄️', color: C.pg, category: 'db', x: 900, y: 630 },
	{ id: 'stripe', label: 'Payments', type: 'Stripe API', icon: '💳', color: C.stripe, category: 'external', x: 1320, y: 630 },
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

// Drag-and-drop sequence
const DROP = {
	cursorEnter: 40,
	lb: { grab: 60, drop: 100 },
	movy: { grab: 140, drop: 180 },
	redis: { grab: 230, drop: 280 },
	pg: { grab: 310, drop: 360 },
	stripe: { grab: 390, drop: 440 },
};

const EDGE_START = 480;
const EDGE_GAP = 20;

const SIM_START = 600;
const SIM_RAMP = 700;
const SIM_PEAK = 800;

// ── Tutorial Subtitles ───────────────────────────────────────────────
const SUBTITLES = [
	{ f: 0, text: "Welcome to Primer! Today we're building Movy..." },
	{ f: 45, text: "...a monolithic theatre booking application." },
	{ f: 90, text: "First, we add an HAProxy Load Balancer to manage traffic." },
	{ f: 160, text: "Next, our core Node.js Monolithic App Server." },
	{ f: 260, text: "We need Redis for distributed seat locks to prevent double-booking." },
	{ f: 340, text: "PostgreSQL will persistently store our ticket orders." },
	{ f: 420, text: "And we'll integrate the Stripe API for checkout." },
	{ f: 490, text: "Let's wire up the protocols (HTTP, TCP, SQL, HTTPS)." },
	{ f: 580, text: "Time to test! We'll run a Step Function up to 10,000 requests/sec." },
	{ f: 680, text: "Traffic is flowing... but latency is spiking..." },
	{ f: 780, text: "Boom! At 10K RPS, our Monolith CPU hits 100%. We've found our bottleneck." },
];

// ── Helpers ──────────────────────────────────────────────────────────
function getNode(id: string) { return NODES.find(n => n.id === id)!; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function bezierPt(t: number, p0: number, p1: number, p2: number, p3: number) {
	const u = 1 - t;
	return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}
function formatNum(val: number) {
	if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
	return Math.round(val).toString();
}

// ═════════════════════════════════════════════════════════════════════
// AUTHENTIC BACKGROUND GRID (Matches Screenshots)
// ═════════════════════════════════════════════════════════════════════
const BackgroundGrid: React.FC = () => {
	return (
		<div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: C.bg }}>
			{/* Grid Pattern based on actual screenshot */}
			<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
						<path d="M 20 0 L 0 0 0 20" fill="none" stroke={C.dotGrid} strokeWidth="0.5" />
					</pattern>
					<pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
						<rect width="100" height="100" fill="url(#smallGrid)" />
						<path d="M 100 0 L 0 0 0 100" fill="none" stroke={C.dotGrid} strokeWidth="1" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#grid)" />
			</svg>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// AUTHENTIC TECH NODE
// ═════════════════════════════════════════════════════════════════════
const AuthNode: React.FC<{
	node: NodeDef;
	frame: number;
	grabFrame: number;
	dropFrame: number;
	simulating: boolean;
	isBottleneck: boolean;
}> = ({ node, frame, grabFrame, dropFrame, simulating, isBottleneck }) => {
	const { fps } = useVideoConfig();
	if (frame < grabFrame) return null;

	// Elements drag out of the Left toolbar
	const toolbarX = 160;
	const toolbarY = 320;

	const isDragging = frame >= grabFrame && frame < dropFrame;
	const isDropped = frame >= dropFrame;

	let posX = toolbarX;
	let posY = toolbarY;
	let shadow = `0 10px 30px rgba(0,0,0,0.5)`;
	let borderCol = C.nodeBorder;
	let scale = 1;

	// Dragging Animation
	if (isDragging) {
		const t = interpolate(frame, [grabFrame, dropFrame], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
		posX = lerp(toolbarX, node.x, t);
		posY = lerp(toolbarY, node.y, t);
		borderCol = node.color;
		scale = interpolate(t, [0, 0.5, 1], [1, 1.05, 1.0]);
	}

	// Dropped state
	if (isDropped) {
		posX = node.x;
		posY = node.y;
		const bounce = spring({ frame: frame - dropFrame, fps, config: { damping: 12, stiffness: 200, mass: 0.5 } });
		scale = interpolate(bounce, [0, 1], [1.1, 1.0]);
		borderCol = simulating ? `${node.color}99` : C.nodeBorder;
	}

	if (isBottleneck) {
		borderCol = C.red;
		shadow = `0 0 20px -5px ${C.red}60`;
	} else if (simulating && isDropped) {
		shadow = `0 0 15px -5px ${node.color}40`;
	}

	// Metrics Simulation
	const cpu = simulating ? interpolate(frame, [SIM_START, SIM_RAMP, SIM_PEAK],
		node.id === 'movy' ? [5, 68, 98] : [2, 18, 32], { extrapolateRight: 'clamp' }) : 0;

	const rps = simulating ? interpolate(frame, [SIM_START, SIM_RAMP, SIM_PEAK],
		node.id === 'movy' ? [150, 4800, 10000] : (node.id === 'pg' ? [80, 2200, 4800] : [70, 1800, 3200]),
		{ extrapolateRight: 'clamp' }) : 0;

	const latency = simulating ? interpolate(frame, [SIM_START, SIM_RAMP, SIM_PEAK],
		node.id === 'movy' ? [12, 140, 920] : [4, 25, 45], { extrapolateRight: 'clamp' }) : 0;

	return (
		<div style={{
			position: 'absolute', left: posX - 110, top: posY - 60, width: 220,
			transform: `scale(${scale})`, transformOrigin: 'center center',
			zIndex: isDragging ? 50 : 10,
		}}>
			<div style={{
				position: 'relative', width: '100%', height: '100%',
				backgroundColor: C.nodeBg, backdropFilter: 'blur(4px)',
				border: `2px solid ${node.category === 'external' && !simulating ? '#f59e0b50' : borderCol}`,
				borderStyle: node.category === 'external' ? 'dashed' : 'solid',
				borderRadius: 12, boxShadow: shadow,
				display: 'flex', flexDirection: 'column', overflow: 'hidden',
			}}>
				{node.category === 'external' && (
					<div style={{
						position: 'absolute', top: 0, right: 0, background: C.orange,
						color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 6px',
						borderBottomLeftRadius: 8, zIndex: 20, textTransform: 'uppercase',
						letterSpacing: '0.1em', borderLeft: `1px solid ${C.nodeBorder}`, borderBottom: `1px solid ${C.nodeBorder}`
					}}>
						Ext Provider
					</div>
				)}

				<div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: 4, background: '#1e293b', border: '1px solid #334155' }} />
				<div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: 4, background: '#1e293b', border: '1px solid #334155' }} />

				<div style={{
					padding: '12px', borderBottom: `1px solid ${C.nodeBorder}80`,
					display: 'flex', alignItems: 'center', justifyContent: 'space-between',
					backgroundColor: C.headerBg
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
						<div style={{
							padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
							backgroundColor: `${isBottleneck ? C.red : node.color}15`,
							color: isBottleneck ? C.red : node.color, fontSize: 18,
							minWidth: 30, minHeight: 30
						}}>
							{node.icon}
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
							<span style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
								{node.label}
							</span>
							<span style={{ fontSize: 8, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
								{node.type}
							</span>
						</div>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						{isBottleneck && <span style={{ fontSize: 12, animation: 'pulse 1s infinite' }}>⚠️</span>}
						<div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isBottleneck ? C.red : C.green }} />
					</div>
				</div>

				<div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
					{!simulating ? (
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: '#64748b', fontStyle: 'italic', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
							<span>⚡</span> Ready for simulation
						</div>
					) : (
						<>
							{node.category === 'lb' ? (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
									<MetricRow label="Throughput" value={`${formatNum(rps)} rps`} color={node.color} />
									<MetricRow label="Latency" value={`${Math.round(latency)}ms`} color="#fbbf24" />
								</div>
							) : node.category === 'db' ? (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
									<MetricRow label="IOPS" value={formatNum(rps * 1.5)} color={C.green} />
									<MetricRow label="Conns" value={`${Math.round((cpu / 100) * 128)}/200`} color="#6366f1" />
								</div>
							) : node.category === 'cache' ? (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
									<MetricRow label="Hit Rate" value={`${Math.round(98 - (cpu / 100) * 5)}%`} color="#f43f5e" />
									<MetricRow label="Memory" value={`${(1 + cpu / 20).toFixed(1)}GB`} color="#ec4899" />
								</div>
							) : node.category === 'external' ? (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
									<MetricRow label="Throughput" value={`${formatNum(rps)}/s`} color={C.green} />
									<MetricRow label="Latency" value={`${Math.round(latency / 2)}ms`} color="#fbbf24" />
								</div>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
									<div>
										<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', fontWeight: 500 }}>
											<span>CPU Load</span>
											<span style={{ color: cpu > 80 ? C.red : '#f1f5f9', fontWeight: 700 }}>{Math.round(cpu)}%</span>
										</div>
										<div style={{ height: 4, backgroundColor: '#1a1c2e', borderRadius: 2, overflow: 'hidden' }}>
											<div style={{ height: '100%', width: `${Math.min(cpu, 100)}%`, backgroundColor: cpu > 80 ? C.red : node.color, transition: 'width 0.1s' }} />
										</div>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
										<span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: 8 }}>Memory</span>
										<span style={{ color: '#cbd5e1' }}>{(2 + cpu * 0.04).toFixed(1)} GB</span>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

const MetricRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
	<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9 }}>
		<span style={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 500, fontSize: 8, letterSpacing: '-0.02em' }}>{label}</span>
		<span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.05em', color }}>{value}</span>
	</div>
);

// ═════════════════════════════════════════════════════════════════════
// AUTHENTIC TRAFFIC EDGE
// ═════════════════════════════════════════════════════════════════════
const AuthEdge: React.FC<{
	edge: EdgeDef;
	frame: number;
	drawStart: number;
	simulating: boolean;
}> = ({ edge, frame, drawStart, simulating }) => {
	if (frame < drawStart) return null;

	const fromN = getNode(edge.from);
	const toN = getNode(edge.to);

	const x1 = fromN.x, y1 = fromN.y + 60;
	const x2 = toN.x, y2 = toN.y - 65;
	const cx1 = x1, cy1 = y1 + (y2 - y1) * 0.5;
	const cx2 = x2, cy2 = y2 - (y2 - y1) * 0.5;

	const prog = interpolate(frame - drawStart, [0, 20], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
	const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

	const strokeCol = simulating ? '#3caff6' : '#2a2f40';
	const labelOpacity = interpolate(frame - drawStart, [15, 30], [0, 1], { extrapolateRight: 'clamp' });

	const dots = [];
	if (simulating) {
		const numPackets = edge.from === 'lb' ? 8 : 4;
		const speed = edge.from === 'lb' ? 40 : 60;
		for (let i = 0; i < numPackets; i++) {
			const t = ((frame % speed) / speed + i * (1 / numPackets)) % 1;
			const dx = bezierPt(t, x1, cx1, cx2, x2);
			const dy = bezierPt(t, y1, cy1, cy2, y2);
			dots.push(
				<circle key={i} cx={dx} cy={dy} r={4} fill={strokeCol} style={{ filter: `drop-shadow(0 0 6px ${strokeCol})` }}>
					<animate attributeName="opacity" values="0.4;1;0.4" dur="0.8s" repeatCount="indefinite" />
				</circle>
			);
		}
	}

	const lx = (x1 + x2) / 2 + (x2 !== x1 ? (x2 > x1 ? 30 : -30) : 0);
	const ly = (y1 + y2) / 2;

	return (
		<svg style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: 1080, pointerEvents: 'none', zIndex: 5 }}>
			<path d={pathD} fill="none" stroke={strokeCol} strokeWidth={simulating ? 1.5 : 2} strokeOpacity={0.8}
				strokeDasharray={`${prog * 800}`} strokeDashoffset={0} />
			{simulating && <path d={pathD} fill="none" stroke={strokeCol} strokeWidth={4} opacity={0.3} style={{ filter: 'blur(2px)' }} />}
			{dots}
			<foreignObject x={lx - 35} y={ly - 12} width={70} height={24} opacity={labelOpacity}>
				<div style={{
					backgroundColor: '#0f111a', border: `1px solid ${C.nodeBorder}`, borderRadius: 4, padding: '2px 6px',
					display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
				}}>
					<span style={{ fontSize: 10, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{edge.protocol}</span>
				</div>
			</foreignObject>
		</svg>
	);
};

// ═════════════════════════════════════════════════════════════════════
// THE CURSOR
// ═════════════════════════════════════════════════════════════════════
const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
	if (frame < DROP.cursorEnter) return null;

	const kfs = [
		{ f: DROP.cursorEnter, x: 100, y: 600 },
		{ f: DROP.lb.grab, x: 100, y: 400 }, // Over the Left Toolbar icon
		{ f: DROP.lb.drop - 5, x: NODES[0].x, y: NODES[0].y },
		{ f: DROP.lb.drop + 10, x: NODES[0].x + 20, y: NODES[0].y + 20 },

		{ f: DROP.movy.grab - 10, x: 100, y: 300 },
		{ f: DROP.movy.grab, x: 100, y: 300 },
		{ f: DROP.movy.drop - 5, x: NODES[1].x, y: NODES[1].y },
		{ f: DROP.movy.drop + 10, x: NODES[1].x + 20, y: NODES[1].y + 20 },

		{ f: DROP.redis.grab - 10, x: 100, y: 700 },
		{ f: DROP.redis.grab, x: 100, y: 700 },
		{ f: DROP.redis.drop - 5, x: NODES[2].x, y: NODES[2].y },
		{ f: DROP.redis.drop + 10, x: NODES[2].x + 20, y: NODES[2].y + 20 },

		{ f: DROP.pg.grab - 10, x: 100, y: 650 },
		{ f: DROP.pg.grab, x: 100, y: 650 },
		{ f: DROP.pg.drop - 5, x: NODES[3].x, y: NODES[3].y },
		{ f: DROP.pg.drop + 10, x: NODES[3].x + 20, y: NODES[3].y + 20 },

		{ f: DROP.stripe.grab - 10, x: 100, y: 150 },
		{ f: DROP.stripe.grab, x: 100, y: 150 },
		{ f: DROP.stripe.drop - 5, x: NODES[4].x, y: NODES[4].y },
		{ f: DROP.stripe.drop + 10, x: NODES[4].x + 20, y: NODES[4].y + 20 },

		{ f: EDGE_START, x: 1100, y: 400 },
		{ f: SIM_START - 20, x: 1200, y: 950 }, // Moving to Simulate Button
		{ f: SIM_START, x: 1200, y: 950 },
		{ f: SIM_START + 15, x: 1300, y: 700 },
		{ f: TOTAL, x: 1300, y: 700 },
	];

	let x = kfs[0].x, y = kfs[0].y;
	for (let i = 0; i < kfs.length - 1; i++) {
		if (frame >= kfs[i].f && frame <= kfs[i + 1].f) {
			const t = interpolate(frame, [kfs[i].f, kfs[i + 1].f], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
			x = lerp(kfs[i].x, kfs[i + 1].x, t);
			y = lerp(kfs[i].y, kfs[i + 1].y, t);
			break;
		}
		if (frame > kfs[i + 1].f) { x = kfs[i + 1].x; y = kfs[i + 1].y; }
	}

	const isGrabbing = [DROP.lb, DROP.movy, DROP.redis, DROP.pg, DROP.stripe].some(d => frame >= d.grab && frame < d.drop);
	const fade = interpolate(frame, [TOTAL - 20, TOTAL], [1, 0], { extrapolateRight: 'clamp' });

	return (
		<div style={{ position: 'absolute', left: x, top: y, zIndex: 200, pointerEvents: 'none', opacity: fade }}>
			<svg width={24} height={30} viewBox="0 0 18 22" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
				<path d={isGrabbing ? "M2 0 L16 9 L9 9 L12 18 L8 20 L5 11 L2 14 Z" : "M0 0 L16 11 L7 11 L7 20 L0 20 Z"} fill={C.app} stroke="#fff" strokeWidth={1} />
			</svg>
			<div style={{ background: C.app, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, marginTop: -4, marginLeft: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
				Amitesh
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// COMMENT BUBBLE
// ═════════════════════════════════════════════════════════════════════
const Bubble: React.FC<{ frame: number; appear: number; x: number; y: number; text: string; duration?: number; }> = ({ frame, appear, x, y, text, duration = 120 }) => {
	const { fps } = useVideoConfig();
	if (frame < appear) return null;
	const local = frame - appear;
	const scale = spring({ frame: local, fps, config: { damping: 11, stiffness: 160, mass: 0.5 } });
	const opacity = interpolate(local, [0, 8, duration - 20, duration], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

	return (
		<div style={{ position: 'absolute', left: x, top: y, transform: `scale(${scale})`, transformOrigin: 'bottom left', opacity, zIndex: 100 }}>
			<div style={{ background: C.app, border: `1px solid ${C.white}`, borderRadius: 12, padding: '10px 14px', maxWidth: 220, fontSize: 13, color: C.white, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, boxShadow: `0 8px 30px rgba(60,175,246,0.4)` }}>
				{text}
			</div>
			<div style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `8px solid ${C.app}`, marginLeft: 20 }} />
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// AUTHENTIC CHROME (Matches User Screenshots)
// ═════════════════════════════════════════════════════════════════════
const FloatingLeftBar: React.FC = () => (
	<div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 24, width: 44, background: C.panelBg, border: `1px solid ${C.panelBorder}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 16, zIndex: 90, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
		<div style={{ background: C.app, padding: 8, borderRadius: 8, color: '#fff' }}>⚡</div>
		<div style={{ color: C.muted, fontSize: 16 }}>T</div>
		<div style={{ color: C.muted, fontSize: 16 }}>▲</div>
		<div style={{ color: C.muted, fontSize: 16 }}>□</div>
		<div style={{ color: C.muted, fontSize: 16 }}>↓</div>
		<div style={{ color: C.green, fontSize: 16, marginTop: 'auto' }}>📊</div>
	</div>
);

const FloatingTechBar: React.FC<{ frame: number }> = ({ frame }) => {
	// Replicating the "Tech Components" panel shown in the screenshot
	if (frame > EDGE_START) return null; // Hide after dropping is done
	return (
		<div style={{ position: 'absolute', top: 120, left: 90, width: 240, background: C.panelBg, border: `1px solid ${C.panelBorder}`, borderRadius: 12, display: 'flex', flexDirection: 'column', padding: 16, zIndex: 80, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontFamily: 'Inter, system-ui, sans-serif' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', color: C.white, fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
				Tech Components <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>Close</span>
			</div>

			<div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 12 }}>EXTERNAL CLIENTS & LOAD</div>
			<div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
				<div style={{ flex: 1, height: 60, border: `1px solid ${C.panelBorder}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span style={{ color: C.lb, fontSize: 16 }}>🟣</span><span style={{ fontSize: 9, color: C.muted }}>Workers</span></div>
				<div style={{ flex: 1, height: 60, border: `1px solid ${C.panelBorder}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span style={{ color: C.app, fontSize: 16 }}>💻</span><span style={{ fontSize: 9, color: C.muted }}>Web Client</span></div>
			</div>

			<div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 12 }}>COMPUTE</div>
			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
				<div style={{ width: 'calc(50% - 4px)', height: 60, border: `1px solid ${C.panelBorder}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span style={{ color: '#3b82f6', fontSize: 16 }}>⎈</span><span style={{ fontSize: 9, color: C.muted }}>Kubernetes</span></div>
				<div style={{ width: 'calc(50% - 4px)', height: 60, border: `1px solid ${C.panelBorder}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span style={{ color: '#0ea5e9', fontSize: 16 }}>🐳</span><span style={{ fontSize: 9, color: C.muted }}>Docker</span></div>
				<div style={{ width: 'calc(50% - 4px)', height: 60, border: `1px solid ${C.panelBorder}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#1e2536' }}><span style={{ color: '#f59e0b', fontSize: 16 }}>AWS</span><span style={{ fontSize: 9, color: C.white }}>AWS EC2</span></div>
				<div style={{ width: 'calc(50% - 4px)', height: 60, border: `1px solid ${C.panelBorder}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span style={{ color: C.green, fontSize: 16 }}>🐧</span><span style={{ fontSize: 9, color: C.muted }}>Linux Server</span></div>
			</div>
		</div>
	);
};

const AuthenticBottomBar: React.FC<{ frame: number }> = ({ frame }) => {
	const simStart = SIM_START;
	const sim = frame >= simStart;
	const rps = sim ? interpolate(frame, [SIM_START, SIM_RAMP, SIM_PEAK], [500, 5000, 10000], { extrapolateRight: 'clamp' }) : 1500;

	return (
		<div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 110 }}>
			<div style={{ background: C.panelBg, border: `1px solid ${C.panelBorder}`, borderRadius: 12, padding: '8px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', fontFamily: 'Inter, system-ui, sans-serif' }}>

				<div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
					<span style={{ color: C.muted }}>🏠</span>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						<div style={{ width: 8, height: 8, borderRadius: 4, background: C.app }} />
						<span style={{ color: C.white, fontSize: 13, fontWeight: 500 }}>Movy Ticketing</span>
					</div>
				</div>

				<div style={{ width: 1, height: 24, background: C.panelBorder }} />

				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 100 }}>
					<span style={{ color: C.muted, fontSize: 8, fontWeight: 700, letterSpacing: '0.05em' }}>TRAFFIC PATTERN <span style={{ color: C.app }}>STEP</span></span>
					<div style={{ background: '#1e2536', padding: '2px 8px', borderRadius: 4, color: C.white, fontSize: 11, fontWeight: 600, width: '100%', textAlign: 'center', marginTop: 2 }}>
						{formatNum(rps)} RPS
					</div>
				</div>

				<div style={{ width: 1, height: 24, background: C.panelBorder }} />

				<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
					<span style={{ color: C.muted, fontSize: 9 }}>SIM SPEED</span>
					<div style={{ width: 40, height: 4, background: '#1e2536', borderRadius: 2, position: 'relative' }}>
						<div style={{ position: 'absolute', top: -3, left: '50%', width: 10, height: 10, borderRadius: 5, background: C.app }} />
					</div>
					<span style={{ color: C.white, fontSize: 11 }}>1x</span>
				</div>

				<div style={{ width: 1, height: 24, background: C.panelBorder }} />
				<div style={{ display: 'flex', gap: 12, padding: '0 8px', color: C.muted }}>
					<span>⚙️</span>
					<span>💬</span>
				</div>

				<div style={{ background: sim ? C.red : C.app, color: '#fff', fontSize: 14, fontWeight: 600, padding: '6px 16px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 0 15px ${sim ? C.red : C.app}40` }}>
					{sim ? '■ Stop' : '▶ Simulate'}
				</div>
				<div style={{ color: C.white, fontSize: 13, padding: '6px 16px' }}>Save</div>
				<div style={{ color: C.white, fontSize: 13, padding: '6px 16px' }}>Share</div>
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// TUTORIAL SUBTITLE TRACK
// ═════════════════════════════════════════════════════════════════════
const SubtitleTrack: React.FC<{ frame: number }> = ({ frame }) => {
	const currentSub = [...SUBTITLES].reverse().find(s => frame >= s.f);
	if (!currentSub) return null;

	return (
		<div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 120, width: '100%', display: 'flex', justifyContent: 'center' }}>
			<div style={{
				background: 'rgba(11, 13, 20, 0.85)', backdropFilter: 'blur(8px)',
				border: `1px solid ${C.app}40`, borderTopWidth: 2, borderTopColor: C.app,
				padding: '12px 32px', borderRadius: 8,
				boxShadow: `0 10px 40px rgba(0,0,0,0.8), 0 0 20px ${C.app}20`,
				textAlign: 'center'
			}}>
				<span style={{
					color: '#f1f5f9', fontSize: 24, fontWeight: 600,
					fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.02em',
					textShadow: '0 2px 10px rgba(0,0,0,0.5)'
				}}>
					{currentSub.text}
				</span>
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═════════════════════════════════════════════════════════════════════
export const MovyDesign2D: React.FC = () => {
	const frame = useCurrentFrame();
	const sim = frame >= SIM_START;
	const bottleneck = frame >= SIM_PEAK;

	return (
		<div style={{ width: 1920, height: 1080, background: C.bg, overflow: 'hidden', position: 'relative' }}>

			{/* Authentic Base Layers */}
			<BackgroundGrid />
			<FloatingLeftBar />
			<FloatingTechBar frame={frame} />

			{/* Extracted the Properties Panel since user noted it can be omitted to focus on canvas */}

			{/* Canvas Elements */}
			<div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
				{/* Edges */}
				{EDGES.map((e, i) => (
					<AuthEdge key={`${e.from}-${e.to}`} edge={e} frame={frame} drawStart={EDGE_START + i * EDGE_GAP} simulating={sim} />
				))}

				{/* Nodes */}
				<AuthNode node={NODES[0]} frame={frame} grabFrame={DROP.lb.grab} dropFrame={DROP.lb.drop} simulating={sim} isBottleneck={false} />
				<AuthNode node={NODES[1]} frame={frame} grabFrame={DROP.movy.grab} dropFrame={DROP.movy.drop} simulating={sim} isBottleneck={bottleneck} />
				<AuthNode node={NODES[2]} frame={frame} grabFrame={DROP.redis.grab} dropFrame={DROP.redis.drop} simulating={sim} isBottleneck={false} />
				<AuthNode node={NODES[3]} frame={frame} grabFrame={DROP.pg.grab} dropFrame={DROP.pg.drop} simulating={sim} isBottleneck={false} />
				<AuthNode node={NODES[4]} frame={frame} grabFrame={DROP.stripe.grab} dropFrame={DROP.stripe.drop} simulating={sim} isBottleneck={false} />

				<Cursor frame={frame} />

				{/* Commentary Bubbles mapping the progression */}
				<Bubble frame={frame} appear={DROP.lb.drop + 10} x={1130} y={130} text="⚖️ The Load Balancer scales incoming traffic across the monolith." />
				<Bubble frame={frame} appear={DROP.movy.drop + 10} x={1130} y={370} text="🎬 Movy App Node.js Monolith. All core logic runs here." />
				<Bubble frame={frame} appear={DROP.redis.drop + 10} x={240} y={610} text="⚡ Redis provides distributed locking for seat reservations." />
				<Bubble frame={frame} appear={DROP.stripe.drop + 10} x={1550} y={610} text="💳 Stripe handles payments. Configured as external dependency." />
				<Bubble frame={frame} appear={SIM_PEAK} x={960} y={300} text="🔴 BOOM! 10K RPS. Simulation caught the bottleneck. CPU pegged at 100%!" duration={TOTAL} />
			</div>

			<AuthenticBottomBar frame={frame} />
			<SubtitleTrack frame={frame} />

		</div>
	);
};
