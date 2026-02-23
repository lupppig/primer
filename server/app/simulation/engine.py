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
        # 1. Clean up deleted nodes
        for node_id in list(self.actors.keys()):
            if node_id not in graph.nodes:
                del self.actors[node_id]

        # 2. Add or update existing actors
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

        # 1. Synchronize physical states
        self._sync_actors(graph)
        sorted_nodes = self.topological_sort(graph)
        
        # 2. Reset transient tick metrics (TPS, drops etc) while preserving Buffer state
        for actor in self.actors.values():
            actor.reset_tick_metrics()
            
        adj_list: Dict[str, List[tuple[str, float]]] = {n_id: [] for n_id in graph.nodes}
        for edge in graph.edges:
            adj_list[edge.source].append((edge.target, edge.traffic_percent))
            
        # 3. Inject baseline load into entrypoints
        start_nodes = [node_id for node_id in sorted_nodes if not any(e.target == node_id for e in graph.edges)]
        if not start_nodes and graph.nodes:
            raise ValueError("Graph has no valid entry points for traffic.")
            
        initial_rps = incoming_rps / len(start_nodes)
        for start_id in start_nodes:
            self.actors[start_id].metrics.incoming_rps += initial_rps
            
        max_latency = 0.0
        total_throughput = 0.0
        bottlenecks = []
        
        # 4. Cascade calculation topologically
        for node_id in sorted_nodes:
            actor = self.actors[node_id]
            # Polymorphic execution based on concrete Component Type limits
            metrics = actor.process_tick()
            
            if metrics.bottleneck:
                bottlenecks.append(node_id)
                
            if metrics.latency != float('inf') and metrics.latency > max_latency:
                max_latency = metrics.latency
                
            # Fan out successfully mitigated traffic downward to downstream dependents
            for target_id, traffic_pct in adj_list[node_id]:
                child_incoming = metrics.effective_rps * traffic_pct
                self.actors[target_id].metrics.incoming_rps += child_incoming
                
            # If leaf node, counts toward total successful throughput
            if not adj_list[node_id]:
                total_throughput += metrics.effective_rps
                
        gm = GraphMetrics(
            total_throughput=total_throughput,
            max_latency=max_latency if max_latency != float('inf') else 9999.9,
            bottleneck_nodes=bottlenecks
        )
        
        # Duplicate state safely for serialization payload
        nodes_snapshot = {n_id: NodeMetrics(**actor.metrics.model_dump()) for n_id, actor in self.actors.items()}
        
        self.current_time += 1
        return SimulationTickResult(
            time=self.current_time,
            nodes=nodes_snapshot,
            graph_metrics=gm
        )
