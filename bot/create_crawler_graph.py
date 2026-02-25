import requests
import json
import uuid

session = requests.Session()
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

access_token = res.cookies.get("access_token")
cookies = {"access_token": access_token}

# --- Nodes Layout (HORIZONTAL LEFT-TO-RIGHT) ---
nodes = [
    # VPC 1: Global Crawler Ingress (Left)
    {
        "id": "group_crawlers",
        "type": "groupNode",
        "position": {"x": 50, "y": 50},
        "data": {"label": "Global Crawler Ingress"},
        "width": 350,
        "height": 700
    },
    # VPC 2: Distributed Processing Cluster (Center)
    {
        "id": "group_processing",
        "type": "groupNode",
        "position": {"x": 500, "y": 50},
        "data": {"label": "Distributed Processing Cluster (K8s)"},
        "width": 550,
        "height": 700
    },
    # VPC 3: Search & Petabyte Storage (Right)
    {
        "id": "group_storage",
        "type": "groupNode",
        "position": {"x": 1150, "y": 50},
        "data": {"label": "Search & Petabyte Storage Layer"},
        "width": 450,
        "height": 700
    },

    # --- Crawler fleet ---
    {
        "id": "node_crawler_nodes",
        "type": "techNode",
        "parentNode": "group_crawlers",
        "position": {"x": 50, "y": 300},
        "data": {
            "label": "Edge Crawler Fleet",
            "originalType": "Workers",
            "capacity_rps": 200000,
            "base_latency_ms": 150,
            "replicas": 500
        }
    },

    # --- Processing Layer ---
    {
        "id": "node_url_frontier",
        "type": "techNode",
        "parentNode": "group_processing",
        "position": {"x": 50, "y": 100},
        "data": {
            "label": "Distributed Frontier",
            "originalType": "Redis",
            "capacity_rps": 500000,
            "base_latency_ms": 1,
            "replicas": 32
        }
    },
    {
        "id": "node_content_parser",
        "type": "techNode",
        "parentNode": "group_processing",
        "position": {"x": 50, "y": 300},
        "data": {
            "label": "Content Ingestion Engine",
            "originalType": "Generic Service",
            "capacity_rps": 300000,
            "base_latency_ms": 30,
            "replicas": 100
        }
    },
    {
        "id": "node_dedupe_svc",
        "type": "techNode",
        "parentNode": "group_processing",
        "position": {"x": 50, "y": 500},
        "data": {
            "label": "URL Deduplication Service",
            "originalType": "Docker",
            "capacity_rps": 400000,
            "base_latency_ms": 5,
            "replicas": 24
        }
    },
    {
        "id": "node_event_stream",
        "type": "techNode",
        "parentNode": "group_processing",
        "position": {"x": 320, "y": 300},
        "data": {
            "label": "Unified Event Bus",
            "originalType": "Apache Kafka",
            "capacity_rps": 500000,
            "base_latency_ms": 5,
            "replicas": 24,
            "queue_size": 2000000
        }
    },

    # --- Persistence & Search ---
    {
        "id": "node_elasticsearch",
        "type": "techNode",
        "parentNode": "group_storage",
        "position": {"x": 80, "y": 300},
        "data": {
            "label": "Search Index Cluster",
            "originalType": "VscSearch",
            "capacity_rps": 200000,
            "base_latency_ms": 25,
            "replicas": 48
        }
    },
    {
        "id": "node_object_store",
        "type": "techNode",
        "parentNode": "group_storage",
        "position": {"x": 80, "y": 100},
        "data": {
            "label": "Blob Storage Layer",
            "originalType": "HardDrive",
            "capacity_rps": 500000,
            "base_latency_ms": 80,
            "replicas": 20
        }
    },
    {
        "id": "node_search_api",
        "type": "techNode",
        "parentNode": "group_storage",
        "position": {"x": 80, "y": 500},
        "data": {
            "label": "Search Gateway API",
            "originalType": "Nginx",
            "capacity_rps": 200000,
            "base_latency_ms": 10,
            "replicas": 16
        }
    }
]

edges = [
    # Horizontal Flow (Right to Left)
    {"id": "e_spiders_frontier", "source": "node_crawler_nodes", "target": "node_url_frontier", "sourceHandle": "right", "targetHandle": "left", "traffic_percent": 1.0, "style": {"strokeWidth": 6}},
    {"id": "e_frontier_parser", "source": "node_url_frontier", "target": "node_content_parser", "sourceHandle": "right", "targetHandle": "left", "traffic_percent": 1.0, "style": {"strokeWidth": 4}},
    
    # Parser to Dedupe & Stream
    {"id": "e_parser_dedupe", "source": "node_content_parser", "target": "node_dedupe_svc", "sourceHandle": "right", "targetHandle": "left", "traffic_percent": 1.0},
    {"id": "e_parser_stream", "source": "node_content_parser", "target": "node_event_stream", "sourceHandle": "right", "targetHandle": "left", "traffic_percent": 1.0, "style": {"strokeWidth": 4}},
    
    # Events to Persistence
    {"id": "e_stream_index", "source": "node_event_stream", "target": "node_elasticsearch", "sourceHandle": "right", "targetHandle": "left", "traffic_percent": 1.0, "style": {"strokeWidth": 4}},
    {"id": "e_stream_s3", "source": "node_event_stream", "target": "node_object_store", "sourceHandle": "right", "targetHandle": "left", "traffic_percent": 0.5},
    
    # Search flow
    {"id": "e_api_index", "source": "node_search_api", "target": "node_elasticsearch", "sourceHandle": "right", "targetHandle": "left", "traffic_percent": 1.0}
]

design_payload = {
    "name": "100k RPS Ultra-Scale Distributed Crawler",
    "description": "Enterprise-scale horizontal architecture designed for 100,000 requests per second across global zones.",
    "nodes": nodes,
    "edges": edges,
    "settings": {
        "targetRps": 100000
    }
}

res = session.post("http://localhost:8000/api/v1/canvas/design", headers=headers, cookies=cookies, json=design_payload)
if res.status_code in [200, 201]:
    print(f"Successfully created 100k RPS design! ID: {res.json()['id']}")
else:
    print(f"Failed to create design: {res.status_code} {res.text}")
