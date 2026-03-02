import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';
import { PrimerLogo } from '../components/PrimerLogo';
import { FeatureCallout } from '../components/FeatureCallout';

/**
 * Scene 14: Recap — what we learned and next steps.
 */
export const Recap: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const fadeIn = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20 });
	const ctaOpacity = interpolate(frame, [180, 210], [0, 1], { extrapolateRight: 'clamp' });

	const steps = [
		'Built a ticket booking system from scratch',
		'Connected services with traffic flows',
		'Configured capacity, caching, and replicas',
		'Simulated load and found bottlenecks',
		'Fixed performance issues with scaling',
		'Analyzed simulation results in the dashboard',
	];

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, display: 'flex', position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}20 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}20 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.15 }} />
			<div style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${COLORS.primary}10, transparent 70%)`, filter: 'blur(60px)' }} />

			{/* Left: recap list */}
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', opacity: fadeIn }}>
				<h2 style={{ fontFamily: FONT.heading, fontSize: 32, fontWeight: 800, color: COLORS.textMain, letterSpacing: '-0.03em', marginBottom: 28, margin: 0 }}>
					What you learned:
				</h2>
				<FeatureCallout items={steps} delay={20} />
			</div>

			{/* Right: next steps & CTA */}
			<div style={{ width: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, opacity: ctaOpacity }}>
				<PrimerLogo size={48} />
				<h3 style={{ fontFamily: FONT.heading, fontSize: 28, fontWeight: 800, color: COLORS.textMain, margin: 0 }}>Keep experimenting!</h3>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 280 }}>
					<div style={{ background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: COLORS.textMuted, fontFamily: FONT.body }}>
						🔥 Try chaos engineering — kill a server
					</div>
					<div style={{ background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: COLORS.textMuted, fontFamily: FONT.body }}>
						🛡 Configure circuit breakers
					</div>
					<div style={{ background: COLORS.panelBg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: COLORS.textMuted, fontFamily: FONT.body }}>
						🔗 Share your design with teammates
					</div>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, background: COLORS.panelBg, border: `1px solid ${COLORS.primary}40`, borderRadius: 10, padding: '10px 18px', marginTop: 8 }}>
					<span style={{ fontSize: 16 }}>⭐</span>
					<div>
						<div style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 600, color: COLORS.textMain }}>Star on GitHub</div>
						<div style={{ fontFamily: FONT.mono, fontSize: 10, color: COLORS.primary }}>github.com/lupppig/primer</div>
					</div>
				</div>
			</div>

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' }) }}>
				<div style={{ background: 'rgba(9,10,15,0.9)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px' }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>
						That's it! You've built and tested a complete system in Primer.
					</span>
				</div>
			</div>
		</div>
	);
};
