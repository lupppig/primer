import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

/**
 * Scene 7: Configuring the API Server properties.
 * Shows the Properties Panel exactly as it appears in the real UI.
 */
export const ConfigureApiServer: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const panelOpacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });

	// Field reveal timing
	const fields = [
		{ label: 'Component Name', value: 'App-Server', type: 'text', at: 20 },
		{ label: 'Region', value: '🇺🇸 US East (N. Virginia)', type: 'select', at: 50 },
		{ label: 'Base Capacity', value: '5,000', unit: 'RPS', type: 'number', at: 90, highlight: true, instruction: 'Set to 5,000 — max requests one instance handles' },
		{ label: 'Replicas', value: '3', unit: 'Instances', type: 'number', at: 160, highlight: true, instruction: 'Set to 3 — run three instances for redundancy' },
		{ label: 'Base Latency', value: '15', unit: 'ms', type: 'number', at: 230, highlight: true, instruction: 'Set to 15ms — realistic for an API server' },
		{ label: 'Rate Limit', value: 'None', type: 'select', at: 300 },
	];

	const activeField = fields.find(f => f.highlight && frame >= f.at && frame < f.at + 60);

	const narration = frame < 80
		? 'Click on the App-Server node to open Properties. Let\'s configure it.'
		: frame < 150
			? 'Set Base Capacity to 5,000 RPS — the max requests one instance can handle.'
			: frame < 220
				? 'Set Replicas to 3. We want three instances running for redundancy.'
				: frame < 300
					? 'Set Base Latency to 15ms — that\'s realistic for an API server.'
					: 'Our API Server is now configured and ready for simulation.';

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg, display: 'flex', position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${COLORS.border}20 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}20 1px, transparent 1px)`, backgroundSize: '30px 30px', opacity: 0.2 }} />

			{/* Left half: Node selected description */}
			<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: panelOpacity }}>
				<div style={{ textAlign: 'center' }}>
					{/* Mini node preview */}
					<div style={{ display: 'inline-flex', background: COLORS.panelBgAlt, border: `2px solid ${COLORS.primary}`, borderRadius: 12, padding: 14, gap: 10, alignItems: 'center', marginBottom: 24 }}>
						<div style={{ width: 28, height: 28, borderRadius: 8, background: '#3caff620', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🖥</div>
						<div style={{ textAlign: 'left' }}>
							<div style={{ fontSize: 12, fontWeight: 800, color: COLORS.textMain, fontFamily: FONT.body, textTransform: 'uppercase' }}>App-Server</div>
							<div style={{ fontSize: 8, color: COLORS.textDimmed, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AWS EC2</div>
						</div>
						<div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.green }} />
					</div>

					{activeField && (
						<div style={{ background: `${COLORS.primary}10`, border: `1px solid ${COLORS.primary}40`, borderRadius: 10, padding: '10px 16px', display: 'inline-block', opacity: interpolate(frame, [activeField.at, activeField.at + 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
							<p style={{ fontFamily: FONT.body, fontSize: 14, color: COLORS.primary, margin: 0, fontWeight: 600 }}>
								💡 {activeField.instruction}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Right: Properties Panel — matches the real UI */}
			<div style={{ width: 340, background: COLORS.panelBg, borderLeft: `1px solid ${COLORS.border}`, padding: 20, display: 'flex', flexDirection: 'column', opacity: panelOpacity }}>
				{/* Header */}
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${COLORS.border}` }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<span style={{ fontSize: 14 }}>⚙️</span>
						<span style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 700, color: COLORS.textMain }}>Properties</span>
					</div>
					<span style={{ fontFamily: FONT.body, fontSize: 10, color: COLORS.textMuted }}>Component configuration</span>
				</div>

				{/* Type badge */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
					<div style={{ background: '#3caff620', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, color: COLORS.primary, fontFamily: FONT.body }}>
						APP-SERVER
					</div>
				</div>

				{/* Fields */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					{fields.map((field) => {
						const visible = frame >= field.at;
						const isActive = field.highlight && frame >= field.at && frame < field.at + 60;
						return visible ? (
							<div key={field.label} style={{ opacity: interpolate(frame, [field.at, field.at + 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
									<span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMain, fontFamily: FONT.body }}>{field.label}</span>
									{field.unit && <span style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: FONT.body }}>{field.unit}</span>}
								</div>
								<div style={{
									background: 'rgba(0,0,0,0.3)',
									border: `1px solid ${isActive ? COLORS.primary : COLORS.border}`,
									borderRadius: 8,
									padding: '8px 12px',
									fontSize: 13,
									color: COLORS.textMain,
									fontFamily: field.type === 'number' ? FONT.mono : FONT.body,
									fontWeight: 600,
									boxShadow: isActive ? `0 0 8px ${COLORS.primary}20` : 'none',
								}}>
									{field.value}
								</div>
							</div>
						) : null;
					})}
				</div>
			</div>

			{/* Narration */}
			<div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
				<div style={{ background: 'rgba(9,10,15,0.9)', border: `1px solid ${COLORS.border}60`, borderRadius: 12, padding: '10px 28px', maxWidth: 700 }}>
					<span style={{ fontFamily: FONT.body, fontSize: 20, color: COLORS.textMain }}>{narration}</span>
				</div>
			</div>
		</div>
	);
};
