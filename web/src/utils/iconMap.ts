import {
	SiKubernetes, SiDocker, SiAmazonec2, SiGooglecloud, SiLinux,
	SiPostgresql, SiMysql, SiAmazonrds,
	SiMongodb, SiRedis, SiApachecassandra, SiAmazondynamodb, SiFirebase,
	SiApachekafka, SiRabbitmq, SiAmazonsqs,
	SiGraphql, SiNginx, SiEnvoyproxy, SiKong,
	SiAwselasticloadbalancing, SiCloudflare, SiIstio, SiTraefikproxy,
	SiTerraform, SiAnsible, SiPulumi,
	SiAmazonwebservices, SiDigitalocean, SiVercel,
	SiPrometheus, SiGrafana, SiDatadog, SiElasticstack, SiElasticsearch
} from 'react-icons/si';
import { VscAzure } from 'react-icons/vsc';
import { DiMsqlServer } from 'react-icons/di';
import {
	Database, ArrowRight, Minus, Activity, LayoutTemplate, Network,
	Shield, LayoutDashboard, Users, PlaySquare, MessageSquare, Bell, UserCheck, HardDrive, FileText, Webhook, Repeat, Cuboid,
	Laptop, Smartphone, Settings
} from 'lucide-react';

export const COMPONENT_CATEGORIES = [
	{
		name: 'External Clients & Load',
		items: [
			{ type: 'Workers', icon: Settings, color: '#A855F7' },
			{ type: 'Web Client', icon: Laptop, color: '#3caff6' },
			{ type: 'Mobile Client', icon: Smartphone, color: '#10B981' },
			{ type: 'Desktop Client', icon: Laptop, color: '#F59E0B' },
		]
	},
	{
		name: 'Compute',
		items: [
			{ type: 'Kubernetes', icon: SiKubernetes, color: '#326CE5' },
			{ type: 'Docker', icon: SiDocker, color: '#2496ED' },
			{ type: 'AWS EC2', icon: SiAmazonec2, color: '#FF9900' },
			{ type: 'GCP Compute Engine', icon: SiGooglecloud, color: '#4285F4' },
			{ type: 'Azure VM', icon: VscAzure, color: '#0089D6' },
			{ type: 'Linux Server', icon: SiLinux, color: '#FCC624' },
		]
	},
	{
		name: 'Databases (SQL)',
		items: [
			{ type: 'PostgreSQL', icon: SiPostgresql, color: '#4169E1' },
			{ type: 'MySQL', icon: SiMysql, color: '#4479A1' },
			{ type: 'MS SQL Server', icon: DiMsqlServer, color: '#CC292B' },
			{ type: 'Amazon RDS', icon: SiAmazonrds, color: '#527FFF' },
		]
	},
	{
		name: 'Databases (NoSQL)',
		items: [
			{ type: 'MongoDB', icon: SiMongodb, color: '#47A248' },
			{ type: 'Redis', icon: SiRedis, color: '#DC382D' },
			{ type: 'Cassandra', icon: SiApachecassandra, color: '#1287B1' },
			{ type: 'DynamoDB', icon: SiAmazondynamodb, color: '#4053D6' },
			{ type: 'Firebase', icon: SiFirebase, color: '#FFCA28' },
			{ type: 'Elasticsearch', icon: SiElasticsearch, color: '#005571' },
		]
	},
	{
		name: 'Caching & Messaging',
		items: [
			{ type: 'Apache Kafka', icon: SiApachekafka, color: '#E5E7EB' }, // Lighter color for dark bg
			{ type: 'RabbitMQ', icon: SiRabbitmq, color: '#FF6600' },
			{ type: 'Amazon SQS', icon: SiAmazonsqs, color: '#FF4F8B' },
		]
	},
	{
		name: 'API & Communication',
		items: [
			{ type: 'GraphQL', icon: SiGraphql, color: '#E10098' },
			{ type: 'REST API', icon: Activity, color: '#009688' },
			{ type: 'Nginx', icon: SiNginx, color: '#009639' },
			{ type: 'Envoy', icon: SiEnvoyproxy, color: '#F83EED' },
			{ type: 'Kong', icon: SiKong, color: '#003459' },
		]
	},
	{
		name: 'Load Balancing & Networking',
		items: [
			{ type: 'AWS ELB', icon: SiAwselasticloadbalancing, color: '#8C4FFF' },
			{ type: 'Cloudflare', icon: SiCloudflare, color: '#F38020' },
			{ type: 'Istio', icon: SiIstio, color: '#466BB0' },
			{ type: 'Traefik', icon: SiTraefikproxy, color: '#24A1C1' },
			{ type: 'HAProxy', icon: Network, color: '#1A1869' },
			{ type: 'Firewall', icon: Shield, color: '#ef4444' },
			{ type: 'API Gateway', icon: Webhook, color: '#ec4899' },
			{ type: 'CDN', icon: SiCloudflare, color: '#F38020' },
		]
	},
	{
		name: 'Infrastructure As Code',
		items: [
			{ type: 'Terraform', icon: SiTerraform, color: '#844FBA' },
			{ type: 'Ansible', icon: SiAnsible, color: '#EE0000' },
			{ type: 'Pulumi', icon: SiPulumi, color: '#F7BF2A' },
		]
	},
	{
		name: 'Cloud Providers',
		items: [
			{ type: 'AWS', icon: SiAmazonwebservices, color: '#FF9900' }, // Standard AWS Orange
			{ type: 'GCP', icon: SiGooglecloud, color: '#4285F4' },
			{ type: 'Azure', icon: VscAzure, color: '#0089D6' },
			{ type: 'DigitalOcean', icon: SiDigitalocean, color: '#0080FF' },
			{ type: 'Vercel', icon: SiVercel, color: '#FFFFFF' },
		]
	},
	{
		name: 'Internal Services',
		items: [
			{ type: 'Auth Service', icon: Shield, color: '#EAB308' },
			{ type: 'Diagram Service', icon: LayoutDashboard, color: '#3B82F6' },
			{ type: 'Collaboration Service', icon: Users, color: '#A855F7' },
			{ type: 'Simulation Service', icon: PlaySquare, color: '#10B981' },
			{ type: 'Comment Service', icon: MessageSquare, color: '#F43F5E' },
			{ type: 'Notification Service', icon: Bell, color: '#F97316' },
			{ type: 'Profile Service', icon: UserCheck, color: '#06B6D4' },
			{ type: 'File Storage Service', icon: HardDrive, color: '#64748B' },
			{ type: 'Audit Log Service', icon: FileText, color: '#78716C' },
		]
	},
	{
		name: 'Resilience & Deployment',
		items: [
			{ type: 'Dead Letter Queue', icon: Bell, color: '#ef4444' },
			{ type: 'Traffic Splitter', icon: Repeat, color: '#3b82f6' },
			{ type: 'Canary Gate', icon: UserCheck, color: '#10b981' },
		]
	},
	{
		name: 'Observability',
		items: [
			{ type: 'Prometheus', icon: SiPrometheus, color: '#E6522C' },
			{ type: 'Grafana', icon: SiGrafana, color: '#F46800' },
			{ type: 'Datadog', icon: SiDatadog, color: '#632CA6' },
			{ type: 'Elastic Stack', icon: SiElasticstack, color: '#005571' },
		]
	},
	{
		name: 'Generic Infrastructure',
		items: [
			{ type: 'Generic Service', icon: Cuboid, color: '#6366f1' },
			{ type: 'Custom Cache', icon: Database, color: '#f43f5e' },
			{ type: 'Web Server', icon: LayoutTemplate, color: '#0ea5e9' },
			{ type: 'Database Proxy', icon: Database, color: '#3b82f6' },
			{ type: 'App Server', icon: Network, color: '#8b5cf6' },
			{ type: 'Event Bus', icon: MessageSquare, color: '#f97316' },
			{ type: 'Internal Messaging', icon: Repeat, color: '#10b981' },
			{ type: 'Storage', icon: HardDrive, color: '#64748B' },
		]
	},
	{
		name: 'Generic Shapes',
		items: [
			{ type: 'Text Note', icon: FileText, color: '#9ca3af' },
			{ type: 'Custom Group', icon: Cuboid, color: '#9ca3af' },
			{ type: 'Rectangle', icon: LayoutTemplate, color: '#9ca3af' },
			{ type: 'Cylinder', icon: Database, color: '#9ca3af' },
			{ type: 'Straight Line', icon: Minus, color: '#9ca3af' },
			{ type: 'Arrow', icon: ArrowRight, color: '#9ca3af' },
		]
	}
];

// Helper to flat map for TechNode
export const TECH_COMPONENTS = COMPONENT_CATEGORIES.flatMap(cat => cat.items);
