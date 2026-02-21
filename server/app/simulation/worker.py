import asyncio
import json
import logging
from app.core.nats import get_nats_js, nats_client
from app.simulation.engine import SimulationEngine
from app.simulation.schemas import SimulationInput
from pydantic import ValidationError
from nats.errors import TimeoutError

logger = logging.getLogger(__name__)

async def start_simulation_worker():
    """
    Background worker that continuously pulls simulation jobs from NATS JetStream,
    computes the tick, and replies to the specified topic.
    """
    js = await get_nats_js()
    logger.info("Simulation Worker started. Listening for jobs on 'simulation.requests'...")
    
    # We use a pull subscription to easily process messages one by one
    try:
        sub = await js.pull_subscribe("simulation.requests", durable="sim_worker")
    except Exception as e:
        logger.error(f"Failed to create pull subscription: {e}")
        return

    while True:
        try:
            # Check if NATS is still alive, if shutting down, gracefully exit loop
            if nats_client.nc and nats_client.nc.is_closed:
                break
                
            msgs = await sub.fetch(1, timeout=1.0)
            for msg in msgs:
                try:
                    payload = json.loads(msg.data.decode())
                    sim_input = SimulationInput(**payload)
                    reply_topic = msg.headers.get("reply-to") if msg.headers else None
                    
                    if not reply_topic:
                        logger.warning("Received simulation request without a 'reply-to' header. Ignoring.")
                        await msg.ack()
                        continue
                        
                    # Compute the logic
                    # Pass the current tick info inside the input for stateless processing
                    result = SimulationEngine.compute_tick(
                        graph=sim_input.graph,
                        incoming_rps=sim_input.incoming_rps, 
                        current_time=payload.get("current_tick", 0)  # Extract tick from generic payload or add to schema
                    )
                    
                    # Publish result back
                    await js.publish(reply_topic, result.model_dump_json().encode())
                    
                    # Acknowledge successful processing
                    await msg.ack()
                    
                except (json.JSONDecodeError, ValidationError) as e:
                    logger.error(f"Worker received malformed payload: {e}")
                    await msg.ack() # Ack so it doesn't get redelivered and clog the queue
                except Exception as e:
                    logger.exception(f"Error computing simulation tick: {e}")
                    # Don't ack so it can be retried if it's a transient failure, 
                    # but in a real-world scenario we'd want a dead-letter queue.
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
