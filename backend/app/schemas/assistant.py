from pydantic import BaseModel
from typing import Optional, List
from app.schemas.product import ProductOut

class HealthResponse(BaseModel):
    status: str

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str

class TTSRequest(BaseModel):
    text: str

class AvatarBehavior(BaseModel):
    state: str = "speaking"
    emotion: str = "neutral"
    gesture: str = "explain"
    intensity: float = 0.5

class IntentFilters(BaseModel):
    is_ready_to_eat: Optional[bool] = None
    is_drink: Optional[bool] = None
    is_sweet: Optional[bool] = None
    is_hot: Optional[bool] = None
    is_healthy: Optional[bool] = None

class IntentParseResult(BaseModel):
    intent: str
    category: Optional[str] = None
    filters: IntentFilters = IntentFilters()
    needs_clarification: bool = False
    clarifying_question: Optional[str] = None
    sort: Optional[str] = None
    more_options: bool = False
    assistant_reply: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    text: str
    tts_text: str
    emotion: str
    animation: str
    action: str
    avatar_behavior: AvatarBehavior = AvatarBehavior()
    products: List[ProductOut] = []

class VoiceResponse(ChatResponse):
    transcript: str
