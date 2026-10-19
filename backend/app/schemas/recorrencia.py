from datetime import date
from decimal import Decimal
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.schemas.lancamento import FormaPagamento, TipoLancamento


class RecorrenciaCriar(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    descricao: str = Field(min_length=1, max_length=200)
    tipo: TipoLancamento
    valor: Decimal = Field(
        gt=0,
        max_digits=14,
        decimal_places=2,
        allow_inf_nan=False,
    )
    categoria_id: int = Field(gt=0)
    dia_vencimento: int = Field(ge=1, le=31)
    competencia_inicio: date
    competencia_fim: date | None = None
    forma_pagamento: FormaPagamento
    observacao: str | None = None

    @field_validator("competencia_inicio", "competencia_fim")
    @classmethod
    def validar_mes(cls, valor: date | None) -> date | None:
        if valor is not None and valor.day != 1:
            raise ValueError(
                "Use o primeiro dia do mês, por exemplo: 2026-11-01."
            )

        return valor

    @model_validator(mode="after")
    def validar_periodo(self) -> Self:
        if (
            self.competencia_fim is not None
            and self.competencia_fim < self.competencia_inicio
        ):
            raise ValueError(
                "O mês final não pode ser anterior ao mês inicial."
            )

        return self


class RecorrenciaResposta(RecorrenciaCriar):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool


class RecorrenciaSituacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ativo: bool


class RecorrenciaGerar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ate: date

    @field_validator("ate")
    @classmethod
    def validar_mes(cls, valor: date) -> date:
        if valor.day != 1:
            raise ValueError(
                "Use o primeiro dia do último mês desejado."
            )

        return valor


class RecorrenciaGeracaoResposta(BaseModel):
    recorrencia_id: int
    gerados: int
    meses_ja_processados: int
    ate: date