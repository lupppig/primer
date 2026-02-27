import asyncio
import json
import logging
import uuid
import os
from datetime import datetime
from playwright.async_api import async_playwright

from sqlalchemy import select
from app.core.nats import get_nats_js, nats_client
from app.core.storage import storage_service
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.canvas.models import Design
from app.simulation.persistence import SimulationExport
from app.simulation.schemas import ExportStatus, ExportFormat

logger = logging.getLogger(__name__)

async def start_export_worker():
    """
    Background worker that listens for export requests, renders designs via Playwright,
    and uploads the results to MinIO.
    """
    js = await get_nats_js()
    logger.info("Export Worker started. Listening on 'simulation.export.requests'...")
    
    try:
        sub = await js.pull_subscribe("simulation.export.requests", durable="export_worker")
    except Exception as e:
        logger.error(f"Failed to create pull subscription for exports: {e}")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        while True:
            try:
                if nats_client.nc and nats_client.nc.is_closed:
                    break
                    
                msgs = await sub.fetch(1, timeout=1.0)
                for msg in msgs:
                    try:
                        payload = json.loads(msg.data.decode())
                        export_id = payload.get("export_id")
                        design_id = payload.get("design_id")
                        fmt = payload.get("format")
                        options = payload.get("options", {})
                        
                        logger.info(f"Processing export {export_id} for design {design_id} (Format: {fmt})")
                        
                        await process_export(export_id, design_id, fmt, options, browser)
                        
                        await msg.ack()
                        
                    except Exception as e:
                        logger.exception(f"Error processing export message: {e}")
                        await msg.nak()
                        
            except asyncio.TimeoutError:
                pass
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in export worker loop: {e}")
                await asyncio.sleep(1.0)
                
        await browser.close()



async def process_export(export_id: str, design_id: str, fmt: str, options: dict, browser):
    async with AsyncSessionLocal() as db:
        stmt = select(SimulationExport, Design.user_id).join(Design).where(SimulationExport.id == uuid.UUID(export_id))
        result = await db.execute(stmt)
        row = result.first()
        
        if not row:
            return
            
        export_record, user_id = row

        try:
            export_record.status = ExportStatus.PROCESSING
            await db.commit()

            context = await browser.new_context(viewport={"width": 1920, "height": 1080})
            
            await context.set_extra_http_headers({
                "X-System-Token": settings.SECRET_KEY,
                "X-User-ID": str(user_id)
            })
            
            page = await context.new_page()
            
            url = f"{settings.FRONTEND_URL}/canvas?id={design_id}&export=true"
            logger.info(f"Navigating to {url}")
            
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            try:
                await page.wait_for_selector(".react-flow__node", timeout=15000)
            except Exception:
                logger.warning(f"Nodes not found for design {design_id} within timeout. Capturing anyway.")
            
            await asyncio.sleep(4)
            
            await page.evaluate("""() => {
                const selectors = ['.react-flow__controls', '.react-flow__minimap', '.react-flow__panel', '.FloatingToolbar'];
                selectors.forEach(s => {
                    document.querySelectorAll(s).forEach(el => el.style.display = 'none');
                });
            }""")

            file_content = b""
            content_type = ""
            file_ext = fmt.lower()

            await page.emulate_media(media="screen")

            if fmt == ExportFormat.PNG:
                file_content = await page.screenshot(type="png", full_page=False)
                content_type = "image/png"
            elif fmt == ExportFormat.JPG:
                file_content = await page.screenshot(type="jpeg", full_page=False, quality=90)
                content_type = "image/jpeg"
            elif fmt == ExportFormat.PDF:
                file_content = await page.pdf(
                    width="1920px",
                    height="1080px",
                    print_background=True,
                    display_header_footer=False,
                    page_ranges="1"
                )
                content_type = "application/pdf"
            elif fmt == ExportFormat.SVG:
                svg_data_url = await page.evaluate("""async () => {
                    await new Promise((resolve, reject) => {
                        if (window.htmlToImage) { resolve(); return; }
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                    
                    const el = document.querySelector('.react-flow');
                    if (!el) return '';
                    
                    return await htmlToImage.toSvg(el, {
                        backgroundColor: '#090a0f',
                        width: el.offsetWidth,
                        height: el.offsetHeight,
                        style: {
                            transform: 'scale(1)',
                            transformOrigin: 'top left'
                        },
                        filter: (node) => {
                            if (node && node.classList && (
                                node.classList.contains('react-flow__controls') ||
                                node.classList.contains('react-flow__minimap') ||
                                node.classList.contains('react-flow__panel')
                            )) return false;
                            return true;
                        }
                    });
                }""")
                
                import base64
                import urllib.parse
                if svg_data_url.startswith('data:image/svg+xml;charset=utf-8,'):
                    decoded_svg = urllib.parse.unquote(svg_data_url.split(',', 1)[1])
                    file_content = decoded_svg.encode('utf-8')
                elif svg_data_url.startswith('data:image/svg+xml;base64,'):
                    b64_str = svg_data_url.split(',', 1)[1]
                    file_content = base64.b64decode(b64_str)
                else:
                    file_content = svg_data_url.encode('utf-8')

                content_type = "image/svg+xml"
            elif fmt == ExportFormat.GIF:
                quality = options.get("quality", "high") if options else "high"
                width = 1920 if quality == "high" else 1280
                height = 1080 if quality == "high" else 720
                fps = 15 if quality == "high" else 10
                scale_flag = "scale=1920:-1:flags=lanczos" if quality == "high" else "scale=800:-1:flags=lanczos"

                video_dir = "/tmp/videos"
                os.makedirs(video_dir, exist_ok=True)
                vid_context = await browser.new_context(
                    viewport={"width": width, "height": height}, 
                    record_video_dir=video_dir
                )
                
                await vid_context.set_extra_http_headers({
                    "X-System-Token": settings.SECRET_KEY,
                    "X-User-ID": str(user_id)
                })
                
                vid_page = await vid_context.new_page()
                await vid_page.goto(url, wait_until="networkidle", timeout=30000)
                
                await vid_page.wait_for_selector(".react-flow__node", timeout=15000)
                await asyncio.sleep(3)
                
                logger.info(f"Starting simulation for GIF record ({quality} quality)...")
                await vid_page.click("button:has-text('Simulate')")
                
                try:
                    await vid_page.wait_for_selector(".react-flow__edge.animated", timeout=5000)
                    logger.info(f"Simulation started, recording 8 seconds at {width}x{height}...")
                except Exception:
                    logger.warning("Simulation animation not detected, recording anyway.")
                    
                await asyncio.sleep(8)
                video_path = await vid_page.video.path()
                await vid_context.close()
                
                gif_path = f"/tmp/{export_id}.gif"
                ffmpeg_cmd = [
                    "ffmpeg", "-i", video_path, 
                    "-vf", f"fps={fps},{scale_flag},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
                    "-y", gif_path
                ]
                process = await asyncio.create_subprocess_exec(*ffmpeg_cmd)
                await process.communicate()
                
                if os.path.exists(gif_path):
                    with open(gif_path, "rb") as f:
                        file_content = f.read()
                    content_type = "image/gif"
                    os.remove(gif_path)
                else:
                    raise Exception("FFmpeg failed to generate GIF")
                if video_path and os.path.exists(video_path): os.remove(video_path)
            
            await context.close()

            await storage_service.ensure_bucket_exists()
            object_name = f"exports/{export_id}.{file_ext}"
            await storage_service.upload_file(file_content, object_name, content_type)

            export_record.status = ExportStatus.COMPLETED
            export_record.file_url = object_name
            await db.commit()

        except Exception as e:
            logger.exception(f"Failed to process export {export_id}")
            export_record.status = ExportStatus.FAILED
            user_msg = "Failed to render design. Please try again."
            if "Timeout" in str(e):
                user_msg = "Rendering timed out. The canvas might be too complex."
            export_record.error_message = user_msg
            export_record.retry_count += 1
            await db.commit()
