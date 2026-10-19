from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.categoria import Categoria
from app.models.lancamento import Lancamento


class RelatorioRepository:
    def __init__(self, db: Session):
        self.db = db

    def listar_lancamentos(
        self,
        data_inicio: date,
        data_fim: date,
        tipo: str | None = None,
        status: str | None = None,
    ):
        consulta = (
            select(Lancamento, Categoria.nome)
            .join(Categoria, Categoria.id == Lancamento.categoria_id)
            .where(
                Lancamento.data_competencia >= data_inicio,
                Lancamento.data_competencia <= data_fim,
            )
            .order_by(Lancamento.data_competencia, Lancamento.id)
            .limit(10001)
        )

        if tipo is not None:
            consulta = consulta.where(Lancamento.tipo == tipo)

        if status is not None:
            consulta = consulta.where(Lancamento.status == status)

        return self.db.execute(consulta).all()