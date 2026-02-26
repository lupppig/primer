from app.simulation.models.base import ComponentActor
from app.simulation.schemas import NodeMetrics

class TrafficSplitterActor(ComponentActor):
    """
    Specialized actor for traffic shifting and load balancing.
    Unlike standard compute nodes, it doesn't process capacity but redistributes RPS.
    """
    def process_tick(self) -> NodeMetrics:
        # Splitters are usually high-throughput and passive
        # We model them as having near-infinite capacity for now
        self.metrics.effective_rps = self.metrics.incoming_rps
        self.metrics.utilization = 0.0
        self.metrics.latency = 1.0 # Minimal routing overhead
        self.metrics.bottleneck = False
        
        # Costs and health
        self._update_costs()
        self.metrics.status = "healthy"
        
        # Geodistribution
        if self.metrics.incoming_rps > 0:
            avg_net_latency = self.net_latency_accumulator / self.metrics.incoming_rps
            self.metrics.network_latency = avg_net_latency
            self.metrics.latency += avg_net_latency
            
        return self.metrics
