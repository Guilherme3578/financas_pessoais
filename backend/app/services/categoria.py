from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.categoria import Categoria
from app.repositories.categoria import CategoriaRepository
from app.schemas.categoria import CategoriaAtualizar, CategoriaCriar


class CategoriaService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = CategoriaRepository(db)

    def listar(
        self,
        tipo: str | None,
        ativo: bool | None,
        offset: int,
        limit: int,
    ) -> list[Categoria]:
        return self.repository.listar(tipo, ativo, offset, limit)

    def buscar(self, categoria_id: int) -> Categoria:
        categoria = self.repository.buscar(categoria_id)

        if categoria is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada.",
            )

        return categoria

    def criar(self, dados: CategoriaCriar) -> Categoria:
        categoria = Categoria(**dados.model_dump())
        self.repository.adicionar(categoria)

        self._confirmar(
            "Não foi possível salvar. Confira se já existe "
            "uma categoria com esse nome e tipo."
        )

        self.db.refresh(categoria)
        return categoria

    def atualizar(
        self,
        categoria_id: int,
        dados: CategoriaAtualizar,
    ) -> Categoria:
        categoria = self.buscar(categoria_id)

        categoria.nome = dados.nome
        categoria.tipo = dados.tipo
        categoria.ativo = dados.ativo

        self._confirmar(
            "Não foi possível atualizar. Confira se já existe "
            "uma categoria com esse nome e tipo."
        )

        self.db.refresh(categoria)
        return categoria

    def excluir(self, categoria_id: int) -> None:
        categoria = self.buscar(categoria_id)
        self.repository.excluir(categoria)

        self._confirmar(
            "Não foi possível excluir: a categoria possui "
            "vínculos com outros registros."
        )

    def _confirmar(self, mensagem: str) -> None:
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=mensagem,
            ) from None