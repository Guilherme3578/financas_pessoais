from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.previsao import PrevisaoMesResposta
from app.services.previsao import PrevisaoService


router = APIRouter(
    prefix="/previsoes",
    tags=["Previsões"],
)


@router.get("/mensal", response_model=list[PrevisaoMesResposta])
def consultar_previsao_mensal(
    inicio: Annotated[date, Query()],
    db: Annotated[Session, Depends(get_db)],
    meses: Annotated[int, Query(ge=1, le=12)] = 6,
):
    return PrevisaoService(db).listar(inicio, meses)