import asyncio
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from starlette.websockets import WebSocketState
from pydantic import ValidationError

from app.core.nats import get_nats_js

from app.simulation.schemas import SimulationInput
from app.simulation.engine import SimulationEngine
from app.core.exceptions import ValidationException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulation", tags=["simulation"])

@router.post("/run")
async def run_simulation_sync(sim_input: SimulationInput):
    """
    Executes a single snapshot compute tick of the simulation.
    Ideal for lightweight analysis.
    """
    try:
        # Currently defaults to tick 0
        result = SimulationEngine.compute_tick(sim_input.graph, sim_input.incoming_rps)
        return result
    except ValueError as e:
        raise ValidationException(str(e))

@router.websocket("/ws")
async def simulation_websocket(websocket: WebSocket):
    """
    Streams simulation ticks back to the client continuously.
    Client sends initial `SimulationInput` JSON payload to start.
    """
    await websocket.accept()
    logger.info(f"WebSocket Client connected: {websocket.client}")
    
    try:
        # Wait for the initial configuration
        data = await websocket.receive_text()
        
        try:
            payload = json.loads(data)
            sim_input = SimulationInput(**payload)
        except (json.JSONDecodeError, ValidationError) as e:
            await websocket.send_json({"error": "Invalid initial configuration payload", "details": str(e)})
            await websocket.close(code=1003)
            return

        async def listen_for_updates():
            nonlocal sim_input
            try:
                while True:
                    new_data = await websocket.receive_text()
                    try:
                        new_payload = json.loads(new_data)
                        sim_input = SimulationInput(**new_payload)
                        logger.info("Simulation config updated via hot reload")
                    except (json.JSONDecodeError, ValidationError) as e:
                        logger.error(f"Failed to parse hot reload payload: {e}")
            except WebSocketDisconnect:
                pass
            except Exception as e:
                logger.error(f"Error in websocket listener: {e}")

        listen_task = asyncio.create_task(listen_for_updates())
        
        # NATS Integration
        js = await get_nats_js()
        client_id = str(uuid.uuid4())
        reply_topic = f"simulation.results.{client_id}"
        
        # Subscribe to our specific reply topic
        sub = await js.subscribe(reply_topic)

        # Start streaming simulation ticks via NATS Worker
        current_tick = 0
        try:
            while websocket.application_state == WebSocketState.CONNECTED:
                try:
                    # Prepare payload for worker
                    payload = sim_input.model_dump()
                    payload["current_tick"] = current_tick
                    
                    # Publish to worker stream, injecting the reply subject
                    await js.publish(
                        "simulation.requests", 
                        json.dumps(payload).encode(),
                        reply=reply_topic
                    )
                    
                    # Wait for the worker to process and publish back (timeout gracefully)
                    try:
                        msg = await sub.next_msg(timeout=5.0)
                        await websocket.send_text(msg.data.decode())
                        current_tick += 1
                        
                        # Rate limit to 1 simulated tick per second
                        await asyncio.sleep(1.0)
                        
                    except Exception as e:
                        logger.warning(f"Timeout or error waiting for NATS reply on {reply_topic}: {e}")
                        await asyncio.sleep(1.0) # Prevent tight loop on failure
                        
                except ValueError as e:
                     logger.exception("Simulation Error Caught")
                     await websocket.send_json({"error": "Simulation Error", "details": str(e)})
                     await asyncio.sleep(5)  # Pause on error before retrying or closing
                     break
        finally:
            listen_task.cancel()
            await sub.unsubscribe()

    except WebSocketDisconnect:
        logger.info(f"WebSocket Client disconnected: {websocket.client}")
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        if websocket.application_state == WebSocketState.CONNECTED:
            await websocket.close(code=1011)
