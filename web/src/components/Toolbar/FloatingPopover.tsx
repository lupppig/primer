import { COMPONENT_CATEGORIES } from '../../utils/iconMap';
import { motion, AnimatePresence } from 'framer-motion';
import type { ToolType } from './types';

interface PopoverProps {
	type: ToolType;
	onClose: () => void;
}

export default function FloatingPopover({ type, onClose }: PopoverProps) {
	const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
		event.dataTransfer.setData('application/reactflow', nodeType);
		event.dataTransfer.setData('application/label', label);
		event.dataTransfer.effectAllowed = 'move';
	};

	let categories = COMPONENT_CATEGORIES;

	// Filter down categories if they selected 'shapes' purely instead of 'components'
	if (type === 'shapes') {
		categories = COMPONENT_CATEGORIES.filter(c => c.name === 'Generic Shapes');
	} else if (type === 'components') {
		categories = COMPONENT_CATEGORIES.filter(c => c.name !== 'Generic Shapes');
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, x: -10, scale: 0.95 }}
				animate={{ opacity: 1, x: 0, scale: 1 }}
				exit={{ opacity: 0, x: -10, scale: 0.95 }}
				transition={{ duration: 0.15, ease: 'easeOut' }}
				className="w-64 max-h-[70vh] overflow-y-auto custom-scrollbar bg-[#13151a] border border-[var(--color-border)] rounded-xl shadow-2xl backdrop-blur-xl flex flex-col"
			>
				<div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-panel)] sticky top-0 z-10 flex justify-between items-center">
					<h3 className="font-heading font-semibold text-white text-sm">
						{type === 'shapes' ? 'Shapes & Notes' : 'Tech Components'}
					</h3>
					<button
						onClick={onClose}
						className="text-[var(--color-text-muted)] hover:text-white transition-colors text-xs"
					>
						Close
					</button>
				</div>

				<div className="p-3 space-y-4">
					{categories.map((category) => (
						<div key={category.name} className="space-y-2">
							<h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] pl-1">
								{category.name}
							</h4>
							<div className="grid grid-cols-2 gap-2">
								{category.items.map((item) => {
									const Icon = item.icon;
									return (
										<div
											key={item.type}
											className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border border-[var(--color-border)] bg-[#0f1115] hover:border-[var(--color-primary)]/50 hover:bg-[#1a1c23] cursor-grab active:cursor-grabbing transition-colors group"
											draggable
											onDragStart={(e) => onDragStart(e, 'default', item.type)}
											title={item.type}
											onClick={onClose} // Optional context switch: close drawer after picking something
										>
											<div
												className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center bg-opacity-10 group-hover:bg-opacity-20 transition-colors"
												style={{ backgroundColor: `${item.color}15`, color: item.color }}
											>
												<Icon className="w-3.5 h-3.5" />
											</div>
											<span className="text-[10px] font-medium text-[var(--color-text-muted)] group-hover:text-white transition-colors truncate w-full text-center">
												{item.type}
											</span>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
