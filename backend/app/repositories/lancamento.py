from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lancamento import Lancamento


class LancamentoRepository:
    def __init__(self, db: Session):
        self.db = db

    def listar(
        self,
        tipo: str | None = None,
        status: str | None = None,
        categoria_id: int | None = None,
        competencia_inicio: date | None = None,
        competencia_fim: date | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[Lancamento]:
        consulta = select(Lancamento)

        if tipo is not None:
            consulta = consulta.where(Lancamento.tipo == tipo)

        if status is not None:
            consulta = consulta.where(Lancamento.status == status)

        if categoria_id is not None:
            consulta = consulta.where(
                Lancamento.categoria_id == categoria_id
            )

        if competencia_inicio is not None:
            consulta = consulta.where(
                Lancamento.data_competencia >= competencia_inicio
            )

        if competencia_fim is not None:
            consulta = consulta.where(
                Lancamento.data_competencia <= competencia_fim
            )

        consulta = (
            consulta
            .order_by(
                Lancamento.data_competencia.desc(),
                Lancamento.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )

        return list(self.db.scalars(consulta).all())

    def buscar(self, lancamento_id: int) -> Lancamento | None:
        return self.db.get(Lancamento, lancamento_id)

    def adicionar(self, lancamento: Lancamento) -> None:
        self.db.add(lancamento)

    def excluir(self, lancamento: Lancamento) -> None:
        self.db.delete(lancamento)