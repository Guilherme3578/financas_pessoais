from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.recorrencia import (
    RecorrenciaCriar,
    RecorrenciaGerar,
    RecorrenciaGeracaoResposta,
    RecorrenciaResposta,
    RecorrenciaSituacao,
)
from app.services.recorrencia import RecorrenciaService


router = APIRouter(
    prefix="/recorrencias",
    tags=["Recorrências"],
)


def get_service(
    db: Annotated[Session, Depends(get_db)],
) -> RecorrenciaService:
    return RecorrenciaService(db)


Service = Annotated[RecorrenciaService, Depends(get_service)]
RecorrenciaId = Annotated[int, Path(gt=0)]


@router.post(
    "",
    response_model=RecorrenciaResposta,
    status_code=201,
)
def criar_recorrencia(
    dados: RecorrenciaCriar,
    service: Service,
):
    return service.criar(dados)


@router.get(
    "",
    response_model=list[RecorrenciaResposta],
)
def listar_recorrencias(
    service: Service,
    ativo: bool | None = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return service.listar(ativo, offset, limit)


@router.patch(
    "/{recorrencia_id}/situacao",
    response_model=RecorrenciaResposta,
)
def alterar_situacao(
    recorrencia_id: RecorrenciaId,
    dados: RecorrenciaSituacao,
    service: Service,
):
    return service.alterar_situacao(recorrencia_id, dados.ativo)


@router.post(
    "/{recorrencia_id}/gerar",
    response_model=RecorrenciaGeracaoResposta,
)
def gerar_lancamentos(
    recorrencia_id: RecorrenciaId,
    dados: RecorrenciaGerar,
    service: Service,
):
    return service.gerar(recorrencia_id, dados.ate)