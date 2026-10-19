from datetime import date
from decimal import Decimal

from sqlalchemy import case, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.functions import coalesce, count
from sqlalchemy.sql.functions import sum as sql_sum

from app.models.lancamento import Lancamento


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def resumir(
        self,
        data_inicio: date,
        data_fim: date,
    ) -> dict[str, Decimal | int]:
        def total(tipo: str, status: str):
            return coalesce(
                sql_sum(
                    case(
                        (
                            (Lancamento.tipo == tipo)
                            & (Lancamento.status == status),
                            Lancamento.valor,
                        ),
                        else_=0,
                    )
                ),
                0,
            )

        consulta = select(
            total("receita", "efetivado").label("receitas_efetivadas"),
            total("despesa", "efetivado").label("despesas_efetivadas"),
            total("receita", "pendente").label("receitas_pendentes"),
            total("despesa", "pendente").label("despesas_pendentes"),
            count(Lancamento.id).label("quantidade_lancamentos"),
        ).where(
            Lancamento.data_competencia >= data_inicio,
            Lancamento.data_competencia <= data_fim,
            Lancamento.status != "cancelado",
        )

        resultado = self.db.execute(consulta).mappings().one()

        return {
            "receitas_efetivadas": Decimal(
                resultado["receitas_efetivadas"]
            ),
            "despesas_efetivadas": Decimal(
                resultado["despesas_efetivadas"]
            ),
            "receitas_pendentes": Decimal(
                resultado["receitas_pendentes"]
            ),
            "despesas_pendentes": Decimal(
                resultado["despesas_pendentes"]
            ),
            "quantidade_lancamentos": int(
                resultado["quantidade_lancamentos"]
            ),
        }