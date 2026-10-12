from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="API para controle financeiro pessoal.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(
    api_router,
    prefix="/api/v1",
)


@app.get("/", tags=["Status"])
def inicio() -> dict[str, str]:
    return {
        "aplicacao": settings.app_name,
        "documentacao": "/docs",
    }