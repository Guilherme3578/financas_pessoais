from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CategoriaDados(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    nome: str = Field(min_length=1, max_length=80)
    tipo: Literal["receita", "despesa"]
    ativo: bool = True


class CategoriaCriar(CategoriaDados):
    pass


class CategoriaAtualizar(CategoriaDados):
    pass


class CategoriaResposta(CategoriaDados):
    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        extra="forbid",
    )

    id: int