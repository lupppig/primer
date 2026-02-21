from typing import List, Dict, Tuple, Optional
from pydantic import BaseModel, Field

class SimNode(BaseModel):
    id: str
    type: str # "api", "db", "cache", "queue", "k8s", etc.
    capacity_rps: float = Field(default=1000.0, ge=0)
    base_latency_ms: float = Field(default=50.0, ge=0)
    replicas: int = Field(default=1, ge=1)
    queue_size: int = Field(default=0, ge=0)
    resources: dict = Field(default_factory=dict)

class SimEdge(BaseModel):
    id: str
    source: str  # maps to from_node
    target: str  # maps to to_node
    traffic_percent: float = Field(default=1.0, ge=0.0, le=1.0)

class SimGraph(BaseModel):
    nodes: Dict[str, SimNode]
    edges: List[SimEdge]

class SimulationInput(BaseModel):
    graph: SimGraph
    incoming_rps: float = Field(default=100.0, ge=0)
    traffic_pattern: Optional[List[Tuple[int, float]]] = None
    duration_ms: int = Field(default=0, ge=0)
    fail_nodes: Optional[List[str]] = None

class NodeMetrics(BaseModel):
    incoming_rps: float = 0.0
    effective_rps: float = 0.0
    utilization: float = 0.0
    latency: float = 0.0
    bottleneck: bool = False
    queue_depth: int = 0
    dropped_requests: int = 0

class GraphMetrics(BaseModel):
    total_throughput: float = 0.0
    max_latency: float = 0.0
    bottleneck_nodes: List[str] = []

class SimulationTickResult(BaseModel):
    time: int = 0
    nodes: Dict[str, NodeMetrics] = {}
    graph_metrics: GraphMetrics
