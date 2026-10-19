from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Orcamento(Base):
    __tablename__ = "orcamentos"

    __table_args__ = (
        UniqueConstraint(
            "categoria_id",
            "competencia",
            name="uq_orcamentos_categoria_competencia",
        ),
        CheckConstraint(
            "limite > 0",
            name="ck_orcamentos_limite",
        ),
        CheckConstraint(
            "EXTRACT(DAY FROM competencia) = 1",
            name="ck_orcamentos_competencia",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    categoria_id: Mapped[int] = mapped_column(
        ForeignKey("categorias.id", ondelete="RESTRICT"),
        nullable=False,
    )

    competencia: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    limite: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )