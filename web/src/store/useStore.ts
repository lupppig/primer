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
	chaosNodes: string[];
	simSpeed: number; // 1 to 10
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
	toggleSimulation: () => void;
	setSimulationData: (data: Partial<SimulationState>) => void;
	updateLoadProfile: (profile: Partial<LoadProfile>) => void;
	setSimSpeed: (speed: number) => void;
	activeTool: string;
	setActiveTool: (tool: string) => void;
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

// Initial Mock Nodes Removed in favor of empty start

let ws: WebSocket | null = null;

export const useStore = create<AppState>((set, get) => ({
	nodes: [],
	edges: [],
	simulation: {
		isSimulating: false,
		totalRps: 0,
		loadProfile: { type: 'flat', baseRps: 1500, peakRps: 5000, durationSeconds: 30 },
		activeBottlenecks: [],
		nodeMetrics: {},
		chaosNodes: [],
		simSpeed: 1.0,
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

		// Deselect others
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

		// If actively simulating, force a hot payload update instantly applying the chaos
		if (ws && ws.readyState === WebSocket.OPEN) {
			const { nodes, edges } = get();
			const simNodes: any = {};
			nodes.forEach(n => {
				if (n.type !== 'techNode') return;
				const lbl = (n.data?.label || '').toLowerCase();
				const isQueue = ['kafka', 'rabbitmq', 'sqs', 'queue'].some(q => lbl.includes(q));

				// Apply Chaos constraint
				const effectivelyFailed = newChaos.includes(n.id);

				simNodes[n.id] = {
					id: n.id,
					type: isQueue ? 'queue' : 'api',
					capacity_rps: effectivelyFailed ? 0.0 : (n.data?.capacity_rps ?? 1000), // Chaos cuts capacity
					base_latency_ms: n.data?.base_latency_ms ?? 10,
					replicas: effectivelyFailed ? 0 : (n.data?.replicas ?? 1), // And zero-scales replicas
					queue_size: n.data?.queue_size ?? 5000,
					rate_limit_rps: n.data?.rate_limit_rps ?? null
				};
			});
			const simEdges = edges
				.filter(e => simNodes[e.source] && simNodes[e.target]) // Only include edges between valid tech nodes
				.map(e => ({
					id: e.id,
					source: e.source,
					target: e.target,
					traffic_percent: e.data?.traffic_percent ?? 1.0
				}));
			const payload = {
				incoming_rps: get().simulation.loadProfile.baseRps,
				load_profile: get().simulation.loadProfile,
				graph: { nodes: simNodes, edges: simEdges }
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
		// Only snapshot on discrete changes or when dragging STOPS
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
			data: { protocol: 'HTTP' } // Default protocol
		};
		set({
			edges: addEdge(newEdge, edges),
		});
	},
	toggleSimulation: () => {
		const isSimulating = !get().simulation.isSimulating;
		const { nodes, edges } = get();

		if (isSimulating) {
			const simNodes: any = {};
			nodes.forEach(n => {
				if (n.type !== 'techNode') return;

				const lbl = (n.data?.label || '').toLowerCase();
				const isQueue = ['kafka', 'rabbitmq', 'sqs', 'queue'].some(q => lbl.includes(q));
				simNodes[n.id] = {
					id: n.id,
					type: isQueue ? 'queue' : 'api',
					capacity_rps: n.data?.capacity_rps ?? 1000,
					base_latency_ms: n.data?.base_latency_ms ?? 10,
					replicas: n.data?.replicas ?? 1,
					queue_size: n.data?.queue_size ?? 5000,
					rate_limit_rps: n.data?.rate_limit_rps ?? null
				};
			});

			const simEdges = edges
				.filter(e => simNodes[e.source] && simNodes[e.target]) // Only include edges between valid tech nodes
				.map(e => ({
					id: e.id,
					source: e.source,
					target: e.target,
					traffic_percent: e.data?.traffic_percent ?? 1.0
				}));

			const payload = {
				incoming_rps: get().simulation.loadProfile.baseRps,
				load_profile: get().simulation.loadProfile,
				graph: {
					nodes: simNodes,
					edges: simEdges
				}
			};

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

					// Parse the telemetry tick
					set((state) => {
						const nodeUtils: Record<string, number> = {};
						if (data.nodes) {
							for (const [nodeId, metrics] of Object.entries(data.nodes) as any) {
								nodeUtils[nodeId] = metrics.utilization;
							}
						}

						// Update Edge Colors based on target node utilization
						const updatedEdges = state.edges.map(edge => {
							const targetUtil = nodeUtils[edge.target] || 0;
							let strokeColor = '#3caff6'; // Base Blue
							if (targetUtil >= 1.0) {
								strokeColor = '#ff3344'; // Red Bottleneck
							} else if (targetUtil >= 0.7) {
								strokeColor = '#fbbf24'; // Yellow Warning
							}

							// Calculate edge speed based on source's effective RPS (if available)
							let simDuration = 1.5;
							const sourceMetrics = data.nodes ? data.nodes[edge.source] : null;
							if (sourceMetrics) {
								const eff_rps = sourceMetrics.effective_rps || 0;
								// Scale down duration for higher RPS (faster animation)
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

		// Animate edges when simulating
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
		// If simulation is active, hot-reload the payload immediately
		if (ws && ws.readyState === WebSocket.OPEN) {
			const { nodes, edges } = get();
			const simNodes: any = {};
			nodes.forEach(n => {
				// Only include tech nodes in the simulation
				if (n.type !== 'techNode') return;

				const lbl = (n.data?.label || '').toLowerCase();
				const isQueue = ['kafka', 'rabbitmq', 'sqs', 'queue'].some(q => lbl.includes(q));
				simNodes[n.id] = {
					id: n.id,
					type: isQueue ? 'queue' : 'api',
					capacity_rps: n.data?.capacity_rps ?? 1000,
					base_latency_ms: n.data?.base_latency_ms ?? 10,
					replicas: n.data?.replicas ?? 1,
					queue_size: n.data?.queue_size ?? 5000,
					rate_limit_rps: n.data?.rate_limit_rps ?? null
				};
			});
			const simEdges = edges
				.filter(e => simNodes[e.source] && simNodes[e.target]) // Only include edges between valid tech nodes
				.map(e => ({
					id: e.id,
					source: e.source,
					target: e.target,
					traffic_percent: e.data?.traffic_percent ?? 1.0
				}));
			const payload = {
				incoming_rps: get().simulation.loadProfile.baseRps,
				load_profile: get().simulation.loadProfile,
				graph: { nodes: simNodes, edges: simEdges }
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
