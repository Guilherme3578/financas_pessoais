from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.copia_orcamento import (
    CopiaOrcamentoCriar,
    CopiaOrcamentoResposta,
)
from app.schemas.orcamento import OrcamentoResposta, OrcamentoSalvar
from app.services.copia_orcamento import CopiaOrcamentoService
from app.services.orcamento import OrcamentoService


router = APIRouter(
    prefix="/orcamentos",
    tags=["Orçamentos"],
)


@router.get("", response_model=list[OrcamentoResposta])
def listar_orcamentos(
    competencia: Annotated[date, Query()],
    db: Annotated[Session, Depends(get_db)],
):
    return OrcamentoService(db).listar(competencia)


@router.put("", response_model=OrcamentoResposta)
def salvar_orcamento(
    dados: OrcamentoSalvar,
    db: Annotated[Session, Depends(get_db)],
):
    return OrcamentoService(db).salvar(dados)


@router.post("/copiar", response_model=CopiaOrcamentoResposta)
def copiar_orcamentos(
    dados: CopiaOrcamentoCriar,
    db: Annotated[Session, Depends(get_db)],
):
    return CopiaOrcamentoService(db).copiar(dados)


@router.delete("/{orcamento_id}", status_code=204)
def excluir_orcamento(
    orcamento_id: Annotated[int, Path(gt=0)],
    db: Annotated[Session, Depends(get_db)],
):
    OrcamentoService(db).excluir(orcamento_id)

    return Response(status_code=204)