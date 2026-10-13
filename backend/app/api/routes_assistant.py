import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Product
from app.schemas.assistant import ChatRequest, ChatResponse, HealthResponse
from app.schemas.product import ProductOut
from app.services.gemini_tts import generate_tts_audio
from app.services.groq_llm import generate_response
from app.services.knowledge_base import (
    block_to_recommendation_card,
    build_grok_knowledge_context,
    get_active_blocks,
    get_relevant_blocks,
)
from app.services.session_memory import append_history, get_session


class TTSRequest(BaseModel):
    text: str


logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok")


@router.get("/products", response_model=List[ProductOut])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


def process_assistant_logic(db: Session, session_id: str, message: str) -> dict:
    existing_session = get_session(session_id)
    history = existing_session.get("history", []) if existing_session else []

    append_history(session_id, "user", message)

    all_active_blocks = get_active_blocks(db)
    relevant_blocks = get_relevant_blocks(db, message, limit=12)
    knowledge_context = build_grok_knowledge_context(all_active_blocks, relevant_blocks)
    recommendation_cards = [
        block_to_recommendation_card(block)
        for block in relevant_blocks
        if block.type in {"product", "hotel_room", "service", "menu_item", "course"}
    ]

    augmented_message = (
        f"{message}\n\n"
        f"{knowledge_context}\n\n"
        "Instruction: First check the full compact catalog, then use detailed relevant blocks. "
        "Answer using only these knowledge base facts. If exact information is missing, say that there is not enough data."
    )

    history_for_groq = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in history[-10:]
    ]
    history_for_groq.append({"role": "user", "content": augmented_message})

    ai_response = generate_response(history_for_groq)

    if recommendation_cards and ai_response.get("action") == "none":
        ai_response["action"] = "show_products"

    append_history(session_id, "assistant", ai_response.get("text", ""))

    return {
        "text": ai_response["text"],
        "tts_text": ai_response["tts_text"],
        "emotion": ai_response["emotion"],
        "animation": ai_response["animation"],
        "action": ai_response["action"],
        "avatar_behavior": ai_response.get("avatar_behavior", {
            "state": "speaking",
            "emotion": "neutral",
            "gesture": "explain",
            "intensity": 0.5,
        }),
        "products": recommendation_cards,
    }


@router.post("/assistant/chat", response_model=ChatResponse)
def chat_with_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    session_id = request.session_id or uuid.uuid4().hex
    res = process_assistant_logic(db, session_id, request.message)

    return ChatResponse(
        session_id=session_id,
        text=res["text"],
        tts_text=res["tts_text"],
        emotion=res["emotion"],
        animation=res["animation"],
        action=res["action"],
        avatar_behavior=res["avatar_behavior"],
        products=res["products"],
    )


@router.post("/assistant/tts")
def text_to_speech(request: TTSRequest):
    audio_bytes = generate_tts_audio(request.text)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Failed to generate TTS audio")

    return Response(content=audio_bytes, media_type="audio/wav")
