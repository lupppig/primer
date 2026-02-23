import asyncio
from app.simulation.schemas import SimGraph, SimNode, SimEdge, SimulationInput
from app.simulation.engine import Simulator

def test_engine():
    print("Building Test Graph...")
    # 100 incoming -> API (Capacity 100) -> Queue (Capacity 10, Size 200)
    node1 = SimNode(id="n1", type="api", capacity_rps=100)
    node2 = SimNode(id="n2", type="queue", capacity_rps=10, queue_size=200)
    edge1 = SimEdge(id="e1", source="n1", target="n2", traffic_percent=1.0)

    graph = SimGraph(nodes={"n1": node1, "n2": node2}, edges=[edge1])
    sim = Simulator(session_id="test")

    print("\n--- TICK 1 ---")
    r1 = sim.process_tick(graph, incoming_rps=100)
    print(f"Queue Depth: {r1.nodes['n2'].queue_depth}")
    print(f"Dropped: {r1.nodes['n2'].dropped_requests}")
    
    print("\n--- TICK 2 ---")
    r2 = sim.process_tick(graph, incoming_rps=100)
    print(f"Queue Depth: {r2.nodes['n2'].queue_depth}")
    print(f"Dropped: {r2.nodes['n2'].dropped_requests}")
    
    print("\n--- TICK 3 ---")
    r3 = sim.process_tick(graph, incoming_rps=100)
    print(f"Queue Depth: {r3.nodes['n2'].queue_depth}")
    print(f"Dropped: {r3.nodes['n2'].dropped_requests}")

if __name__ == "__main__":
    test_engine()
