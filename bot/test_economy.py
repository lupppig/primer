import pytest
from app.simulation.models.compute import ComputeActor
from app.simulation.schemas import SimNode, CostConfig

def test_cost_calculation():
    # Setup node with cost config
    # Monthly: $100 per replica
    # Variable: $0.10 per million requests
    cost_config = CostConfig(
        monthly_base_cost_per_replica=100.0,
        cost_per_million_requests=0.10
    )
    node = SimNode(
        id="test-node",
        type="api",
        capacity_rps=1000.0,
        replicas=2,
        cost_config=cost_config
    )
    actor = ComputeActor(node)

    # Process tick with 500 RPS
    # Monthly seconds = 2,592,000
    # Expected base per tick = (100 * 2) / 2,592,000 = 0.00007716...
    # Expected var per tick = (500 * 0.10) / 1,000,000 = 0.00005
    # Total expected = 0.00012716...
    actor.metrics.incoming_rps = 500.0
    actor.process_tick()
    
    expected_base = (100.0 * 2) / 2592000
    expected_var = (500.0 * 0.10) / 1000000
    expected_total = expected_base + expected_var
    
    assert actor.metrics.tick_cost == pytest.approx(expected_total, rel=1e-6)

    # Increase Load
    actor.metrics.incoming_rps = 1000.0
    actor.process_tick()
    expected_var_high = (1000.0 * 0.10) / 1000000
    assert actor.metrics.tick_cost == pytest.approx(expected_base + expected_var_high, rel=1e-6)
