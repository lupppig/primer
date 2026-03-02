/* Primer Tutorial Video — Design Tokens
 * Matches Primer's existing dark UI palette exactly.
 */

export const COLORS = {
	canvasBg: '#090a0f',
	panelBg: '#13151a',
	panelBgAlt: '#0f111a',
	cardBg: '#0f111a',
	border: '#2a2f40',
	borderSubtle: 'rgba(42,47,64,0.5)',
	primary: '#3caff6',
	primaryHover: '#5bc0f8',
	accent: '#5048e5',
	textMain: '#f1f5f9',
	textMuted: '#64748b',
	textDimmed: '#475569',
	red: '#ef4444',
	redGlow: 'rgba(239,68,68,0.3)',
	yellow: '#fbbf24',
	green: '#10b981',
	orange: '#f97316',
	purple: '#a855f7',
	blue: '#3b82f6',
	emerald: '#10b981',
	pink: '#ec4899',
	white: '#ffffff',
	black: '#000000',
} as const;

export const FONT = {
	heading: "'Inter', sans-serif",
	body: "'Inter', sans-serif",
	mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const SIZES = {
	width: 1920,
	height: 1080,
} as const;

export const FPS = 30;
export const TOTAL_DURATION_FRAMES = 5400; // ~3 minutes
