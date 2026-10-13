# Smart Retail Assistant — "Yasi" 3D Avatar Assistant

An interactive, voice-driven **3D avatar assistant** for physical businesses. Yasi (the avatar) greets visitors, understands questions in Uzbek / Russian / English, recommends products, and answers aloud in real time — turning any kiosk, shop counter, or lobby screen into a conversational guide.

The platform is **universal**: the same engine drives a retail shop, restaurant menu, hotel reception, museum guide, service business, or education center. You just describe your catalog in a knowledge base and Yasi adapts.

> **Status: working MVP / prototype.** The full conversation loop works end to end — speech recognition → LLM reasoning over a knowledge base → streamed spoken answer with synchronized 3D lip-sync. It is actively being developed.

---

## Demo flow

1. Visitor talks (or types) → **Web Speech API** transcribes speech on the client.
2. Text + dialog context go over a **WebSocket** to the FastAPI backend.
3. The backend retrieves relevant **knowledge-base blocks**, builds a grounded prompt, and asks a **Groq-hosted LLM** for a structured JSON answer (text, emotion, animation, product recommendations).
4. The reply text is shown immediately, product/recommendation cards are rendered, and a **Gemini native-audio** voice is streamed back as PCM chunks.
5. The browser plays the audio while a **Web Audio analyser** drives real-time **lip-sync** and **avatar behavior** (idle, talking, wave, point, nod…).

---

## Features

- 🗣️ **Voice + text chat** — hands-free conversation via microphone, with live partial transcripts.
- 🔊 **Streamed speech synthesis** — low-latency PCM audio from Gemini, played back through the Web Audio API.
- 👄 **Real-time lip-sync** — mouth movement driven by the amplitude of the generated voice.
- 🧍 **3D avatar with animations** — `react-three-fiber` model with idle / talking / waving / nodding states and emotion/gesture mapping.
- 🧠 **Knowledge-base grounded answers** — the LLM only answers from catalog facts; it is instructed never to invent prices, stock, or schedules.
- 💬 **Session memory** — short per-session dialog history (with TTL) enables contextual follow-ups.
- 🗂️ **Recommendation cards** — matched catalog items are returned as structured cards (products, menu items, rooms, services, courses).
- 🌐 **Multilingual** — Uzbek (default), Russian, and English.
- 🛠️ **Admin panel** — a password-protected UI (`/admin`) to create, edit, and preview knowledge-base blocks.
- 🖥️ **Kiosk-oriented UI** — large, clean layout with quick-action buttons.

---

## Tech stack

**Backend**
- Python, **FastAPI**, Uvicorn
- **SQLAlchemy** + **SQLite**
- **Pydantic** schemas
- **Groq** LLM (`llama-3.3-70b-versatile`) for intent/dialogue + structured JSON output
- **Google Gemini** (`google-genai`) for native-audio speech streaming and TTS
- Native **WebSockets** for real-time text + audio transport

**Frontend**
- **React 18** + **Vite**
- **three.js** via `@react-three/fiber` and `@react-three/drei` for the 3D avatar
- Web **SpeechRecognition** API (speech-to-text)
- Web **Audio API** (PCM streaming playback + lip-sync analyser)
- **Axios** for the REST admin/knowledge-base calls

---

## Architecture

```
Browser (React + Vite)
 ├─ SpeechRecognition  ──► text
 ├─ WebSocket /ws/assistant ─┐
 ├─ Web Audio playback  ◄────┘ audio chunks (PCM)
 └─ 3D avatar (three.js) ◄── emotion / animation / lip-sync

FastAPI backend
 ├─ /ws/assistant        → process chat + stream audio
 ├─ /assistant/chat      → REST chat (fallback path)
 ├─ /assistant/tts       → REST TTS (WAV)
 ├─ /admin/knowledge-base → CRUD for catalog blocks (token protected)
 └─ services: groq_llm · gemini_live · gemini_tts · knowledge_base · session_memory
        │
        ▼
   SQLite (products, knowledge_blocks)
```

---

## Getting started

### Prerequisites
- Python 3.10+
- Node.js 18+
- API keys: a **Groq** key and a **Google Gemini** key (see below)

### Quick start (Windows)

```bat
install-and-start.bat
```

This creates the virtual environment, installs both backend and frontend dependencies, and launches both dev servers.

### Manual setup

**Backend**
```bash
cd backend
python -m venv ../venv
../venv/Scripts/activate      # Windows; use source venv/bin/activate on Linux/macOS
pip install -r requirements.txt
copy .env.example .env        # then fill in your keys
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**. The admin panel is at **http://localhost:5173/admin**.

### Environment variables (`backend/.env`)

| Variable           | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `GROQ_API_KEY`     | Groq API key for the dialogue LLM                      |
| `GROQ_MODEL`       | Groq model id (default `llama-3.3-70b-versatile`)      |
| `GEMINI_API_KEY`   | Google Gemini API key for real-time audio / TTS        |
| `ADMIN_API_TOKEN`  | Token protecting the admin knowledge-base endpoints    |

> ⚠️ Never commit `.env`. Only `backend/.env.example` is tracked.

---

## API overview

| Method | Endpoint                          | Description                                   |
| ------ | --------------------------------- | --------------------------------------------- |
| `GET`  | `/health`                         | Service health check                          |
| `GET`  | `/products`                       | List products                                 |
| `POST` | `/assistant/chat`                 | Text chat (returns text, emotion, cards…)     |
| `POST` | `/assistant/tts`                  | Text → WAV speech                             |
| `WS`   | `/ws/assistant`                   | Real-time chat + streamed voice                |
| `GET`  | `/admin/knowledge-base/blocks`    | List / search knowledge blocks (admin token)  |
| `POST` | `/admin/knowledge-base/blocks`    | Create a knowledge block (admin token)        |
| `PUT`  | `/admin/knowledge-base/blocks/{id}` | Update a knowledge block (admin token)      |
| `DELETE` | `/admin/knowledge-base/blocks/{id}` | Delete a knowledge block (admin token)    |
| `GET`  | `/admin/knowledge-base/context`   | Preview the LLM context for a query           |

---

## Project structure

```
Asistent/
├─ backend/
│  ├─ app/
│  │  ├─ api/          # routes: assistant, websocket, knowledge base
│  │  ├─ core/         # config, prompt, admin security
│  │  ├─ db/           # SQLAlchemy models, session, seed
│  │  ├─ schemas/      # Pydantic request/response models
│  │  └─ services/     # groq_llm, gemini_live, gemini_tts, knowledge_base, session_memory
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  ├─ public/models/   # 3D avatar model + animations
│  └─ src/
│     ├─ avatar/       # avatar scene, animation & behavior mapping, lip-sync
│     ├─ components/   # ChatBox, MessageList, ProductGrid, AdminKnowledgeBase
│     ├─ hooks/        # useVoice (STT + audio playback + lip-sync)
│     └─ services/     # axios API client
├─ install-and-start.bat
└─ start.bat
```

---

## Roadmap

- [x] Text + voice chat with streamed speech
- [x] 3D avatar with emotion/gesture-driven animations and lip-sync
- [x] Knowledge-base grounded answers + admin panel
- [ ] Persistent sessions (move memory out of process)
- [ ] Auth & multi-tenant knowledge bases
- [ ] Server-side speech-to-text for broader language coverage
- [ ] Deployment packaging (Docker) and automated tests

---

## Notes

The bundled 3D avatar ("Reze") is provided **for development/demo purposes**. Check the license of any model you add before using it commercially. Add new avatars under `frontend/public/models/<id>/` and register them in `frontend/src/avatar/avatarConfig.js`.

## License

Released for portfolio/demonstration purposes. Contact the author before commercial use.
