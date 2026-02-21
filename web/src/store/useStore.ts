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

export type SimulationState = {
	isSimulating: boolean;
	totalRps: number;
	targetRps: number;
	activeBottlenecks: string[];
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
	setTargetRps: (rps: number) => void;
	activeTool: string;
	setActiveTool: (tool: string) => void;
};

// Initial Mock Nodes Removed in favor of empty start

let ws: WebSocket | null = null;

export const useStore = create<AppState>((set, get) => ({
	nodes: [],
	edges: [],
	simulation: {
		isSimulating: false,
		totalRps: 0,
		targetRps: 1500, // Default Starting RPS
		activeBottlenecks: [],
	},
	activeTool: 'select',
	setActiveTool: (tool: string) => {
		set({ activeTool: tool });
	},
	onNodesChange: (changes: NodeChange[]) => {
		set({
			nodes: applyNodeChanges(changes, get().nodes),
		});
	},
	onEdgesChange: (changes: EdgeChange[]) => {
		set({
			edges: applyEdgeChanges(changes, get().edges),
		});
	},
	onConnect: (connection: Connection) => {
		const isSimulating = get().simulation.isSimulating;
		const newEdge = {
			...connection,
			type: 'traffic',
			animated: isSimulating,
			style: { stroke: isSimulating ? '#3caff6' : '#5048e5' },
		};
		set({
			edges: addEdge(newEdge, get().edges),
		});
	},
	setNodes: (nodes: Node[]) => {
		set({ nodes });
	},
	setEdges: (edges: Edge[]) => {
		set({ edges });
	},
	toggleSimulation: () => {
		const isSimulating = !get().simulation.isSimulating;
		const { nodes, edges } = get();

		if (isSimulating) {
			// 1. Convert React Flow payload to FastAPI schema
			const simNodes: any = {};
			nodes.forEach(n => {
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

			const simEdges = edges.map(e => ({
				id: e.id,
				source: e.source,
				target: e.target,
				traffic_percent: 1.0 // 100% fan-out per edge MVP
			}));

			const payload = {
				incoming_rps: get().simulation.targetRps,
				graph: {
					nodes: simNodes,
					edges: simEdges
				}
			};

			// 2. Open WebSocket
			// Hardcode localhost port because Vite proxy doesn't trivially bridge bare WebSockets without wss proxy rules
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
								strokeColor = '#ef4444'; // Red Bottleneck
							} else if (targetUtil >= 0.7) {
								strokeColor = '#fbbf24'; // Yellow Warning
							}

							return {
								...edge,
								style: { ...edge.style, stroke: strokeColor }
							};
						});

						return {
							edges: updatedEdges,
							simulation: {
								...state.simulation,
								totalRps: data.graph_metrics?.total_throughput || 0,
								activeBottlenecks: data.graph_metrics?.bottleneck_nodes || [],
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
			}
		}));
	},
	setSimulationData: (data: Partial<SimulationState>) => {
		set((state) => ({
			simulation: { ...state.simulation, ...data }
		}));
	},
	setTargetRps: (rps: number) => {
		set((state) => ({
			simulation: { ...state.simulation, targetRps: rps }
		}));
		// If simulation is active, hot-reload the payload immediately
		if (ws && ws.readyState === WebSocket.OPEN) {
			const { nodes, edges } = get();
			const simNodes: any = {};
			nodes.forEach(n => {
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
			const simEdges = edges.map(e => ({
				id: e.id,
				source: e.source,
				target: e.target,
				traffic_percent: 1.0
			}));
			const payload = {
				incoming_rps: rps,
				graph: { nodes: simNodes, edges: simEdges }
			};
			ws.send(JSON.stringify(payload));
		}
	}
}));
