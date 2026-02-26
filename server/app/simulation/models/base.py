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
        
    def reset_tick_metrics(self):
        self.metrics.incoming_rps = 0.0
        self.metrics.effective_rps = 0.0
        self.metrics.utilization = 0.0
        self.metrics.latency = 0.0
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
            self.metrics.tick_cost = 0.0
            return

        # Monthly seconds = 30 * 24 * 3600 = 2,592,000
        # Tick cost (base) = (monthly_base_cost_per_replica * replicas) / 2592000
        base_cost_tick = (config.monthly_base_cost_per_replica * self.node.replicas) / 2592000
        
        # Variable cost: (effective_rps * cost_per_million_requests) / 1,000,000
        # Since RPS is per second and 1 tick = 1 second
        var_cost_tick = (self.metrics.effective_rps * config.cost_per_million_requests) / 1000000
        
        self.metrics.tick_cost = base_cost_tick + var_cost_tick

    def _update_mesh_logic(self):
        config = self.node.mesh_config
        if not config:
            self.metrics.retry_rps = 0.0
            return

        # 1. Timeout Logic: Drop requests if latency exceeds timeout
        if config.timeout_ms > 0 and self.metrics.latency > config.timeout_ms:
            # All effective RPS are now failures due to timeout
            timed_out_rps = self.metrics.effective_rps
            self.metrics.dropped_requests += int(timed_out_rps)
            self.metrics.effective_rps = 0.0
            self.metrics.latency = config.timeout_ms # Cap latency at timeout for display
            self.metrics.status = "degraded"
            self.metrics.failure_reason = "Request Timeout"

        # 2. Retry Logic: Amplify failed requests
        if config.retries > 0 and self.metrics.dropped_requests > 0:
            # We retry the failed requests
            retry_count = min(config.retries, 5) # Safety cap
            self.metrics.retry_rps = self.metrics.dropped_requests * retry_count
            
            # Application: Retries add load and latency
            # We add backoff penalty to current latency
            self.metrics.latency += (retry_count * config.retry_backoff_ms)
            
            # Recalculate utilization with "retry load"
            total_capacity = self.node.capacity_rps * self.node.replicas
            if total_capacity > 0:
                augmented_load = self.metrics.incoming_rps + self.metrics.retry_rps
                self.metrics.utilization = min(1.0, augmented_load / total_capacity)
                
                # If we have retries, some might succeed?
                # For simplicity in this tick-based engine, we treat retries as "load amplification"
                # that makes bottlenecks worse.
                if self.metrics.utilization >= 1.0:
                    self.metrics.bottleneck = True
                    self.metrics.status = "degraded"
                    self.metrics.failure_reason = "Retry Storm"
        
    @abstractmethod
    def process_tick(self) -> NodeMetrics:
        """
        Calculates utilization, effective flow, and latency 
        based on the accumulated `incoming_rps` for the current tick.
        """
        pass
