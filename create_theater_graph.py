import requests
import json
import uuid

session = requests.Session()
# Add CSRF required headers for the backend
headers = {
    "Origin": "http://localhost:5173",
    "Referer": "http://localhost:5173/",
    "Content-Type": "application/json"
}

login_payload = {
    "email": "kami@gmail.com",
    "password": "Blueoak123!"
}
res = session.post("http://localhost:8000/api/v1/auth/login", json=login_payload, headers=headers)
if res.status_code != 200:
    print(f"Login failed: {res.status_code} {res.text}")
    exit(1)

print("Logged in successfully!")

# Extract the access_token cookie
access_token = res.cookies.get("access_token")
if not access_token:
    print("No access_token cookie received!")
    exit(1)

cookies = {"access_token": access_token}

# --- Nodes Layout ---
# Logical Groups (VPCs and Clusters)
nodes = [
    # VPC 1: Edge & Ingress
    {
        "id": "group_ingress",
        "type": "groupNode",
        "position": {"x": 50, "y": 50},
        "data": {"label": "Edge & Ingress Network"},
        "width": 1000,
        "height": 280
    },
    # VPC 2: Service Mesh & Compute
    {
        "id": "group_compute",
        "type": "groupNode",
        "position": {"x": 50, "y": 380},
        "data": {"label": "Microservices Cluster (EKS)"},
        "width": 1000,
        "height": 400
    },
    # VPC 3: Persistence Tier
    {
        "id": "group_persistence",
        "type": "groupNode",
        "position": {"x": 50, "y": 830},
        "data": {"label": "Data & Event Persistence Tier"},
        "width": 1000,
        "height": 300
    },

    # --- Ingress Tier Nodes ---
    {
        "id": "node_cdn",
        "type": "techNode",
        "parentNode": "group_ingress",
        "position": {"x": 400, "y": 50},
        "data": {
            "label": "CloudFront CDN",
            "originalType": "AWS CloudFront",
            "capacity_rps": 100000,
            "base_latency_ms": 2,
            "replicas": 1
        }
    },
    {
        "id": "node_elb",
        "type": "techNode",
        "parentNode": "group_ingress",
        "position": {"x": 400, "y": 130},
        "data": {
            "label": "Application Load Balancer",
            "originalType": "AWS ELB",
            "capacity_rps": 50000,
            "base_latency_ms": 5,
            "replicas": 3
        }
    },
    {
        "id": "node_nginx",
        "type": "techNode",
        "parentNode": "group_ingress",
        "position": {"x": 400, "y": 210},
        "data": {
            "label": "Kong Gateway",
            "originalType": "Nginx",
            "capacity_rps": 30000,
            "base_latency_ms": 10,
            "replicas": 4
        }
    },

    # --- Compute Tier Nodes ---
    {
        "id": "node_theater_svc",
        "type": "techNode",
        "parentNode": "group_compute",
        "position": {"x": 50, "y": 80},
        "data": {
            "label": "Movie Catalog",
            "originalType": "Docker",
            "capacity_rps": 10000,
            "base_latency_ms": 15,
            "replicas": 6
        }
    },
    {
        "id": "node_catalog_cache",
        "type": "techNode",
        "parentNode": "group_compute",
        "position": {"x": 50, "y": 200},
        "data": {
            "label": "Catalog Redis",
            "originalType": "Redis",
            "capacity_rps": 50000,
            "base_latency_ms": 1,
            "replicas": 3
        }
    },
    {
        "id": "node_seat_rsrv",
        "type": "techNode",
        "parentNode": "group_compute",
        "position": {"x": 350, "y": 80},
        "data": {
            "label": "Seat Allocation",
            "originalType": "Kubernetes",
            "capacity_rps": 20000,
            "base_latency_ms": 25,
            "replicas": 10
        }
    },
    {
        "id": "node_checkout_svc",
        "type": "techNode",
        "parentNode": "group_compute",
        "position": {"x": 700, "y": 80},
        "data": {
            "label": "Payment Processing",
            "originalType": "Docker",
            "capacity_rps": 10000,
            "base_latency_ms": 120,
            "replicas": 8
        }
    },
    {
        "id": "node_envoy",
        "type": "techNode",
        "parentNode": "group_compute",
        "position": {"x": 350, "y": 220},
        "data": {
            "label": "Istio Ingress",
            "originalType": "Envoy",
            "capacity_rps": 40000,
            "base_latency_ms": 2,
            "replicas": 1
        }
    },

    # --- Persistence Tier Nodes ---
    {
        "id": "node_redis_cluster",
        "type": "techNode",
        "parentNode": "group_persistence",
        "position": {"x": 100, "y": 80},
        "data": {
            "label": "Session Redis",
            "originalType": "Redis",
            "capacity_rps": 100000,
            "base_latency_ms": 1,
            "replicas": 5
        }
    },
    {
        "id": "node_postgres",
        "type": "techNode",
        "parentNode": "group_persistence",
        "position": {"x": 400, "y": 80},
        "data": {
            "label": "Main PostgreSQL Cluster",
            "originalType": "PostgreSQL",
            "capacity_rps": 15000,
            "base_latency_ms": 20,
            "replicas": 6
        }
    },
    {
        "id": "node_kafka",
        "type": "techNode",
        "parentNode": "group_persistence",
        "position": {"x": 700, "y": 80},
        "data": {
            "label": "Message Bus",
            "originalType": "Apache Kafka",
            "capacity_rps": 50000,
            "base_latency_ms": 5,
            "replicas": 3,
            "queue_size": 200000
        }
    },
    {
        "id": "node_ticket_gen",
        "type": "techNode",
        "parentNode": "group_persistence",
        "position": {"x": 700, "y": 200},
        "data": {
            "label": "Fulfillment Workers",
            "originalType": "Workers",
            "capacity_rps": 8000,
            "base_latency_ms": 50,
            "replicas": 15
        }
    }
]

edges = [
    # Ingress Chain
    {"id": "e_cdn_elb", "source": "node_cdn", "target": "node_elb", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 1.0, "style": {"strokeWidth": 5}},
    {"id": "e_elb_nginx", "source": "node_elb", "target": "node_nginx", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 1.0, "style": {"strokeWidth": 4}},
    
    # Gateway -> Services (Scale traffic)
    {"id": "e_nginx_catalog", "source": "node_nginx", "target": "node_theater_svc", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 0.65, "style": {"strokeWidth": 2}},
    {"id": "e_nginx_seat", "source": "node_nginx", "target": "node_seat_rsrv", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 0.25, "style": {"strokeWidth": 2}},
    {"id": "e_nginx_checkout", "source": "node_nginx", "target": "node_checkout_svc", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 0.10, "style": {"strokeWidth": 2}},
    
    # Service Caching
    {"id": "e_catalog_redis", "source": "node_theater_svc", "target": "node_catalog_cache", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 1.0},

    # Internal Communication through Envoy
    {"id": "e_seat_envoy", "source": "node_seat_rsrv", "target": "node_envoy", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 1.0},
    {"id": "e_envoy_redis", "source": "node_envoy", "target": "node_redis_cluster", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 0.80},
    {"id": "e_envoy_postgres", "source": "node_envoy", "target": "node_postgres", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 0.20},
    
    # Checkout Chain
    {"id": "e_checkout_kafka", "source": "node_checkout_svc", "target": "node_kafka", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 1.0},
    {"id": "e_kafka_ticket", "source": "node_kafka", "target": "node_ticket_gen", "sourceHandle": "bottom", "targetHandle": "top", "traffic_percent": 1.0}
]

design_payload = {
    "name": "Ultra-Scalable Theater Booking (10k RPS Ready)",
    "description": "Enterprise microservices architecture optimized for extreme loads, with dedicated caching and high-availability tiers.",
    "nodes": nodes,
    "edges": edges,
    "settings": {
        "targetRps": 10000
    }
}

res = session.post("http://localhost:8000/api/v1/canvas/design", headers=headers, cookies=cookies, json=design_payload)
if res.status_code in [200, 201]:
    print(f"Successfully created Senior Tier design! ID: {res.json()['id']}")
else:
    print(f"Failed to create design: {res.status_code} {res.text}")
