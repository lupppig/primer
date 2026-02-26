from app.simulation.models.queue import QueueActor

class DeadLetterQueueActor(QueueActor):
    """
    A specialized Queue designed to catch overflows and failed requests from other nodes.
    By default, it has a very large capacity but high storage latency.
    """
    def __init__(self, node):
        super().__init__(node)
        # DLQs usually have high durability / storage overhead
        if self.node.base_latency_ms == 50.0: # Default value
             self.node.base_latency_ms = 150.0 
