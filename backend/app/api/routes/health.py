from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.database.session import engine


router = APIRouter(
    prefix="/health",
    tags=["Status"],
)


@router.get("")
def verificar_status() -> dict[str, str]:
    return {
        "status": "ok",
        "mensagem": "API de finanças funcionando",
    }


@router.get("/database")
def verificar_banco() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            banco = connection.execute(
                text("SELECT current_database()")
            ).scalar_one()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Não foi possível conectar ao PostgreSQL. "
                "Confira o serviço e os dados do arquivo .env."
            ),
        ) from None

    return {
        "status": "ok",
        "banco": banco,
        "mensagem": "PostgreSQL conectado",
    }