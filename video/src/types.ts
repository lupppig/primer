export interface SceneProps {
	title?: string;
}

export interface NodeData {
	id: string;
	label: string;
	type: 'api' | 'db' | 'cache' | 'queue' | 'lb' | 'cdn' | 'firewall' | 'external' | 'storage';
	x: number;
	y: number;
	color: string;
	icon?: string;
	metrics?: {
		utilization: number;
		rps: number;
		latency: number;
		replicas: number;
		queueDepth?: number;
		status?: 'healthy' | 'bottleneck' | 'tripped' | 'degraded' | 'failed';
		scalingStatus?: 'idle' | 'scaling_up' | 'scaling_down';
	};
}

export interface EdgeData {
	id: string;
	from: string;
	to: string;
	protocol: 'HTTP' | 'WebSocket' | 'gRPC' | 'UDP';
	trafficPercent: number;
	animated: boolean;
	color: string;
}

export interface SubtitleEntry {
	text: string;
	startFrame: number;
	durationFrames: number;
}
