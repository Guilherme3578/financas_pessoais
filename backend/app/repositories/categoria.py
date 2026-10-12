from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.categoria import Categoria


class CategoriaRepository:
    def __init__(self, db: Session):
        self.db = db

    def listar(
        self,
        tipo: str | None,
        ativo: bool | None,
        offset: int,
        limit: int,
    ) -> list[Categoria]:
        consulta = select(Categoria)

        if tipo is not None:
            consulta = consulta.where(Categoria.tipo == tipo)

        if ativo is not None:
            consulta = consulta.where(Categoria.ativo == ativo)

        consulta = (
            consulta
            .order_by(Categoria.nome, Categoria.id)
            .offset(offset)
            .limit(limit)
        )

        return list(self.db.scalars(consulta).all())

    def buscar(self, categoria_id: int) -> Categoria | None:
        return self.db.get(Categoria, categoria_id)

    def adicionar(self, categoria: Categoria) -> None:
        self.db.add(categoria)

    def excluir(self, categoria: Categoria) -> None:
        self.db.delete(categoria)