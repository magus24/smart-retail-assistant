import time
from typing import Dict, Optional, List

# In-memory storage for sessions. 
# Data structure: { session_id: {"updated_at": float, "history": list} }
_sessions: Dict[str, dict] = {}
SESSION_TTL = 30 * 60  # 30 minutes in seconds

def get_session(session_id: str) -> Optional[dict]:
    """Retrieve an active session if it exists and hasn't expired."""
    clear_expired_sessions()
    return _sessions.get(session_id)

def append_history(session_id: str, role: str, content: str):
    """Append a message to the session's chat history."""
    if session_id not in _sessions:
        _sessions[session_id] = {
            "updated_at": time.time(),
            "history": []
        }
    _sessions[session_id]["history"].append({"role": role, "content": content})
    
    # Keep only last 10 messages
    if len(_sessions[session_id]["history"]) > 10:
        _sessions[session_id]["history"] = _sessions[session_id]["history"][-10:]
        
    _sessions[session_id]["updated_at"] = time.time()

def clear_expired_sessions():
    """Clear sessions that have outlived the TTL."""
    current_time = time.time()
    expired_keys = [
        sid for sid, data in _sessions.items() 
        if current_time - data["updated_at"] > SESSION_TTL
    ]
    for sid in expired_keys:
        del _sessions[sid]
