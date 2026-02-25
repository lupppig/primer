from typing import List, Dict, Tuple, Optional
from pydantic import BaseModel, Field

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

class SimNode(BaseModel):
    id: str
    type: str # "api", "db", "cache", "queue", "k8s", etc.
    capacity_rps: float = Field(default=1000.0, ge=0)
    base_latency_ms: float = Field(default=50.0, ge=0)
    rate_limit_rps: Optional[float] = None
    replicas: int = Field(default=1, ge=0)
    queue_size: int = Field(default=0, ge=0)
    load_balancing_strategy: str = "round_robin" # "round_robin" or "least_latency"
    resources: dict = Field(default_factory=dict)
    resilience_config: Optional[ResilienceConfig] = None
    scaling_config: Optional[ScalingConfig] = None

class SimEdge(BaseModel):
    id: str
    source: str  # maps to from_node
    target: str  # maps to to_node
    traffic_percent: float = Field(default=1.0, ge=0.0, le=1.0)

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

class GraphMetrics(BaseModel):
    total_throughput: float = 0.0
    max_latency: float = 0.0
    bottleneck_nodes: List[str] = []

class SimulationTickResult(BaseModel):
    time: int = 0
    nodes: Dict[str, NodeMetrics] = {}
    graph_metrics: GraphMetrics
