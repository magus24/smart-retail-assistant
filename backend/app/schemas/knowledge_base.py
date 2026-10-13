from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


BlockStatus = Literal["active", "inactive"]


class KnowledgeBlockBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = ""
    fields: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    status: BlockStatus = "active"

    @field_validator("title", "type")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be empty")
        return value

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: List[str]) -> List[str]:
        tags = []
        seen = set()
        for tag in value:
            normalized = str(tag).strip().lower()
            if normalized and normalized not in seen:
                tags.append(normalized)
                seen.add(normalized)
        return tags

    @field_validator("fields")
    @classmethod
    def normalize_fields(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        normalized = {}
        for key, field_value in value.items():
            clean_key = str(key).strip()
            if clean_key:
                normalized[clean_key] = field_value
        return normalized


class KnowledgeBlockCreate(KnowledgeBlockBase):
    pass


class KnowledgeBlockUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    fields: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    status: Optional[BlockStatus] = None

    @field_validator("title", "type")
    @classmethod
    def strip_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Value cannot be empty")
        return value

    @field_validator("tags")
    @classmethod
    def normalize_optional_tags(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        return KnowledgeBlockBase.normalize_tags(value)

    @field_validator("fields")
    @classmethod
    def normalize_optional_fields(cls, value: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if value is None:
            return value
        return KnowledgeBlockBase.normalize_fields(value)


class KnowledgeBlockOut(KnowledgeBlockBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeContextResponse(BaseModel):
    blocks: List[KnowledgeBlockOut]
    context: str
