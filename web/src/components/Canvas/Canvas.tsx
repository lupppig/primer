import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
	Background,
	BackgroundVariant,
	Controls,
	MiniMap,
	Panel,
	ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../../store/useStore';
import { useDesignStore } from '../../store/useDesignStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Activity, Play, Settings, Save, MessageSquare, Loader2, Plus, Minus, Home } from 'lucide-react';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { motion, AnimatePresence } from 'framer-motion';
import TechNode from './TechNode';
import TrafficEdge from './TrafficEdge';
import TextNode from './TextNode';
import GroupNode from './GroupNode';

const nodeTypes = {
	techNode: TechNode,
	textNode: TextNode,
	groupNode: GroupNode,
};

const edgeTypes = {
	traffic: TrafficEdge,
};

const numberFormatter = new Intl.NumberFormat('en-US', {
	notation: "compact",
	compactDisplay: "short",
	maximumFractionDigits: 1
});

export default function Canvas() {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect, simulation, toggleSimulation, activeTool, setActiveTool } = useStore();
	const { currentDesign, saveDesign, renameDesign } = useDesignStore();
	const { user, setAuthModalOpen } = useAuthStore();
	const navigate = useNavigate();
	const [isSaving, setIsSaving] = useState(false);
	const [tempName, setTempName] = useState('');
	const [isEditingName, setIsEditingName] = useState(false);
	const [rfInstance, setRfInstance] = useState<any>(null);

	const bottleneckLabels = nodes
		.filter(n => (simulation.activeBottlenecks || []).includes(n.id))
		.map(n => n.data.label || 'Unknown Node')
		.join(', ') || 'System';

	// --- Auto Save Logic ---
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const initialLoadDone = useRef(false);
	const lastSavedData = useRef({ nodes: '[]', edges: '[]', settings: '{}' });

	useEffect(() => {
		if (currentDesign?.name) {
			setTempName(currentDesign.name);
		}
	}, [currentDesign?.name]);

	const handleRename = async () => {
		if (currentDesign && tempName && tempName !== currentDesign.name) {
			await renameDesign(currentDesign.id, tempName);
		}
		setIsEditingName(false);
	};

	// Capture initial design load to prevent immediate overwriting
	useEffect(() => {
		if (currentDesign && !initialLoadDone.current) {
			// Once we have a currentDesign with nodes/edges, consider the initial load complete
			if (nodes.length === currentDesign.nodes.length && edges.length === currentDesign.edges.length) {
				initialLoadDone.current = true;
				lastSavedData.current = {
					nodes: JSON.stringify(currentDesign.nodes || []),
					edges: JSON.stringify(currentDesign.edges || []),
					settings: JSON.stringify(currentDesign.settings || {})
				};
			}
		}
	}, [currentDesign, nodes, edges]);

	// Auto Save Logic
	useEffect(() => {
		if (!initialLoadDone.current || !currentDesign || simulation.isSimulating) {
			return;
		}

		// Only save if the data actually changed (prevents saving on pure renders)
		const currentNodesStr = JSON.stringify(nodes);
		const currentEdgesStr = JSON.stringify(edges);
		const currentSettingsStr = JSON.stringify({ targetRps: simulation.targetRps });

		if (currentNodesStr === lastSavedData.current.nodes && currentEdgesStr === lastSavedData.current.edges && currentSettingsStr === lastSavedData.current.settings) {
			return;
		}

		setIsSaving(true);
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

		saveTimeoutRef.current = setTimeout(async () => {
			try {
				await saveDesign(currentDesign.id, nodes, edges, { targetRps: simulation.targetRps }, currentDesign.version);
				lastSavedData.current = { nodes: currentNodesStr, edges: currentEdgesStr, settings: currentSettingsStr };
			} finally {
				setIsSaving(false);
			}
		}, 1500); // 1.5s debounce

		return () => {
			if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
		};
	}, [nodes, edges, currentDesign, saveDesign, simulation.isSimulating]);

	const onDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}, []);

	const onDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();

			const type = event.dataTransfer.getData('application/reactflow');
			const label = event.dataTransfer.getData('application/label');

			if (typeof type === 'undefined' || !type) {
				return;
			}

			if (!rfInstance) return;

			const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
			if (!reactFlowBounds) return;

			const position = rfInstance.project({
				x: event.clientX - reactFlowBounds.left,
				y: event.clientY - reactFlowBounds.top,
			});

			const isTextNode = label === 'Text Note';
			const isGroupNode = label === 'Custom Group';

			let nodeType = 'techNode';
			if (isTextNode) nodeType = 'textNode';
			if (isGroupNode) nodeType = 'groupNode';

			const newNode: any = {
				id: `node_${new Date().getTime()}`,
				type: nodeType,
				position,
				data: {
					label: `${label}`,
					originalType: `${label}`
				},
			};

			if (isGroupNode) {
				newNode.style = { width: 400, height: 400 };
				newNode.zIndex = -10;
			}

			useStore.getState().setNodes([...nodes, newNode]);
		},
		[nodes, rfInstance]
	);

	const onPaneClick = useCallback(
		(event: React.MouseEvent) => {
			if (activeTool === 'text' && rfInstance) {
				const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
				if (reactFlowBounds) {
					const position = rfInstance.project({
						x: event.clientX - reactFlowBounds.left,
						y: event.clientY - reactFlowBounds.top,
					});

					const newNode = {
						id: `node_${new Date().getTime()}`,
						type: 'textNode',
						position,
						data: { label: 'Text Note', originalType: 'Text Note' },
					};

					useStore.getState().setNodes([...nodes, newNode]);
					setActiveTool('select');
				}
			}
		},
		[activeTool, rfInstance, nodes, setActiveTool]
	);

	return (
		<div className="w-full h-full relative" style={{ background: 'var(--color-canvas)' }}>
			<ReactFlowProvider>
				<div className="w-full h-full" onDragOver={onDragOver} onDrop={onDrop}>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						nodeTypes={nodeTypes}
						edgeTypes={edgeTypes}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onInit={setRfInstance}
						onPaneClick={onPaneClick}
						panOnDrag={activeTool !== 'select' && activeTool !== 'draw'}
						selectionOnDrag={activeTool === 'select'}
						fitView
						deleteKeyCode={['Backspace', 'Delete']}
						className={`bg-[var(--color-canvas)] ${activeTool === 'text' ? 'cursor-text' : (activeTool === 'draw' ? 'cursor-crosshair' : '')}`}
						defaultEdgeOptions={{ type: 'traffic', style: { strokeWidth: 2 } }}
					>
						<Background color="#1f2330" variant={BackgroundVariant.Lines} gap={30} lineWidth={1} />
						<Controls className="!bg-[var(--color-panel)] !border-[var(--color-border)] !fill-[var(--color-text-main)]" />

						<MiniMap
							nodeColor={(n) => {
								if (simulation.isSimulating && (simulation.activeBottlenecks || []).includes(n.id)) return '#ff3344';
								return '#3caff6';
							}}
							maskColor="rgba(9, 10, 15, 0.8)"
							className="!bg-[var(--color-panel)] !border-[var(--color-border)]"
						/>

						<Panel position="top-center" className="w-full pointer-events-none mt-4">
							<div className="flex justify-center w-full">
								<div className="flex items-center gap-2 bg-[var(--color-panel)] border border-[var(--color-border)] p-1.5 rounded-xl shadow-lg pointer-events-auto">
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 hover:bg-white/5 mr-1"
										onClick={() => navigate('/dashboard')}
										title="Return to Dashboard"
									>
										<Home className="w-4 h-4 text-[var(--color-text-muted)] hover:text-white" />
									</Button>
									<div className="w-px h-4 bg-[var(--color-border)] mr-1" />

									{isEditingName ? (
										<input
											autoFocus
											className="bg-transparent text-white text-sm font-medium px-2 py-0.5 outline-none border-b border-[var(--color-primary)] w-48"
											value={tempName}
											onChange={(e) => setTempName(e.target.value)}
											onBlur={handleRename}
											onKeyDown={(e) => e.key === 'Enter' && handleRename()}
										/>
									) : (
										<Button
											variant="ghost"
											size="sm"
											className="h-8 gap-2 hover:bg-white/5"
											onClick={() => setIsEditingName(true)}
										>
											<div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
											{currentDesign?.name || 'Untitled'}
										</Button>
									)}
									<div className="w-px h-4 bg-[var(--color-border)]" />

									<div className="flex items-center gap-1 px-2 border-r border-[var(--color-border)]">
										<span className="text-xs text-[var(--color-text-muted)] font-medium mr-1">LOAD</span>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 hover:bg-[#1a1c23] shrink-0"
											onClick={() => {
												const newVal = Math.max(0, simulation.targetRps - 1000);
												useStore.getState().setTargetRps(newVal);
											}}
										>
											<Minus className="w-3 h-3 text-[var(--color-text-muted)]" />
										</Button>
										<Input
											type="number"
											value={simulation.targetRps}
											onChange={(e) => {
												const val = parseInt(e.target.value);
												// Always call setTargetRps. If the user deleted the text, fallback to 0 safely.
												useStore.getState().setTargetRps(isNaN(val) ? 0 : Math.max(0, val));
											}}
											className="h-8 w-24 bg-[#0f1115] text-center font-mono"
											min={0}
											step={100}
										/>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 hover:bg-[#1a1c23] shrink-0 mr-1"
											onClick={() => {
												const newVal = simulation.targetRps + 1000;
												useStore.getState().setTargetRps(newVal);
											}}
										>
											<Plus className="w-3 h-3 text-[var(--color-text-muted)]" />
										</Button>
										<span className="text-xs text-[var(--color-text-muted)]">RPS</span>
									</div>

									<Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white ml-2">
										<Settings className="w-4 h-4" />
									</Button>
									<Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white">
										<MessageSquare className="w-4 h-4" />
									</Button>
									<div className="w-px h-4 bg-[var(--color-border)] mx-1" />
									<Button
										variant={simulation.isSimulating ? "destructive" : "default"}
										size="sm"
										className="h-8 gap-2 transition-colors relative overflow-hidden"
										onClick={toggleSimulation}
									>
										{simulation.isSimulating ? (
											<>
												<Activity className="w-4 h-4 animate-pulse" /> Stop Sim
											</>
										) : (
											<>
												<Play className="w-4 h-4" /> Simulate
											</>
										)}
									</Button>
									<Button
										size="sm"
										variant="outline"
										className="h-8 gap-2 border-[var(--color-border)]/50"
										disabled={isSaving}
										onClick={async () => {
											if (!user) {
												setAuthModalOpen(true);
												return;
											}
											if (currentDesign) {
												setIsSaving(true);
												try {
													await saveDesign(currentDesign.id, nodes, edges, { targetRps: simulation.targetRps }, currentDesign.version);
												} finally {
													setIsSaving(false);
												}
											}
										}}
									>
										{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
										{!user ? 'Save to Cloud' : 'Save'}
									</Button>
								</div>
							</div>
						</Panel>

						{/* Simulation Overlay Metrics */}
						<AnimatePresence>
							{simulation.isSimulating && simulation.activeBottlenecks.length > 0 && (
								<Panel position="top-right" className="mr-4 mt-16 pointer-events-none">
									<motion.div
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 20 }}
										className="bg-[#0f111a] border border-[#ff3344]/50 p-4 rounded-xl shadow-[0_0_20px_rgba(255,51,68,0.2)] pointer-events-auto w-64"
									>
										<div className="flex items-center gap-2 text-red-400 mb-2">
											<Activity className="w-4 h-4" />
											<h3 className="font-semibold text-sm">System Alert</h3>
										</div>
										<p className="text-xs text-[var(--color-text-muted)] mt-1">
											Bottleneck detected at <strong className="text-white">{bottleneckLabels}</strong>
											due to high concurrency. Current LOAD: {numberFormatter.format(simulation.totalRps)} RPS.
										</p>
									</motion.div>
								</Panel>
							)}
						</AnimatePresence>

					</ReactFlow>
				</div>
			</ReactFlowProvider>
		</div>
	);
}
