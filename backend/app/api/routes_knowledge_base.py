from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.database import get_db
from app.db.models import KnowledgeBlock
from app.schemas.knowledge_base import (
    KnowledgeBlockCreate,
    KnowledgeBlockOut,
    KnowledgeBlockUpdate,
    KnowledgeContextResponse,
)
from app.services.knowledge_base import (
    build_grok_knowledge_context,
    get_active_blocks,
    search_knowledge_blocks,
)

router = APIRouter(prefix="/admin/knowledge-base", tags=["knowledge-base"])


@router.get("/blocks", response_model=list[KnowledgeBlockOut], dependencies=[Depends(require_admin)])
def list_blocks(
    q: str | None = Query(default=None),
    type: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return search_knowledge_blocks(
        db,
        keyword=q,
        block_type=type,
        tag=tag,
        status=status,
        limit=200,
    )


@router.post("/blocks", response_model=KnowledgeBlockOut, dependencies=[Depends(require_admin)])
def create_block(payload: KnowledgeBlockCreate, db: Session = Depends(get_db)):
    block = KnowledgeBlock(**payload.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.get("/blocks/{block_id}", response_model=KnowledgeBlockOut, dependencies=[Depends(require_admin)])
def get_block(block_id: int, db: Session = Depends(get_db)):
    block = db.get(KnowledgeBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Knowledge block not found")
    return block


@router.put("/blocks/{block_id}", response_model=KnowledgeBlockOut, dependencies=[Depends(require_admin)])
def update_block(block_id: int, payload: KnowledgeBlockUpdate, db: Session = Depends(get_db)):
    block = db.get(KnowledgeBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Knowledge block not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(block, key, value)

    db.commit()
    db.refresh(block)
    return block


@router.delete("/blocks/{block_id}", dependencies=[Depends(require_admin)])
def delete_block(block_id: int, db: Session = Depends(get_db)):
    block = db.get(KnowledgeBlock, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Knowledge block not found")

    db.delete(block)
    db.commit()
    return {"ok": True}


@router.get("/context", response_model=KnowledgeContextResponse, dependencies=[Depends(require_admin)])
def preview_context(
    q: str | None = Query(default=None),
    type: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    blocks = search_knowledge_blocks(
        db,
        keyword=q,
        block_type=type,
        tag=tag,
        status="active",
        limit=20,
    )
    return {
        "blocks": blocks,
        "context": build_grok_knowledge_context(get_active_blocks(db), blocks),
    }
