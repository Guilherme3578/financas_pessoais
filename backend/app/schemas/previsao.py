from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class PrevisaoMesResposta(BaseModel):
    competencia: date
    receitas_recebidas: Decimal
    receitas_pendentes: Decimal
    despesas_pagas: Decimal
    despesas_pendentes: Decimal
    receitas_previstas: Decimal
    despesas_previstas: Decimal
    resultado_previsto: Decimal