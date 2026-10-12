from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Lancamento(Base):
    __tablename__ = "lancamentos"

    id: Mapped[int] = mapped_column(primary_key=True)

    descricao: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    tipo: Mapped[str] = mapped_column(
        String(7),
        nullable=False,
    )

    valor: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    categoria_id: Mapped[int] = mapped_column(nullable=False)

    data_competencia: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    data_vencimento: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    data_efetivacao: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="pendente",
        server_default=text("'pendente'"),
    )

    forma_pagamento: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    observacao: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["categoria_id", "tipo"],
            ["categorias.id", "categorias.tipo"],
            name="fk_lancamentos_categoria_tipo",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        CheckConstraint(
            "length(trim(descricao)) > 0",
            name="ck_lancamentos_descricao",
        ),
        CheckConstraint(
            "valor > 0",
            name="ck_lancamentos_valor",
        ),
        CheckConstraint(
            "tipo IN ('receita', 'despesa')",
            name="ck_lancamentos_tipo",
        ),
        CheckConstraint(
            "status IN ('pendente', 'efetivado', 'cancelado')",
            name="ck_lancamentos_status",
        ),
        CheckConstraint(
            "forma_pagamento IN "
            "('pix', 'debito', 'dinheiro', 'transferencia', 'boleto')",
            name="ck_lancamentos_forma_pagamento",
        ),
        CheckConstraint(
            "(status = 'efetivado' AND data_efetivacao IS NOT NULL) "
            "OR "
            "(status IN ('pendente', 'cancelado') "
            "AND data_efetivacao IS NULL)",
            name="ck_lancamentos_efetivacao",
        ),
        Index(
            "ix_lancamentos_competencia",
            "data_competencia",
        ),
        Index(
            "ix_lancamentos_status_vencimento",
            "status",
            "data_vencimento",
        ),
        Index(
            "ix_lancamentos_categoria_tipo",
            "categoria_id",
            "tipo",
        ),
    )