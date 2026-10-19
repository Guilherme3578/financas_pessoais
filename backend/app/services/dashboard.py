from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.dashboard import DashboardRepository
from app.schemas.dashboard import DashboardResumo


class DashboardService:
    def __init__(self, db: Session):
        self.repository = DashboardRepository(db)

    def resumir(
        self,
        data_inicio: date,
        data_fim: date,
    ) -> DashboardResumo:
        if data_inicio > data_fim:
            raise HTTPException(
                status_code=422,
                detail="A data inicial não pode ser posterior à data final.",
            )

        dados = self.repository.resumir(data_inicio, data_fim)

        receitas_efetivadas = Decimal(dados["receitas_efetivadas"])
        despesas_efetivadas = Decimal(dados["despesas_efetivadas"])
        receitas_pendentes = Decimal(dados["receitas_pendentes"])
        despesas_pendentes = Decimal(dados["despesas_pendentes"])

        saldo_realizado = receitas_efetivadas - despesas_efetivadas

        saldo_previsto = (
            saldo_realizado
            + receitas_pendentes
            - despesas_pendentes
        )

        return DashboardResumo(
            data_inicio=data_inicio,
            data_fim=data_fim,
            receitas_efetivadas=receitas_efetivadas,
            despesas_efetivadas=despesas_efetivadas,
            saldo_realizado=saldo_realizado,
            receitas_pendentes=receitas_pendentes,
            despesas_pendentes=despesas_pendentes,
            saldo_previsto=saldo_previsto,
            quantidade_lancamentos=int(dados["quantidade_lancamentos"]),
        )