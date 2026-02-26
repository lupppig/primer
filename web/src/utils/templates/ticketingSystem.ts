import type { Node, Edge } from 'reactflow';

export const TICKETING_SYSTEM_TEMPLATE = {
	name: "Professional High-Scale Ticketing (CQRS)",
	description: "Production-grade ticketing system with 50k RPS capacity, CQRS split, and high resilience.",
	nodes: [
		{
			id: 'cdn',
			type: 'techNode',
			position: { x: 400, y: 0 },
			data: { label: 'Global Edge CDN', type: 'cdn', capacity_rps: 100000, base_latency_ms: 5, region: 'global' }
		},
		{
			id: 'waf',
			type: 'techNode',
			position: { x: 400, y: 100 },
			data: { label: 'Security Firewall', type: 'firewall', capacity_rps: 80000, base_latency_ms: 2, protocol_whitelist: ['HTTP', 'gRPC'] }
		},
		{
			id: 'lb',
			type: 'techNode',
			position: { x: 400, y: 200 },
			data: { label: 'L7 Load Balancer', type: 'lb', capacity_rps: 60000, base_latency_ms: 3 }
		},
		// Command Side
		{
			id: 'order-api',
			type: 'techNode',
			position: { x: 200, y: 350 },
			data: {
				label: 'Order Command Service',
				type: 'api',
				capacity_rps: 30000,
				replicas: 10,
				resilience_config: {
					retry_count: 3,
					retry_budget: 0.2,
					timeout_ms: 500,
					circuit_breaker: { enabled: true, failure_threshold: 5, recovery_timeout_ms: 5000 }
				}
			}
		},
		{
			id: 'order-queue',
			type: 'techNode',
			position: { x: 200, y: 500 },
			data: { label: 'Order Processing Queue', type: 'queue', capacity_rps: 50000, queue_size: 100000 }
		},
		{
			id: 'order-worker',
			type: 'techNode',
			position: { x: 200, y: 650 },
			data: { label: 'Order Execution Worker', type: 'api', capacity_rps: 20000, replicas: 15 }
		},
		{
			id: 'stripe',
			type: 'techNode',
			position: { x: 0, y: 650 },
			data: {
				label: 'Stripe API',
				type: 'external',
				external_config: { provider: 'Stripe', availability_sla: 99.9, avg_latency_ms: 150, failure_pattern: 'random' }
			}
		},
		{
			id: 'dlq',
			type: 'techNode',
			position: { x: 0, y: 500 },
			data: { label: 'Failed Orders DLQ', type: 'queue', capacity_rps: 10000, queue_size: 5000 }
		},
		// Query Side
		{
			id: 'search-api',
			type: 'techNode',
			position: { x: 600, y: 350 },
			data: { label: 'Event Search Service', type: 'api', capacity_rps: 40000, replicas: 8 }
		},
		{
			id: 'cache',
			type: 'techNode',
			position: { x: 800, y: 350 },
			data: { label: 'Redis Event Cache', type: 'api', capacity_rps: 100000, base_latency_ms: 1 }
		},
		{
			id: 'db',
			type: 'techNode',
			position: { x: 400, y: 800 },
			data: { label: 'Primary PostgreSQL', type: 'api', capacity_rps: 10000, replicas: 1, base_latency_ms: 20 }
		}
	] as Node[],
	edges: [
		{ id: 'e-cdn-waf', source: 'cdn', target: 'waf' },
		{ id: 'e-waf-lb', source: 'waf', target: 'lb' },
		{ id: 'e-lb-order', source: 'lb', target: 'order-api', data: { traffic_percent: 0.3 } },
		{ id: 'e-lb-search', source: 'lb', target: 'search-api', data: { traffic_percent: 0.7 } },
		// Command Flow
		{ id: 'e-order-queue', source: 'order-api', target: 'order-queue' },
		{ id: 'e-queue-worker', source: 'order-queue', target: 'order-worker' },
		{ id: 'e-worker-stripe', source: 'order-worker', target: 'stripe' },
		{ id: 'e-worker-db', source: 'order-worker', target: 'db' },
		{ id: 'e-worker-dlq', source: 'order-worker', target: 'dlq' },
		// Query Flow
		{ id: 'e-search-cache', source: 'search-api', target: 'cache' },
		{ id: 'e-search-db', source: 'search-api', target: 'db' }
	] as Edge[],
	settings: {
		loadProfile: { type: 'step', baseRps: 10000, peakRps: 50000, durationSeconds: 60 }
	}
};
