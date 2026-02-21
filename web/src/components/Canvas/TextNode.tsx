import { NodeResizer } from 'reactflow';
import { useStore } from '../../store/useStore';

export default function TextNode({ id, data, selected }: { id: string, data: any, selected?: boolean }) {
	const { nodes, setNodes } = useStore();

	const updateText = (newText: string) => {
		const updatedNodes = nodes.map(n => {
			if (n.id === id) {
				return {
					...n,
					data: { ...n.data, label: newText }
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
				minWidth={100}
				minHeight={40}
				handleStyle={{ width: 6, height: 6, border: 'none', borderRadius: '2px', backgroundColor: 'var(--color-primary)' }}
				lineStyle={{ border: '1px dashed var(--color-primary)' }}
			/>
			<div className="w-full h-full min-w-[100px] min-h-[40px]">
				<textarea
					className="nodrag nopan nowheel w-full h-full bg-transparent text-white border-none outline-none resize-none overflow-hidden placeholder:text-white/30"
					value={data.label === 'Text Note' || data.label === 'Text' ? '' : data.label}
					onChange={(e) => updateText(e.target.value)}
					placeholder="type your text here"
					style={{
						fontSize: `${data.fontSize ?? 14}px`,
						lineHeight: '1.4',
					}}
				/>
			</div>
			{selected && (
				<button
					className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md transition-colors z-50 pointer-events-auto"
					onClick={(e) => {
						e.stopPropagation();
						setNodes(nodes.filter(n => n.id !== id));
					}}
					title="Delete Note"
				>
					×
				</button>
			)}
		</>
	);
}
