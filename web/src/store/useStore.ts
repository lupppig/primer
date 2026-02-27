import { create } from 'zustand';
import type {
	Connection,
	Edge,
	EdgeChange,
	Node,
	NodeChange,
	OnNodesChange,
	OnEdgesChange,
	OnConnect,
} from 'reactflow';
import {
	addEdge,
	applyNodeChanges,
	applyEdgeChanges,
} from 'reactflow';

export type LoadProfileType = 'flat' | 'spike' | 'step';

export interface LoadProfile {
	type: LoadProfileType;
	baseRps: number;
	peakRps: number;
	durationSeconds: number;
}

export type SimulationState = {
	isSimulating: boolean;
	totalRps: number;
	loadProfile: LoadProfile;
	activeBottlenecks: string[];
	nodeMetrics: Record<string, any>;
	history: Record<string, any[]>; // For charts
	chaosNodes: string[];
	simSpeed: number; // 1 to 10
	totalSimulationCost: number;
	burnRate: number; // Global tick cost
	viewMode: 'canvas' | 'dashboard';
};

type AppState = {
	nodes: Node[];
	edges: Edge[];
	simulation: SimulationState;
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	onConnect: OnConnect;
	setNodes: (nodes: Node[]) => void;
	setEdges: (edges: Edge[]) => void;
	toggleSimulation: (designId?: string) => void;
	setSimulationData: (data: Partial<SimulationState>) => void;
	updateLoadProfile: (profile: Partial<LoadProfile>) => void;
	setSimSpeed: (speed: number) => void;
	activeTool: string;
	setActiveTool: (tool: string) => void;
	setViewMode: (mode: 'canvas' | 'dashboard') => void;
	duplicateNode: (id: string, newPosition?: { x: number, y: number }) => void;
	deleteNode: (id: string) => void;
	updateNodeData: (id: string, newData: Partial<any>) => void;
	updateEdgeData: (id: string, newData: Partial<any>) => void;
	toggleNodeFailure: (id: string) => void;
	updateEdgeProtocol: (edgeId: string, protocol: 'HTTP' | 'WebSocket' | 'gRPC' | 'UDP') => void;
	past: { nodes: Node[], edges: Edge[] }[];
	future: { nodes: Node[], edges: Edge[] }[];
	undo: () => void;
	redo: () => void;
	takeSnapshot: () => void;
};


let ws: WebSocket | null = null;

const _getSimGraph = (nodes: Node[], edges: Edge[], chaosNodes: string[]) => {
	const simNodes: any = {};
	nodes.forEach(n => {
		if (n.type !== 'techNode') return;
		const lbl = (n.data?.label || '').toLowerCase();
		const isQueue = ['kafka', 'rabbitmq', 'sqs', 'queue'].some(q => lbl.includes(q));
		const isCDN = ['cdn', 'edge', 'cloudfront'].some(q => lbl.includes(q));
		const isFirewall = ['firewall', 'waf', 'security', 'shield'].some(q => lbl.includes(q));
		const isLB = ['lb', 'balancer', 'nginx', 'proxy'].some(q => lbl.includes(q));
		const isExternal = ['external', 'stripe', 'aws', 'auth0', 'api.', 'ext-'].some(q => lbl.includes(q)) || n.data?.type === 'external';

		let nodeType = 'api';
		if (isQueue) nodeType = 'queue';
		else if (isCDN) nodeType = 'cdn';
		else if (isFirewall) nodeType = 'firewall';
		else if (isLB) nodeType = 'lb';
		else if (isExternal) nodeType = 'external';

		const effectivelyFailed = chaosNodes.includes(n.id);

		simNodes[n.id] = {
			id: n.id,
			type: nodeType,
			capacity_rps: effectivelyFailed ? 0.0 : (n.data?.capacity_rps ?? 1000),
			base_latency_ms: n.data?.base_latency_ms ?? 10,
			replicas: effectivelyFailed ? 0 : (n.data?.replicas ?? 1),
			queue_size: n.data?.queue_size ?? 5000,
			rate_limit_rps: n.data?.rate_limit_rps ?? null,
			resilience_config: n.data?.resilience_config ?? null,
			scaling_config: n.data?.scaling_config ?? null,
			cost_config: n.data?.cost_config ?? null,
			mesh_config: n.data?.mesh_config ?? null,
			cache_config: n.data?.cache_config ?? null,
			database_config: n.data?.database_config ?? null,
			storage_config: n.data?.storage_config ?? null,
			protocol_whitelist: n.data?.protocol_whitelist ?? null,
			region: n.data?.region ?? 'us-east-1',
			external_config: n.data?.external_config ?? null
		};
	});

	const simEdges = edges
		.filter(e => simNodes[e.source] && simNodes[e.target])
		.map(e => ({
			id: e.id,
			source: e.source,
			target: e.target,
			traffic_percent: e.data?.traffic_percent ?? 1.0,
			protocol: e.data?.protocol ?? 'HTTP',
			packet_loss_pct: e.data?.packet_loss_pct ?? 0.0,
			jitter_ms: e.data?.jitter_ms ?? 0.0
		}));

	return { nodes: simNodes, edges: simEdges };
};

export const useStore = create<AppState>((set, get) => ({
	nodes: [],
	edges: [],
	simulation: {
		isSimulating: false,
		totalRps: 0,
		loadProfile: { type: 'flat', baseRps: 1500, peakRps: 5000, durationSeconds: 30 },
		activeBottlenecks: [],
		nodeMetrics: {},
		history: {},
		chaosNodes: [],
		simSpeed: 1.0,
		totalSimulationCost: 0,
		burnRate: 0,
		viewMode: 'canvas',
	},
	past: [],
	future: [],

	takeSnapshot: () => {
		const { nodes, edges, past } = get();
		// Max history depth 50
		const newPast = [...past.slice(-49), { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }];
		set({ past: newPast, future: [] });
	},

	undo: () => {
		const { nodes, edges, past, future } = get();
		if (past.length === 0) return;

		const previous = past[past.length - 1];
		const newPast = past.slice(0, past.length - 1);
		const newFuture = [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...future.slice(0, 49)];

		set({
			nodes: previous.nodes,
			edges: previous.edges,
			past: newPast,
			future: newFuture
		});
	},

	redo: () => {
		const { nodes, edges, past, future } = get();
		if (future.length === 0) return;

		const next = future[0];
		const newFuture = future.slice(1);
		const newPast = [...past, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }];

		set({
			nodes: next.nodes,
			edges: next.edges,
			past: newPast,
			future: newFuture
		});
	},

	setNodes: (nodes: Node[]) => {
		set({ nodes });
	},
	setEdges: (edges: Edge[]) => {
		set({ edges });
	},

	activeTool: 'select',
	setActiveTool: (tool: string) => {
		set({ activeTool: tool });
	},
	setViewMode: (mode: 'canvas' | 'dashboard') => {
		set(state => ({ simulation: { ...state.simulation, viewMode: mode } }));
	},
	duplicateNode: (id: string, newPosition?: { x: number, y: number }) => {
		const state = get();
		const nodeToClone = state.nodes.find(n => n.id === id);
		if (!nodeToClone) return;

		state.takeSnapshot();

		const newNode = {
			...nodeToClone,
			id: `node_${new Date().getTime()}`,
			position: newPosition || { x: nodeToClone.position.x + 50, y: nodeToClone.position.y + 50 },
			selected: true
		};

		const updatedNodes = state.nodes.map(n => ({ ...n, selected: false }));

		set({ nodes: [...updatedNodes, newNode] });
	},
	deleteNode: (id: string) => {
		get().takeSnapshot();
		set(state => ({
			nodes: state.nodes.filter(n => n.id !== id),
			edges: state.edges.filter(e => e.source !== id && e.target !== id)
		}));
	},
	updateNodeData: (id: string, newData: Partial<any>) => {
		set(state => ({
			nodes: state.nodes.map(n =>
				n.id === id
					? { ...n, data: { ...n.data, ...newData } }
					: n
			)
		}));
	},
	updateEdgeData: (id: string, newData: Partial<any>) => {
		set(state => ({
			edges: state.edges.map(e =>
				e.id === id
					? { ...e, data: { ...e.data, ...newData } }
					: e
			)
		}));
	},
	toggleNodeFailure: (id: string) => {
		const state = get();
		const currentChaos = state.simulation.chaosNodes;
		const isFailed = currentChaos.includes(id);
		const newChaos = isFailed ? currentChaos.filter(n => n !== id) : [...currentChaos, id];

		set({ simulation: { ...state.simulation, chaosNodes: newChaos } });

		if (ws && ws.readyState === WebSocket.OPEN) {
			const { nodes, edges } = get();
			const graph = _getSimGraph(nodes, edges, newChaos);
			const payload = {
				incoming_rps: get().simulation.loadProfile.baseRps,
				load_profile: get().simulation.loadProfile,
				graph
			};
			ws.send(JSON.stringify(payload));
		}
	},
	updateEdgeProtocol: (edgeId: string, protocol: 'HTTP' | 'WebSocket' | 'gRPC' | 'UDP') => {
		set(state => ({
			edges: state.edges.map(e =>
				e.id === edgeId
					? { ...e, data: { ...e.data, protocol } }
					: e
			)
		}));
	},
	onNodesChange: (changes: NodeChange[]) => {
		const { nodes, takeSnapshot } = get();
		const isDiscreteChange = changes.some(c => c.type === 'remove' || c.type === 'add' || c.type === 'dimensions');
		const isPositionEnd = changes.some(c => c.type === 'position' && !c.dragging);

		if (isDiscreteChange || isPositionEnd) {
			takeSnapshot();
		}

		set({
			nodes: applyNodeChanges(changes, nodes),
		});
	},
	onEdgesChange: (changes: EdgeChange[]) => {
		const { edges, takeSnapshot } = get();
		if (changes.some(c => c.type === 'remove' || c.type === 'add' || c.type === 'select')) {
			takeSnapshot();
		}
		set({
			edges: applyEdgeChanges(changes, edges),
		});
	},
	onConnect: (connection: Connection) => {
		const { simulation, edges, takeSnapshot } = get();
		const isSimulating = simulation.isSimulating;

		takeSnapshot();

		const newEdge = {
			...connection,
			type: 'traffic',
			animated: isSimulating,
			style: { stroke: isSimulating ? '#3caff6' : '#5048e5' },
			data: { protocol: 'HTTP' }
		};
		set({
			edges: addEdge(newEdge, edges),
		});
	},
	toggleSimulation: (designId?: string) => {
		const isSimulating = !get().simulation.isSimulating;
		const { nodes, edges } = get();

		if (isSimulating) {
			const graph = _getSimGraph(nodes, edges, get().simulation.chaosNodes);

			const payload = {
				design_id: designId,
				incoming_rps: get().simulation.loadProfile.baseRps,
				load_profile: get().simulation.loadProfile,
				sim_speed: get().simulation.simSpeed,
				graph
			};

			// Reset costs for a clean run
			set((state) => ({
				simulation: {
					...state.simulation,
					totalSimulationCost: 0,
					burnRate: 0,
					history: {}
				}
			}));

			ws = new WebSocket('ws://localhost:8000/api/v1/simulation/ws');

			ws.onopen = () => {
				ws?.send(JSON.stringify(payload));
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.error) {
						console.error("Simulation API Error:", data.error, data.details);
						return;
					}

					set((state) => {
						const nodeUtils: Record<string, number> = {};
						const newHistory = { ...state.simulation.history };
						let tickCostSum = 0;

						if (data.nodes) {
							for (const [nodeId, metrics] of Object.entries(data.nodes) as any) {
								nodeUtils[nodeId] = metrics.utilization;
								tickCostSum += metrics.tick_cost || 0;
								if (!newHistory[nodeId]) newHistory[nodeId] = [];
								newHistory[nodeId] = [
									...newHistory[nodeId].slice(-999),
									{ time: data.time, ...metrics }
								];
							}
						}

						// Update Edge Colors and Animation Speeds
						const updatedEdges = state.edges.map(edge => {
							const targetUtil = nodeUtils[edge.target] || 0;
							let strokeColor = edge.animated ? '#3caff6' : '#5048e5';

							if (edge.animated) {
								if (targetUtil >= 1.0) strokeColor = '#ff3344';
								else if (targetUtil >= 0.7) strokeColor = '#fbbf24';
							}

							let simDuration = 1.5;
							const sourceMetrics = data.nodes ? data.nodes[edge.source] : null;
							if (sourceMetrics) {
								const eff_rps = sourceMetrics.effective_rps || 0;
								simDuration = Math.max(0.1, 2.0 - (eff_rps / 50000) * 1.9);
							}

							return {
								...edge,
								style: { ...edge.style, stroke: strokeColor },
								data: { ...edge.data, simDuration, rps: sourceMetrics?.effective_rps || 0 }
							};
						});

						return {
							edges: updatedEdges,
							simulation: {
								...state.simulation,
								totalRps: data.graph_metrics?.total_throughput || 0,
								activeBottlenecks: data.graph_metrics?.bottleneck_nodes || [],
								nodeMetrics: data.nodes || {},
								history: newHistory,
								totalSimulationCost: state.simulation.totalSimulationCost + tickCostSum,
								burnRate: data.graph_metrics?.burn_rate || tickCostSum
							}
						};
					});
				} catch (e) {
					console.error("Failed to parse sim tick", e);
				}
			};

			ws.onclose = () => {
				set((state) => ({
					simulation: { ...state.simulation, isSimulating: false }
				}));
			};

			ws.onerror = (err) => {
				console.error("Simulation WS Error:", err);
			};
		} else {
			// Disconnect
			if (ws) {
				ws.close();
				ws = null;
			}
		}

		const newEdges = edges.map((edge) => ({
			...edge,
			animated: isSimulating,
			style: { ...edge.style, stroke: isSimulating ? '#3caff6' : '#5048e5' },
		}));

		set((state) => ({
			edges: newEdges,
			simulation: {
				...state.simulation,
				isSimulating,
				activeBottlenecks: isSimulating ? state.simulation.activeBottlenecks : [],
				nodeMetrics: isSimulating ? state.simulation.nodeMetrics : {},
				chaosNodes: isSimulating ? state.simulation.chaosNodes : [], // reset chaos on stop
				totalSimulationCost: isSimulating ? 0 : state.simulation.totalSimulationCost,
			}
		}));
	},
	setSimulationData: (data: Partial<SimulationState>) => {
		set((state) => ({
			simulation: { ...state.simulation, ...data }
		}));
	},
	updateLoadProfile: (profile: Partial<LoadProfile>) => {
		set((state) => ({
			simulation: { ...state.simulation, loadProfile: { ...state.simulation.loadProfile, ...profile } }
		}));
		if (ws && ws.readyState === WebSocket.OPEN) {
			const { nodes, edges } = get();
			const graph = _getSimGraph(nodes, edges, get().simulation.chaosNodes);

			const payload = {
				incoming_rps: get().simulation.loadProfile.baseRps,
				load_profile: get().simulation.loadProfile,
				sim_speed: get().simulation.simSpeed,
				graph
			};
			ws.send(JSON.stringify(payload));
		}
	},
	setSimSpeed: (speed: number) => {
		set((state) => ({
			simulation: { ...state.simulation, simSpeed: speed }
		}));
	}
}));
