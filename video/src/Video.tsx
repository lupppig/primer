import React from 'react';
import { Sequence, Audio, staticFile } from 'remotion';
import { COLORS } from './theme';
import { AudioVisualizer } from './components/AudioVisualizer';

import { Welcome } from './scenes/01_Welcome';
import { CreateDesign } from './scenes/02_CreateDesign';
import { UnderstandCanvas } from './scenes/03_UnderstandCanvas';
import { AddFirstComponent } from './scenes/04_AddFirstComponent';
import { BuildArchitecture } from './scenes/05_BuildArchitecture';
import { ConnectComponents } from './scenes/06_ConnectComponents';
import { ConfigureApiServer } from './scenes/07_ConfigureApiServer';
import { ConfigureRedis } from './scenes/08_ConfigureRedis';
import { SetupTraffic } from './scenes/09_SetupTraffic';
import { RunSimulation } from './scenes/10_RunSimulation';
import { FixBottleneck } from './scenes/11_FixBottleneck';
import { AnalyticsDashboard } from './scenes/12_AnalyticsDashboard';
import { SaveAndExport } from './scenes/13_SaveAndExport';
import { Recap } from './scenes/14_Recap';

/*
 * Primer Tutorial Video — Educational Step-by-Step Guide
 *
 * Total: ~2 min 23 sec at 30fps
 *
 * Each scene teaches a specific action with narration.
 */
const SCENES = [
	{ component: Welcome, duration: 300, name: '1. Welcome' },
	{ component: CreateDesign, duration: 300, name: '2. Create a Design' },
	{ component: UnderstandCanvas, duration: 300, name: '3. Understand the Canvas' },
	{ component: AddFirstComponent, duration: 360, name: '4. Add First Component' },
	{ component: BuildArchitecture, duration: 600, name: '5. Build Architecture' },
	{ component: ConnectComponents, duration: 450, name: '6. Connect Components' },
	{ component: ConfigureApiServer, duration: 390, name: '7. Configure API Server' },
	{ component: ConfigureRedis, duration: 270, name: '8. Configure Redis' },
	{ component: SetupTraffic, duration: 330, name: '9. Set Up Traffic' },
	{ component: RunSimulation, duration: 420, name: '10. Run Simulation' },
	{ component: FixBottleneck, duration: 360, name: '11. Fix Bottleneck' },
	{ component: AnalyticsDashboard, duration: 240, name: '12. Analytics Dashboard' },
	{ component: SaveAndExport, duration: 210, name: '13. Save & Export' },
	{ component: Recap, duration: 300, name: '14. Recap' },
] as const;

const TOTAL = SCENES.reduce((sum, s) => sum + s.duration, 0); // 4830 frames

export const Video: React.FC = () => {
	let currentFrame = 0;

	return (
		<div style={{ width: '100%', height: '100%', background: COLORS.canvasBg }}>
			{/* Background ambient audio */}
			<Audio src={staticFile('bgm.wav')} volume={0.3} />

			{/* Audio visualizer overlay */}
			<AudioVisualizer />

			{SCENES.map((scene) => {
				const from = currentFrame;
				currentFrame += scene.duration;

				const SceneComponent = scene.component;
				return (
					<Sequence key={scene.name} from={from} durationInFrames={scene.duration} name={scene.name}>
						<SceneComponent />
					</Sequence>
				);
			})}
		</div>
	);
};

export const TOTAL_DURATION = TOTAL;
