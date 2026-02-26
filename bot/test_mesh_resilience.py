import pytest
from app.simulation.engine import Simulator
from app.simulation.schemas import SimGraph, SimNode, SimEdge, NodeType, MeshConfig

def test_timeout_logic():
    # 1. Setup Node with 50ms base latency and 10ms timeout
    nodes = {
        "api": SimNode(
            id="api", 
            type="api", 
            capacity_rps=1000, 
            base_latency_ms=50.0,
            mesh_config=MeshConfig(timeout_ms=10.0)
        )
    }
    graph = SimGraph(nodes=nodes, edges=[])
    sim = Simulator("test-timeout")

    # 2. Process Tick
    result = sim.process_tick(graph, incoming_rps=100.0)

    # 3. Verify Timeout behavior
    # Latency (50ms) > Timeout (10ms) -> All requests should be dropped
    assert result.nodes["api"].effective_rps == 0.0
    assert result.nodes["api"].dropped_requests == 100
    assert result.nodes["api"].failure_reason == "Request Timeout"

def test_retry_budget_capping():
    # 1. Setup Node with 20% retry budget and high retries
    # Capacity is 50 RPS, Incoming is 100 RPS.
    # Dropped = 50. 
    # Requested Retries = 50 * 3 (retries) = 150 RPS.
    # Budget = 100 (incoming) * 0.2 (20%) = 20 RPS.
    nodes = {
        "api": SimNode(
            id="api", 
            type="api", 
            capacity_rps=50, 
            mesh_config=MeshConfig(retries=3, retry_budget_pct=20.0)
        )
    }
    graph = SimGraph(nodes=nodes, edges=[])
    sim = Simulator("test-retry-budget")

    # 2. Process Tick
    result = sim.process_tick(graph, incoming_rps=100.0)

    # 3. Verify Budget Capping
    assert result.nodes["api"].dropped_requests == 50
    assert result.nodes["api"].retry_rps == 20.0 # Capped at 20% of 100
    assert result.nodes["api"].budget_exhausted is True
    assert result.nodes["api"].failure_reason == "Retry Budget Exhausted"

def test_retry_within_budget():
    # Incoming 100, Capacity 90. Dropped = 10.
    # Retries = 3. Requested = 10 * 3 = 30.
    # Budget = 100 * 0.2 = 20.
    # Still capped at 20.
    
    # Let's change budget to 50%
    nodes = {
        "api": SimNode(
            id="api", 
            type="api", 
            capacity_rps=90, 
            mesh_config=MeshConfig(retries=3, retry_budget_pct=50.0)
        )
    }
    graph = SimGraph(nodes=nodes, edges=[])
    sim = Simulator("test-retry-within")
    
    result = sim.process_tick(graph, incoming_rps=100.0)
    
    # Dropped = 10. Retries = 3. Requested = 30.
    # Budget = 100 * 0.5 = 50.
    # 30 < 50, so retry_rps should be 30.
    assert result.nodes["api"].dropped_requests == 10
    assert result.nodes["api"].retry_rps == 30.0
    assert result.nodes["api"].budget_exhausted is False
