import React from 'react';
import { Composition } from 'remotion';
import { Video, TOTAL_DURATION } from './Video';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="PrimerTutorial"
				component={Video}
				durationInFrames={TOTAL_DURATION}
				fps={30}
				width={1920}
				height={1080}
			/>
		</>
	);
};
