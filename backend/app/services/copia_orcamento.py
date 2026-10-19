from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.categoria import Categoria
from app.models.orcamento import Orcamento
from app.schemas.copia_orcamento import (
    CopiaOrcamentoCriar,
    CopiaOrcamentoResposta,
)


class CopiaOrcamentoService:
    def __init__(self, db: Session):
        self.db = db

    def copiar(
        self,
        dados: CopiaOrcamentoCriar,
    ) -> CopiaOrcamentoResposta:
        try:
            orcamentos_origem = self.db.scalars(
                select(Orcamento)
                .where(Orcamento.competencia == dados.origem)
                .order_by(Orcamento.categoria_id)
            ).all()

            if not orcamentos_origem:
                raise HTTPException(
                    status_code=404,
                    detail="Não existem orçamentos no mês de origem.",
                )

            ids_categorias = [
                item.categoria_id for item in orcamentos_origem
            ]

            categorias = self.db.scalars(
                select(Categoria)
                .where(Categoria.id.in_(ids_categorias))
                .order_by(Categoria.id)
                .with_for_update()
            ).all()

            categorias_disponiveis = {
                categoria.id
                for categoria in categorias
                if categoria.ativo and categoria.tipo == "despesa"
            }

            categorias_existentes = set(
                self.db.scalars(
                    select(Orcamento.categoria_id).where(
                        Orcamento.competencia == dados.destino,
                        Orcamento.categoria_id.in_(ids_categorias),
                    )
                ).all()
            )

            copiados = 0
            ja_existentes = 0
            indisponiveis = 0

            for orcamento in orcamentos_origem:
                if orcamento.categoria_id in categorias_existentes:
                    ja_existentes += 1
                    continue

                if orcamento.categoria_id not in categorias_disponiveis:
                    indisponiveis += 1
                    continue

                self.db.add(
                    Orcamento(
                        categoria_id=orcamento.categoria_id,
                        competencia=dados.destino,
                        limite=orcamento.limite,
                    )
                )

                copiados += 1

            self.db.commit()

            return CopiaOrcamentoResposta(
                origem=dados.origem,
                destino=dados.destino,
                copiados=copiados,
                ja_existentes=ja_existentes,
                categorias_indisponiveis=indisponiveis,
            )

        except HTTPException:
            self.db.rollback()
            raise

        except IntegrityError as exc:
            self.db.rollback()

            raise HTTPException(
                status_code=409,
                detail=(
                    "Houve um conflito ao copiar os orçamentos. "
                    "Nenhum limite desta operação foi salvo. "
                    "Atualize e tente novamente."
                ),
            ) from exc

        except SQLAlchemyError:
            self.db.rollback()
            raise