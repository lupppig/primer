import asyncio
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from starlette.websockets import WebSocketState
from pydantic import ValidationError

from sqlalchemy import select
from app.core.nats import get_nats_js
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

from app.simulation.schemas import SimulationInput
from app.simulation.engine import Simulator
from app.simulation.persistence import SimulationRun, SimulationTick
from app.core.exceptions import ValidationException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulation", tags=["simulation"])

@router.get("/history/{design_id}")
async def get_design_simulation_history(design_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Returns a list of recent simulation runs for a specific design.
    """
    result = await db.execute(
        select(SimulationRun)
        .where(SimulationRun.design_id == design_id)
        .order_by(SimulationRun.start_time.desc())
        .limit(10)
    )
    runs = result.scalars().all()
    return runs

@router.get("/history/run/{run_id}")
async def get_simulation_run_ticks(run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Returns all telemetry ticks for a specific simulation run.
    """
    result = await db.execute(
        select(SimulationTick)
        .where(SimulationTick.run_id == run_id)
        .order_by(SimulationTick.tick_index.asc())
    )
    ticks = result.scalars().all()
    return ticks


@router.post("/run")
async def run_simulation_sync(sim_input: SimulationInput):
    """
    Executes a single snapshot compute tick of the simulation.
    Ideal for lightweight analysis.
    """
    try:
        simulator = Simulator(session_id="sync_run")
        result = simulator.process_tick(sim_input.graph, sim_input.incoming_rps)
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
        data = await websocket.receive_text()
        
        try:
            payload = json.loads(data)
            sim_input = SimulationInput(**payload)
        except (json.JSONDecodeError, ValidationError) as e:
            await websocket.send_json({"error": "Invalid initial configuration payload", "details": str(e)})
            await websocket.close(code=1003)
            return

        client_disconnected = asyncio.Event()

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
                client_disconnected.set()
            except Exception as e:
                logger.error(f"Error in websocket listener: {e}")
                client_disconnected.set()

        listen_task = asyncio.create_task(listen_for_updates())
        
        js = await get_nats_js()
        client_id = str(uuid.uuid4())
        reply_topic = f"simulation.results.{client_id}"
        
        sub = await js.subscribe(reply_topic)

        current_tick = 0
        try:
            while not client_disconnected.is_set() and websocket.application_state == WebSocketState.CONNECTED:
                try:
                    payload = sim_input.model_dump()
                    payload["current_tick"] = current_tick
                    
                    await js.publish(
                        "simulation.requests", 
                        json.dumps(payload).encode(),
                        headers={"reply-to": reply_topic}
                    )
                    
                    try:
                        msg = await sub.next_msg(timeout=5.0)
                        
                        try:
                            await websocket.send_text(msg.data.decode())
                        except RuntimeError as e:
                            if "websocket" in str(e).lower() or "asgi" in str(e).lower():
                                logger.info("WebSocket closed by client during send, ending simulation loop.")
                                client_disconnected.set()
                                break
                            raise  # Re-raise if it's a different RuntimeError
                            
                        current_tick += 1
                        
                        interval = 1.0 / (sim_input.sim_speed or 1.0)
                        await asyncio.sleep(interval)
                        
                    except Exception as e:
                        if not client_disconnected.is_set():
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
