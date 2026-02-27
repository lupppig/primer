<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/layers.svg" alt="Primer Logo" width="100"/>
  <h1>Primer: High-Performance Architecture Simulator</h1>
  <p><strong>Visually Design, Test, and Break Distributed Systems Before You Build Them.</strong></p>
</div>

<br />

![Primer Dashboard](image/dashboard.png)

## What is Primer?

Primer is an interactive, browser-based simulation tool that allows software engineers, architects, and technical leaders to design complex cloud architectures and simulate how they will perform under massive user traffic. 

Instead of writing thousands of lines of code just to discover your database will crash under an unexpected spike in visitors, Primer lets you **drag-and-drop** components (like Load Balancers, Databases, and API Servers) onto a canvas, connect them, and run real-time stress tests. It acts like a "flight simulator" for backend infrastructure, helping teams visualize bottlenecks, identify points of failure, and calculate estimated cloud costs before a single dollar is spent on real servers.

---

## Key Features

*   **Interactive Architecture Canvas:** A rich, responsive drag-and-drop interface to build complex systems.
*   **Real-time Traffic Simulation:** Push simulated traffic (up to hundreds of thousands of requests per second) through your imaginary system and watch it react instantly.
*   **Chaos Engineering:** Introduce random network failures, server crashes, and latency jitter to see if your system can survive the unexpected.
*   **Cost Estimation (Burn Rate):** Automatically calculates how much your infrastructure will cost in real life based on how much traffic you throw at it.
*   **Deep Analytics Dashboard:** A comprehensive breakdown of your system's performance, highlighting exactly which component caused a traffic jam.
*   **One-Click Export:** Instantly download high-quality PDFs, PNGs, SVGs, or animated GIFs of your architecture to share with stakeholders.

![Simulation Run](image/simulator_run.png)

---

## How It Works Under the Hood

Primer handles an immense amount of mathematical computation without freezing the browser. To achieve this, the application is split into two distinct halves: a blazing-fast Frontend for visualization and a heavy-duty Backend cluster for raw calculation.

### The Mathematics of Simulation
When you click "Start Simulation," Primer isn't just drawing pretty animations. The Backend engine runs a **Topological Sort** algorithm to understand the exact order in which data flows through your system (e.g., Load Balancer $\rightarrow$ Web Server $\rightarrow$ Database). 

For every virtual "second" (tick) of the simulation, the engine calculates:
1.  **Incoming Traffic:** The total volume of users arriving.
2.  **Effective Flow:** How much traffic a component can actually handle based on its *Capacity Limit*.
3.  **Latency:** Base delay + queuing delay (the traffic jam effect when incoming traffic exceeds capacity).
4.  **Drop Rate:** Requests that simply fail because the system is overwhelmed.

### Handling Heavy Computation
Calculating millions of virtual requests across dozens of connected components in real-time requires serious horsepower. This is solved by creating a **distributed worker pool**. Instead of one worker trying to do everything, Primer delegates the heavy math to multiple "Worker" programs running in the background.

![Simulation Analysis](image/simulation_analysis.png)

### The Tech Stack

Carefully chose technologies that excel at speed, reliability, and real-time communication:

*   **FastAPI & Python (Backend):** Powers the core API and the complex mathematical simulation engine. Python is perfect for the heavy data processing required per tick.
*   **NATS JetStream (Message Broker):** The central nervous system of Primer. When the frontend asks to run a simulation, the API sends a message to NATS. NATS instantly routes this massive job to an available background Worker, ensuring the API itself never slows down or crashes.
*   **PostgreSQL (Database):** The reliable vault. It permanently stores your architecture designs, run histories, and analytical data with guarantees that nothing gets lost or overwritten (thanks to atomic database operations).
*   **Redis (In-Memory Data Store):** Used for lightning-fast caching and managing active user sessions. When data is needed *now*, Redis is the answer.
*   **React & Zustand (Frontend):** The canvas is built using ReactFlow for smooth, interactive diagramming. Zustand manages the incredibly complex "state" of the dashboard (keeping track of thousands of changing numbers per second) without causing the browser to stutter.

---

## Architecture Design

### High-Level Event Flow

Primer is architected as an event-driven, distributed system:

1.  **Ingress & Visualization (Web Tier):** The React/Zustand frontend maintains the diagram state. When a simulation starts, it establishes an asynchronous WebSocket connection to the backend.
2.  **API Gateway & Router (FastAPI):** Receives HTTP requests for CRUD operations (saving architectures) and WebSocket connections for live simulation streams.
3.  **Command Broker (NATS JetStream):** 
    - The router pushes simulation jobs to a NATS subject. 
    - This decouples the API server from the heavy computational engine, ensuring identical throughput regardless of simulation load.
4.  **Simulation Engine (Python Workers):**
    - Headless background workers listen to NATS queues. 
    - They pull jobs, execute the Topological Sort to calculate component capacity, routing flow, and latency per tick. 
    - Results are published back to a reply queue.
5.  **State & Persistence:**
    - **Redis:** Manages fast ephemeral data like session locks and intermediate states.
    - **Postgres:** Permanently stores system designs, component topologies, and historic run metrics using atomic operations to prevent read-modify-write race conditions.
6.  **Egress:** The API Router consumes the calculated results from NATS and streams the telemetry directly down the open WebSocket connection to the browser for live animation.

### CQRS Inspired Execution

The system is engineered using a **CQRS (Command-Query Responsibility Segregation)** inspired pattern. 

1.  **The User Builds:** You design a system on the frontend.
2.  **The WebSocket Streams:** A continuous connection is opened between your browser and the server.
3.  **The Engine Computes:** The `Simulator` calculates metrics, applies retry logic, and determines failure cascades.
4.  **Live Updates:** Results are streamed back through the WebSocket instantly, painting realistic traffic animations on your screen.
5.  **Post-Analysis:** Background routines save the finalized run data into Postgres for deep-dive historical review.

---

## Getting Started (Local Development)

Docker is used to make getting started as simple as possible.

### Prerequisites
*   Docker & Docker Compose
*   Node.js (for frontend tooling)
*   Python (uv package manager recommended)

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/lupppig/primer.git
cd primer

# Spin up the entire infrastructure (DB, NATS, Redis, MinIO)
cd server
docker-compose up -d

# Install backend dependencies and run
uv sync
uv run uvicorn app.main:app --reload

# In a separate terminal, start the frontend
cd web
npm install
npm run dev
```

Visit `http://localhost:5173` to start simulating!
