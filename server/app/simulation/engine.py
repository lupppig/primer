from typing import Dict, List
from app.simulation.schemas import SimGraph, NodeMetrics, GraphMetrics, SimulationTickResult
from app.simulation.models.base import ComponentActor
from app.simulation.models.compute import ComputeActor
from app.simulation.models.queue import QueueActor

class Simulator:
    """
    Stateful Discrete Event Simulator engine.
    Maintains actor references across ticks to persist physical queues 
    and states based on the frontend UI ReactFlow graph inputs.
    """
    def __init__(self, session_id: str):
        self.session_id = session_id
        # Persisted state map of graph node ID to logical Actor
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
                # Factory pattern based on component explicit needs
                if node_data.type == 'queue':
                    self.actors[node_id] = QueueActor(node_data)
                else:
                    self.actors[node_id] = ComputeActor(node_data)
            else:
                # The user might have tweaked base capacity, latency etc in the UI. 
                # This safely patches it under the hood while preserving buffers.
                self.actors[node_id].node = node_data

    def process_tick(self, graph: SimGraph, incoming_rps: float) -> SimulationTickResult:
        """
        Executes a single chronological simulation interval (tick).
        Propagates load top-down, computing cascading latency and back-pressure.
        """
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
            
        initial_rps = incoming_rps / len(start_nodes)
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
                
            if metrics.latency != float('inf') and metrics.latency > max_latency:
                max_latency = metrics.latency
                
            # Traffic Distribution based on Load Balancing Strategy
            targets = adj_list[node_id]
            if not targets:
                total_throughput += metrics.effective_rps
                continue

            strategy = actor.node.load_balancing_strategy
            
            if strategy == "least_latency" and len(targets) > 1:
                # Distribution logic: targets with lower latency get more traffic
                # Using the latency from the current tick (just calculated above)
                target_latencies = {t_id: self.actors[t_id].metrics.latency for t_id, _ in targets}
                # Handle infinite/failed latencies
                valid_latencies = {t_id: lat for t_id, lat in target_latencies.items() if lat != float('inf') and lat > 0}
                
                if valid_latencies:
                    # Weights are inverse to latency
                    total_inv_latency = sum(1.0 / lat for lat in valid_latencies.values())
                    for target_id, traffic_pct in targets:
                        if target_id in valid_latencies:
                            share = (1.0 / valid_latencies[target_id]) / total_inv_latency
                            child_incoming = metrics.effective_rps * share * traffic_pct
                        else:
                            child_incoming = 0 # Failed target gets no traffic
                        self.actors[target_id].metrics.incoming_rps += child_incoming
                else:
                    # All targets failed or infinite, fallback to equal distribution
                    share = 1.0 / len(targets)
                    for target_id, traffic_pct in targets:
                        self.actors[target_id].metrics.incoming_rps += metrics.effective_rps * share * traffic_pct
            else:
                # Default: Equal distribution (Round Robin / Static)
                share = 1.0 / len(targets)
                for target_id, traffic_pct in targets:
                    child_incoming = metrics.effective_rps * share * traffic_pct
                    self.actors[target_id].metrics.incoming_rps += child_incoming
                
        gm = GraphMetrics(
            total_throughput=total_throughput,
            max_latency=max_latency if max_latency != float('inf') else 9999.9,
            bottleneck_nodes=bottlenecks
        )
        
        nodes_snapshot = {n_id: NodeMetrics(**actor.metrics.model_dump()) for n_id, actor in self.actors.items()}
        
        self.current_time += 1
        return SimulationTickResult(
            time=self.current_time,
            nodes=nodes_snapshot,
            graph_metrics=gm
        )
