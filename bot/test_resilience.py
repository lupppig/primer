import pytest
from app.simulation.engine import Simulator
from app.simulation.schemas import SimGraph, SimNode, SimEdge, NodeType, Region

def test_traffic_splitter_distribution():
    # 1. Setup Graph with Splitter
    nodes = {
        "user": SimNode(id="user", type="api", capacity_rps=10000),
        "splitter": SimNode(id="splitter", type="splitter", capacity_rps=10000),
        "v1": SimNode(id="v1", type="api", capacity_rps=1000),
        "v2": SimNode(id="v2", type="api", capacity_rps=1000)
    }
    edges = [
        SimEdge(id="e1", source="user", target="splitter"),
        SimEdge(id="e2", source="splitter", target="v1", traffic_percent=0.7),
        SimEdge(id="e3", source="splitter", target="v2", traffic_percent=0.3)
    ]
    graph = SimGraph(nodes=nodes, edges=edges)
    sim = Simulator("test-splitter")

    # 2. Process Tick with 100 RPS
    result = sim.process_tick(graph, incoming_rps=100.0)

    # 3. Verify Distribution
    assert result.nodes["v1"].incoming_rps == 70.0
    assert result.nodes["v2"].incoming_rps == 30.0

def test_dead_letter_routing():
    # 1. Setup Graph: API -> (Success Edge) & (DLQ Edge)
    # API has 50 RPS capacity, but receive 100 RPS
    nodes = {
        "api": SimNode(id="api", type="api", capacity_rps=50, replicas=1),
        "sink": SimNode(id="sink", type="api", capacity_rps=1000),
        "dlq": SimNode(id="dlq", type="dlq", capacity_rps=0, queue_size=1000)
    }
    edges = [
        SimEdge(id="e_success", source="api", target="sink", traffic_percent=1.0),
        SimEdge(id="e_dlq", source="api", target="dlq", traffic_percent=0.0) # 0% normal traffic, only drops
    ]
    graph = SimGraph(nodes=nodes, edges=edges)
    sim = Simulator("test-dlq")

    # 2. Process Tick with 100 RPS
    result = sim.process_tick(graph, incoming_rps=100.0)

    # 3. Verify Dropped Requests go to DLQ
    # API processes 50, drops 50.
    assert result.nodes["api"].effective_rps == 50.0
    assert result.nodes["api"].dropped_requests == 50
    
    # DLQ should have received the 50 dropped requests as incoming_rps
    assert result.nodes["dlq"].incoming_rps == 50.0
    # In one tick, DLQ buffers them.
    assert result.nodes["dlq"].queue_depth == 50
