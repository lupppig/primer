import { useState } from 'react';
import { useStore } from '../../store/useStore';
import {
	MousePointer2,
	Type,
	Shapes,
	Component,
	MessageSquare,
	PenTool
} from 'lucide-react';
import FloatingPopover from './FloatingPopover';

import type { ToolType } from './types';

export default function FloatingToolbar() {
	const activeTool = useStore((state) => state.activeTool) as ToolType;
	const setActiveTool = useStore((state) => state.setActiveTool);
	const [popoverOpen, setPopoverOpen] = useState<ToolType | null>(null);

	const handleToolClick = (tool: ToolType) => {
		setActiveTool(tool);

		// Toggle popovers for categories that have them
		if (tool === 'shapes' || tool === 'components') {
			setPopoverOpen(popoverOpen === tool ? null : tool);
		} else {
			setPopoverOpen(null);
		}
	};

	const tools = [
		{ id: 'select', icon: MousePointer2, label: 'Select' },
		{ id: 'text', icon: Type, label: 'Text Note' },
		{ id: 'shapes', icon: Shapes, label: 'Generic Shapes' },
		{ id: 'components', icon: Component, label: 'Tech Components' },
		{ id: 'draw', icon: PenTool, label: 'Draw' },
		{ id: 'comment', icon: MessageSquare, label: 'Comment' },
	] as const;

	return (
		<div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex items-start gap-3">
			{/* Main Toolbar Column */}
			<div className="flex flex-col gap-1 bg-[var(--color-panel)] border border-[var(--color-border)] p-1.5 rounded-xl shadow-2xl backdrop-blur-md">
				{tools.map((tool) => {
					const Icon = tool.icon;
					const isActive = activeTool === tool.id;

					return (
						<button
							key={tool.id}
							onClick={() => handleToolClick(tool.id)}
							className={`p-2.5 rounded-lg transition-all relative group flex items-center justify-center
								${isActive
									? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
									: 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/5'
								}`}
							title={tool.label}
						>
							<Icon className="w-4 h-4" />

							<div className="absolute left-full ml-3 px-1.5 py-0.5 bg-black/40 backdrop-blur-md text-[10px] text-white/90 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
								{tool.label}
							</div>
						</button>
					);
				})}
			</div>

			{/* Slide-out Popover System */}
			{popoverOpen && (
				<FloatingPopover
					type={popoverOpen}
					onClose={() => setPopoverOpen(null)}
				/>
			)}
		</div>
	);
}
