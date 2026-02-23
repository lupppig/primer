from abc import ABC, abstractmethod
from app.simulation.schemas import SimNode, NodeMetrics

class ComponentActor(ABC):
    def __init__(self, node: SimNode):
        self.node = node
        # State tracking persists across simulator ticks (vital for queue depths)
        self.metrics = NodeMetrics()
        
    def reset_tick_metrics(self):
        """
        Resets transient metrics for the next timeframe calculation, 
        but fundamentally preserves internal state like queue depths.
        """
        self.metrics.incoming_rps = 0.0
        self.metrics.effective_rps = 0.0
        self.metrics.utilization = 0.0
        self.metrics.latency = 0.0
        self.metrics.bottleneck = False
        self.metrics.dropped_requests = 0
        
    @abstractmethod
    def process_tick(self) -> NodeMetrics:
        """
        Calculates utilization, effective flow, and latency 
        based on the accumulated `incoming_rps` for the current tick.
        """
        pass
