"""Cria a tabela de lançamentos.

Revision ID: b816bacea313
Revises: 9c2d4c670bcb
Create Date: 2026-10-12 19:41:43.374145
"""

# O Alembic disponibiliza as funções de op dinamicamente.
# pylint: disable=no-member

import sqlalchemy as sa
from alembic import op


revision: str = "b816bacea313"
down_revision: str | None = "9c2d4c670bcb"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    """Cria a restrição referenciada, a tabela e os índices."""

    op.create_unique_constraint(
        "uq_categorias_id_tipo",
        "categorias",
        ["id", "tipo"],
    )

    op.create_table(
        "lancamentos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.String(length=200), nullable=False),
        sa.Column("tipo", sa.String(length=7), nullable=False),
        sa.Column(
            "valor",
            sa.Numeric(precision=14, scale=2),
            nullable=False,
        ),
        sa.Column("categoria_id", sa.Integer(), nullable=False),
        sa.Column("data_competencia", sa.Date(), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=False),
        sa.Column("data_efetivacao", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=10),
            server_default=sa.text("'pendente'"),
            nullable=False,
        ),
        sa.Column(
            "forma_pagamento",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column("observacao", sa.Text(), nullable=True),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(status = 'efetivado' AND data_efetivacao IS NOT NULL) "
            "OR (status IN ('pendente', 'cancelado') "
            "AND data_efetivacao IS NULL)",
            name="ck_lancamentos_efetivacao",
        ),
        sa.CheckConstraint(
            "forma_pagamento IN "
            "('pix', 'debito', 'dinheiro', 'transferencia', 'boleto')",
            name="ck_lancamentos_forma_pagamento",
        ),
        sa.CheckConstraint(
            "status IN ('pendente', 'efetivado', 'cancelado')",
            name="ck_lancamentos_status",
        ),
        sa.CheckConstraint(
            "tipo IN ('receita', 'despesa')",
            name="ck_lancamentos_tipo",
        ),
        sa.CheckConstraint(
            "length(trim(descricao)) > 0",
            name="ck_lancamentos_descricao",
        ),
        sa.CheckConstraint(
            "valor > 0",
            name="ck_lancamentos_valor",
        ),
        sa.ForeignKeyConstraint(
            ["categoria_id", "tipo"],
            ["categorias.id", "categorias.tipo"],
            name="fk_lancamentos_categoria_tipo",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_lancamentos_categoria_tipo",
        "lancamentos",
        ["categoria_id", "tipo"],
        unique=False,
    )

    op.create_index(
        "ix_lancamentos_competencia",
        "lancamentos",
        ["data_competencia"],
        unique=False,
    )

    op.create_index(
        "ix_lancamentos_status_vencimento",
        "lancamentos",
        ["status", "data_vencimento"],
        unique=False,
    )


def downgrade() -> None:
    """Remove os índices, a tabela e depois a restrição referenciada."""

    op.drop_index(
        "ix_lancamentos_status_vencimento",
        table_name="lancamentos",
    )

    op.drop_index(
        "ix_lancamentos_competencia",
        table_name="lancamentos",
    )

    op.drop_index(
        "ix_lancamentos_categoria_tipo",
        table_name="lancamentos",
    )

    op.drop_table("lancamentos")

    op.drop_constraint(
        "uq_categorias_id_tipo",
        "categorias",
        type_="unique",
    )