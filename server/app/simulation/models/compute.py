from app.simulation.models.base import ComponentActor
from app.simulation.schemas import NodeMetrics

class ComputeActor(ComponentActor):
    """
    Standard implementation for deterministic capacity processing and mathematical latency.
    Used generically for APIs, databases, caches, k8s deployments etc.
    """
    def process_tick(self) -> NodeMetrics:
        if self.cb_state == "OPEN":
            self.metrics.effective_rps = 0.0
            self.metrics.dropped_requests = int(self.metrics.incoming_rps)
            self.metrics.status = "tripped"
            self.metrics.latency = 9999.9 # Effectively high latency for a tripped circuit
            self.metrics.failure_reason = "Circuit Breaker Open"
            self._update_circuit_breaker(has_failures=True)
            return self.metrics

        # Specialized Capacity & Load Calculation
        load_to_process = self.metrics.incoming_rps
        total_capacity = self.node.capacity_rps * self.node.replicas
        
        # Handle Cache specialization
        if self.node.cache_config:
            c_config = self.node.cache_config
            hits = self.metrics.incoming_rps * c_config.hit_rate
            misses = self.metrics.incoming_rps * (1.0 - c_config.hit_rate)
            # Only misses put real load on the cache "engine"
            load_to_process = misses
            self.metrics.cache_hit_rate = c_config.hit_rate
        
        # Handle Database specialization
        if self.node.database_config:
            d_config = self.node.database_config
            # Read replicas add to capacity, but writes (estimated at 20%) only go to primary
            read_cap = (self.node.capacity_rps * 0.8) * d_config.read_replicas
            total_capacity += read_cap
            self.metrics.read_latency = self.node.base_latency_ms + d_config.replication_lag_ms

        # Standard Processing Logic with modified load/capacity
        # Calculate component utilization ratio
        self.metrics.utilization = (load_to_process / total_capacity) if total_capacity > 0 else (1.0 if load_to_process > 0 else 0.0)
        
        # Storage I/O Modeling
        if self.node.storage_config:
            s_config = self.node.storage_config
            # IOPS is proportional to RPS
            # Throughput is estimated as average payload size (e.g. 100KB)
            avg_payload_mb = 0.1 
            estimated_throughput = self.metrics.incoming_rps * avg_payload_mb
            
            iops_util = (self.metrics.incoming_rps / s_config.iops_limit) if s_config.iops_limit > 0 else 0.0
            thru_util = (estimated_throughput / s_config.bandwidth_mbps) if s_config.bandwidth_mbps > 0 else 0.0
            
            self.metrics.storage_utilization = max(iops_util, thru_util)
            
            if self.metrics.storage_utilization > 1.0:
                # Storage is saturated! This adds significant latency.
                self.metrics.storage_latency = 100.0 * (self.metrics.storage_utilization - 1.0)
                # Also cap the total capacity by the storage bottleneck
                storage_capped_capacity = min(s_config.iops_limit, s_config.bandwidth_mbps / avg_payload_mb)
                total_capacity = min(total_capacity, storage_capped_capacity)
                self.metrics.bottleneck = True
            else:
                self.metrics.storage_latency = 0.0
        
        # Bound effective RPS by physical capacity
        self.metrics.effective_rps = min(self.metrics.incoming_rps, total_capacity)
        
        # Calculate dropped requests if load exceeds capacity
        if load_to_process > total_capacity:
            self.metrics.dropped_requests = int(load_to_process - total_capacity)

        # Apply strict rate limits if explicitly configured in node UI
        if self.node.rate_limit_rps is not None:
            if self.metrics.effective_rps > self.node.rate_limit_rps:
                self.metrics.dropped_requests += int(self.metrics.effective_rps - self.node.rate_limit_rps)
                self.metrics.effective_rps = self.node.rate_limit_rps

        # Latency Calculation
        if self.metrics.utilization <= 1.0:
            calc_latency = self.node.base_latency_ms / max(1.0 - self.metrics.utilization, 0.001)
            
            if self.node.cache_config:
                # Weighted average of hit latency and miss latency
                c_config = self.node.cache_config
                self.metrics.latency = (c_config.hit_rate * c_config.hit_latency_ms) + ((1.0 - c_config.hit_rate) * calc_latency)
            else:
                self.metrics.latency = calc_latency
                
            # Apply storage penalty
            self.metrics.latency += self.metrics.storage_latency
                
            if not (self.node.storage_config and self.metrics.storage_utilization > 1.0):
                self.metrics.bottleneck = False
            self.metrics.failure_reason = None
        else:
            self.metrics.latency = 9999.9
            self.metrics.bottleneck = True
            self.metrics.failure_reason = "Capacity Saturation"
            
        #  Update Circuit Breaker State for next tick
        # We consider it a "failure" if there are dropped requests
        self._update_circuit_breaker(has_failures=(self.metrics.dropped_requests > 0))
        
        #  Update Autoscaling Logic
        self._update_autoscaling()
        
        #  Update Costs
        self._update_costs()
        
        #  Update Service Mesh Service
        self._update_mesh_logic()
        
        # Final Geodistribution Latency Application
        if self.metrics.incoming_rps > 0:
            avg_net_latency = self.net_latency_accumulator / self.metrics.incoming_rps
            self.metrics.network_latency = avg_net_latency
            if self.metrics.latency != 9999.9:
                self.metrics.latency += avg_net_latency

        return self.metrics
