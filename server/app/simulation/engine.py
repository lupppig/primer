from typing import Dict, List, Optional
from app.simulation.schemas import SimGraph, NodeMetrics, GraphMetrics, SimulationTickResult, LoadProfile, Region

# Network Latency in ms between regions
# Note: This is an initial set of regions and can be expanded as needed for more granular global modeling.
LATENCY_MATRIX = {
    Region.US_EAST: {
        Region.US_EAST: 0.0,
        Region.US_WEST: 65.0,
        Region.EU_CENTRAL: 90.0,
        Region.AP_SOUTHEAST: 240.0
    },
    Region.US_WEST: {
        Region.US_EAST: 65.0,
        Region.US_WEST: 0.0,
        Region.EU_CENTRAL: 150.0,
        Region.AP_SOUTHEAST: 180.0
    },
    Region.EU_CENTRAL: {
        Region.US_EAST: 90.0,
        Region.US_WEST: 150.0,
        Region.EU_CENTRAL: 0.0,
        Region.AP_SOUTHEAST: 310.0
    },
    Region.AP_SOUTHEAST: {
        Region.US_EAST: 240.0,
        Region.US_WEST: 180.0,
        Region.EU_CENTRAL: 310.0,
        Region.AP_SOUTHEAST: 0.0
    }
}

from app.simulation.models.base import ComponentActor
from app.simulation.models.compute import ComputeActor
from app.simulation.models.queue import QueueActor
from app.simulation.models.cdn import CDNActor
from app.simulation.models.firewall import FirewallActor
from app.simulation.models.splitter import TrafficSplitterActor
from app.simulation.models.dlq import DeadLetterQueueActor
import random

class Simulator:
    """
    Stateful Discrete Event Simulator engine.
    Maintains actor references across ticks to persist physical queues 
    and states based on the frontend UI ReactFlow graph inputs.
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.actors: Dict[str, ComponentActor] = {}
        self.current_time = 0

    @staticmethod
    def topological_sort(graph: SimGraph) -> List[str]:
        """
        Sorts the graph dependencies to ensure nodes are calculated after their parents.
        """
        in_degree: Dict[str, int] = {node_id: 0 for node_id in graph.nodes}
        adj_list: Dict[str, List[str]] = {node_id: [] for node_id in graph.nodes}

        for edge in graph.edges:
            if edge.source not in in_degree or edge.target not in in_degree:
                raise ValueError(f"Edge references invalid node: {edge.source} -> {edge.target}")
            adj_list[edge.source].append(edge.target)
            in_degree[edge.target] += 1

        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        sorted_nodes = []

        while queue:
            current = queue.pop(0)
            sorted_nodes.append(current)

            for neighbor in adj_list[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        if len(sorted_nodes) != len(graph.nodes):
            raise ValueError("Cycle detected in the system architecture graph.")

        return sorted_nodes

    def _sync_actors(self, graph: SimGraph):
        """
        Synchronizes internal Stateful Components against the potentially mutated UI graph.
        Adds new nodes, updates configurations of existing ones, and drops deleted ones.
        """
        for node_id in list(self.actors.keys()):
            if node_id not in graph.nodes:
                del self.actors[node_id]

        for node_id, node_data in graph.nodes.items():
            if node_id not in self.actors:
                if node_data.type == 'queue':
                    self.actors[node_id] = QueueActor(node_data)
                elif node_data.type == 'cdn':
                    self.actors[node_id] = CDNActor(node_data)
                elif node_data.type == 'firewall':
                    self.actors[node_id] = FirewallActor(node_data)
                elif node_data.type == 'dlq':
                    self.actors[node_id] = DeadLetterQueueActor(node_data)
                elif node_data.type == 'splitter':
                    self.actors[node_id] = TrafficSplitterActor(node_data)
                else:
                    self.actors[node_id] = ComputeActor(node_data)
            else:
                self.actors[node_id].node = node_data

    def process_tick(self, graph: SimGraph, incoming_rps: float, load_profile: Optional['LoadProfile'] = None) -> SimulationTickResult:
        """
        Executes a single chronological simulation interval (tick).
        Propagates load top-down, computing cascading latency and back-pressure.
        """
        actual_incoming_rps = incoming_rps
        if load_profile:
            t = self.current_time % load_profile.durationSeconds
            p_type = load_profile.type
            base = load_profile.baseRps
            peak = load_profile.peakRps
            dur = load_profile.durationSeconds
            
            if p_type == 'flat':
                actual_incoming_rps = base
            elif p_type == 'spike':
                mid = dur / 2
                if t < mid:
                    actual_incoming_rps = base + (peak - base) * (t / mid)
                else:
                    actual_incoming_rps = peak - (peak - base) * ((t - mid) / mid)
            elif p_type == 'step':
                actual_incoming_rps = base if t < (dur / 2) else peak
        
        if not graph.nodes:
            return SimulationTickResult(
                time=self.current_time,
                nodes={},
                graph_metrics=GraphMetrics(total_throughput=0.0, max_latency=0.0, bottleneck_nodes=[])
            )

        self._sync_actors(graph)
        sorted_nodes = self.topological_sort(graph)
        
        for actor in self.actors.values():
            actor.reset_tick_metrics()
            
        adj_list: Dict[str, List[tuple[str, float]]] = {n_id: [] for n_id in graph.nodes}
        for edge in graph.edges:
            adj_list[edge.source].append((edge.target, edge.traffic_percent))
            
        start_nodes = [node_id for node_id in sorted_nodes if not any(e.target == node_id for e in graph.edges)]
        if not start_nodes and graph.nodes:
            raise ValueError("Graph has no valid entry points for traffic.")
            
        initial_rps = actual_incoming_rps / len(start_nodes)
        for start_id in start_nodes:
            self.actors[start_id].metrics.incoming_rps += initial_rps
            
        max_latency = 0.0
        total_throughput = 0.0
        bottlenecks = []
        
        for node_id in sorted_nodes:
            actor = self.actors[node_id]
            metrics = actor.process_tick()
            
            if metrics.bottleneck:
                bottlenecks.append(node_id)
            
            # 1b. Dead Letter Queue (DLQ) Routing
            if metrics.dropped_requests > 0:
                # Find if this node has an outgoing edge to a DLQ node
                dlq_targets = [target_id for target_id, _ in adj_list[node_id] if graph.nodes[target_id].type == 'dlq']
                if dlq_targets:
                    # Distribute dropped requests across available DLQs (usually just one)
                    dropped_per_dlq = metrics.dropped_requests / len(dlq_targets)
                    for dlq_id in dlq_targets:
                        self.actors[dlq_id].metrics.incoming_rps += dropped_per_dlq
                
            if metrics.latency != 9999.9 and metrics.latency > max_latency:
                max_latency = metrics.latency
                
            targets = adj_list[node_id]
            if not targets:
                total_throughput += metrics.effective_rps
                continue

            # --- Adaptive Load Balancing / Routing ---
            # If adaptive routing is enabled, we redistribute traffic from unhealthy nodes
            use_adaptive = False
            if actor.node.splitter_config and actor.node.splitter_config.adaptive_routing:
                use_adaptive = True
            
            # Identify "usable" targets (ignoring DLQs for main traffic redistribution)
            usable_targets = []
            total_weight_of_usable = 0.0
            
            for target_id, traffic_pct in targets:
                target_actor = self.actors[target_id]
                
                # Check persistent health state (Circuit Breaker) + current tick status
                # cb_state is NOT reset every tick, so it's a reliable indicator of "tripped"
                is_tripped = hasattr(target_actor, 'cb_state') and target_actor.cb_state == "OPEN"
                is_unhealthy = is_tripped or (target_actor.metrics.status in ["tripped", "degraded"])
                
                # We skip DLQs for weight redistribution as they handle "dropped" traffic specifically
                if target_actor.node.type == 'dlq':
                    usable_targets.append((target_id, traffic_pct, False))
                    continue
                
                if use_adaptive and is_unhealthy:
                    # Skip routing to unhealthy nodes if adaptive is on
                    usable_targets.append((target_id, traffic_pct, True)) # is_skipped=True
                else:
                    usable_targets.append((target_id, traffic_pct, False))
                    total_weight_of_usable += traffic_pct

            # Calculate redistribution factor if we skipped some nodes
            redistribution_factor = 1.0
            if use_adaptive and total_weight_of_usable > 0 and total_weight_of_usable < 1.0:
                 # We have some healthy nodes and some unhealthy ones
                 # We want to scale the healthy weights to sum to 1.0 (or whatever the total split was)
                 redistribution_factor = 1.0 / total_weight_of_usable

            for target_id, traffic_pct, is_skipped in usable_targets:
                # Find the actual edge object to get chaos configs
                edge = next((e for e in graph.edges if e.source == node_id and e.target == target_id), None)
                if not edge:
                    continue
                
                # 1. Protocol Whitelisting Enforcement (Ingress & Egress)
                source_node = actor.node
                target_node = graph.nodes[target_id]
                
                # Check source Egress rules
                if source_node.protocol_whitelist and edge.protocol not in source_node.protocol_whitelist:
                    continue
                    
                # Check target Ingress rules
                if target_node.protocol_whitelist and edge.protocol not in target_node.protocol_whitelist:
                    continue

                # 2. Chaos: Packet Loss & Adaptive Skipping
                # Deterministically reduce traffic based on loss pct
                loss_factor = 1.0 - (edge.packet_loss_pct / 100.0)
                
                effective_pct = traffic_pct
                if is_skipped:
                    effective_pct = 0.0
                elif use_adaptive and target_node.type != 'dlq':
                    effective_pct = traffic_pct * redistribution_factor

                child_incoming = metrics.effective_rps * effective_pct * loss_factor
                
                # 3. Chaos: Jitter & Network Latency
                source_region = actor.node.region
                target_region = self.actors[target_id].node.region
                
                net_latency = LATENCY_MATRIX.get(source_region, {}).get(target_region, 0.0)
                
                # Apply Jitter (random variation)
                if edge.jitter_ms > 0:
                    net_latency += random.uniform(-edge.jitter_ms, edge.jitter_ms)
                    net_latency = max(0.0, net_latency)
                
                # Accumulate weighted network latency for the child
                self.actors[target_id].net_latency_accumulator += (net_latency * child_incoming)
                self.actors[target_id].metrics.incoming_rps += child_incoming
                
        gm = GraphMetrics(
            total_throughput=total_throughput,
            max_latency=max_latency if max_latency != 9999.9 else 9999.9,
            bottleneck_nodes=bottlenecks
        )
        
        nodes_snapshot = {n_id: NodeMetrics(**actor.metrics.model_dump()) for n_id, actor in self.actors.items()}
        
        self.current_time += 1
        return SimulationTickResult(
            time=self.current_time,
            nodes=nodes_snapshot,
            graph_metrics=gm
        )
