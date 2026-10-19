from datetime import date

from sqlalchemy import case, extract, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.functions import sum as sql_sum

from app.models.lancamento import Lancamento


class PrevisaoRepository:
    def __init__(self, db: Session):
        self.db = db

    def resumir(self, inicio: date, fim: date):
        ano = extract("year", Lancamento.data_competencia)
        mes = extract("month", Lancamento.data_competencia)

        consulta = (
            select(
                ano.label("ano"),
                mes.label("mes"),
                sql_sum(
                    case(
                        (
                            (Lancamento.tipo == "receita")
                            & (Lancamento.status == "efetivado"),
                            Lancamento.valor,
                        ),
                        else_=0,
                    )
                ).label("receitas_recebidas"),
                sql_sum(
                    case(
                        (
                            (Lancamento.tipo == "receita")
                            & (Lancamento.status == "pendente"),
                            Lancamento.valor,
                        ),
                        else_=0,
                    )
                ).label("receitas_pendentes"),
                sql_sum(
                    case(
                        (
                            (Lancamento.tipo == "despesa")
                            & (Lancamento.status == "efetivado"),
                            Lancamento.valor,
                        ),
                        else_=0,
                    )
                ).label("despesas_pagas"),
                sql_sum(
                    case(
                        (
                            (Lancamento.tipo == "despesa")
                            & (Lancamento.status == "pendente"),
                            Lancamento.valor,
                        ),
                        else_=0,
                    )
                ).label("despesas_pendentes"),
            )
            .where(
                Lancamento.data_competencia >= inicio,
                Lancamento.data_competencia <= fim,
                Lancamento.status.in_(["pendente", "efetivado"]),
            )
            .group_by(ano, mes)
            .order_by(ano, mes)
        )

        return self.db.execute(consulta).mappings().all()