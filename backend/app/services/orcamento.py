from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.categoria import Categoria
from app.models.orcamento import Orcamento
from app.repositories.orcamento import OrcamentoRepository
from app.schemas.orcamento import OrcamentoResposta, OrcamentoSalvar


class OrcamentoService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = OrcamentoRepository(db)

    def listar(self, competencia: date) -> list[OrcamentoResposta]:
        if competencia.day != 1:
            raise HTTPException(
                status_code=422,
                detail="Informe o primeiro dia do mês.",
            )

        resultado = []

        for orcamento, nome, pago, pendente in self.repository.listar(
            competencia
        ):
            valor_pago = Decimal(pago)
            valor_pendente = Decimal(pendente)
            comprometido = valor_pago + valor_pendente

            resultado.append(
                OrcamentoResposta(
                    id=orcamento.id,
                    categoria_id=orcamento.categoria_id,
                    categoria_nome=nome,
                    competencia=orcamento.competencia,
                    limite=orcamento.limite,
                    pago=valor_pago,
                    pendente=valor_pendente,
                    comprometido=comprometido,
                    disponivel=orcamento.limite - comprometido,
                )
            )

        return resultado

    def salvar(self, dados: OrcamentoSalvar) -> OrcamentoResposta:
        categoria = self.db.scalar(
            select(Categoria)
            .where(Categoria.id == dados.categoria_id)
            .with_for_update()
        )

        if categoria is None:
            raise HTTPException(
                status_code=404,
                detail="Categoria não encontrada.",
            )

        if categoria.tipo != "despesa":
            raise HTTPException(
                status_code=422,
                detail="O orçamento deve usar uma categoria de despesa.",
            )

        if not categoria.ativo:
            raise HTTPException(
                status_code=422,
                detail="Ative a categoria antes de definir o orçamento.",
            )

        orcamento = self.repository.buscar(
            dados.categoria_id,
            dados.competencia,
        )

        if orcamento is None:
            orcamento = Orcamento(
                categoria_id=dados.categoria_id,
                competencia=dados.competencia,
                limite=dados.limite,
            )

            self.db.add(orcamento)
        else:
            orcamento.limite = dados.limite

        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()

            raise HTTPException(
                status_code=409,
                detail="Não foi possível salvar. Atualize e tente novamente.",
            ) from exc

        return next(
            item
            for item in self.listar(dados.competencia)
            if item.categoria_id == dados.categoria_id
        )

    def excluir(self, orcamento_id: int) -> None:
        orcamento = self.db.get(Orcamento, orcamento_id)

        if orcamento is None:
            raise HTTPException(
                status_code=404,
                detail="Orçamento não encontrado.",
            )

        self.db.delete(orcamento)
        self.db.commit()