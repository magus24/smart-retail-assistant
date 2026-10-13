from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import engine, Base, SessionLocal
from app.db.seed import seed_db
from app.api.routes_assistant import router as assistant_router
from app.api.routes_websocket import router as ws_router
from app.api.routes_knowledge_base import router as knowledge_base_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Seed data
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()
        
    yield
    # Shutdown logic (if any)

app = FastAPI(
    title="Smart Retail Assistant MVP",
    description="Backend for smart interactive market display",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistant_router)
app.include_router(ws_router)
app.include_router(knowledge_base_router)
