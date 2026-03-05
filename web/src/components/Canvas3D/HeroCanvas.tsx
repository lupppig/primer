import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, ContactShadows, OrbitControls } from '@react-three/drei';
import { FrostedNode } from './FrostedNode';
import { KineticFlow } from './KineticFlow';
import * as THREE from 'three';

interface HeroCanvasProps {
	chaosMode: boolean;
	stressLevel: number;
	theme: 'dark' | 'light';
}

// Fallback for suspense
const CanvasFallback = () => (
	<mesh>
		<boxGeometry args={[1, 1, 1]} />
		<meshStandardMaterial color="#333" wireframe />
	</mesh>
);

export const HeroCanvas: React.FC<HeroCanvasProps> = ({ chaosMode, stressLevel, theme }) => {
	const isDark = theme === 'dark';

	return (
		<Canvas
			gl={{ antialias: true, alpha: true }}
			style={{ background: 'transparent' }}
			onCreated={({ gl }) => {
				gl.toneMapping = THREE.NoToneMapping;
			}}
		>
			<PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />

			{/* Full 360° orbit controls */}
			<OrbitControls
				enablePan={false}
				enableZoom={true}
				enableDamping={true}
				dampingFactor={0.05}
				autoRotate={true}
				autoRotateSpeed={0.5}
				minDistance={6}
				maxDistance={25}
				target={[0, 0, 0]}
			/>

			<ambientLight intensity={isDark ? 0.5 : 2} />
			<pointLight position={[10, 10, 10]} intensity={isDark ? 200 : 800} color={isDark ? '#00C2FF' : '#ffffff'} />
			<pointLight position={[-10, -5, -10]} intensity={isDark ? 100 : 400} color={isDark ? '#0052FF' : '#ffffff'} />

			{/* Chaos Strobing */}
			{chaosMode && (
				<pointLight position={[0, 0, 0]} intensity={500} color="#ef4444" distance={20} decay={2} />
			)}

			<Suspense fallback={<CanvasFallback />}>
				<Environment preset={isDark ? 'night' : 'studio'} environmentIntensity={isDark ? 0.5 : 1} />

				<FrostedNode
					position={[-4, 0, 0]}
					label="API Gateway"
					metrics={['RPS: 45,210', 'Latency: 12ms']}
					chaosMode={chaosMode}
					color={isDark ? '#00C2FF' : '#0052FF'}
				/>

				<FrostedNode
					position={[0, 0, -3]}
					label="Auth Service"
					metrics={['Tokens: 1.2M', 'CPU: 42%']}
					chaosMode={chaosMode}
					color={isDark ? '#00C2FF' : '#0052FF'}
				/>

				<FrostedNode
					position={[0, 0, 3]}
					label="Worker Cluster"
					metrics={['Nodes: 24', 'Load: 88%']}
					chaosMode={chaosMode}
					color={isDark ? '#00C2FF' : '#0052FF'}
				/>

				<FrostedNode
					position={[4, 0, 0]}
					label="Primary DB"
					metrics={['IOPS: 120k', 'Lag: 5ms']}
					chaosMode={chaosMode}
					color={isDark ? '#00C2FF' : '#0052FF'}
				/>

				<KineticFlow chaosMode={chaosMode} stressLevel={stressLevel} theme={theme} />

				{/* Soft ground shadow */}
				<ContactShadows position={[0, -4, 0]} opacity={isDark ? 0.8 : 0.2} scale={30} blur={2} far={10} color={isDark ? '#00C2FF' : '#000000'} />
			</Suspense>
		</Canvas>
	);
};
