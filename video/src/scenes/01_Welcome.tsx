import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';
import { PrimerLogo } from '../components/PrimerLogo';

export const Welcome: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const logoScale = spring({ frame, fps, from: 0.5, to: 1, durationInFrames: 20, config: { damping: 12 } });
	const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
	const titleOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });
	const descOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: 'clamp' });
	const previewOpacity = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: 'clamp' });

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
			{/* Grid */}
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}25 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}25 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.3 }} />

			{/* Logo + Title */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: logoOpacity, transform: `scale(${logoScale})`, marginBottom: 24 }}>
				<PrimerLogo size={52} />
				<span style={{ fontFamily: FONT.heading, fontSize: 52, fontWeight: 800, color: COLORS.textMain, letterSpacing: '-0.04em' }}>Primer</span>
			</div>

			{/* Tutorial title */}
			<div style={{ opacity: titleOpacity, textAlign: 'center' }}>
				<h1 style={{ fontFamily: FONT.heading, fontSize: 36, fontWeight: 700, color: COLORS.primary, margin: 0, letterSpacing: '-0.02em' }}>
					Building a Ticket Booking System
				</h1>
				<p style={{ fontFamily: FONT.body, fontSize: 18, color: COLORS.textMuted, marginTop: 8 }}>
					A step-by-step tutorial for beginners
				</p>
			</div>

			{/* What we'll learn */}
			<div style={{ opacity: descOpacity, marginTop: 40, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 500 }}>
				<p style={{ fontFamily: FONT.body, fontSize: 16, color: COLORS.textMuted, textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
					In this tutorial, you'll learn how to design a ticket booking system, connect services, configure capacity, run a load simulation, and fix performance bottlenecks.
				</p>
			</div>

			{/* Preview hint */}
			{frame > 120 && (
				<div style={{ position: 'absolute', bottom: 80, display: 'flex', alignItems: 'center', gap: 8, opacity: previewOpacity }}>
					<div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.primary }} />
					<span style={{ fontFamily: FONT.body, fontSize: 14, color: COLORS.textMuted }}>
						Total time: ~2 minutes
					</span>
				</div>
			)}

			{/* Narration subtitle */}
			{frame > 80 && (
				<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: 'clamp' }) }}>
					<div style={{ background: 'rgba(9,10,15,0.9)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px' }}>
						<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>
							Let's get started.
						</span>
					</div>
				</div>
			)}
		</div>
	);
};
