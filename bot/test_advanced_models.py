import pytest
from app.simulation.models.compute import ComputeActor
from app.simulation.schemas import SimNode, CacheConfig, DatabaseConfig

def test_cache_hit_load_reduction():
    # 1. Setup node with 90% hit rate
    cache_config = CacheConfig(hit_rate=0.9, hit_latency_ms=1.0)
    node = SimNode(
        id="test-cache",
        type="cache",
        capacity_rps=100.0, # Low capacity
        base_latency_ms=10.0,
        cache_config=cache_config
    )
    actor = ComputeActor(node)
    
    # Process 500 RPS
    # With 90% hit rate, only 50 RPS (10%) should hit the "backend" capacity
    actor.metrics.incoming_rps = 500.0
    actor.process_tick()
    
    # 50 RPS < 100 RPS capacity -> No drops
    assert actor.metrics.dropped_requests == 0
    # Utilization should be based on the 50 RPS miss load
    assert actor.metrics.utilization == pytest.approx(0.5)
    # Overall latency should be weighted average
    # Hits (450) at 1ms, Misses (50) at ~20ms (util 0.5)
    # Average ~ (0.9 * 1) + (0.1 * 20) = 0.9 + 2.0 = 2.9ms
    assert 2.5 < actor.metrics.latency < 3.5

def test_database_read_replica_scaling():
    # 2. Setup node with read replicas
    db_config = DatabaseConfig(read_replicas=4) # 4 replicas
    node = SimNode(
        id="test-db",
        type="db",
        capacity_rps=100.0, # Base capacity per instance
        base_latency_ms=10.0,
        database_config=db_config
    )
    actor = ComputeActor(node)
    
    # 4 replicas + 1 primary = 5 instances? 
    # Logic in compute.py: primary + (0.8 * read_replicas)
    # total_capacity = 100 + (4 * 100 * 0.8) = 100 + 320 = 420 RPS
    
    # Send 400 RPS
    actor.metrics.incoming_rps = 400.0
    actor.process_tick()
    
    # 400 < 420 -> No drops
    assert actor.metrics.dropped_requests == 0
    assert actor.metrics.utilization < 1.0
    
    # Verify read_latency metric exists
    assert actor.metrics.read_latency >= 10.0
