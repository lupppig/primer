from app.simulation.models.base import ComponentActor
from app.simulation.schemas import NodeMetrics

class ComputeActor(ComponentActor):
    """
    Standard implementation for deterministic capacity processing and mathematical latency.
    Used generically for APIs, databases, caches, k8s deployments etc.
    """
    def process_tick(self) -> NodeMetrics:
        if self.cb_state == "OPEN":
            self.metrics.effective_rps = 0.0
            self.metrics.dropped_requests = int(self.metrics.incoming_rps)
            self.metrics.status = "tripped"
            self.metrics.latency = 9999.9 # Effectively high latency for a tripped circuit
            self.metrics.failure_reason = "Circuit Breaker Open"
            self._update_circuit_breaker(has_failures=True)
            return self.metrics

        total_capacity = self.node.capacity_rps * self.node.replicas
        
        # Calculate component utilization ratio
        self.metrics.utilization = (self.metrics.incoming_rps / total_capacity) if total_capacity > 0 else (1.0 if self.metrics.incoming_rps > 0 else 0.0)
        
        # Bound effective RPS by physical capacity
        self.metrics.effective_rps = min(self.metrics.incoming_rps, total_capacity)
        
        # Calculate dropped requests if incoming exceeds capacity
        if self.metrics.incoming_rps > total_capacity:
            self.metrics.dropped_requests = int(self.metrics.incoming_rps - total_capacity)

        # Apply strict rate limits if explicitly configured in node UI
        if self.node.rate_limit_rps is not None:
            if self.metrics.effective_rps > self.node.rate_limit_rps:
                self.metrics.dropped_requests += int(self.metrics.effective_rps - self.node.rate_limit_rps)
                self.metrics.effective_rps = self.node.rate_limit_rps

        # Mathematical latency curve
        if self.metrics.utilization <= 1.0:
            self.metrics.latency = self.node.base_latency_ms / max(1.0 - self.metrics.utilization, 0.001)
            self.metrics.bottleneck = False
            self.metrics.failure_reason = None
        else:
            self.metrics.latency = 9999.9
            self.metrics.bottleneck = True
            self.metrics.failure_reason = "Capacity Saturation"
            
        #  Update Circuit Breaker State for next tick
        # I consider it a "failure" if there are dropped requests
        self._update_circuit_breaker(has_failures=(self.metrics.dropped_requests > 0))
        
        #  Update Autoscaling Logic
        self._update_autoscaling()
        
        #  Update Costs
        self._update_costs()
        
        return self.metrics
