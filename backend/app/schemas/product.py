from pydantic import BaseModel
from typing import Optional

class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    subcategory: Optional[str] = None
    description: Optional[str] = None
    price: float
    in_stock: bool
    brand: Optional[str] = None
    keywords: Optional[str] = None
    
    is_ready_to_eat: bool
    is_drink: bool
    is_sweet: bool
    is_hot: bool
    is_healthy: bool

    class Config:
        from_attributes = True
