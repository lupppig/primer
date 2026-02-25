from app.simulation.schemas import SimulationInput, SimGraph, SimNode, SimEdge
from app.simulation.engine import SimulationEngine

payload = {
    "incoming_rps": 1500,
    "graph": {
        "nodes": {
            "node_1": {"id": "node_1", "type": "api", "capacity_rps": 1000, "base_latency_ms": 10, "replicas": 1, "queue_size": 1000},
            "node_2": {"id": "node_2", "type": "api", "capacity_rps": 1000, "base_latency_ms": 10, "replicas": 1, "queue_size": 1000}
        },
        "edges": [
            {"id": "e1", "source": "node_1", "target": "node_2", "traffic_percent": 1.0}
        ]
    }
}

try:
    sim_input = SimulationInput(**payload)
    result = SimulationEngine.compute_tick(sim_input.graph, sim_input.incoming_rps)
    print("Success:", result)
except Exception as e:
    import traceback
    traceback.print_exc()
