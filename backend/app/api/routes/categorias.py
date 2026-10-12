from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.categoria import (
    CategoriaAtualizar,
    CategoriaCriar,
    CategoriaResposta,
)
from app.services.categoria import CategoriaService


router = APIRouter(
    prefix="/categorias",
    tags=["Categorias"],
)


def get_service(
    db: Annotated[Session, Depends(get_db)],
) -> CategoriaService:
    return CategoriaService(db)


Service = Annotated[CategoriaService, Depends(get_service)]


@router.post(
    "",
    response_model=CategoriaResposta,
    status_code=status.HTTP_201_CREATED,
)
def criar_categoria(dados: CategoriaCriar, service: Service):
    return service.criar(dados)


@router.get("", response_model=list[CategoriaResposta])
def listar_categorias(
    service: Service,
    tipo: Literal["receita", "despesa"] | None = None,
    ativo: bool | None = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return service.listar(tipo, ativo, offset, limit)


@router.get("/{categoria_id}", response_model=CategoriaResposta)
def buscar_categoria(categoria_id: int, service: Service):
    return service.buscar(categoria_id)


@router.put("/{categoria_id}", response_model=CategoriaResposta)
def atualizar_categoria(
    categoria_id: int,
    dados: CategoriaAtualizar,
    service: Service,
):
    return service.atualizar(categoria_id, dados)


@router.delete(
    "/{categoria_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def excluir_categoria(categoria_id: int, service: Service):
    service.excluir(categoria_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)