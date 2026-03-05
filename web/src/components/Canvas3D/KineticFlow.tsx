import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface KineticFlowProps {
	chaosMode: boolean;
	stressLevel: number; // 0 to 1
	theme: 'dark' | 'light';
}

const PARTICLE_COUNT = 3000;

export const KineticFlow: React.FC<KineticFlowProps> = ({ chaosMode, stressLevel, theme }) => {
	const meshRef = useRef<THREE.InstancedMesh>(null);

	// We define a few fixed paths (lines) between nodes.
	// Node positions (approximate matches to FrostedNode positions)
	const paths = useMemo(() => [
		[new THREE.Vector3(-4, 0, 0), new THREE.Vector3(0, 0, -3)], // Gateway -> Auth
		[new THREE.Vector3(-4, 0, 0), new THREE.Vector3(0, 0, 3)],  // Gateway -> Worker
		[new THREE.Vector3(0, 0, -3), new THREE.Vector3(4, 0, 0)],  // Auth -> DB
		[new THREE.Vector3(0, 0, 3), new THREE.Vector3(4, 0, 0)],   // Worker -> DB
		[new THREE.Vector3(-6, 2, 0), new THREE.Vector3(-4, 0, 0)]  // External -> Gateway
	], []);

	// Initial dummy object for matrix calculations
	const dummy = useMemo(() => new THREE.Object3D(), []);

	// Particle state: path index, progress (0-1), speed
	const particleData = useMemo(() => {
		const data = [];
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const r1 = (Math.sin(i * 123) * 10000) - Math.floor(Math.sin(i * 123) * 10000);
			const r2 = (Math.cos(i * 321) * 10000) - Math.floor(Math.cos(i * 321) * 10000);
			const r3 = (Math.sin(i * 555) * 10000) - Math.floor(Math.sin(i * 555) * 10000);
			const r4 = (Math.cos(i * 777) * 10000) - Math.floor(Math.cos(i * 777) * 10000);
			const r5 = (Math.sin(i * 999) * 10000) - Math.floor(Math.sin(i * 999) * 10000);

			data.push({
				pathIdx: Math.floor(r1 * paths.length),
				progress: r2,
				speed: 0.002 + r3 * 0.005,
				offsetBase: new THREE.Vector3((r4 - 0.5) * 0.4, (r5 - 0.5) * 0.4, (r1 - 0.5) * 0.4)
			});
		}
		return data;
	}, [paths.length]);

	useFrame((state, delta) => {
		if (!meshRef.current) return;

		const time = state.clock.elapsedTime;
		const speedMult = 1 + (stressLevel * 5) + (chaosMode ? 10 : 0);

		particleData.forEach((p, i) => {
			p.progress += p.speed * speedMult * 60 * delta;
			if (p.progress >= 1) p.progress = 0; // Loop back

			const path = paths[p.pathIdx];
			const start = path[0];
			const end = path[1];

			// Interpolate position along the path
			dummy.position.lerpVectors(start, end, p.progress);

			// Add sine-wave turbulence
			const turbulence = chaosMode ? 0.3 : 0.05;
			dummy.position.x += Math.sin(time * 5 + i) * turbulence;
			dummy.position.y += Math.cos(time * 4 + i) * turbulence;
			dummy.position.z += Math.sin(time * 3 + i) * turbulence;

			// Add base spread offset
			dummy.position.add(p.offsetBase);

			// Scale particles slightly based on progress (fade in/out effect essentially)
			const scale = Math.sin(p.progress * Math.PI) * (chaosMode ? 1.5 : 1);
			dummy.scale.set(scale, scale, scale);

			dummy.updateMatrix();
			meshRef.current!.setMatrixAt(i, dummy.matrix);
		});

		meshRef.current.instanceMatrix.needsUpdate = true;
	});

	const isDark = theme === 'dark';
	const baseColor = isDark ? '#00C2FF' : '#0052FF';
	const chaoticColor = '#ef4444';

	return (
		<group>
			{/* Draw physical pipes lightly */}
			{paths.map((pts, i) => {
				const curve = new THREE.LineCurve3(pts[0], pts[1]);
				return (
					<mesh key={i}>
						<tubeGeometry args={[curve, 20, 0.4, 8, false]} />
						<meshPhysicalMaterial
							transparent
							opacity={0.15}
							roughness={0.1}
							transmission={1}
							thickness={0.5}
							color={isDark ? '#ffffff' : '#0052FF'}
						/>
					</mesh>
				)
			})}

			{/* Particles using InstancedMesh for high performance */}
			<instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
				<sphereGeometry args={[0.04, 8, 8]} />
				<meshBasicMaterial
					color={chaosMode ? chaoticColor : baseColor}
					toneMapped={false}
				/>
			</instancedMesh>
		</group>
	);
};
