# Smart Retail Assistant Backend MVP

A text-based AI assistant backend for a market, using FastAPI, SQLite, SQLAlchemy, and Pydantic. Built dynamically to support rule-based intent parsing (as a placeholder for a future LLM integration).

## Tech Stack
- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- Ollama (Local LLM via API)

## Multilingual Short-Answer Clarification
The backend now correctly recognizes short contextual answers if the user is responding to a clarifying question.
- **RU**: `"еда"`, `"напиток"`, `"согреться"` 
- **UZ**: `"ovqat"`, `"ichimlik"`, `"issiq"`
- **EN**: `"food"`, `"drink"`, `"sweet"`
System replies natively matching detected language. STT engine (`faster-whisper`) extracts language directly (Requires `MODEL_SIZE=small` or `medium`).

## Ollama Setup (LLM Intent Parser)
By default, the backend tries to use a local Large Language Model as an intent parser. The system features a built-in health checker that cleanly detects connection problems and safely routes traffic to a smart Uzbek/Russian Rule-based parser if Ollama is unavailable.

1. Download Ollama from [ollama.com](https://ollama.com).
2. Start the Ollama background service in a separate terminal:
   ```bash
   ollama serve
   ```
3. Install the recommended model (Qwen2.5) by running:
   ```bash
   ollama pull qwen2.5:3b
   ```
4. *Configuration & Diagnostics*: Ensure `http://localhost:11434` is active. You can visit `http://127.0.0.1:11434/` in your browser. It should say "Ollama is running".
   - *Note*: If you see `HF_TOKEN` warnings during startup regarding HuggingFace, they are absolutely non-critical. The local processing still runs normally.
   - If disabled or if Ollama fails (API rejects), the app automatically shifts to deterministic rules.

## How to Run

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
```bash
venv\Scripts\activate
```
- Linux/Mac:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the development server:
```bash
uvicorn app.main:app --reload
```

## Endpoints

- `GET /health` - Checks if server is alive.
- `GET /products` - Fetch all available products in DB.
- `POST /assistant/chat` - Interact with the text-based intent parser. Expects JSON: `{"message": "что-нибудь сладкое", "session_id": "optional-uuid"}`. The backend automatically tracks dialog context (e.g., negations or modifications) if `session_id` is provided from previous responses!

### Examples for Swagger / Postman

**Example 1: Initial Request**
```json
{
  "message": "мне нужно что-нибудь покушать"
}
```
*Backend response contains `session_id` e.g. "abc12345"*

**Example 2: Contextual Follow-up (Negative filter)**
```json
{
  "session_id": "abc12345",
  "message": "не сладкое"
}
```

**Example 3: Sorting Modifier**
```json
{
  "session_id": "abc12345",
  "message": "что подешевле"
}
```

Upon first launch, demographic product entities will be automatically seeded into the built-in SQLite database (`market.db`).
