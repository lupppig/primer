import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import TechNode from './Canvas/TechNode';
import TrafficEdge from './Canvas/TrafficEdge';
import TextNode from './Canvas/TextNode';
import GroupNode from './Canvas/GroupNode';

const nodeTypes = {
	techNode: TechNode,
	textNode: TextNode,
	groupNode: GroupNode,
};

const edgeTypes = {
	traffic: TrafficEdge,
};

interface MiniCanvasPreviewProps {
	nodes: any[];
	edges: any[];
}

export function MiniCanvasPreview({ nodes, edges }: MiniCanvasPreviewProps) {
	// Sanitize edges to prevent React Flow crash on null markerEnd
	const sanitizedEdges = (edges || []).map((edge: any) => ({
		...edge,
		markerEnd: edge.markerEnd || undefined
	}));

	// A strictly read-only, non-interactive instance of React Flow
	// Used only for visual thumbnails on the dashboard
	return (
		<div className="w-full h-full pointer-events-none">
			<ReactFlow
				nodes={nodes}
				edges={sanitizedEdges}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				nodesDraggable={false}
				nodesConnectable={false}
				elementsSelectable={false}
				zoomOnScroll={false}
				panOnScroll={false}
				panOnDrag={false}
				zoomOnDoubleClick={false}
				preventScrolling={false}
			>
				<Background color="#2d3139" gap={16} size={1} />
			</ReactFlow>
		</div>
	);
}
