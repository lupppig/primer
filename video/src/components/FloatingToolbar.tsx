import React from 'react';
import { COLORS, FONT } from '../theme';

/**
 * Accurate FloatingToolbar matching the real Primer toolbar from FloatingToolbar.tsx.
 *
 * Tools: Select, Text, Shapes, Components, Draw, Comment, Export
 * Separator line
 * Analytics Dashboard button (green)
 *
 * Position: absolute left-4 top-1/2 -translate-y-1/2
 */
interface FloatingToolbarProps {
	activeTool?: string;
}

const TOOLS = [
	{ id: 'select', icon: '⬚', label: 'Select' },
	{ id: 'text', icon: 'T', label: 'Text Note' },
	{ id: 'shapes', icon: '◇', label: 'Shapes' },
	{ id: 'components', icon: '⬡', label: 'Components' },
	{ id: 'draw', icon: '✎', label: 'Draw' },
	{ id: 'comment', icon: '💬', label: 'Comment' },
	{ id: 'download', icon: '⬇', label: 'Export' },
];

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ activeTool = 'select' }) => {
	return (
		<div
			style={{
				position: 'absolute',
				left: 16,
				top: '50%',
				transform: 'translateY(-50%)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 2,
				background: COLORS.panelBg,
				border: `1px solid ${COLORS.border}`,
				padding: 6,
				borderRadius: 14,
				zIndex: 50,
				boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
			}}
		>
			{TOOLS.map((tool) => {
				const isActive = activeTool === tool.id;
				return (
					<div
						key={tool.id}
						style={{
							width: 36,
							height: 36,
							borderRadius: 8,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 14,
							color: isActive ? COLORS.white : COLORS.textMuted,
							background: isActive ? COLORS.primary : 'transparent',
							boxShadow: isActive ? `0 4px 10px ${COLORS.primary}30` : 'none',
						}}
					>
						{tool.icon}
					</div>
				);
			})}

			{/* Separator */}
			<div style={{ width: '70%', height: 1, background: `${COLORS.border}50`, margin: '4px 0' }} />

			{/* Analytics dashboard button */}
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 8,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 14,
					color: '#4ade80',
				}}
			>
				📊
			</div>
		</div>
	);
};
