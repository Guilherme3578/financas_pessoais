from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class DashboardResumo(BaseModel):
    data_inicio: date
    data_fim: date
    receitas_efetivadas: Decimal
    despesas_efetivadas: Decimal
    saldo_realizado: Decimal
    receitas_pendentes: Decimal
    despesas_pendentes: Decimal
    saldo_previsto: Decimal
    quantidade_lancamentos: int