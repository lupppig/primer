import asyncio
import json
import logging
from datetime import datetime
from nats.errors import TimeoutError
from pydantic import ValidationError

from app.core.nats import get_nats_js, nats_client
from app.simulation.engine import Simulator
from app.simulation.schemas import SimulationInput
from app.simulation.persistence import SimulationRun, SimulationTick
from sqlalchemy import update, func
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

async def start_simulation_worker():
    """
    Background worker that continuously pulls simulation jobs from NATS JetStream,
    computes the tick, and replies to the specified topic.
    """
    js = await get_nats_js()
    logger.info("Simulation Worker started. Listening for jobs on 'simulation.requests'...")
    
    simulators = {}
    active_runs = {} 
    
    try:
        sub = await js.pull_subscribe("simulation.requests", durable="sim_worker")
    except Exception as e:
        logger.error(f"Failed to create pull subscription: {e}")
        return

    while True:
        try:
            if nats_client.nc and nats_client.nc.is_closed:
                break
                
            msgs = await sub.fetch(1, timeout=1.0)
            for msg in msgs:
                try:
                    payload = json.loads(msg.data.decode())
                    sim_input = SimulationInput(**payload)
                    reply_topic = msg.headers.get("reply-to") if msg.headers else None
                    current_tick = payload.get("current_tick", 0)
                    
                    if not reply_topic:
                        logger.warning("Received simulation request without a 'reply-to' header. Ignoring.")
                        await msg.ack()
                        continue
                        
                    if reply_topic not in simulators:
                        simulators[reply_topic] = Simulator(session_id=reply_topic)
                        
                    simulator = simulators[reply_topic]

                    run_id = active_runs.get(reply_topic)
                    
                    async with AsyncSessionLocal() as db:
                        if current_tick == 0 or not run_id:
                            if sim_input.design_id:
                                new_run = SimulationRun(
                                    design_id=sim_input.design_id,
                                    status="running",
                                    start_time=datetime.utcnow()
                                )
                                db.add(new_run)
                                await db.commit()
                                await db.refresh(new_run)
                                run_id = str(new_run.id)
                                active_runs[reply_topic] = run_id
                        
                        result = simulator.process_tick(
                            graph=sim_input.graph,
                            incoming_rps=sim_input.incoming_rps,
                            load_profile=sim_input.load_profile
                        )
                        
                        if run_id:
                            tick = SimulationTick(
                                run_id=run_id,
                                tick_index=result.time,
                                metrics=result.model_dump()
                            )
                            db.add(tick)
                            
                            # Atomic update for run metrics to prevent race conditions
                            stmt = (
                                update(SimulationRun)
                                .where(SimulationRun.id == run_id)
                                .values(
                                    total_rps_peak=func.greatest(SimulationRun.total_rps_peak, result.graph_metrics.total_throughput),
                                    avg_latency=func.coalesce(
                                        (SimulationRun.avg_latency + result.graph_metrics.max_latency) / 2,
                                        result.graph_metrics.max_latency
                                    )
                                )
                            )
                            await db.execute(stmt)
                            await db.commit()
                    
                    await js.publish(reply_topic, result.model_dump_json().encode())
                    
                    await msg.ack()
                    
                except (json.JSONDecodeError, ValidationError) as e:
                    logger.error(f"Worker received malformed payload: {e}")
                    await msg.ack() # Ack so it doesn't get redelivered and clog the queue
                except Exception as e:
                    logger.exception(f"Error computing simulation tick: {e}")
                    # Don't ack so it can be retried if it's a transient failure, 
                    #TODO: but in a prod  we'd want a dead-letter queue.
                    await msg.nak()
                    
        except TimeoutError:
            # Expected if queue is empty, just loop again
            pass
        except asyncio.CancelledError:
            logger.info("Simulation Worker task cancelled.")
            break
        except Exception as e:
            logger.error(f"Unexpected error in worker loop: {e}")
            await asyncio.sleep(1.0) # Prevent tight crash loops
