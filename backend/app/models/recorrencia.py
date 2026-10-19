from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Recorrencia(Base):
    __tablename__ = "recorrencias"

    id: Mapped[int] = mapped_column(primary_key=True)
    descricao: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(String(7), nullable=False)
    valor: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )
    categoria_id: Mapped[int] = mapped_column(nullable=False)
    dia_vencimento: Mapped[int] = mapped_column(nullable=False)
    competencia_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    competencia_fim: Mapped[date | None] = mapped_column(Date)
    forma_pagamento: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    observacao: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["categoria_id", "tipo"],
            ["categorias.id", "categorias.tipo"],
            name="fk_recorrencias_categoria_tipo",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        CheckConstraint(
            "length(trim(descricao)) > 0",
            name="ck_recorrencias_descricao",
        ),
        CheckConstraint(
            "tipo IN ('receita', 'despesa')",
            name="ck_recorrencias_tipo",
        ),
        CheckConstraint(
            "valor > 0",
            name="ck_recorrencias_valor",
        ),
        CheckConstraint(
            "dia_vencimento BETWEEN 1 AND 31",
            name="ck_recorrencias_dia",
        ),
        CheckConstraint(
            "EXTRACT(DAY FROM competencia_inicio) = 1",
            name="ck_recorrencias_inicio_mes",
        ),
        CheckConstraint(
            "competencia_fim IS NULL OR "
            "(EXTRACT(DAY FROM competencia_fim) = 1 "
            "AND competencia_fim >= competencia_inicio)",
            name="ck_recorrencias_fim_mes",
        ),
        CheckConstraint(
            "forma_pagamento IN "
            "('pix', 'debito', 'dinheiro', 'transferencia', 'boleto')",
            name="ck_recorrencias_forma_pagamento",
        ),
    )


class RecorrenciaOcorrencia(Base):
    __tablename__ = "recorrencia_ocorrencias"

    id: Mapped[int] = mapped_column(primary_key=True)
    recorrencia_id: Mapped[int] = mapped_column(
        ForeignKey("recorrencias.id", ondelete="RESTRICT"),
        nullable=False,
    )
    competencia: Mapped[date] = mapped_column(Date, nullable=False)
    lancamento_id: Mapped[int | None] = mapped_column(
        ForeignKey("lancamentos.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "recorrencia_id",
            "competencia",
            name="uq_recorrencia_competencia",
        ),
        UniqueConstraint(
            "lancamento_id",
            name="uq_ocorrencia_lancamento",
        ),
        CheckConstraint(
            "EXTRACT(DAY FROM competencia) = 1",
            name="ck_ocorrencias_competencia_mes",
        ),
    )