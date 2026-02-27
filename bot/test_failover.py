import pytest
from app.simulation.engine import Simulator
from app.simulation.schemas import SimGraph, SimNode, SimEdge, NodeType, SplitterConfig, ResilienceConfig

def test_adaptive_routing_failover():
    # Setup: Splitter -> [Service A (50%), Service B (50%)]
    # Service A will be unhealthy
    nodes = {
        "splitter": SimNode(
            id="splitter", 
            type="splitter", 
            splitter_config=SplitterConfig(adaptive_routing=True)
        ),
        "service_a": SimNode(
            id="service_a", 
            type="api", 
            capacity_rps=100,
            resilience_config=ResilienceConfig(circuit_breaker_enabled=True)
        ),
        "service_b": SimNode(
            id="service_b", 
            type="api", 
            capacity_rps=100
        )
    }
    edges = [
        SimEdge(id="e1", source="splitter", target="service_a", traffic_percent=0.5),
        SimEdge(id="e2", source="splitter", target="service_b", traffic_percent=0.5)
    ]
    graph = SimGraph(nodes=nodes, edges=edges)
    sim = Simulator("test-failover")

    # Force Service A into "tripped" state manually or via load
    # Let's do it via simulation state manipulation for precision
    sim._sync_actors(graph)
    sim.actors["service_a"].cb_state = "OPEN"
    sim.actors["service_a"].metrics.status = "tripped"

    # Process Tick
    result = sim.process_tick(graph, incoming_rps=100.0)

    # Verify Failover
    # Service A is unhealthy, so 100% should go to Service B
    assert result.nodes["service_a"].incoming_rps == 0.0
    assert result.nodes["service_b"].incoming_rps == 100.0
    
def test_no_failover_when_disabled():
    # Same setup, but adaptive_routing=False
    nodes = {
        "splitter": SimNode(
            id="splitter", 
            type="splitter", 
            splitter_config=SplitterConfig(adaptive_routing=False)
        ),
        "service_a": SimNode(
            id="service_a", 
            type="api", 
            capacity_rps=100
        ),
        "service_b": SimNode(
            id="service_b", 
            type="api", 
            capacity_rps=100
        )
    }
    edges = [
        SimEdge(id="e1", source="splitter", target="service_a", traffic_percent=0.5),
        SimEdge(id="e2", source="splitter", target="service_b", traffic_percent=0.5)
    ]
    graph = SimGraph(nodes=nodes, edges=edges)
    sim = Simulator("test-no-failover")

    sim._sync_actors(graph)
    sim.actors["service_a"].metrics.status = "tripped"

    # Process Tick
    result = sim.process_tick(graph, incoming_rps=100.0)

    # Verification: Traffic should still be 50/50
    assert result.nodes["service_a"].incoming_rps == 50.0
    assert result.nodes["service_b"].incoming_rps == 50.0

def test_all_unhealthy_fallback():
    # If all targets are unhealthy, traffic should still split or be dropped?
    # Current engine logic REDISTRIBUTES to healthy ones. If none healthy, factor is 1.0 (no change).
    nodes = {
        "splitter": SimNode(
            id="splitter", 
            type="splitter", 
            splitter_config=SplitterConfig(adaptive_routing=True)
        ),
        "service_a": SimNode(id="service_a", type="api", capacity_rps=100),
        "service_b": SimNode(id="service_b", type="api", capacity_rps=100)
    }
    edges = [
        SimEdge(id="e1", source="splitter", target="service_a", traffic_percent=0.5),
        SimEdge(id="e2", source="splitter", target="service_b", traffic_percent=0.5)
    ]
    graph = SimGraph(nodes=nodes, edges=edges)
    sim = Simulator("test-all-fail")

    sim._sync_actors(graph)
    sim.actors["service_a"].metrics.status = "tripped"
    sim.actors["service_b"].metrics.status = "tripped"

    # Process Tick
    result = sim.process_tick(graph, incoming_rps=100.0)

    # If all are unhealthy, we fallback to original distribution (safety factor)
    assert result.nodes["service_a"].incoming_rps == 50.0
    assert result.nodes["service_b"].incoming_rps == 50.0
