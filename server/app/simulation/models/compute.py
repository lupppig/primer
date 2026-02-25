from app.simulation.models.base import ComponentActor
from app.simulation.schemas import NodeMetrics

class ComputeActor(ComponentActor):
    """
    Standard implementation for deterministic capacity processing and mathematical latency.
    Used generically for APIs, databases, caches, k8s deployments etc.
    """
    def process_tick(self) -> NodeMetrics:
        total_capacity = self.node.capacity_rps * self.node.replicas
        
        # Calculate component utilization ratio (if dead with load, it's 100% maxed instantly)
        self.metrics.utilization = (self.metrics.incoming_rps / total_capacity) if total_capacity > 0 else (1.0 if self.metrics.incoming_rps > 0 else 0.0)
        
        # Bound effective RPS by physical capacity
        self.metrics.effective_rps = min(self.metrics.incoming_rps, total_capacity)
        
        # Apply strict rate limits if explicitly configured in node UI
        if self.node.rate_limit_rps is not None:
            self.metrics.effective_rps = min(self.metrics.effective_rps, self.node.rate_limit_rps)

        # Mathematical latency curve scaling exponentially to infinity as utilization nears 1.0 (100%)
        if self.metrics.utilization <= 1.0:
            self.metrics.latency = self.node.base_latency_ms / max(1.0 - self.metrics.utilization, 0.001)
            self.metrics.bottleneck = False
            self.metrics.failure_reason = None
        else:
            self.metrics.latency = float('inf')
            self.metrics.bottleneck = True
            self.metrics.failure_reason = "Capacity Saturation"
            
        self.metrics.replica_count = self.node.replicas
        return self.metrics
