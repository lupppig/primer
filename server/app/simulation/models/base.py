from abc import ABC, abstractmethod
from app.simulation.schemas import SimNode, NodeMetrics

class ComponentActor(ABC):
    def __init__(self, node: SimNode):
        self.node = node
        self.metrics = NodeMetrics()
        
        # Circuit Breaker state
        self.cb_state = "CLOSED" # "CLOSED", "OPEN", "HALF_OPEN"
        self.failure_ticks = 0
        self.success_count = 0
        self.ticks_in_open = 0
        self.total_requests_in_period = 0
        self.total_failures_in_period = 0
        
        # Scaling state
        self.scaling_status = "idle" # "idle", "scaling_up", "scaling_down"
        self.ticks_since_last_scale = 0
        
        # Geodistribution state
        self.net_latency_accumulator = 0.0
        
    def reset_tick_metrics(self):
        self.metrics.incoming_rps = 0.0
        self.metrics.effective_rps = 0.0
        self.metrics.utilization = 0.0
        self.metrics.latency = 0.0
        self.metrics.network_latency = 0.0
        self.net_latency_accumulator = 0.0
        self.metrics.bottleneck = False
        self.metrics.dropped_requests = 0
        self.metrics.status = "healthy"
        self.metrics.scaling_status = "idle"
        self.metrics.tick_cost = 0.0
        self.metrics.retry_rps = 0.0
        
    def _update_circuit_breaker(self, has_failures: bool = False):
        config = self.node.resilience_config
        if not config or not config.circuit_breaker_enabled:
            self.cb_state = "CLOSED"
            self.metrics.status = "healthy"
            return

        # Track rolling failure rate if in CLOSED state
        if self.cb_state == "CLOSED":
            if has_failures:
                self.failure_ticks += 1
            else:
                self.failure_ticks = max(0, self.failure_ticks - 1)

            # Trip logic: If utilization is high or node is bottlenecked for too long
            # Simplified for now: if node has significant errors/dropped requests
            if self.metrics.dropped_requests > 0:
                self.total_failures_in_period += self.metrics.dropped_requests
            
            self.total_requests_in_period += self.metrics.incoming_rps

            if self.total_requests_in_period >= config.min_request_threshold:
                fail_rate = (self.total_failures_in_period / self.total_requests_in_period) * 100
                if fail_rate >= config.failure_threshold_pct:
                    self.cb_state = "OPEN"
                    self.ticks_in_open = 0
                
                # Reset rolling window every few ticks to keep it fresh
                if self.total_requests_in_period > config.min_request_threshold * 5:
                    self.total_requests_in_period = 0
                    self.total_failures_in_period = 0

        elif self.cb_state == "OPEN":
            self.ticks_in_open += 1
            if self.ticks_in_open >= config.recovery_timeout_ticks:
                self.cb_state = "HALF_OPEN"
                self.success_count = 0

        elif self.cb_state == "HALF_OPEN":
            if self.metrics.dropped_requests == 0 and self.metrics.incoming_rps > 0:
                self.success_count += 1
                if self.success_count >= 3: # 3 consecutive successful ticks to close
                    self.cb_state = "CLOSED"
                    self.total_requests_in_period = 0
                    self.total_failures_in_period = 0
            elif self.metrics.dropped_requests > 0:
                # Any failure in HALF_OPEN sent it back to OPEN
                self.cb_state = "OPEN"
                self.ticks_in_open = 0

        # Update status for telemetry
        if self.cb_state == "OPEN":
            self.metrics.status = "tripped"
        elif self.cb_state == "HALF_OPEN":
            self.metrics.status = "degraded"
        else:
            self.metrics.status = "healthy"

    def _update_autoscaling(self):
        config = self.node.scaling_config
        if not config or not config.enabled:
            self.scaling_status = "idle"
            self.metrics.scaling_status = "idle"
            return

        self.ticks_since_last_scale += 1
        
        # Current utilization from metrics
        util = self.metrics.utilization
        
        # Scaling logic
        if util > config.target_utilization and self.node.replicas < config.max_replicas:
            if self.ticks_since_last_scale >= config.scale_up_cooldown_ticks:
                self.node.replicas += 1
                self.ticks_since_last_scale = 0
                self.scaling_status = "scaling_up"
            else:
                self.scaling_status = "scaling_up" # Still show scaling if in cooldown but threshold met? 
                # Actually k8s shows 'ScalingUp' even if waiting. But let's show intent.

        elif util < (config.target_utilization * 0.5) and self.node.replicas > config.min_replicas:
            # Scale down if util is less than half the target
            if self.ticks_since_last_scale >= config.scale_down_cooldown_ticks:
                self.node.replicas -= 1
                self.ticks_since_last_scale = 0
                self.scaling_status = "scaling_down"
            else:
                self.scaling_status = "scaling_down"
        else:
            if self.ticks_since_last_scale > 5: # Small buffer before going back to idle
                self.scaling_status = "idle"

        self.metrics.scaling_status = self.scaling_status
        self.metrics.replica_count = self.node.replicas

    def _update_costs(self):
        config = self.node.cost_config
        if not config:
            # Default sensible costs by node type
            default_costs = {
                "api": (20.0, 0.5),      # Server instance
                "db": (150.0, 2.0),      # High compute/storage
                "cache": (30.0, 0.1),    # Memory intensive
                "queue": (40.0, 0.4),    # IO heavy
                "cdn": (0.0, 0.05),      # Mostly bandwidth
                "firewall": (50.0, 1.0), # Compute/network
                "lb": (20.0, 0.1),       # Network intensive
                "external": (0.0, 5.0),  # 3rd party API pricing
                "docker": (15.0, 0.3),   # Container
                "k8s": (100.0, 1.0),     # Clustered workloads
                "gateway": (30.0, 0.5),  # API Gateway
                "storage": (10.0, 0.1),  # Generic storage
                "dlq": (5.0, 0.1),       # Dead letter queue
                "splitter": (5.0, 0.1),  # Traffic splitter
            }
            base_m, var_m = default_costs.get(self.node.type, (10.0, 0.5))
            from app.simulation.schemas import CostConfig
            config = CostConfig(monthly_base_cost_per_replica=base_m, cost_per_million_requests=var_m)

        # Tick cost (base) = (monthly_base_cost_per_replica * replicas) / 2592000
        base_cost_tick = (config.monthly_base_cost_per_replica * self.node.replicas) / 2592000
        # Usage cost
        # cost is per million requests
        reqs_in_tick = self.metrics.effective_rps
        var_cost_tick = (reqs_in_tick * config.cost_per_million_requests) / 1000000
        
        self.metrics.tick_cost = base_cost_tick + var_cost_tick

    def _update_mesh_logic(self):
        config = self.node.mesh_config
        if not config:
            self.metrics.retry_rps = 0.0
            self.metrics.budget_exhausted = False
            return

        # Timeout Logic: Drop requests if latency exceeds timeout
        if config.timeout_ms > 0 and self.metrics.latency > config.timeout_ms:
            # All effective RPS are now failures due to timeout
            timed_out_rps = self.metrics.effective_rps
            self.metrics.dropped_requests += int(timed_out_rps)
            self.metrics.effective_rps = 0.0
            self.metrics.latency = config.timeout_ms # Cap latency at timeout for display
            self.metrics.status = "degraded"
            self.metrics.failure_reason = "Request Timeout"

        # Retry Logic: Amplify failed requests with Budgeting
        self.metrics.retry_rps = 0.0
        self.metrics.budget_exhausted = False
        
        if config.retries > 0 and self.metrics.dropped_requests > 0:
            # Calculate retry budget (e.g. 20% of normal traffic)
            # This prevents "Retry Storms" from overwhelming the system infinitely
            max_retry_rps = self.metrics.incoming_rps * (config.retry_budget_pct / 100.0)
            
            requested_retries = self.metrics.dropped_requests * config.retries
            
            if requested_retries > max_retry_rps:
                self.metrics.retry_rps = max_retry_rps
                self.metrics.budget_exhausted = True
            else:
                self.metrics.retry_rps = requested_retries

            # Application: Retries add load and latency
            retry_count = self.metrics.retry_rps / max(1, self.metrics.dropped_requests)
            self.metrics.latency += (retry_count * config.retry_backoff_ms)
            
            # Recalculate utilization with "retry load"
            total_capacity = self.node.capacity_rps * self.node.replicas
            if total_capacity > 0:
                augmented_load = self.metrics.incoming_rps + self.metrics.retry_rps
                self.metrics.utilization = min(1.0, augmented_load / total_capacity)
                
                if self.metrics.utilization >= 1.0:
                    self.metrics.bottleneck = True
                    self.metrics.status = "degraded"
                    if self.metrics.budget_exhausted:
                        self.metrics.failure_reason = "Retry Budget Exhausted"
                    else:
                        self.metrics.failure_reason = "Retry Storm"
        
    @abstractmethod
    def process_tick(self) -> NodeMetrics:
        """
        Calculates utilization, effective flow, and latency 
        based on the accumulated `incoming_rps` for the current tick.
        """
        pass
