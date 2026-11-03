import os
import ssl
from collections.abc import Generator

from sqlalchemy import URL, create_engine, make_url
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


settings = get_settings()

connect_args: dict = {"timeout": 5}

if settings.database_url:
    # O pg8000 não aceita parâmetros como sslmode na URL;
    # a conexão com o banco na nuvem usa SSL pelo ssl_context.
    database_url = make_url(
        settings.database_url.get_secret_value()
    ).set(drivername="postgresql+pg8000", query={})
    connect_args["ssl_context"] = ssl.create_default_context()
else:
    database_url = URL.create(
        drivername="postgresql+pg8000",
        username=settings.db_user,
        password=(
            settings.db_password.get_secret_value()
            if settings.db_password
            else None
        ),
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
    )

# Em funções serverless as conexões não são reaproveitadas entre execuções.
engine_options = {"poolclass": NullPool} if os.getenv("VERCEL") else {}

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
    **engine_options,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
