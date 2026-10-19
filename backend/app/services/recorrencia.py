from calendar import monthrange
from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.categoria import Categoria
from app.models.lancamento import Lancamento
from app.models.recorrencia import Recorrencia, RecorrenciaOcorrencia
from app.repositories.recorrencia import RecorrenciaRepository
from app.schemas.recorrencia import (
    RecorrenciaCriar,
    RecorrenciaGeracaoResposta,
)


class RecorrenciaService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = RecorrenciaRepository(db)

    def listar(
        self,
        ativo: bool | None,
        offset: int,
        limit: int,
    ) -> list[Recorrencia]:
        return self.repository.listar(ativo, offset, limit)

    def _validar_categoria(
        self,
        categoria_id: int,
        tipo: str,
    ) -> None:
        categoria = self.db.scalar(
            select(Categoria)
            .where(Categoria.id == categoria_id)
            .with_for_update(read=True)
        )

        if categoria is None:
            raise HTTPException(
                status_code=422,
                detail="A categoria informada não existe.",
            )

        if categoria.tipo != tipo:
            raise HTTPException(
                status_code=422,
                detail="O tipo da categoria não corresponde ao lançamento.",
            )

        if not categoria.ativo:
            raise HTTPException(
                status_code=422,
                detail="A categoria está inativa. Ative-a antes de continuar.",
            )

    def _buscar(self, recorrencia_id: int) -> Recorrencia:
        recorrencia = self.repository.buscar_com_bloqueio(recorrencia_id)

        if recorrencia is None:
            raise HTTPException(
                status_code=404,
                detail="Recorrência não encontrada.",
            )

        return recorrencia

    def _confirmar(self) -> None:
        try:
            self.db.commit()
        except IntegrityError as erro:
            self.db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Não foi possível salvar. Verifique os dados vinculados.",
            ) from erro
        except SQLAlchemyError:
            self.db.rollback()
            raise

    def criar(self, dados: RecorrenciaCriar) -> Recorrencia:
        self._validar_categoria(dados.categoria_id, dados.tipo)

        recorrencia = Recorrencia(
            **dados.model_dump(),
            ativo=True,
        )

        self.repository.adicionar(recorrencia)
        self._confirmar()
        self.db.refresh(recorrencia)

        return recorrencia

    def alterar_situacao(
        self,
        recorrencia_id: int,
        ativo: bool,
    ) -> Recorrencia:
        recorrencia = self._buscar(recorrencia_id)

        if ativo:
            self._validar_categoria(
                recorrencia.categoria_id,
                recorrencia.tipo,
            )

        recorrencia.ativo = ativo
        self._confirmar()
        self.db.refresh(recorrencia)

        return recorrencia

    def gerar(
        self,
        recorrencia_id: int,
        ate: date,
    ) -> RecorrenciaGeracaoResposta:
        recorrencia = self._buscar(recorrencia_id)

        if not recorrencia.ativo:
            raise HTTPException(
                status_code=409,
                detail="A recorrência está pausada.",
            )

        inicio = recorrencia.competencia_inicio
        limite = min(ate, recorrencia.competencia_fim or ate)

        if limite < inicio:
            raise HTTPException(
                status_code=422,
                detail="O mês solicitado é anterior ao início da recorrência.",
            )

        quantidade = (
            (limite.year - inicio.year) * 12
            + limite.month
            - inicio.month
            + 1
        )

        if quantidade > 120:
            raise HTTPException(
                status_code=422,
                detail="O período máximo desta geração é de 120 meses desde o início.",
            )

        self._validar_categoria(
            recorrencia.categoria_id,
            recorrencia.tipo,
        )

        processados = self.repository.meses_processados(recorrencia.id)

        gerados = 0
        ignorados = 0

        try:
            for deslocamento in range(quantidade):
                indice = inicio.year * 12 + inicio.month - 1 + deslocamento
                ano, mes_zero = divmod(indice, 12)
                mes = mes_zero + 1
                competencia = date(ano, mes, 1)

                if competencia in processados:
                    ignorados += 1
                    continue

                ultimo_dia = monthrange(ano, mes)[1]
                vencimento = date(
                    ano,
                    mes,
                    min(recorrencia.dia_vencimento, ultimo_dia),
                )

                lancamento = Lancamento(
                    descricao=recorrencia.descricao,
                    tipo=recorrencia.tipo,
                    valor=recorrencia.valor,
                    categoria_id=recorrencia.categoria_id,
                    data_competencia=competencia,
                    data_vencimento=vencimento,
                    data_efetivacao=None,
                    status="pendente",
                    forma_pagamento=recorrencia.forma_pagamento,
                    observacao=recorrencia.observacao,
                )

                self.db.add(lancamento)
                self.db.flush()

                self.db.add(
                    RecorrenciaOcorrencia(
                        recorrencia_id=recorrencia.id,
                        competencia=competencia,
                        lancamento_id=lancamento.id,
                    )
                )

                gerados += 1

            self.db.commit()
        except IntegrityError as erro:
            self.db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Conflito ao gerar os lançamentos. Nenhum novo registro desta operação foi salvo.",
            ) from erro
        except SQLAlchemyError:
            self.db.rollback()
            raise

        return RecorrenciaGeracaoResposta(
            recorrencia_id=recorrencia_id,
            gerados=gerados,
            meses_ja_processados=ignorados,
            ate=limite,
        )