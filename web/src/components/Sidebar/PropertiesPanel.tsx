import { useStore } from '../../store/useStore';
import { Input } from '../Common/Input';
import { Button } from '../Common/Button';
import { Plus, Minus } from 'lucide-react';
import type { Node } from 'reactflow';

export default function PropertiesPanel() {
	const { nodes, setNodes, simulation, setTargetRps } = useStore();

	// Find the currently selected node
	const selectedNode = nodes.find(n => n.selected) as Node | undefined;

	// Helper to update specific data field on the selected node
	const updateNodeData = (field: string, value: any) => {
		if (!selectedNode) return;

		const updatedNodes = nodes.map(n => {
			if (n.id === selectedNode.id) {
				return {
					...n,
					data: {
						...n.data,
						[field]: value
					}
				};
			}
			return n;
		});

		setNodes(updatedNodes);

		// If simulation is active, trigger a hot reload by re-setting the target RPS 
		// (this re-compiles the payload and sends it over WS)
		if (simulation.isSimulating) {
			setTargetRps(simulation.targetRps);
		}
	};

	if (!selectedNode) {
		return (
			<div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)] p-8 text-center ml-2">
				Click on any component or connection to view its properties here.
			</div>
		);
	}

	if (selectedNode.type === 'textNode') {
		const fontSize = selectedNode.data.fontSize ?? 14;
		return (
			<div className="p-4 flex flex-col gap-6 pl-10 overflow-y-auto">
				<div>
					<h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
						Text Note Configuration
					</h4>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-white flex justify-between">
								Font Size
								<span className="text-[var(--color-text-muted)] text-xs font-normal">px</span>
							</label>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
									onClick={() => updateNodeData('fontSize', Math.max(8, fontSize - 2))}
								>
									<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
								</Button>
								<Input
									type="number"
									value={fontSize}
									onChange={(e) => updateNodeData('fontSize', parseInt(e.target.value) || 14)}
									className="bg-[#0f1115] text-center px-1"
									min={8}
								/>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
									onClick={() => updateNodeData('fontSize', Math.min(128, fontSize + 2))}
								>
									<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (selectedNode.type === 'groupNode') {
		const labelValue = selectedNode.data.label || '';
		return (
			<div className="p-4 flex flex-col gap-6 pl-10 overflow-y-auto">
				<div>
					<h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
						Group Configuration
					</h4>
					<div className="space-y-4">
						<div className="space-y-1.5 border-b border-[var(--color-border)] pb-4 mb-2">
							<label className="text-sm font-medium text-white flex justify-between">
								Group Name
							</label>
							<Input
								type="text"
								value={labelValue}
								placeholder="e.g. Database Cluster"
								onChange={(e) => updateNodeData('label', e.target.value)}
								className="bg-[#0f1115] px-2"
							/>
							<p className="text-xs text-[var(--color-text-muted)]">Display name rendered on the canvas.</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Defaults handled gracefully if not yet set on drop
	const capacity = selectedNode.data.capacity_rps ?? 1000;
	const replicas = selectedNode.data.replicas ?? 1;
	const latency = selectedNode.data.base_latency_ms ?? 10;
	const queueSize = selectedNode.data.queue_size ?? 5000;
	const displayLabel = selectedNode.data.label || 'Component';
	const labelValue = selectedNode.data.label || '';

	const isQueue = ['kafka', 'rabbitmq', 'sqs', 'queue'].some(q => displayLabel.toLowerCase().includes(q));

	return (
		<div className="p-4 flex flex-col gap-6 pl-10 overflow-y-auto">
			<div>
				<h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
					{displayLabel} Configuration
				</h4>

				<div className="space-y-4">
					<div className="space-y-1.5 border-b border-[var(--color-border)] pb-4 mb-2">
						<label className="text-sm font-medium text-white flex justify-between">
							Component Name
						</label>
						<Input
							type="text"
							value={labelValue}
							placeholder="e.g. primary-db"
							onChange={(e) => updateNodeData('label', e.target.value)}
							className="bg-[#0f1115] px-2"
						/>
						<p className="text-xs text-[var(--color-text-muted)]">Display name rendered on the canvas.</p>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-white flex justify-between">
							Base Capacity
							<span className="text-[var(--color-text-muted)] text-xs font-normal">RPS</span>
						</label>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('capacity_rps', Math.max(1, capacity - 100))}
							>
								<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
							<Input
								type="number"
								value={capacity}
								onChange={(e) => updateNodeData('capacity_rps', parseInt(e.target.value) || 0)}
								className="bg-[#0f1115] text-center px-1"
								min={1}
							/>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('capacity_rps', capacity + 100)}
							>
								<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
						</div>
						<p className="text-xs text-[var(--color-text-muted)]">Max requests processed per replica.</p>
					</div>

					<div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
						<label className="text-sm font-medium text-white flex justify-between">
							Rate Limit
							<span className="text-[var(--color-text-muted)] text-xs font-normal">RPS</span>
						</label>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('rate_limit_rps', Math.max(0, (selectedNode.data.rate_limit_rps || 100) - 10))}
							>
								<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
							<Input
								type="number"
								value={selectedNode.data.rate_limit_rps || ''}
								placeholder="None"
								onChange={(e) => updateNodeData('rate_limit_rps', e.target.value === '' ? null : parseInt(e.target.value))}
								className="bg-[#0f1115] text-center px-1"
								min={0}
							/>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('rate_limit_rps', (selectedNode.data.rate_limit_rps || 0) + 10)}
							>
								<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
						</div>
						<p className="text-xs text-[var(--color-text-muted)]">Global rate limit filter applied before capacity.</p>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-white flex justify-between">
							Replicas
							<span className="text-[var(--color-text-muted)] text-xs font-normal">Instances</span>
						</label>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('replicas', Math.max(1, replicas - 1))}
							>
								<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
							<Input
								type="number"
								value={replicas}
								onChange={(e) => updateNodeData('replicas', parseInt(e.target.value) || 1)}
								className="bg-[#0f1115] text-center px-1"
								min={1}
							/>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('replicas', replicas + 1)}
							>
								<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
						</div>
						<p className="text-xs text-[var(--color-text-muted)]">Horizontal scale limits total capacity.</p>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-white flex justify-between">
							Base Latency
							<span className="text-[var(--color-text-muted)] text-xs font-normal">ms</span>
						</label>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('base_latency_ms', Math.max(0, latency - 5))}
							>
								<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
							<Input
								type="number"
								value={latency}
								onChange={(e) => updateNodeData('base_latency_ms', parseInt(e.target.value) || 0)}
								className="bg-[#0f1115] text-center px-1"
								min={0}
							/>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
								onClick={() => updateNodeData('base_latency_ms', latency + 5)}
							>
								<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
							</Button>
						</div>
						<p className="text-xs text-[var(--color-text-muted)]">Minimum response time at 0% load.</p>
					</div>

					{isQueue && (
						<div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
							<label className="text-sm font-medium text-white flex justify-between">
								Queue Size
								<span className="text-[var(--color-text-muted)] text-xs font-normal">Messages</span>
							</label>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
									onClick={() => updateNodeData('queue_size', Math.max(100, queueSize - 1000))}
								>
									<Minus className="w-4 h-4 text-[var(--color-text-muted)]" />
								</Button>
								<Input
									type="number"
									value={queueSize}
									onChange={(e) => updateNodeData('queue_size', parseInt(e.target.value) || 0)}
									className="bg-[#0f1115] text-center px-1"
									min={100}
									step={1000}
								/>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 hover:bg-[#1a1c23] shrink-0 border border-transparent hover:border-[#333]"
									onClick={() => updateNodeData('queue_size', queueSize + 1000)}
								>
									<Plus className="w-4 h-4 text-[var(--color-text-muted)]" />
								</Button>
							</div>
							<p className="text-xs text-[var(--color-text-muted)]">Maximum buffered requests before dropping.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
