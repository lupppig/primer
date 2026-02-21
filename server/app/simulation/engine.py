from typing import Dict, List, Set
from app.simulation.schemas import SimGraph, NodeMetrics, GraphMetrics, SimulationTickResult

class SimulationEngine:
    """
    Deterministic, stateless pure function simulation engine.
    Computes graph metrics per tick without external side-effects.
    """

    @staticmethod
    def topological_sort(graph: SimGraph) -> List[str]:
        """
        Sorts the graph dependencies to ensure nodes are calculated after their parents.
        Returns a list of node IDs in execution order.
        Raises an exception if a cycle is detected or if nodes are disconnected.
        """
        in_degree: Dict[str, int] = {node_id: 0 for node_id in graph.nodes}
        adj_list: Dict[str, List[str]] = {node_id: [] for node_id in graph.nodes}

        for edge in graph.edges:
            if edge.source not in in_degree or edge.target not in in_degree:
                raise ValueError(f"Edge references invalid node: {edge.source} -> {edge.target}")
            adj_list[edge.source].append(edge.target)
            in_degree[edge.target] += 1

        # Find all start nodes (In-Degree == 0)
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

    @staticmethod
    def compute_tick(graph: SimGraph, incoming_rps: float, current_time: int = 0) -> SimulationTickResult:
        """
        Executes a single deterministic tick (e.g., 1 second interval) of the simulation.
        Applies topological sort, calculates fan-out traffic, node utilizations, 
        and backpressure based on queue depths.
        """
        if not graph.nodes:
            return SimulationTickResult(
                time=current_time,
                nodes={},
                graph_metrics=GraphMetrics(total_throughput=0.0, max_latency=0.0, bottleneck_nodes=[])
            )

        sorted_nodes = SimulationEngine.topological_sort(graph)
        
        # State trackers for this tick
        node_metrics: Dict[str, NodeMetrics] = {n_id: NodeMetrics() for n_id in graph.nodes}
        adj_list: Dict[str, List[tuple[str, float]]] = {n_id: [] for n_id in graph.nodes}
        
        # Build weighted adjacency list
        for edge in graph.edges:
            adj_list[edge.source].append((edge.target, edge.traffic_percent))

        # We assume the first nodes in the topological sort (in_degree 0) receive the initial RPS evenly.
        start_nodes = [node_id for node_id in sorted_nodes if not any(e.target == node_id for e in graph.edges)]
        if not start_nodes and graph.nodes:
            raise ValueError("Graph has no entry points (start nodes).")
            
        initial_rps_per_start_node = incoming_rps / len(start_nodes)
        for start_id in start_nodes:
            node_metrics[start_id].incoming_rps = initial_rps_per_start_node

        max_latency = 0.0
        total_throughput = 0.0
        bottlenecks = []

        # Execute node calculations in dependency order
        for node_id in sorted_nodes:
            node = graph.nodes[node_id]
            metrics = node_metrics[node_id]
            
            # Step 2: Node-Level Computation
            total_capacity = node.capacity_rps * node.replicas
            metrics.utilization = metrics.incoming_rps / total_capacity if total_capacity > 0 else float('inf')
            
            # Bound effective RPS by physical capacity
            metrics.effective_rps = min(metrics.incoming_rps, total_capacity)
            
            if metrics.utilization < 1.0:
                metrics.latency = node.base_latency_ms / (1.0 - metrics.utilization)
                metrics.bottleneck = False
            else:
                metrics.latency = float('inf')
                metrics.bottleneck = True
                bottlenecks.append(node_id)
            
            # Queue & Backpressure calculations
            if getattr(node, 'type', '') == "queue":
                # Calculate what went into the queue, bounded by queue size
                metrics.queue_depth += int(metrics.incoming_rps)
                if metrics.queue_depth > node.queue_size:
                    metrics.dropped_requests = metrics.queue_depth - node.queue_size
                    metrics.queue_depth = node.queue_size
                    # When dropping packets, effective RPS is further restricted
                    metrics.effective_rps = min(metrics.effective_rps, total_capacity)
                    
            if metrics.latency != float('inf') and metrics.latency > max_latency:
                max_latency = metrics.latency

            # Step 3: Fan-Out Traffic Propagation 
            for target_id, traffic_pct in adj_list[node_id]:
                # Child receives percentage of the *processed* traffic (effective_rps)
                child_incoming = metrics.effective_rps * traffic_pct
                node_metrics[target_id].incoming_rps += child_incoming
                
            # If this is an end node, its effective rps counts towards total system throughput
            if not adj_list[node_id]:
                total_throughput += metrics.effective_rps

        gm = GraphMetrics(
            total_throughput=total_throughput,
            max_latency=max_latency if max_latency != float('inf') else 9999.9, # Cap infinity for UI
            bottleneck_nodes=bottlenecks
        )

        return SimulationTickResult(
            time=current_time,
            nodes=node_metrics,
            graph_metrics=gm
        )
