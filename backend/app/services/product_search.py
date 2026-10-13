from sqlalchemy.orm import Session
from app.db.models import Product
from app.schemas.assistant import IntentParseResult
from typing import List

def search_products(db: Session, intent: IntentParseResult) -> List[Product]:
    if intent.needs_clarification:
        return []

    query = db.query(Product).filter(Product.in_stock == True)

    if intent.category:
        query = query.filter(Product.category == intent.category)
        
    # Apply boolean filters dynamically for both True and False values
    for filter_key, filter_val in intent.filters.model_dump(exclude_unset=True).items():
        column_attr = getattr(Product, filter_key, None)
        if column_attr is not None:
            if filter_val is True:
                query = query.filter(column_attr == True)
            elif filter_val is False:
                query = query.filter(column_attr == False)

    # Ordering
    if intent.sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif intent.sort == "price_desc":
        query = query.order_by(Product.price.desc())

    # Example of how we might handle 'more_options': skip the first 5 and get next 5.
    # For MVP we keep it simple or randomize, but standard approach is returning first N usually.
    # We will just return 5 or up to 10 if more options chosen.
    limit = 10 if intent.more_options else 5

    return query.limit(limit).all()
