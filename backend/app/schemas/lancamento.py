from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


TipoLancamento = Literal["receita", "despesa"]

StatusLancamento = Literal["pendente", "efetivado", "cancelado"]

FormaPagamento = Literal[
    "pix",
    "debito",
    "dinheiro",
    "transferencia",
    "boleto",
]


class LancamentoDados(BaseModel):
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
    data_competencia: date
    data_vencimento: date
    data_efetivacao: date | None = None
    status: StatusLancamento = "pendente"
    forma_pagamento: FormaPagamento
    observacao: str | None = None

    @model_validator(mode="after")
    def validar_efetivacao(self) -> Self:
        if self.status == "efetivado" and self.data_efetivacao is None:
            raise ValueError(
                "Informe a data de efetivação para um lançamento efetivado."
            )

        if self.status != "efetivado" and self.data_efetivacao is not None:
            raise ValueError(
                "Lançamentos pendentes ou cancelados não podem "
                "ter data de efetivação."
            )

        return self


class LancamentoCriar(LancamentoDados):
    pass


class LancamentoAtualizar(LancamentoDados):
    pass


class LancamentoResposta(LancamentoDados):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime