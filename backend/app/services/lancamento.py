from datetime import date

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.categoria import Categoria
from app.models.lancamento import Lancamento
from app.repositories.lancamento import LancamentoRepository
from app.schemas.lancamento import LancamentoAtualizar, LancamentoCriar


class LancamentoService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = LancamentoRepository(db)

    def listar(
        self,
        tipo: str | None = None,
        status: str | None = None,
        categoria_id: int | None = None,
        competencia_inicio: date | None = None,
        competencia_fim: date | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[Lancamento]:
        if (
            competencia_inicio is not None
            and competencia_fim is not None
            and competencia_inicio > competencia_fim
        ):
            raise HTTPException(
                status_code=422,
                detail="A data inicial não pode ser posterior à data final.",
            )

        return self.repository.listar(
            tipo=tipo,
            status=status,
            categoria_id=categoria_id,
            competencia_inicio=competencia_inicio,
            competencia_fim=competencia_fim,
            offset=offset,
            limit=limit,
        )

    def buscar(self, lancamento_id: int) -> Lancamento:
        lancamento = self.repository.buscar(lancamento_id)

        if lancamento is None:
            raise HTTPException(
                status_code=404,
                detail="Lançamento não encontrado.",
            )

        return lancamento

    def criar(self, dados: LancamentoCriar) -> Lancamento:
        self._validar_categoria(
            categoria_id=dados.categoria_id,
            tipo=dados.tipo,
            exigir_ativa=True,
        )

        lancamento = Lancamento(**dados.model_dump())

        self.repository.adicionar(lancamento)
        self._confirmar(
            "Não foi possível cadastrar o lançamento. "
            "Verifique a categoria e os dados informados."
        )
        self.db.refresh(lancamento)

        return lancamento

    def atualizar(
        self,
        lancamento_id: int,
        dados: LancamentoAtualizar,
    ) -> Lancamento:
        lancamento = self.buscar(lancamento_id)

        alterou_categoria_ou_tipo = (
            lancamento.categoria_id != dados.categoria_id
            or lancamento.tipo != dados.tipo
        )

        self._validar_categoria(
            categoria_id=dados.categoria_id,
            tipo=dados.tipo,
            exigir_ativa=alterou_categoria_ou_tipo,
        )

        for campo, valor in dados.model_dump().items():
            setattr(lancamento, campo, valor)

        self._confirmar(
            "Não foi possível atualizar o lançamento. "
            "Verifique a categoria e os dados informados."
        )
        self.db.refresh(lancamento)

        return lancamento

    def excluir(self, lancamento_id: int) -> None:
        lancamento = self.buscar(lancamento_id)

        self.repository.excluir(lancamento)
        self._confirmar(
            "Não foi possível excluir o lançamento "
            "porque existem registros vinculados a ele."
        )

    def _validar_categoria(
        self,
        categoria_id: int,
        tipo: str,
        exigir_ativa: bool,
    ) -> None:
        categoria = self.db.get(Categoria, categoria_id)

        if categoria is None:
            raise HTTPException(
                status_code=422,
                detail="A categoria informada não existe.",
            )

        if categoria.tipo != tipo:
            raise HTTPException(
                status_code=422,
                detail=(
                    "O tipo do lançamento deve ser igual "
                    "ao tipo da categoria."
                ),
            )

        if exigir_ativa and not categoria.ativo:
            raise HTTPException(
                status_code=422,
                detail="Selecione uma categoria ativa.",
            )

    def _confirmar(self, mensagem: str) -> None:
        try:
            self.db.commit()
        except IntegrityError as erro:
            self.db.rollback()
            raise HTTPException(
                status_code=409,
                detail=mensagem,
            ) from erro