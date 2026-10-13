from app.schemas.assistant import IntentParseResult, IntentFilters

def parse_intent(message: str) -> IntentParseResult:
    """
    Very simple rule-based router to decide if we need to search DB before calling Azure.
    Since Azure OpenAI handles the final reasoning, this just hints if products are requested.
    """
    text = ''.join(c for c in message.lower() if c.isalnum() or c.isspace()).strip()
    
    product_keywords = ["купить", "поесть", "попить", "товар", "цена", "сколько стоит", "есть", "хочу", "сладкое", "ovqat", "ichimlik", "shirinlik"]
    info_keywords = ["где", "когда", "история", "музей", "информация"]
    
    intent_type = "normal_chat"
    
    if any(word in text for word in product_keywords):
        intent_type = "product_query"
    elif any(word in text for word in info_keywords):
        intent_type = "location_info"
        
    # We return a dummy IntentParseResult just for the search_products function to have something to work with,
    # or we can bypass it entirely. For now, we'll map product_query to a generic DB search intent.
    
    filters = IntentFilters()
    category = None
    
    # Very basic filter mapping for the DB search 
    if "сладкое" in text or "shirin" in text:
        filters.is_sweet = True
    if "попить" in text or "ichimlik" in text:
        filters.is_drink = True
        
    return IntentParseResult(
        intent="find_product" if intent_type == "product_query" else "unknown",
        category=category,
        filters=filters,
        needs_clarification=False
    )
