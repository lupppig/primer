from enum import Enum
from typing import List, Dict, Tuple, Optional
from pydantic import BaseModel, Field

class Region(str, Enum):
    US_EAST = "us-east-1"
    US_WEST = "us-west-2"
    EU_CENTRAL = "eu-central-1"
    AP_SOUTHEAST = "ap-southeast-1"

class NodeType(str, Enum):
    API = "api"
    DATABASE = "db"
    CACHE = "cache"
    QUEUE = "queue"
    CDN = "cdn"
    FIREWALL = "firewall"
    DOCKER = "docker"
    K8S = "k8s"
    LOAD_BALANCER = "lb"
    API_GATEWAY = "gateway"
    STORAGE = "storage" # Object storage, S3 etc
    DLQ = "dlq" # Dead Letter Queue
    SPLITTER = "splitter" # Traffic Splitter / Canary
    EXTERNAL = "external" # Third-party API (Stripe, Auth0, etc)

class ResilienceConfig(BaseModel):
    circuit_breaker_enabled: bool = False
    failure_threshold_pct: float = Field(default=50.0, ge=0.0, le=100.0)
    recovery_timeout_ticks: int = Field(default=10, ge=1)
    min_request_threshold: int = Field(default=10, ge=1)

class ScalingConfig(BaseModel):
    enabled: bool = False
    min_replicas: int = Field(default=1, ge=1)
    max_replicas: int = Field(default=10, ge=1)
    target_utilization: float = Field(default=0.7, ge=0.1, le=1.0)
    scale_up_cooldown_ticks: int = Field(default=5, ge=0)
    scale_down_cooldown_ticks: int = Field(default=10, ge=0)

class CostConfig(BaseModel):
    monthly_base_cost_per_replica: float = Field(default=0.0, ge=0)
    cost_per_million_requests: float = Field(default=0.0, ge=0)

class MeshConfig(BaseModel):
    retries: int = Field(default=0, ge=0, le=10)
    timeout_ms: float = Field(default=0.0, ge=0.0) # 0 means disabled
    retry_backoff_ms: float = Field(default=10.0, ge=0)
    retry_budget_pct: float = Field(default=20.0, ge=0.0, le=100.0)

class CacheConfig(BaseModel):
    hit_rate: float = Field(default=0.8, ge=0.0, le=1.0)
    hit_latency_ms: float = Field(default=2.0, ge=0.0)

class DatabaseConfig(BaseModel):
    read_replicas: int = Field(default=0, ge=0)
    write_capacity_rps: float = Field(default=500.0, ge=0)
    replication_lag_ms: float = Field(default=100.0, ge=0)

class StorageConfig(BaseModel):
    iops_limit: float = Field(default=1000.0, ge=0)
    bandwidth_mbps: float = Field(default=100.0, ge=0)

class SplitterConfig(BaseModel):
    # Weights for outgoing regions/targets. 
    # Usually we rely on SimEdge.traffic_percent, but splitter can override or validate.
    enabled: bool = True
    adaptive_routing: bool = False # If true, shifts traffic away from unhealthy targets
    weights: Dict[str, float] = Field(default_factory=dict) # target_id -> weight

class ExternalServiceConfig(BaseModel):
    provider: str = "Stripe" # Stripe, AWS S3, Auth0, etc
    availability_sla: float = Field(default=99.9, ge=0.0, le=100.0)
    avg_latency_ms: float = Field(default=100.0, ge=0.0)
    failure_pattern: str = "random" # "random", "spiky", "maintenance"
    error_rate_pct: float = Field(default=0.1, ge=0.0, le=100.0)

class SimNode(BaseModel):
    id: str
    type: str # "api", "db", "cache", "queue", "k8s", etc.
    region: Region = Region.US_EAST # Physical location
    capacity_rps: float = Field(default=1000.0, ge=0)
    base_latency_ms: float = Field(default=50.0, ge=0)
    rate_limit_rps: Optional[float] = None
    replicas: int = Field(default=1, ge=0)
    queue_size: int = Field(default=0, ge=0)
    load_balancing_strategy: str = "round_robin" # "round_robin" or "least_latency"
    resources: dict = Field(default_factory=dict)
    resilience_config: Optional[ResilienceConfig] = None
    scaling_config: Optional[ScalingConfig] = None
    cost_config: Optional[CostConfig] = None
    mesh_config: Optional[MeshConfig] = None
    cache_config: Optional[CacheConfig] = None
    database_config: Optional[DatabaseConfig] = None
    storage_config: Optional[StorageConfig] = None
    splitter_config: Optional[SplitterConfig] = None
    external_config: Optional[ExternalServiceConfig] = None
    protocol_whitelist: Optional[List[str]] = None

class SimEdge(BaseModel):
    id: str
    source: str  # maps to from_node
    target: str  # maps to to_node
    traffic_percent: float = Field(default=1.0, ge=0.0, le=1.0)
    packet_loss_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    jitter_ms: float = Field(default=0.0, ge=0.0)
    protocol: str = "HTTP" # Used for validation against whitelist

class SimGraph(BaseModel):
    nodes: Dict[str, SimNode]
    edges: List[SimEdge]

class LoadProfile(BaseModel):
    type: str # "flat", "spike", "step"
    baseRps: float = Field(default=100.0, ge=0)
    peakRps: float = Field(default=1000.0, ge=0)
    durationSeconds: int = Field(default=30, ge=1)

class SimulationInput(BaseModel):
    design_id: Optional[str] = None
    graph: SimGraph
    incoming_rps: float = Field(default=100.0, ge=0)
    load_profile: Optional[LoadProfile] = None
    sim_speed: float = Field(default=1.0, ge=0.1, le=10.0)
    traffic_pattern: Optional[List[Tuple[int, float]]] = None
    duration_ms: int = Field(default=0, ge=0)
    fail_nodes: Optional[List[str]] = None

class NodeMetrics(BaseModel):
    incoming_rps: float = 0.0
    effective_rps: float = 0.0
    utilization: float = 0.0
    latency: float = 0.0
    bottleneck: bool = False
    failure_reason: Optional[str] = None
    replica_count: int = 1
    queue_depth: int = 0
    dropped_requests: int = 0
    status: str = "healthy" # "healthy", "degraded", "tripped"
    scaling_status: str = "idle" # "idle", "scaling_up", "scaling_down"
    tick_cost: float = 0.0
    retry_rps: float = 0.0
    budget_exhausted: bool = False
    cache_hit_rate: float = 0.0
    read_latency: float = 0.0
    network_latency: float = 0.0
    storage_utilization: float = 0.0 # IOPS/Bandwidth saturation
    storage_latency: float = 0.0

class GraphMetrics(BaseModel):
    total_throughput: float = 0.0
    max_latency: float = 0.0
    bottleneck_nodes: List[str] = []

class SimulationTickResult(BaseModel):
    time: int = 0
    nodes: Dict[str, NodeMetrics] = {}
    graph_metrics: GraphMetrics
