import { NodeResizer } from 'reactflow';
import { useStore } from '../../store/useStore';

export default function GroupNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
	const { nodes, setNodes } = useStore();

	const updateLabel = (newLabel: string) => {
		const updatedNodes = nodes.map(n => {
			if (n.id === id) {
				return {
					...n,
					data: { ...n.data, label: newLabel }
				};
			}
			return n;
		});
		setNodes(updatedNodes);
	};

	return (
		<>
			<NodeResizer
				color="var(--color-primary)"
				isVisible={selected}
				minWidth={200}
				minHeight={200}
				handleStyle={{ width: 8, height: 8, border: 'none', borderRadius: '4px', backgroundColor: 'var(--color-primary)' }}
				lineStyle={{ border: '2px dashed var(--color-primary)' }}
			/>
			<div className="w-full h-full min-w-[200px] min-h-[200px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-panel)]/30 rounded-xl relative overflow-hidden pointer-events-none">
				{/* Background styling for the group */}
				<div className="absolute top-0 left-0 w-full p-2 bg-[var(--color-border)]/50 border-b border-[var(--color-border)] pointer-events-auto">
					<input
						className="w-full bg-transparent text-xs font-semibold text-white/80 outline-none uppercase tracking-wider"
						value={data.label === 'Custom Group' ? '' : data.label}
						onChange={(e) => updateLabel(e.target.value)}
						placeholder="Group Name (e.g. Core VPC)"
					/>
				</div>
			</div>
		</>
	);
}
