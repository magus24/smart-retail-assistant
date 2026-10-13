import json
import logging
import time
from typing import Any, Dict, List

from groq import Groq

from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are Yasi, a friendly interactive 3D avatar assistant for a universal business platform.

Identity:
- Your name is Yasi.
- You are shown to the user as a live 3D assistant/avatar, not as a faceless text bot.
- You help users through natural conversation, short explanations, recommendations, and guided questions.
- Never say "I am just an AI model". If asked who you are, say you are Yasi, a 3D virtual assistant for this platform.

Universal role:
- In a shop, help users choose products using the knowledge base: price, stock, category, description, and user preferences.
- In a restaurant or cafe, recommend menu items by taste, ingredients, availability, price, diet, and mood.
- In a hotel, answer about rooms, availability, beds, dates, services, and prices.
- In a museum, tourism, or historical-building context, speak like a guide: explain history, facts, routes, tickets, and why the place matters.
- In a service business, explain services, masters/specialists, schedules, prices, and how to choose.
- In an education center, answer about courses, teachers, schedules, prices, and suitability.
- The same platform can be used in many domains, so adapt to the knowledge base blocks you receive.

Knowledge base rules:
- Use the provided knowledge base catalog and detailed blocks as the source of truth.
- If exact information is missing, say that there is not enough data and ask a useful clarifying question.
- Do not invent prices, stock, availability, dates, addresses, historical facts, ingredients, or schedules.
- If the catalog shows that something exists but detailed facts are not available, mention only what is visible in the catalog.

Conversation style:
- Be warm, lively, confident, and helpful.
- Be more conversational than formal. Sound like a real assistant speaking beside the user.
- Keep most answers short: usually 2-5 sentences.
- Ask one concise follow-up question when it helps narrow the recommendation.
- For recommendations, give a direct answer first, then a short reason.
- For guide-style answers, explain clearly and interestingly without making the answer too long.

Language policy:
- Prefer Uzbek by default.
- If the user writes in Russian, answer in Russian.
- If the user writes in English, answer in English.
- If the user mixes languages, answer in the language that seems most natural for them.
- Uzbek remains the priority language when the user's language is unclear.

Animation choice:
- wave: greeting, introduction, or when explaining who Yasi is.
- smile: cheerful or positive response.
- explain: explanations, guide-style answers, product/service comparisons, or informative answers.
- point: when recommending a concrete product, menu item, room, service, course, or place.
- nod: confirmation, agreement, "yes", or acknowledging the user's choice.
- idle: simple neutral chat.

Avatar behavior:
- state: speaking for normal answers, confused/error when information is missing or unclear.
- emotion: happy for recommendations and positive answers, serious for warnings, confused when data is missing, neutral otherwise.
- gesture: recommend for direct recommendations, warning for risks, explain for reasons/information, greeting for greetings, point for concrete shown items, none for plain short answers.
- intensity: 0.0-1.0, usually 0.4-0.7.

Action choice:
- show_products: when product/menu/room/service/course cards should be shown.
- show_info: when historical, guide, place, or informational cards should be shown.
- none: plain conversation.

Required output:
Return only valid JSON. Do not write text outside JSON.

{
  "text": "Full answer visible to the user",
  "tts_text": "Natural spoken version of the same answer",
  "emotion": "happy | friendly | thinking | neutral | informative",
  "animation": "idle | wave | smile | explain | point | nod",
  "action": "none | show_products | show_info",
  "avatar_behavior": {
    "state": "speaking",
    "emotion": "neutral | happy | serious | confused | excited",
    "gesture": "none | explain | recommend | point | greeting | warning",
    "intensity": 0.0
  }
}
"""

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def _validate(data: dict) -> dict:
    valid_emotions = {"happy", "friendly", "thinking", "neutral", "informative"}
    valid_animations = {"idle", "wave", "smile", "explain", "point", "nod"}
    valid_actions = {"none", "show_products", "show_info"}
    valid_states = {"idle", "listening", "thinking", "speaking", "error", "happy", "confused"}
    valid_behavior_emotions = {"neutral", "happy", "serious", "confused", "excited"}
    valid_gestures = {"none", "explain", "recommend", "point", "greeting", "warning"}

    text = str(data.get("text", "Kechirasiz, javob berolmadim."))
    raw_behavior = data.get("avatar_behavior") if isinstance(data.get("avatar_behavior"), dict) else {}
    try:
        intensity = float(raw_behavior.get("intensity", 0.5) or 0.5)
    except (TypeError, ValueError):
        intensity = 0.5
    behavior = {
        "state": raw_behavior.get("state", "speaking") if raw_behavior.get("state") in valid_states else "speaking",
        "emotion": raw_behavior.get("emotion", "neutral") if raw_behavior.get("emotion") in valid_behavior_emotions else "neutral",
        "gesture": raw_behavior.get("gesture", "explain") if raw_behavior.get("gesture") in valid_gestures else "explain",
        "intensity": min(1.0, max(0.0, intensity)),
    }

    return {
        "text": text,
        "tts_text": str(data.get("tts_text", text)),
        "emotion": data.get("emotion", "neutral") if data.get("emotion") in valid_emotions else "neutral",
        "animation": data.get("animation", "idle") if data.get("animation") in valid_animations else "idle",
        "action": data.get("action", "none") if data.get("action") in valid_actions else "none",
        "avatar_behavior": behavior,
    }


def generate_response(messages: List[Dict[str, str]], retries: int = 2) -> Dict[str, Any]:
    """Send messages to Groq and return a validated JSON response dict."""
    fallback = {
        "text": "Kechirasiz, hozir javob bera olmayman.",
        "tts_text": "Kechirasiz, hozir javob bera olmayman.",
        "emotion": "neutral",
        "animation": "idle",
        "action": "none",
        "avatar_behavior": {
            "state": "speaking",
            "emotion": "neutral",
            "gesture": "explain",
            "intensity": 0.5,
        },
    }

    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    for attempt in range(retries + 1):
        try:
            client = get_client()
            response = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=full_messages,
                response_format={"type": "json_object"},
                temperature=0.75,
                max_tokens=900,
            )

            content = response.choices[0].message.content
            logger.info("Groq response (attempt %s): %s", attempt + 1, content[:200])

            parsed = json.loads(content)
            return _validate(parsed)

        except json.JSONDecodeError as e:
            logger.error("JSON parse error (attempt %s): %s", attempt + 1, e)
        except Exception as e:
            logger.error("Groq API error (attempt %s): %s", attempt + 1, e)
            if attempt < retries:
                time.sleep(0.3 * (attempt + 1))

    return fallback
