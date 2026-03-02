import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';
import { PrimerLogo } from '../components/PrimerLogo';

export const CreateDesign: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const panelOpacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });
	const clickFrame = 120;
	const clicked = frame > clickFrame;
	const btnGlow = clicked ? interpolate(frame, [clickFrame, clickFrame + 10], [0, 1], { extrapolateRight: 'clamp' }) : 0;

	const sidebarItems = ['Home', 'My Designs', 'Shared', 'Templates'];

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, display: 'flex', position: 'relative' }}>
			{/* Sidebar */}
			<div style={{ width: 240, borderRight: `1px solid ${COLORS.border}`, background: COLORS.panelBg, padding: '20px 0', opacity: panelOpacity }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', marginBottom: 28 }}>
					<PrimerLogo size={24} />
					<span style={{ fontFamily: FONT.heading, fontSize: 18, fontWeight: 700, color: COLORS.textMain }}>Primer</span>
				</div>
				{sidebarItems.map((item, i) => (
					<div key={item} style={{ padding: '9px 20px', fontSize: 13, fontFamily: FONT.body, color: i === 0 ? COLORS.primary : COLORS.textMuted, background: i === 0 ? `${COLORS.primary}10` : 'transparent', margin: '2px 10px', borderRadius: 8 }}>
						{item}
					</div>
				))}
			</div>

			{/* Main area */}
			<div style={{ flex: 1, padding: 48, opacity: panelOpacity }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
					<div>
						<h1 style={{ fontFamily: FONT.heading, fontSize: 28, fontWeight: 700, color: COLORS.textMain, margin: 0 }}>Welcome back</h1>
						<p style={{ fontFamily: FONT.body, fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>Start a new design or continue working on an existing one.</p>
					</div>
					{/* Create New Design button */}
					<div style={{
						background: COLORS.primary,
						color: COLORS.white,
						padding: '10px 20px',
						borderRadius: 10,
						fontFamily: FONT.body,
						fontSize: 14,
						fontWeight: 600,
						boxShadow: clicked ? `0 0 ${20 + btnGlow * 20}px ${COLORS.primary}60` : `0 4px 16px ${COLORS.primary}30`,
						transform: clicked ? 'scale(0.96)' : 'scale(1)',
					}}>
						+ Create New Design
					</div>
				</div>

				{/* Recent designs grid */}
				<h3 style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Recent Designs</h3>
				<div style={{ display: 'flex', gap: 16 }}>
					{['API Gateway', 'Microservices'].map((name, i) => (
						<div key={name} style={{ width: 220, background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: 'hidden', opacity: interpolate(frame, [20 + i * 10, 35 + i * 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
							<div style={{ height: 80, background: '#1a1c23' }} />
							<div style={{ padding: 12 }}>
								<div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain, fontFamily: FONT.body }}>{name}</div>
								<div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT.body, marginTop: 2 }}>Feb 28, 2026</div>
							</div>
						</div>
					))}
				</div>

				{/* Templates section */}
				<h3 style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, marginTop: 40 }}>Templates</h3>
				<div style={{ display: 'flex', gap: 16 }}>
					<div style={{ width: 220, background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }) }}>
						<div style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, fontFamily: FONT.body, marginBottom: 4 }}>Ticketing System (CQRS)</div>
						<p style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT.body, margin: 0, lineHeight: 1.4 }}>50k RPS capacity with CQRS split.</p>
					</div>
				</div>
			</div>

			{/* Cursor pointing at "Create New Design" */}
			{frame > 80 && frame < clickFrame + 30 && (
				<div style={{
					position: 'absolute',
					right: interpolate(frame, [80, 110], [500, 170], { extrapolateRight: 'clamp' }),
					top: interpolate(frame, [80, 110], [200, 60], { extrapolateRight: 'clamp' }),
					opacity: interpolate(frame, [80, 90], [0, 1], { extrapolateRight: 'clamp' }),
					zIndex: 100,
				}}>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
						<path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" strokeWidth={1.5} strokeLinejoin="round" />
					</svg>
				</div>
			)}

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }) }}>
				<div style={{ background: 'rgba(9,10,15,0.9)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px', maxWidth: 800 }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>
						{frame < 80
							? 'This is your Dashboard. You can see recent designs and templates here.'
							: frame < clickFrame
								? 'Click "Create New Design" to start building from scratch.'
								: 'You can also start from a template — but we\'ll build step by step.'}
					</span>
				</div>
			</div>
		</div>
	);
};
