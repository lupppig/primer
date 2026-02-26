from app.simulation.models.base import ComponentActor
from app.simulation.schemas import NodeMetrics

class FirewallActor(ComponentActor):
    """
    Specialized actor for Firewalls/WAFs.
    - Rule-based filtering (drops traffic if protocol doesn't match rules).
    - Adds subtle processing latency (DPI overhead).
    """
    def process_tick(self) -> NodeMetrics:
        # Firewall has high base capacity but low efficiency if rules are complex
        total_capacity = self.node.capacity_rps * self.node.replicas
        
        # Determine effective throughput
        # The actual dropping happens in Simulator.process_tick via protocol_whitelist,
        # but the firewall actor itself handles the "service" latency.
        load_to_process = self.metrics.incoming_rps
        self.metrics.utilization = (load_to_process / total_capacity) if total_capacity > 0 else 0.0

        # Firewall is almost always transparent unless saturated
        self.metrics.effective_rps = min(self.metrics.incoming_rps, total_capacity)

        # Latency is base + utilization wait time
        # DPI adds a constant 0.5ms per request by default
        dpi_penalty = 0.5 
        self.metrics.latency = (self.node.base_latency_ms + dpi_penalty) / max(1.0 - self.metrics.utilization, 0.001)
        
        # Geodistribution
        if self.metrics.incoming_rps > 0:
            avg_net_latency = self.net_latency_accumulator / self.metrics.incoming_rps
            self.metrics.network_latency = avg_net_latency
            self.metrics.latency += avg_net_latency

        return self.metrics
