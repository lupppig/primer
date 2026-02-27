import pytest
from app.simulation.models.compute import ComputeActor
from app.simulation.schemas import SimNode, MeshConfig

def test_mesh_timeout():
    # Setup node with low timeout
    mesh_config = MeshConfig(timeout_ms=10.0) # 10ms timeout
    node = SimNode(
        id="test-timeout",
        type="api",
        capacity_rps=1000.0,
        base_latency_ms=50.0, # Base latency > timeout
        mesh_config=mesh_config
    )
    actor = ComputeActor(node)
    
    # Process tick
    actor.metrics.incoming_rps = 100.0
    actor.process_tick()
    
    # Should be timed out (dropped)
    # Latency at 100 RPS is ~50 / (1 - 0.1) = 55.5ms > 10ms
    assert actor.metrics.dropped_requests == 100
    assert actor.metrics.effective_rps == 0.0
    assert actor.metrics.failure_reason == "Request Timeout"

def test_mesh_retries_and_storm():
    # Setup node with retries
    mesh_config = MeshConfig(
        retries=3,
        retry_backoff_ms=5.0
    )
    node = SimNode(
        id="test-retry",
        type="api",
        capacity_rps=100.0, # Low capacity to force drops
        base_latency_ms=10.0,
        mesh_config=mesh_config
    )
    actor = ComputeActor(node)
    
    # Send 200 RPS (100 should drop)
    actor.metrics.incoming_rps = 200.0
    actor.process_tick()
    
    # Dropped = 100
    # Retries = 100 * 3 = 300
    # Total augmented load = 200 + 300 = 500
    assert actor.metrics.dropped_requests == 100
    assert actor.metrics.retry_rps == 300.0
    
    # Check "Retry Storm" status
    # Capacity is 100. Augmented load 500. Util should be 1.0 (capped)
    assert actor.metrics.utilization == 1.0
    assert actor.metrics.failure_reason == "Retry Storm"
    
    # Check latency penalty
    # Base latency at saturation would be mapped to 9999.9 in process_tick,
    # but mesh logic adds backoff on top.
    # self.metrics.latency += (3 * 5.0) = 15.0
    assert actor.metrics.latency >= 9000.0 # High due to saturation
