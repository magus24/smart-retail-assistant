from fastapi import Header, HTTPException, status

from app.core.config import settings


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    if not settings.ADMIN_API_TOKEN or x_admin_token != settings.ADMIN_API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin access required",
        )
