from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.recorrencia import Recorrencia, RecorrenciaOcorrencia


class RecorrenciaRepository:
    def __init__(self, db: Session):
        self.db = db

    def listar(
        self,
        ativo: bool | None,
        offset: int,
        limit: int,
    ) -> list[Recorrencia]:
        consulta = select(Recorrencia)

        if ativo is not None:
            consulta = consulta.where(Recorrencia.ativo == ativo)

        consulta = (
            consulta
            .order_by(Recorrencia.id.desc())
            .offset(offset)
            .limit(limit)
        )

        return list(self.db.scalars(consulta).all())

    def buscar_com_bloqueio(self, recorrencia_id: int) -> Recorrencia | None:
        consulta = (
            select(Recorrencia)
            .where(Recorrencia.id == recorrencia_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )

        return self.db.scalar(consulta)

    def meses_processados(self, recorrencia_id: int) -> set[date]:
        consulta = select(RecorrenciaOcorrencia.competencia).where(
            RecorrenciaOcorrencia.recorrencia_id == recorrencia_id
        )

        return set(self.db.scalars(consulta).all())

    def adicionar(self, recorrencia: Recorrencia) -> None:
        self.db.add(recorrencia)