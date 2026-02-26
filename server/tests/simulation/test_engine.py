import pytest
from app.simulation.schemas import SimGraph, SimNode, SimEdge
from app.simulation.engine import Simulator

def test_topological_sort_valid():
    graph = SimGraph(
        nodes={
            "A": SimNode(id="A", type="api"),
            "B": SimNode(id="B", type="service"),
            "C": SimNode(id="C", type="db")
        },
        edges=[
            SimEdge(id="e1", source="A", target="B"),
            SimEdge(id="e2", source="B", target="C"),
        ]
    )
    
    sorted_nodes = Simulator.topological_sort(graph)
    assert sorted_nodes == ["A", "B", "C"]

def test_topological_sort_cycle():
    graph = SimGraph(
        nodes={
            "A": SimNode(id="A", type="api"),
            "B": SimNode(id="B", type="service"),
        },
        edges=[
            SimEdge(id="e1", source="A", target="B"),
            SimEdge(id="e2", source="B", target="A"), # Cycle
        ]
    )
    
    with pytest.raises(ValueError, match="Cycle detected"):
        Simulator.topological_sort(graph)

def test_compute_tick_basic_flow():
    sim = Simulator("test")
    graph = SimGraph(
        nodes={
            "API": SimNode(id="API", type="api", capacity_rps=1000, base_latency_ms=20),
            "DB": SimNode(id="DB", type="db", capacity_rps=500, base_latency_ms=10)
        },
        edges=[
            SimEdge(id="e1", source="API", target="DB", traffic_percent=1.0),
        ]
    )
    
    # Send 100 RPS into the system
    result = sim.process_tick(graph, incoming_rps=100.0)
    
    assert result.nodes["API"].incoming_rps == 100.0
    assert result.nodes["API"].effective_rps == 100.0
    assert result.nodes["API"].utilization == 0.1 # 100 / 1000
    assert result.nodes["API"].bottleneck is False
    
    assert result.nodes["DB"].incoming_rps == 100.0
    assert result.nodes["DB"].effective_rps == 100.0
    assert result.nodes["DB"].utilization == 0.2 # 100 / 500
    
    assert result.graph_metrics.total_throughput == 100.0

def test_compute_tick_bottleneck_and_fanout():
    sim = Simulator("test")
    graph = SimGraph(
        nodes={
            "API": SimNode(id="API", type="api", capacity_rps=1000, replicas=2), # 2000 total
            "SVC_A": SimNode(id="SVC_A", type="service", capacity_rps=500), # Bottleneck
            "SVC_B": SimNode(id="SVC_B", type="service", capacity_rps=1000)
        },
        edges=[
            SimEdge(id="e1", source="API", target="SVC_A", traffic_percent=0.5),
            SimEdge(id="e2", source="API", target="SVC_B", traffic_percent=0.5),
        ]
    )
    
    # Send 1500 RPS
    result = sim.process_tick(graph, incoming_rps=1500.0)
    
    # API handles it all (1500 < 2000)
    assert result.nodes["API"].effective_rps == 1500.0
    
    # Fanout 50/50 -> 750 RPS each
    assert result.nodes["SVC_A"].incoming_rps == 750.0
    assert result.nodes["SVC_B"].incoming_rps == 750.0
    
    # SVC_A caps at 500 RPS
    assert result.nodes["SVC_A"].effective_rps == 500.0
    assert result.nodes["SVC_A"].utilization > 1.0
    assert result.nodes["SVC_A"].bottleneck is True
    
    # SVC_B handles all 750
    assert result.nodes["SVC_B"].effective_rps == 750.0
    assert result.nodes["SVC_B"].utilization == 0.75
    assert result.nodes["SVC_B"].bottleneck is False
    
    # Total throughput is what escapes the end nodes: 500 + 750 = 1250
    assert result.graph_metrics.total_throughput == 1250.0
    assert "SVC_A" in result.graph_metrics.bottleneck_nodes
