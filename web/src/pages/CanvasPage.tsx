import { useState, useEffect, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useSearchParams } from 'react-router-dom';
import Canvas from '../components/Canvas/Canvas';
import PropertiesPanel from '../components/Sidebar/PropertiesPanel';
import HistoryPanel from '../components/Sidebar/HistoryPanel';
import FloatingToolbar from '../components/Toolbar/FloatingToolbar';
import { PanelRightClose, PanelRight, Settings2, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDesignStore } from '../store/useDesignStore';
import { useStore } from '../store/useStore';
import AuthModal from '../components/Auth/AuthModal';

export default function CanvasPage() {
	const [isRightOpen, setIsRightOpen] = useState(true);
	const [activeTab, setActiveTab] = useState<'properties' | 'history'>('properties');
	const [searchParams] = useSearchParams();

	const { loadDesign, currentDesign, isLoading } = useDesignStore();
	const { setNodes, setEdges } = useStore();

	const designId = searchParams.get('id');

	const hasHydrated = useRef(false);

	useEffect(() => {
		if (designId) {
			hasHydrated.current = false; // Reset hydration when switching designs
			loadDesign(designId);
		}
	}, [designId, loadDesign]);

	// When currentDesign populates, hydrate the canvas store ONCE to prevent interrupting node dragging
	useEffect(() => {
		if (currentDesign && !hasHydrated.current) {
			setNodes(currentDesign.nodes || []);
			setEdges(currentDesign.edges || []);
			const savedRps = currentDesign.settings?.loadProfile?.baseRps;
			if (typeof savedRps === 'number') {
				// Initialize the load profile from saved settings if available
				useStore.getState().updateLoadProfile({ ...useStore.getState().simulation.loadProfile, baseRps: savedRps });
			}
			hasHydrated.current = true;
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
				animate={{ width: isRightOpen ? 320 : 48 }}
				transition={{ duration: 0.3, ease: 'easeInOut' }}
				className="flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-panel)] h-full relative flex flex-col z-10 overflow-hidden"
			>
				{/* Toggle Button */}
				<button
					onClick={() => setIsRightOpen(!isRightOpen)}
					className="absolute left-2 top-4 z-50 p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-[#1a1c23] transition-colors"
					title={isRightOpen ? "Collapse Sidebar" : "Expand Sidebar"}
				>
					{isRightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
				</button>

				<div
					className={`w-80 h-full flex flex-col transition-opacity duration-200 ${isRightOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
				>
					<div className="p-4 border-b border-[var(--color-border)] pl-10 flex items-center justify-between">
						<div>
							<h3 className="font-heading font-semibold text-white capitalize">{activeTab}</h3>
							<p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
								{activeTab === 'properties' ? 'Component configuration' : 'Past simulation runs'}
							</p>
						</div>

						<div className="flex bg-[#0f111a] rounded-lg p-1 border border-[var(--color-border)]/50">
							<button
								onClick={() => setActiveTab('properties')}
								className={`p-1.5 rounded-md transition-all ${activeTab === 'properties' ? 'bg-[#3caff6] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
								title="Properties"
							>
								<Settings2 className="w-4 h-4" />
							</button>
							<button
								onClick={() => setActiveTab('history')}
								className={`p-1.5 rounded-md transition-all ${activeTab === 'history' ? 'bg-[#3caff6] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
								title="Simulation History"
							>
								<History className="w-4 h-4" />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto custom-scrollbar">
						{activeTab === 'properties' ? <PropertiesPanel /> : <HistoryPanel />}
					</div>
				</div>
			</motion.aside>
		</div>
	);
}

