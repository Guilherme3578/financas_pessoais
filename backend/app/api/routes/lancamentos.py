from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.lancamento import (
    LancamentoAtualizar,
    LancamentoCriar,
    LancamentoResposta,
    StatusLancamento,
    TipoLancamento,
)
from app.services.lancamento import LancamentoService


router = APIRouter(
    prefix="/lancamentos",
    tags=["Lançamentos"],
)


def get_service(
    db: Annotated[Session, Depends(get_db)],
) -> LancamentoService:
    return LancamentoService(db)


Service = Annotated[LancamentoService, Depends(get_service)]
LancamentoId = Annotated[int, Path(gt=0)]


@router.post(
    "",
    response_model=LancamentoResposta,
    status_code=201,
)
def criar_lancamento(
    dados: LancamentoCriar,
    service: Service,
):
    return service.criar(dados)


@router.get(
    "",
    response_model=list[LancamentoResposta],
)
def listar_lancamentos(
    service: Service,
    tipo: TipoLancamento | None = None,
    status: StatusLancamento | None = None,
    categoria_id: Annotated[int | None, Query(gt=0)] = None,
    competencia_inicio: date | None = None,
    competencia_fim: date | None = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return service.listar(
        tipo=tipo,
        status=status,
        categoria_id=categoria_id,
        competencia_inicio=competencia_inicio,
        competencia_fim=competencia_fim,
        offset=offset,
        limit=limit,
    )


@router.get(
    "/{lancamento_id}",
    response_model=LancamentoResposta,
)
def buscar_lancamento(
    lancamento_id: LancamentoId,
    service: Service,
):
    return service.buscar(lancamento_id)


@router.put(
    "/{lancamento_id}",
    response_model=LancamentoResposta,
)
def atualizar_lancamento(
    lancamento_id: LancamentoId,
    dados: LancamentoAtualizar,
    service: Service,
):
    return service.atualizar(lancamento_id, dados)


@router.delete(
    "/{lancamento_id}",
    status_code=204,
    response_class=Response,
)
def excluir_lancamento(
    lancamento_id: LancamentoId,
    service: Service,
) -> Response:
    service.excluir(lancamento_id)
    return Response(status_code=204)