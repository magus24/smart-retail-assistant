import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Smart Retail Assistant"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./market.db")

    # Groq API
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Admin API. Set ADMIN_API_TOKEN in production.
    ADMIN_API_TOKEN: str = os.getenv("ADMIN_API_TOKEN", "magus")

settings = Settings()
