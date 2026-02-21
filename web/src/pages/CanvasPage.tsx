import { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useSearchParams } from 'react-router-dom';
import Canvas from '../components/Canvas/Canvas';
import PropertiesPanel from '../components/Sidebar/PropertiesPanel';
import FloatingToolbar from '../components/Toolbar/FloatingToolbar';
import { PanelRightClose, PanelRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDesignStore } from '../store/useDesignStore';
import { useStore } from '../store/useStore';
import AuthModal from '../components/Auth/AuthModal';

export default function CanvasPage() {
	const [isRightOpen, setIsRightOpen] = useState(true);
	const [searchParams] = useSearchParams();

	const { loadDesign, currentDesign, isLoading } = useDesignStore();
	const { setNodes, setEdges } = useStore();

	const designId = searchParams.get('id');

	useEffect(() => {
		if (designId) {
			loadDesign(designId);
		}
	}, [designId, loadDesign]);

	// When currentDesign populates, hydrate the canvas store
	useEffect(() => {
		if (currentDesign) {
			setNodes(currentDesign.nodes || [])
			setEdges(currentDesign.edges || [])
		}
	}, [currentDesign, setNodes, setEdges]);

	return (
		<div className="flex h-screen bg-[var(--color-canvas)] overflow-hidden">
			{/* Loading Overlay */}
			{isLoading && (
				<div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-canvas)]/50 backdrop-blur-sm">
					<div className="w-8 h-8 rounded-full border-4 border-[var(--color-primary)] border-t-transparent animate-spin" />
				</div>
			)}

			<AuthModal />

			{/* Main Canvas Area */}
			<main className="flex-1 relative min-w-0 h-full">
				<ReactFlowProvider>
					<FloatingToolbar />
					<Canvas />
				</ReactFlowProvider>
			</main>

			{/* Right Properties Panel (Placeholder for MVP) */}
			<motion.aside
				initial={false}
				animate={{ width: isRightOpen ? 288 : 48 }}
				transition={{ duration: 0.3, ease: 'easeInOut' }}
				className="flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-panel)] h-full relative flex flex-col z-10 overflow-hidden"
			>
				{/* Toggle Button */}
				<button
					onClick={() => setIsRightOpen(!isRightOpen)}
					className="absolute left-2 top-4 z-50 p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-[#1a1c23] transition-colors"
					title={isRightOpen ? "Collapse Properties" : "Expand Properties"}
				>
					{isRightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
				</button>

				<div
					className={`w-72 h-full flex flex-col transition-opacity duration-200 ${isRightOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
				>
					<div className="p-4 border-b border-[var(--color-border)] pl-10">
						<h3 className="font-heading font-semibold text-white">Properties</h3>
						<p className="text-xs text-[var(--color-text-muted)] mt-1">Select a node to edit</p>
					</div>
					<div className="flex-1 overflow-y-auto">
						<PropertiesPanel />
					</div>
				</div>
			</motion.aside>
		</div>
	);
}
