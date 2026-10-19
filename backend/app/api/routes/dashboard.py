from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.dashboard import DashboardResumo
from app.services.dashboard import DashboardService


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


def get_service(
    db: Annotated[Session, Depends(get_db)],
) -> DashboardService:
    return DashboardService(db)


Service = Annotated[DashboardService, Depends(get_service)]


@router.get(
    "/resumo",
    response_model=DashboardResumo,
)
def consultar_resumo(
    service: Service,
    data_inicio: Annotated[
        date,
        Query(description="Início do período por data de competência."),
    ],
    data_fim: Annotated[
        date,
        Query(description="Fim do período, incluído na consulta."),
    ],
) -> DashboardResumo:
    return service.resumir(data_inicio, data_fim)