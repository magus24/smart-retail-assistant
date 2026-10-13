from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, Text
from app.db.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, index=True)
    subcategory = Column(String, nullable=True)
    description = Column(String, nullable=True)
    price = Column(Float)
    in_stock = Column(Boolean, default=True)
    brand = Column(String, nullable=True)
    keywords = Column(String, nullable=True) # comma separated
    
    # Boolean filters
    is_ready_to_eat = Column(Boolean, default=False)
    is_drink = Column(Boolean, default=False)
    is_sweet = Column(Boolean, default=False)
    is_hot = Column(Boolean, default=False)
    is_healthy = Column(Boolean, default=False)


class KnowledgeBlock(Base):
    __tablename__ = "knowledge_blocks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    type = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    fields = Column(JSON, nullable=False, default=dict)
    tags = Column(JSON, nullable=False, default=list)
    status = Column(String(20), nullable=False, default="active", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
