import pytest
from app.simulation.engine import Simulator, LATENCY_MATRIX
from app.simulation.schemas import SimGraph, SimNode, SimEdge, Region

def test_cross_region_latency():
    # Setup two nodes in different regions
    # Node A: US-East
    # Node B: EU-Central
    node_a = SimNode(id="node-a", type="api", region=Region.US_EAST, base_latency_ms=10.0)
    node_b = SimNode(id="node-b", type="api", region=Region.EU_CENTRAL, base_latency_ms=10.0)
    
    edge = SimEdge(id="edge-1", source="node-a", target="node-b")
    
    graph = SimGraph(
        nodes={"node-a": node_a, "node-b": node_b},
        edges=[edge]
    )
    
    sim = Simulator("test-session")
    
    # Process 100 RPS
    result = sim.process_tick(graph, incoming_rps=100.0)
    
    # Node A should have base latency + utilization overhead
    # 10ms / (1 - 0.1) = 11.11ms
    assert result.nodes["node-a"].latency == pytest.approx(11.11, rel=1e-2)
    
    # Node B should have (base + util overhead) + 90ms network latency
    expected_net_latency = 90.0
    assert result.nodes["node-b"].network_latency == expected_net_latency
    assert result.nodes["node-b"].latency == pytest.approx(11.11 + expected_net_latency, rel=1e-2)

def test_intra_region_latency():
    # Setup nodes in same region
    node_a = SimNode(id="node-a", type="api", region=Region.US_WEST, base_latency_ms=10.0)
    node_b = SimNode(id="node-b", type="api", region=Region.US_WEST, base_latency_ms=10.0)
    
    edge = SimEdge(id="edge-1", source="node-a", target="node-b")
    
    graph = SimGraph(
        nodes={"node-a": node_a, "node-b": node_b},
        edges=[edge]
    )
    
    sim = Simulator("test-session")
    result = sim.process_tick(graph, incoming_rps=100.0)
    
    # Same region -> 0.0 network latency
    assert result.nodes["node-b"].network_latency == 0.0
    assert result.nodes["node-b"].latency == pytest.approx(11.11, rel=1e-2)
