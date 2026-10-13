from __future__ import annotations

from typing import Iterable, List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import KnowledgeBlock


MAX_CATALOG_BLOCKS = 300
MAX_CONTEXT_CHARS = 18000


def _normalize_tokens(value: str | None) -> list[str]:
    if not value:
        return []
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in value)
    return [token for token in cleaned.split() if len(token) > 1]


def _block_text(block: KnowledgeBlock) -> str:
    field_values = " ".join(f"{key} {value}" for key, value in (block.fields or {}).items())
    tags = " ".join(block.tags or [])
    return f"{block.title} {block.type} {block.description or ''} {field_values} {tags}".lower()


def _shorten(value: object, limit: int = 180) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return f"{text[:limit].rstrip()}..."


def block_matches_keywords(block: KnowledgeBlock, keywords: Iterable[str]) -> bool:
    text = _block_text(block)
    return any(keyword in text for keyword in keywords)


def search_knowledge_blocks(
    db: Session,
    *,
    keyword: str | None = None,
    block_type: str | None = None,
    tag: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> List[KnowledgeBlock]:
    query = db.query(KnowledgeBlock)

    if status:
        query = query.filter(KnowledgeBlock.status == status)
    if block_type:
        query = query.filter(KnowledgeBlock.type == block_type)

    blocks = query.order_by(KnowledgeBlock.updated_at.desc()).limit(max(limit, 1) * 10).all()

    if tag:
        normalized_tag = tag.strip().lower()
        blocks = [block for block in blocks if normalized_tag in (block.tags or [])]

    if keyword:
        keywords = _normalize_tokens(keyword)
        if keywords:
            matched = [block for block in blocks if block_matches_keywords(block, keywords)]
            unmatched = [block for block in blocks if block not in matched]
            blocks = matched + unmatched

    return blocks[:limit]


def get_active_blocks(db: Session, limit: int = MAX_CATALOG_BLOCKS) -> List[KnowledgeBlock]:
    return (
        db.query(KnowledgeBlock)
        .filter(KnowledgeBlock.status == "active")
        .order_by(KnowledgeBlock.updated_at.desc())
        .limit(limit)
        .all()
    )


def get_relevant_blocks(
    db: Session,
    message: str,
    *,
    block_type: Optional[str] = None,
    tags: Optional[list[str]] = None,
    limit: int = 8,
) -> List[KnowledgeBlock]:
    query = db.query(KnowledgeBlock).filter(KnowledgeBlock.status == "active")

    if block_type:
        query = query.filter(KnowledgeBlock.type == block_type)

    candidates = query.order_by(KnowledgeBlock.updated_at.desc()).limit(MAX_CATALOG_BLOCKS).all()

    if tags:
        wanted = {tag.strip().lower() for tag in tags if tag.strip()}
        candidates = [block for block in candidates if wanted.intersection(set(block.tags or []))]

    tokens = _normalize_tokens(message)
    if not tokens:
        return candidates[:limit]

    scored = []
    for block in candidates:
        text = _block_text(block)
        score = sum(text.count(token) for token in tokens)
        if block.type.lower() in tokens:
            score += 2
        score += len(set(tokens).intersection(set(block.tags or []))) * 3
        if score > 0:
            scored.append((score, block))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [block for _, block in scored[:limit]]


def format_block_catalog_for_grok(blocks: list[KnowledgeBlock]) -> str:
    if not blocks:
        return "Knowledge Base Catalog:\nNo active blocks."

    parts = ["Knowledge Base Catalog (all active blocks, compact index):"]
    for block in blocks:
        fields = block.fields or {}
        important_fields = []
        for key in ("price", "price_per_night", "stock", "status", "category", "city", "date", "schedule"):
            if key in fields:
                important_fields.append(f"{key}={_shorten(fields[key], 60)}")
        field_hint = f" | fields: {', '.join(important_fields)}" if important_fields else ""
        tags = f" | tags: {', '.join(block.tags or [])}" if block.tags else ""
        parts.append(
            f"- ID {block.id} | type: {block.type} | title: {_shorten(block.title, 90)}"
            f" | desc: {_shorten(block.description, 130)}{field_hint}{tags}"
        )

    return "\n".join(parts)


def format_blocks_for_grok(blocks: list[KnowledgeBlock], *, heading: str = "Relevant Knowledge Base Blocks") -> str:
    if not blocks:
        return (
            f"{heading}:\n"
            "No relevant active knowledge base blocks were found for this request."
        )

    parts = [f"{heading}:"]
    for block in blocks:
        parts.append(f"[Block ID: {block.id} | Type: {block.type}]")
        parts.append(f"Title: {block.title}")
        if block.description:
            parts.append(f"Description: {block.description}")
        parts.append("Fields:")
        if block.fields:
            for key, value in block.fields.items():
                parts.append(f"- {key}: {value}")
        else:
            parts.append("- none")
        tags = ", ".join(block.tags or [])
        parts.append(f"Tags: {tags or 'none'}")
        parts.append("")

    return "\n".join(parts).strip()


def build_grok_knowledge_context(
    all_active_blocks: list[KnowledgeBlock],
    relevant_blocks: list[KnowledgeBlock],
    max_chars: int = MAX_CONTEXT_CHARS,
) -> str:
    catalog = format_block_catalog_for_grok(all_active_blocks)
    details = format_blocks_for_grok(relevant_blocks)
    context = (
        f"{catalog}\n\n"
        f"{details}\n\n"
        "Context rules:\n"
        "- The catalog lists all active records available in the database.\n"
        "- The detailed section contains the best matching records for the user request.\n"
        "- If the user asks about a catalog item that is not detailed, ask a clarifying question or say that more specific data is needed.\n"
        "- Never invent facts that are not in the catalog or detailed blocks."
    )

    if len(context) <= max_chars:
        return context

    details_budget = max_chars - len(catalog) - 500
    if details_budget > 1000:
        trimmed_details = details[:details_budget].rstrip()
        return (
            f"{catalog}\n\n"
            f"{trimmed_details}\n...[Detailed blocks trimmed because of context budget]\n\n"
            "Context rules: Use catalog as the full active DB index. Use detailed blocks for exact facts. Do not invent missing facts."
        )[:max_chars]

    compact_catalog = format_block_catalog_for_grok(all_active_blocks[:120])
    return (
        f"{compact_catalog}\n\n"
        "Relevant details were omitted because the knowledge base is too large for this model context. "
        "Ask a clarifying question using the catalog; do not invent missing facts."
    )[:max_chars]


def block_to_recommendation_card(block: KnowledgeBlock) -> dict:
    fields = block.fields or {}
    price = fields.get("price") or fields.get("price_per_night") or fields.get("cost") or 0
    try:
        numeric_price = float(str(price).replace("$", "").replace("UZS", "").replace("сум", "").strip())
    except ValueError:
        numeric_price = 0

    status = str(fields.get("status") or fields.get("stock") or "").lower()
    is_available = block.status == "active" and status not in {"0", "out", "sold", "busy", "inactive", "нет"}

    return {
        "id": block.id,
        "name": block.title,
        "category": block.type,
        "subcategory": fields.get("category") or block.type,
        "description": block.description or str(fields.get("description") or ""),
        "price": numeric_price,
        "in_stock": is_available,
        "brand": fields.get("brand") or fields.get("city") or "",
        "keywords": ",".join(block.tags or []),
        "is_ready_to_eat": False,
        "is_drink": False,
        "is_sweet": False,
        "is_hot": False,
        "is_healthy": False,
    }
