from datetime import date

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class CopiaOrcamentoCriar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    origem: date
    destino: date

    @field_validator("origem", "destino")
    @classmethod
    def validar_mes(cls, valor: date) -> date:
        if valor.day != 1:
            raise ValueError("Informe o primeiro dia do mês.")

        return valor

    @model_validator(mode="after")
    def validar_periodos(self):
        if self.origem == self.destino:
            raise ValueError("Escolha meses diferentes para origem e destino.")

        return self


class CopiaOrcamentoResposta(BaseModel):
    origem: date
    destino: date
    copiados: int
    ja_existentes: int
    categorias_indisponiveis: int