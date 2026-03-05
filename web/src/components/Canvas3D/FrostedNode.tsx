import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useCursor, Edges } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

interface FrostedNodeProps {
	position: [number, number, number];
	label: string;
	metrics: string[];
	chaosMode: boolean;
	color?: string;
}

export const FrostedNode: React.FC<FrostedNodeProps> = ({ position, label, metrics, chaosMode, color = '#0052FF' }) => {
	const groupRef = useRef<THREE.Group>(null);
	const coreRef = useRef<THREE.Mesh>(null);

	// Panel refs
	const topPanel = useRef<THREE.Mesh>(null);
	const bottomPanel = useRef<THREE.Mesh>(null);
	const leftPanel = useRef<THREE.Mesh>(null);
	const rightPanel = useRef<THREE.Mesh>(null);
	const frontPanel = useRef<THREE.Mesh>(null);
	const backPanel = useRef<THREE.Mesh>(null);

	const [hovered, setHovered] = useState(false);
	const [opened, setOpened] = useState(false);

	useCursor(hovered, 'pointer', 'auto');

	// Mechanical Unfolding Animation
	useEffect(() => {
		const refs = [topPanel, bottomPanel, leftPanel, rightPanel, frontPanel, backPanel];
		if (!refs.every(r => r.current)) return;

		const distance = 1.2;
		const duration = 0.6;
		const ease = "power3.inOut";

		if (opened) {
			gsap.to(topPanel.current!.position, { y: distance, duration, ease });
			gsap.to(bottomPanel.current!.position, { y: -distance, duration, ease });
			gsap.to(leftPanel.current!.position, { x: -distance, duration, ease });
			gsap.to(rightPanel.current!.position, { x: distance, duration, ease });
			gsap.to(frontPanel.current!.position, { z: distance, duration, ease });
			gsap.to(backPanel.current!.position, { z: -distance, duration, ease });

			// Core reveal
			gsap.to(coreRef.current!.scale, { x: 1.5, y: 1.5, z: 1.5, duration, ease: "back.out(1.7)" });
		} else {
			refs.forEach(ref => {
				gsap.to(ref.current!.position, { x: 0, y: 0, z: 0, duration, ease });
			});
			gsap.to(coreRef.current!.scale, { x: 1, y: 1, z: 1, duration, ease });
		}
	}, [opened]);

	// Chaos Mode Vibration & gentle float
	useFrame((state) => {
		if (!groupRef.current) return;

		// Gentle float
		groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;

		if (chaosMode) {
			// Glitch vibration using deterministic sin
			const t = state.clock.elapsedTime * 50;
			groupRef.current.position.x = position[0] + Math.sin(t + position[0] * 100) * 0.15;
			groupRef.current.position.z = position[2] + Math.cos(t + position[2] * 100) * 0.15;

			if (coreRef.current) {
				(coreRef.current.material as THREE.MeshStandardMaterial).color.set('#ef4444');
				(coreRef.current.material as THREE.MeshStandardMaterial).emissive.set('#ef4444');
			}
		} else {
			groupRef.current.position.x += (position[0] - groupRef.current.position.x) * 0.1;
			groupRef.current.position.z += (position[2] - groupRef.current.position.z) * 0.1;

			if (coreRef.current) {
				(coreRef.current.material as THREE.MeshStandardMaterial).color.set(color);
				(coreRef.current.material as THREE.MeshStandardMaterial).emissive.set(color);
			}
		}
	});

	const panelGeometry = React.useMemo(() => new THREE.BoxGeometry(1.9, 1.9, 0.1), []);

	const edgeColor = hovered ? color : '#333333';
	const edgeOpacity = hovered ? 0.8 : 0.2;
	const glassColor = chaosMode ? '#ffbbbb' : '#e0efff';

	return (
		<group
			ref={groupRef}
			position={position}
			onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
			onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
			onClick={(e) => { e.stopPropagation(); setOpened(!opened); }}
		>
			{/* Glowing Core */}
			<mesh ref={coreRef}>
				<octahedronGeometry args={[0.4, 0]} />
				<meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
			</mesh>

			{/* Glass Panels - using meshPhysicalMaterial for glass effect without MeshTransmissionMaterial */}
			{/* Front */}
			<mesh ref={frontPanel} geometry={panelGeometry} position={[0, 0, 0]} rotation={[0, 0, 0]}>
				<meshPhysicalMaterial transparent opacity={0.3} roughness={0.05} metalness={0.1} color={glassColor} side={THREE.DoubleSide} />
				<Edges scale={1} threshold={15} color={edgeColor} opacity={edgeOpacity} transparent />
			</mesh>
			{/* Back */}
			<mesh ref={backPanel} geometry={panelGeometry} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
				<meshPhysicalMaterial transparent opacity={0.3} roughness={0.05} metalness={0.1} color={glassColor} side={THREE.DoubleSide} />
				<Edges scale={1} threshold={15} color={edgeColor} opacity={edgeOpacity} transparent />
			</mesh>
			{/* Left */}
			<mesh ref={leftPanel} geometry={panelGeometry} position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
				<meshPhysicalMaterial transparent opacity={0.3} roughness={0.05} metalness={0.1} color={glassColor} side={THREE.DoubleSide} />
				<Edges scale={1} threshold={15} color={edgeColor} opacity={edgeOpacity} transparent />
			</mesh>
			{/* Right */}
			<mesh ref={rightPanel} geometry={panelGeometry} position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
				<meshPhysicalMaterial transparent opacity={0.3} roughness={0.05} metalness={0.1} color={glassColor} side={THREE.DoubleSide} />
				<Edges scale={1} threshold={15} color={edgeColor} opacity={edgeOpacity} transparent />
			</mesh>
			{/* Top */}
			<mesh ref={topPanel} geometry={panelGeometry} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<meshPhysicalMaterial transparent opacity={0.3} roughness={0.05} metalness={0.1} color={glassColor} side={THREE.DoubleSide} />
				<Edges scale={1} threshold={15} color={edgeColor} opacity={edgeOpacity} transparent />
			</mesh>
			{/* Bottom */}
			<mesh ref={bottomPanel} geometry={panelGeometry} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<meshPhysicalMaterial transparent opacity={0.3} roughness={0.05} metalness={0.1} color={glassColor} side={THREE.DoubleSide} />
				<Edges scale={1} threshold={15} color={edgeColor} opacity={edgeOpacity} transparent />
			</mesh>

			{/* HTML Overlay for Telemetry */}
			<Html position={[0, 1.8, 0]} center zIndexRange={[100, 0]} style={{ opacity: opened ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: opened ? 'auto' : 'none' }}>
				<div className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-lg font-mono min-w-[200px] shadow-2xl">
					<div className="text-xs font-bold uppercase tracking-widest mb-2 border-b border-white/10 pb-2" style={{ color }}>{label}</div>
					<div className="space-y-1">
						{metrics.map((m, i) => {
							const [k, v] = m.split(':');
							return (
								<div key={i} className="flex justify-between text-[10px]">
									<span className="text-white/50">{k}</span>
									<span className={chaosMode ? 'text-red-400 font-bold' : 'text-white'}>{v}</span>
								</div>
							);
						})}
					</div>
				</div>
			</Html>
		</group>
	);
}
