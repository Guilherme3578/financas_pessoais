from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OrcamentoSalvar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    categoria_id: int = Field(gt=0)
    competencia: date
    limite: Decimal = Field(
        gt=0,
        max_digits=14,
        decimal_places=2,
        allow_inf_nan=False,
    )

    @field_validator("competencia")
    @classmethod
    def validar_competencia(cls, valor: date) -> date:
        if valor.day != 1:
            raise ValueError("Informe o primeiro dia do mês.")

        return valor


class OrcamentoResposta(BaseModel):
    id: int
    categoria_id: int
    categoria_nome: str
    competencia: date
    limite: Decimal
    pago: Decimal
    pendente: Decimal
    comprometido: Decimal
    disponivel: Decimal