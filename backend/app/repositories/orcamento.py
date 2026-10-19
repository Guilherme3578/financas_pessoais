from calendar import monthrange
from datetime import date

from sqlalchemy import case, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.functions import coalesce, sum as sql_sum

from app.models.categoria import Categoria
from app.models.lancamento import Lancamento
from app.models.orcamento import Orcamento


class OrcamentoRepository:
    def __init__(self, db: Session):
        self.db = db

    def buscar(self, categoria_id: int, competencia: date):
        consulta = select(Orcamento).where(
            Orcamento.categoria_id == categoria_id,
            Orcamento.competencia == competencia,
        )

        return self.db.scalar(consulta)

    def listar(self, competencia: date):
        ultimo_dia = monthrange(
            competencia.year,
            competencia.month,
        )[1]

        fim = competencia.replace(day=ultimo_dia)

        totais = (
            select(
                Lancamento.categoria_id.label("categoria_id"),
                sql_sum(
                    case(
                        (
                            Lancamento.status == "efetivado",
                            Lancamento.valor,
                        ),
                        else_=0,
                    )
                ).label("pago"),
                sql_sum(
                    case(
                        (
                            Lancamento.status == "pendente",
                            Lancamento.valor,
                        ),
                        else_=0,
                    )
                ).label("pendente"),
            )
            .where(
                Lancamento.tipo == "despesa",
                Lancamento.status.in_(["efetivado", "pendente"]),
                Lancamento.data_competencia >= competencia,
                Lancamento.data_competencia <= fim,
            )
            .group_by(Lancamento.categoria_id)
            .subquery()
        )

        consulta = (
            select(
                Orcamento,
                Categoria.nome,
                coalesce(totais.c.pago, 0),
                coalesce(totais.c.pendente, 0),
            )
            .join(Categoria, Categoria.id == Orcamento.categoria_id)
            .outerjoin(
                totais,
                totais.c.categoria_id == Orcamento.categoria_id,
            )
            .where(Orcamento.competencia == competencia)
            .order_by(Categoria.nome, Orcamento.id)
        )

        return self.db.execute(consulta).all()