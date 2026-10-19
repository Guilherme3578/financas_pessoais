from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.categorias import router as categorias_router
from app.api.routes.lancamentos import router as lancamentos_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.recorrencias import router as recorrencias_router
from app.api.routes.relatorios import router as relatorios_router
from app.api.routes.orcamentos import router as orcamentos_router
from app.api.routes.previsoes import router as previsoes_router


api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(categorias_router)
api_router.include_router(lancamentos_router)
api_router.include_router(dashboard_router)
api_router.include_router(recorrencias_router)
api_router.include_router(relatorios_router)
api_router.include_router(orcamentos_router)
api_router.include_router(previsoes_router)