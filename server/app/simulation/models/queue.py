from app.simulation.models.base import ComponentActor
from app.simulation.schemas import NodeMetrics

class QueueActor(ComponentActor):
    """
    Specialized actor that breaks the "stateless" assumption by keeping queue buffer states
    across discrete simulation ticks. Useful for event queues, Kafka, SQS, etc.
    """
    def process_tick(self) -> NodeMetrics:
        total_capacity = self.node.capacity_rps * self.node.replicas
        
        # Buffer newly received events
        self.metrics.queue_depth += int(self.metrics.incoming_rps)
        
        # Hard limits & packet drops
        if self.node.queue_size > 0 and self.metrics.queue_depth > self.node.queue_size:
            self.metrics.dropped_requests = self.metrics.queue_depth - self.node.queue_size
            self.metrics.queue_depth = self.node.queue_size
            
        # Our effective throughput for this tick is the amount we can process from the buffer
        processed_this_tick = min(float(self.metrics.queue_depth), total_capacity)
        
        # Flush the buffer for the items we successfully pushed down the network
        self.metrics.queue_depth -= int(processed_this_tick)
        self.metrics.effective_rps = processed_this_tick
        
        # Calculate localized utilization (drain speed vs ingest)
        self.metrics.utilization = (self.metrics.incoming_rps / total_capacity) if total_capacity > 0 else float('inf')
        
        # Latency factoring in wait time in the buffer
        if self.metrics.utilization <= 1.0 and total_capacity > 0:
            base_latency = self.node.base_latency_ms / max(1.0 - self.metrics.utilization, 0.001)
            queue_wait_penalty = (self.metrics.queue_depth / total_capacity) * 1000 # wait time in ms
            self.metrics.latency = base_latency + queue_wait_penalty
            self.metrics.bottleneck = False
        else:
            self.metrics.latency = float('inf')
            self.metrics.bottleneck = True
            
        return self.metrics
