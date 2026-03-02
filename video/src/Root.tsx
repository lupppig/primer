import React from 'react';
import { Composition } from 'remotion';
import { MovyDesign2D } from './scenes/MovyDesign2D';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="MovyDesign2D"
				component={MovyDesign2D}
				durationInFrames={900}
				fps={30}
				width={1920}
				height={1080}
			/>
		</>
	);
};
