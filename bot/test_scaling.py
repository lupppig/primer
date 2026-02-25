import pytest
from app.simulation.models.compute import ComputeActor
from app.simulation.schemas import SimNode, ScalingConfig

def test_autoscaling_up_and_down():
    # 1. Setup node with autoscaling
    scaling_config = ScalingConfig(
        enabled=True,
        min_replicas=1,
        max_replicas=5,
        target_utilization=0.5,
        scale_up_cooldown_ticks=0,
        scale_down_cooldown_ticks=0
    )
    node = SimNode(
        id="test-node",
        type="api",
        capacity_rps=100.0,
        replicas=1,
        scaling_config=scaling_config
    )
    actor = ComputeActor(node)

    # 2. Trigger Scale Up
    # 1 replica, 100 capacity. Provide 80 RPS -> 0.8 utilization
    actor.metrics.incoming_rps = 80.0
    actor.process_tick()
    
    assert actor.node.replicas == 2
    assert actor.metrics.scaling_status == "scaling_up"

    # 3. Scale Up again
    # 2 replicas, 200 capacity. Provide 150 RPS -> 0.75 utilization
    actor.metrics.incoming_rps = 150.0
    actor.process_tick()
    assert actor.node.replicas == 3

    # 4. Stay at Max
    # Provice huge load
    actor.metrics.incoming_rps = 1000.0
    for _ in range(5):
        actor.process_tick()
    assert actor.node.replicas == 5

    # 5. Trigger Scale Down
    # 5 replicas, 500 capacity. Provide 50 RPS -> 0.1 utilization ( < target * 0.5)
    actor.metrics.incoming_rps = 50.0
    actor.process_tick()
    assert actor.node.replicas == 4
    assert actor.metrics.scaling_status == "scaling_down"

    # 6. Stay at Min
    actor.metrics.incoming_rps = 0.0
    for _ in range(10):
        actor.process_tick()
    assert actor.node.replicas == 1
    assert actor.metrics.scaling_status == "idle"
