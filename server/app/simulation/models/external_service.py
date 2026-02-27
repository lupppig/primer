from app.simulation.models.base import ComponentActor
from app.simulation.schemas import NodeMetrics
import random
import math

class ExternalServiceActor(ComponentActor):
    """
    Models third-party API dependencies (Stripe, Auth0, etc.)
    Simulates SLA-based availability, latency profiles, and non-deterministic failure patterns.
    """
    def __init__(self, node):
        super().__init__(node)
        self.outage_ticks_remaining = 0

    def process_tick(self) -> NodeMetrics:
        config = self.node.external_config
        if not config:
            # Fallback to compute logic if no external config
            self.metrics.effective_rps = self.metrics.incoming_rps
            self.metrics.status = "healthy"
            return self.metrics

        # Failure Pattern Simulation
        is_up = True
        
        # Simple non-deterministic SLA check per tick
        # Note: SLA 99.9% means 0.1% chance of failure per "unit of time"
        # In a 1-second tick, we simulate this as a random roll.
        if config.failure_pattern == "random":
            if random.random() * 100 > config.availability_sla:
                is_up = False
        
        elif config.failure_pattern == "spiky":
            # Models infrequent but multi-tick outages
            if self.outage_ticks_remaining > 0:
                is_up = False
                self.outage_ticks_remaining -= 1
            else:
                # 0.5% chance to trigger a spiky outage of 5-15 ticks
                if random.random() < 0.005:
                    is_up = False
                    self.outage_ticks_remaining = random.randint(5, 15)

        # Results application
        if not is_up:
            self.metrics.effective_rps = 0.0
            self.metrics.dropped_requests = int(self.metrics.incoming_rps)
            self.metrics.status = "tripped"
            self.metrics.latency = 9999.9
            self.metrics.failure_reason = f"External Provider Outage ({config.provider})"
        else:
            # Healthy-ish state
            # Still apply random error rate (e.g. 0.1% transient errors)
            error_count = 0
            if config.error_rate_pct > 0:
                error_count = int(self.metrics.incoming_rps * (config.error_rate_pct / 100.0))
            
            self.metrics.dropped_requests = error_count
            self.metrics.effective_rps = max(0.0, self.metrics.incoming_rps - error_count)
            
            # Latency with slight jitter
            jitter = random.uniform(0.9, 1.1)
            self.metrics.latency = config.avg_latency_ms * jitter
            self.metrics.status = "healthy" if error_count == 0 else "degraded"
            self.metrics.utilization = 0.0 # External services have "infinite" capacity for our simulation
            self.metrics.failure_reason = None

        # Standard shared logic
        self._update_costs()
        self._update_mesh_logic()
        
        # Geodistribution
        if self.metrics.incoming_rps > 0:
            avg_net_latency = self.net_latency_accumulator / self.metrics.incoming_rps
            self.metrics.network_latency = avg_net_latency
            if self.metrics.latency != 9999.9:
                self.metrics.latency += avg_net_latency

        return self.metrics
