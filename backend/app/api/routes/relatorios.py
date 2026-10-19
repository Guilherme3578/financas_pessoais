from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.relatorio import RelatorioService


router = APIRouter(
    prefix="/relatorios",
    tags=["Relatórios"],
)


@router.get("/lancamentos.xlsx")
def exportar_lancamentos_excel(
    db: Annotated[Session, Depends(get_db)],
    data_inicio: Annotated[date, Query()],
    data_fim: Annotated[date, Query()],
    tipo: Annotated[
        Literal["receita", "despesa"] | None,
        Query(),
    ] = None,
    status: Annotated[
        Literal["pendente", "efetivado", "cancelado"] | None,
        Query(),
    ] = None,
):
    service = RelatorioService(db)

    arquivo = service.gerar_excel(
        data_inicio=data_inicio,
        data_fim=data_fim,
        tipo=tipo,
        status=status,
    )

    nome = f"lancamentos-{data_inicio}-a-{data_fim}.xlsx"

    return StreamingResponse(
        arquivo,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{nome}"',
            "Cache-Control": "no-store",
        },
    )