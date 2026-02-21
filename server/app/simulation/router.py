import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from starlette.websockets import WebSocketState
from pydantic import ValidationError

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

        # Start streaming simulation ticks
        current_tick = 0
        while websocket.application_state == WebSocketState.CONNECTED:
            try:
                # Compute the next tick based on current state
                # TODO (Phase 2): Apply specific time-series traffic patterns here
                result = SimulationEngine.compute_tick(
                    graph=sim_input.graph,
                    incoming_rps=sim_input.incoming_rps, 
                    current_time=current_tick
                )
                
                await websocket.send_text(result.model_dump_json())
                
                current_tick += 1
                
                # Sleep to prevent blocking the event loop and simulate realtime progress (e.g. 1 tick = 1 second)
                await asyncio.sleep(1.0)
                
            except ValueError as e:
                 await websocket.send_json({"error": "Simulation Error", "details": str(e)})
                 await asyncio.sleep(5)  # Pause on error before retrying or closing
                 break

    except WebSocketDisconnect:
        logger.info(f"WebSocket Client disconnected: {websocket.client}")
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        if websocket.application_state == WebSocketState.CONNECTED:
            await websocket.close(code=1011)
