import requests
import json

# The simulation/run endpoint has no auth requirement (it's a stateless compute endpoint)
headers = {
    "Content-Type": "application/json",
    "Origin": "http://localhost:5173",
    "Referer": "http://localhost:5173/"
}

# Build the SimGraph matching SimulationInput schema
sim_payload = {
    "incoming_rps": 10000,
    "graph": {
        "nodes": {
            "node_api_gw": {
                "id": "node_api_gw",
                "type": "api",
                "capacity_rps": 20000,
                "base_latency_ms": 10,
                "replicas": 2
            },
            "node_theater_svc": {
                "id": "node_theater_svc",
                "type": "api",
                "capacity_rps": 5000,
                "base_latency_ms": 20,
                "replicas": 3
            },
            "node_seat_rsrv": {
                "id": "node_seat_rsrv",
                "type": "api",
                "capacity_rps": 12000,
                "base_latency_ms": 30,
                "replicas": 5
            },
            "node_checkout_svc": {
                "id": "node_checkout_svc",
                "type": "api",
                "capacity_rps": 4000,
                "base_latency_ms": 80,
                "replicas": 3
            },
            "node_redis_cluster": {
                "id": "node_redis_cluster",
                "type": "cache",
                "capacity_rps": 25000,
                "base_latency_ms": 2,
                "replicas": 6
            },
            "node_postgres": {
                "id": "node_postgres",
                "type": "db",
                "capacity_rps": 5000,
                "base_latency_ms": 15,
                "replicas": 3
            },
            "node_kafka": {
                "id": "node_kafka",
                "type": "queue",
                "capacity_rps": 20000,
                "base_latency_ms": 5,
                "replicas": 3,
                "queue_size": 50000
            },
            "node_ticket_gen": {
                "id": "node_ticket_gen",
                "type": "api",
                "capacity_rps": 2000,
                "base_latency_ms": 200,
                "replicas": 10
            }
        },
        "edges": [
            {"id": "e_gw_catalog",    "source": "node_api_gw",     "target": "node_theater_svc",  "traffic_percent": 0.60},
            {"id": "e_gw_seat",       "source": "node_api_gw",     "target": "node_seat_rsrv",    "traffic_percent": 0.30},
            {"id": "e_gw_checkout",   "source": "node_api_gw",     "target": "node_checkout_svc", "traffic_percent": 0.10},
            {"id": "e_catalog_redis", "source": "node_theater_svc","target": "node_redis_cluster","traffic_percent": 0.80},
            {"id": "e_catalog_pg",    "source": "node_theater_svc","target": "node_postgres",     "traffic_percent": 0.20},
            {"id": "e_seat_redis",    "source": "node_seat_rsrv",  "target": "node_redis_cluster","traffic_percent": 1.00},
            {"id": "e_checkout_kafka","source": "node_checkout_svc","target": "node_kafka",        "traffic_percent": 1.00},
            {"id": "e_kafka_ticket",  "source": "node_kafka",      "target": "node_ticket_gen",   "traffic_percent": 1.00}
        ]
    }
}

res = requests.post(
    "http://localhost:8000/api/v1/simulation/run",
    headers=headers,
    json=sim_payload
)

if res.status_code != 200:
    print(f"Simulation failed: {res.status_code} {res.text}")
    exit(1)

result = res.json()
graph_metrics = result["graph_metrics"]
nodes = result["nodes"]

print("=" * 60)
print("   10k RPS THEATER BOOKING SYSTEM — SIMULATION RESULTS")
print("=" * 60)
print(f"\n📊 OVERALL METRICS")
print(f"   Total Throughput: {graph_metrics['total_throughput']:,.0f} RPS")
print(f"   Max Latency:      {graph_metrics['max_latency']:.1f} ms")
print(f"   Bottleneck Nodes: {', '.join(graph_metrics['bottleneck_nodes']) or 'None ✅'}")

node_labels = {
    "node_api_gw":       "API Gateway",
    "node_theater_svc":  "Theater Catalog Svc",
    "node_seat_rsrv":    "Seat Reservation Svc",
    "node_checkout_svc": "Booking & Payment Svc",
    "node_redis_cluster":"Redis Cluster",
    "node_postgres":     "Postgres (Primary)",
    "node_kafka":        "Kafka EventBus",
    "node_ticket_gen":   "Ticket Generation Worker",
}

print(f"\n🔍 PER-NODE BREAKDOWN")
print(f"  {'Node':<28} {'Incoming':>10} {'Effective':>10} {'Util%':>7} {'Latency':>9} {'Status':>10}")
print(f"  {'-'*28} {'-'*10} {'-'*10} {'-'*7} {'-'*9} {'-'*10}")

for node_id, metrics in nodes.items():
    label = node_labels.get(node_id, node_id)
    bottleneck_flag = "🔴 BOTTLENECK" if metrics["bottleneck"] else "🟢 OK"
    print(f"  {label:<28} {metrics['incoming_rps']:>10,.0f} {metrics['effective_rps']:>10,.0f} {metrics['utilization']:>6.1%} {metrics['latency']:>8.1f}ms {bottleneck_flag:>10}")

print("\n" + "=" * 60)
