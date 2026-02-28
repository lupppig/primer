import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Activity, Play, Settings, Save, MessageSquare, Loader2, Home, DollarSign } from 'lucide-react';
import { Button } from '../Common/Button';
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
	const [searchParams] = useSearchParams();
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect, simulation, toggleSimulation, activeTool, setActiveTool, undo, redo } = useStore();
	const { currentDesign, saveDesign, renameDesign } = useDesignStore();
	const { user } = useAuthStore();
	const navigate = useNavigate();
	const [isSaving, setIsSaving] = useState(false);
	const [tempName, setTempName] = useState('');
	const [isEditingName, setIsEditingName] = useState(false);
	const [isLoadProfileOpen, setIsLoadProfileOpen] = useState(false);
	const [rfInstance, setRfInstance] = useState<any>(null);

	const isExport = searchParams.get('export') === 'true';

	const bottleneckLabels = nodes
		.filter(n => (simulation.activeBottlenecks || []).includes(n.id))
		.map(n => n.data.label || 'Unknown Node')
		.join(', ') || 'System';

	// Force fitView when in export mode after a delay for hydration
	useEffect(() => {
		if (rfInstance && isExport) {
			const timer = setTimeout(() => {
				rfInstance.fitView({ padding: 0.2, duration: 0 });
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [rfInstance, isExport]);

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
		const currentSettingsStr = JSON.stringify({ loadProfile: simulation.loadProfile });

		if (currentNodesStr === lastSavedData.current.nodes && currentEdgesStr === lastSavedData.current.edges && currentSettingsStr === lastSavedData.current.settings) {
			return;
		}

		// Throttle saves to 2 seconds
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(async () => {
			setIsSaving(true);
			try {
				await saveDesign(
					currentDesign.id,
					nodes,
					edges,
					{ loadProfile: simulation.loadProfile },
					currentDesign.version
				);
				lastSavedData.current = {
					nodes: currentNodesStr,
					edges: currentEdgesStr,
					settings: currentSettingsStr
				};
			} catch (err) {
				console.error("Auto-save failed", err);
			} finally {
				setIsSaving(false);
			}
		}, 2000);
	}, [nodes, edges, currentDesign, saveDesign, simulation.loadProfile, simulation.isSimulating]);

	// --- Keyboard Shortcuts (Undo/Redo) ---
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				if (e.key.toLowerCase() === 'z') {
					e.preventDefault();
					if (e.shiftKey) {
						redo();
					} else {
						undo();
					}
				} else if (e.key.toLowerCase() === 'y') {
					e.preventDefault();
					redo();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [undo, redo]);

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
						edges={edges.map(e => ({ ...e, markerEnd: e.markerEnd || undefined }))}
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

						<Panel position="bottom-center" className="w-full pointer-events-none mb-6 z-10 transition-transform">
							<div className="flex justify-center w-full">
								<div className="flex items-center gap-2 bg-[var(--color-panel)]/95 backdrop-blur-xl border border-[var(--color-border)] p-2 px-3 rounded-2xl shadow-2xl pointer-events-auto">
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

									<div className="flex items-center gap-4 px-4 border-r border-[var(--color-border)] py-1">
										{/* Load Profile Control */}
										<div className="relative flex flex-col gap-1 w-32">
											<div className="flex justify-between items-center cursor-pointer" onClick={() => setIsLoadProfileOpen(!isLoadProfileOpen)}>
												<span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Load Profile</span>
												<span className="text-[10px] font-mono font-bold text-blue-400 hover:text-blue-300">
													{simulation.loadProfile.type.toUpperCase()}
												</span>
											</div>
											<div className="flex items-center cursor-pointer" onClick={() => setIsLoadProfileOpen(!isLoadProfileOpen)}>
												<span className="text-xs text-white px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded min-w-full text-center border border-[var(--color-border)] transition-colors truncate">
													{simulation.loadProfile.type === 'flat'
														? `${numberFormatter.format(simulation.loadProfile.baseRps)} RPS`
														: `${numberFormatter.format(simulation.loadProfile.baseRps)} → ${numberFormatter.format(simulation.loadProfile.peakRps)}`}
												</span>
											</div>

											<AnimatePresence>
												{isLoadProfileOpen && (
													<motion.div
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: 10 }}
														className="absolute top-full mt-3 left-0 w-64 bg-[#0f111a] border border-[var(--color-border)] p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-4"
													>
														<div>
															<h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Pattern Curve</h4>
															<select
																className="bg-black/50 border border-[var(--color-border)] text-sm text-white rounded p-1.5 w-full outline-none focus:border-blue-500"
																value={simulation.loadProfile.type}
																onChange={(e) => useStore.getState().updateLoadProfile({ type: e.target.value as any })}
															>
																<option value="flat">Static / Flat</option>
																<option value="spike">Sudden Spike</option>
																<option value="step">Step Function</option>
															</select>
														</div>

														<div className="flex flex-col gap-1.5">
															<label className="text-xs font-medium text-[var(--color-text-muted)]">Base RPS</label>
															<input
																type="number"
																className="bg-black/50 border border-[var(--color-border)] text-sm text-white rounded p-1.5 w-full outline-none focus:border-blue-500"
																value={simulation.loadProfile.baseRps === 0 ? '' : simulation.loadProfile.baseRps}
																onChange={e => useStore.getState().updateLoadProfile({ baseRps: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })}
																min={0}
															/>
														</div>

														{simulation.loadProfile.type !== 'flat' && (
															<>
																<div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--color-border)]">
																	<label className="text-xs font-medium text-[var(--color-text-muted)] flex justify-between">
																		Peak RPS
																		<span className="opacity-50">Max Load</span>
																	</label>
																	<input
																		type="number"
																		className="bg-black/50 border border-[var(--color-border)] text-sm text-white rounded p-1.5 w-full outline-none focus:border-blue-500"
																		value={simulation.loadProfile.peakRps === 0 ? '' : simulation.loadProfile.peakRps}
																		onChange={e => useStore.getState().updateLoadProfile({ peakRps: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })}
																		min={0}
																	/>
																</div>
																<div className="flex flex-col gap-1.5">
																	<label className="text-xs font-medium text-[var(--color-text-muted)] flex justify-between">
																		Duration
																		<span className="opacity-50">Seconds</span>
																	</label>
																	<input
																		type="number"
																		className="bg-black/50 border border-[var(--color-border)] text-sm text-white rounded p-1.5 w-full outline-none focus:border-blue-500"
																		value={simulation.loadProfile.durationSeconds === 0 ? '' : simulation.loadProfile.durationSeconds}
																		onChange={e => useStore.getState().updateLoadProfile({ durationSeconds: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })}
																		min={1}
																	/>
																</div>
															</>
														)}
														<Button size="sm" onClick={() => setIsLoadProfileOpen(false)} className="mt-1">Close Config</Button>
													</motion.div>
												)}
											</AnimatePresence>
										</div>

										<div className="w-px h-6 bg-[var(--color-border)]" />

										{/* Simulation Speed Control */}
										<div className="flex flex-col gap-1 w-32">
											<div className="flex justify-between items-center">
												<span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Sim Speed</span>
												<span className="text-[10px] font-mono text-blue-400 font-bold">{simulation.simSpeed}x</span>
											</div>
											<input
												type="range"
												min="0.5"
												max="10"
												step="0.5"
												value={simulation.simSpeed}
												onChange={(e) => useStore.getState().setSimSpeed(parseFloat(e.target.value))}
												className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-400"
											/>
										</div>
									</div>

									<Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white ml-2">
										<Settings className="w-4 h-4" />
									</Button>
									<Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white">
										<MessageSquare className="w-4 h-4" />
									</Button>
									<div className="w-px h-4 bg-[var(--color-border)] mx-1" />
									{simulation.isSimulating && (
										<div className="flex flex-col items-center px-4 border-r border-[var(--color-border)]">
											<span className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Burn Rate</span>
											<div className="flex items-center gap-1 text-green-400 font-mono font-bold text-xs">
												<DollarSign className="w-3 h-3" />
												{simulation.totalSimulationCost.toFixed(4)}
											</div>
										</div>
									)}
									<Button
										variant={simulation.isSimulating ? "destructive" : "default"}
										size="sm"
										className="h-8 gap-2 transition-colors relative overflow-hidden"
										onClick={() => toggleSimulation(currentDesign?.id)}
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
												navigate('/login');
												return;
											}
											if (currentDesign) {
												setIsSaving(true);
												try {
													await saveDesign(currentDesign.id, nodes, edges, { loadProfile: simulation.loadProfile }, currentDesign.version);
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
