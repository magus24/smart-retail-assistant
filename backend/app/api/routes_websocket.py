import json
import logging
import uuid
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.routes_assistant import process_assistant_logic
from app.services.gemini_live import stream_gemini_audio

logger = logging.getLogger(__name__)

router = APIRouter()

def serialize_product(p):
    if isinstance(p, dict):
        return p

    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "price": p.price,
        "stock": getattr(p, "stock", 0),
        "image_url": getattr(p, "image_url", "")
    }

@router.websocket("/ws/assistant")
async def websocket_assistant(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    session_id = uuid.uuid4().hex
    
    # Store the current Gemini streaming task so it can be cancelled if the user interrupts
    current_audio_task = None
    
    try:
        while True:
            # Receive text from client
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                message = payload.get("text", "")
                is_interruption = payload.get("interrupt", False)
            except json.JSONDecodeError:
                message = data
                is_interruption = False
                
            # If user interrupted, cancel the ongoing audio stream
            if is_interruption and current_audio_task and not current_audio_task.done():
                current_audio_task.cancel()
                
            if not message:
                continue

            # 1. Process via Grok (run blocking DB and HTTP logic in a thread)
            res = await asyncio.to_thread(process_assistant_logic, db, session_id, message)
            
            ai_text = res.get("tts_text") or res.get("text")
            
            # Send the text and state update to frontend immediately
            await websocket.send_text(json.dumps({
                "type": "state",
                "text": res["text"],
                "emotion": res["emotion"],
                "animation": res["animation"],
                "action": res["action"],
                "avatar_behavior": res.get("avatar_behavior"),
                "products": [serialize_product(p) for p in res["products"]]
            }))
            
            # 2. Stream audio from Gemini Live
            if ai_text:
                await websocket.send_text(json.dumps({
                    "type": "audio_start",
                    "sample_rate": 24000
                }))
                
                async def send_audio_stream():
                    try:
                        async for pcm_chunk in stream_gemini_audio(ai_text):
                            await websocket.send_bytes(pcm_chunk)
                        await websocket.send_text(json.dumps({"type": "audio_end"}))
                    except asyncio.CancelledError:
                        logger.info("Audio stream interrupted by user.")
                        await websocket.send_text(json.dumps({"type": "audio_end", "interrupted": True}))
                
                # Run the stream in an asyncio Task so it can be cancelled on next message
                current_audio_task = asyncio.create_task(send_audio_stream())

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass
