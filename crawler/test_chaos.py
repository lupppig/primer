from app.simulation.schemas import SimGraph, SimNode, SimEdge
from app.simulation.engine import Simulator

def test_chaos_zero_capacity():
    nodes = {
        "user": SimNode(id="user", type="api", capacity_rps=1000, base_latency_ms=10, replicas=1),
        "queue": SimNode(id="queue", type="queue", queue_size=50, capacity_rps=0, base_latency_ms=10, replicas=0) # CHAOS FAIL
    }
    edges = [SimEdge(id="e1", source="user", target="queue")]
    
    graph = SimGraph(nodes=nodes, edges=edges)
    sim = Simulator("test-session")
    
    # Tick 1: 100 RPS fills 50 depth, drops 50
    metrics = sim.process_tick(graph, incoming_rps=100)
    print("Tick 1 Queue Effective RPS:", metrics.nodes["queue"].effective_rps)
    print("Tick 1 Queue Dropped:", metrics.nodes["queue"].dropped_requests)
    
    # Tick 2: 100 RPS fills 0 depth (queue full), drops 100
    metrics = sim.process_tick(graph, incoming_rps=100)
    print("Tick 2 Queue Effective RPS:", metrics.nodes["queue"].effective_rps)
    print("Tick 2 Queue Dropped:", metrics.nodes["queue"].dropped_requests)

if __name__ == "__main__":
    test_chaos_zero_capacity()
