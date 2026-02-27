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
from app.core.config import settings

from datetime import datetime, timedelta
from app.simulation.schemas import SimulationInput, ExportRequest, ExportResponse, ExportStatus
from app.simulation.engine import Simulator
from app.simulation.persistence import SimulationRun, SimulationTick, SimulationExport
from app.core.storage import storage_service
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

@router.post("/export", response_model=ExportResponse)
async def create_export_request(
    request: ExportRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    Creates an export record and queues the job via NATS.
    """
    # Create DB record
    expires_at = datetime.utcnow() + timedelta(hours=24)
    export_record = SimulationExport(
        design_id=request.design_id,
        format=request.format,
        status=ExportStatus.QUEUED,
        expires_at=expires_at
    )
    db.add(export_record)
    await db.commit()
    await db.refresh(export_record)

    # Queue via NATS
    js = await get_nats_js()
    payload = {
        "export_id": str(export_record.id),
        "design_id": str(request.design_id),
        "format": request.format,
        "options": request.options
    }
    await js.publish("simulation.export.requests", json.dumps(payload).encode())

    return export_record

from fastapi.responses import Response

@router.get("/export/{export_id}/download")
async def download_export(
    export_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Securely streams the export file without exposing storage credentials.
    """
    export_record = await db.get(SimulationExport, export_id)
    if not export_record or not export_record.file_url:
        raise ValidationException("Export not found or not ready")
    
    try:
        obj = await storage_service.get_object(export_record.file_url)
        
        filename = f"primer_export_{export_id}.{export_record.format.lower()}"
        return Response(
            content=obj["body"],
            media_type=obj["content_type"],
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"Failed to stream export {export_id}: {e}")
        raise ValidationException("Could not retrieve file from storage.")

@router.get("/export/{export_id}", response_model=ExportResponse)
async def get_export_status(
    export_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the status and a clean download link (if completed).
    """
    export_record = await db.get(SimulationExport, export_id)
    if not export_record:
        raise ValidationException("Export request not found")

    # Return a clean proxy URL instead of a signed MinIO URL in the RESPONSE only
    response_data = ExportResponse.model_validate(export_record)
    if export_record.status == ExportStatus.COMPLETED and export_record.file_url:
        # Construct the proxy URL for the response without modifying the DB record
        response_data.file_url = f"{settings.API_V1_STR}/simulation/export/{export_id}/download"

    return response_data

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
            logger.info(f"Received simulation payload for design: {payload.get('design_id')}, speed: {payload.get('sim_speed')}")
            sim_input = SimulationInput(**payload)
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"WebSocket payload validation failed: {str(e)}")
            await websocket.send_json({"error": "Invalid initial configuration payload", "details": str(e)})
            await websocket.close(code=1003)
            return

        sim_lock = asyncio.Lock()
        client_disconnected = asyncio.Event()

        async def listen_for_updates():
            nonlocal sim_input
            try:
                while True:
                    new_data = await websocket.receive_text()
                    try:
                        new_payload = json.loads(new_data)
                        new_input = SimulationInput(**new_payload)
                        async with sim_lock:
                            sim_input = new_input
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
                    async with sim_lock:
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
                            res_data = json.loads(msg.data.decode())
                            # Correlation ID check: Discard data from late previous ticks
                            if res_data.get("time") != current_tick + 1:
                                logger.warning(f"Discarding late NATS reply: got tick {res_data.get('time')}, expected {current_tick + 1}")
                                continue
                                
                            await websocket.send_text(json.dumps(res_data))
                        except RuntimeError as e:
                            if "websocket" in str(e).lower() or "asgi" in str(e).lower():
                                logger.info("WebSocket closed by client during send, ending simulation loop.")
                                client_disconnected.set()
                                break
                            raise  # Re-raise if it's a different RuntimeError
                            
                        current_tick += 1
                        
                        async with sim_lock:
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
