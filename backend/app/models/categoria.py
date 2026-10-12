from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Index,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    tipo: Mapped[str] = mapped_column(String(7), nullable=False)

    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('receita', 'despesa')",
            name="ck_categorias_tipo",
        ),
        CheckConstraint(
            "length(trim(nome)) > 0",
            name="ck_categorias_nome",
        ),
        UniqueConstraint(
            "id",
            "tipo",
            name="uq_categorias_id_tipo",
        ),
        Index(
            "uq_categorias_nome_tipo",
            func.lower(nome),
            tipo,
            unique=True,
        ),
    )