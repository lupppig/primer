from app.simulation.models.base import ComponentActor
from app.simulation.schemas import NodeMetrics

class CDNActor(ComponentActor):
    """
    Specialized actor for Content Delivery Networks.
    - High throughput capacity.
    - Edge caching logic (weighted latency).
    - Protocol enforcement (drops non-HTTP/HTTPS traffic).
    """
    def process_tick(self) -> NodeMetrics:
        # CDN typically enforces HTTP/HTTPS. 
        # In this engine, we'll check the whitelist in the Simulator, 
        # but the actor itself should also handle "internal" logic.
        
        load_to_process = self.metrics.incoming_rps
        # CDNs have massive capacity compared to origin servers
        total_capacity = self.node.capacity_rps * self.node.replicas * 10 
        
        # Use Cache logic if provided, otherwise default to high hit rate
        hit_rate = 0.95
        hit_latency = 5.0
        if self.node.cache_config:
            hit_rate = self.node.cache_config.hit_rate
            hit_latency = self.node.cache_config.hit_latency_ms
            
        load_to_process = self.metrics.incoming_rps * (1.0 - hit_rate)
        self.metrics.cache_hit_rate = hit_rate
        
        self.metrics.utilization = (load_to_process / total_capacity) if total_capacity > 0 else 0.0
        self.metrics.effective_rps = self.metrics.incoming_rps # Edge usually absorbs everything
        
        # Latency is weighted average of hit (5ms) and miss (origin base_latency)
        # origin base_latency is usually high across the internet
        miss_latency = self.node.base_latency_ms / max(1.0 - self.metrics.utilization, 0.001)
        self.metrics.latency = (hit_rate * hit_latency) + ((1.0 - hit_rate) * miss_latency)
        
        # Geodistribution
        if self.metrics.incoming_rps > 0:
            avg_net_latency = self.net_latency_accumulator / self.metrics.incoming_rps
            self.metrics.network_latency = avg_net_latency
            self.metrics.latency += avg_net_latency

        return self.metrics
