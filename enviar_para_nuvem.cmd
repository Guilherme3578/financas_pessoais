@echo off
setlocal
title Enviar banco para a nuvem - Financas Pessoais

cd /d "%~dp0"

set "FINANCAS_PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "FINANCAS_BANCO=financas_controle"
set "FINANCAS_USUARIO=postgres"

if not exist "%FINANCAS_PG_BIN%\pg_restore.exe" (
    echo.
    echo ERRO: pg_restore.exe nao encontrado.
    echo Confira a pasta de instalacao do PostgreSQL.
    echo Ajuste FINANCAS_PG_BIN neste arquivo.
    echo.
    pause
    exit /b 1
)

if not exist "backups" mkdir "backups"

set "FINANCAS_ARQUIVO=%~dp0backups\envio_nuvem.backup"

echo.
echo Este script copia o banco local (tabelas e dados) para o banco
echo na nuvem usado pelo Vercel.
echo.
echo ATENCAO: o conteudo atual do banco na nuvem sera substituido.
echo.
echo Cole a connection string do banco (comeca com postgres://
echo ou postgresql://) e pressione Enter.
echo No Vercel: Storage, abra o banco, aba .env.local, copie o valor
echo de DATABASE_URL sem as aspas.
echo.

set "FINANCAS_URL="
set /p "FINANCAS_URL=Connection string: "

if not defined FINANCAS_URL (
    echo.
    echo ERRO: nenhuma connection string informada.
    pause
    exit /b 1
)

set "FINANCAS_URL=%FINANCAS_URL:"=%"

echo.
echo [1/2] Copiando o banco local.
echo Digite a senha do PostgreSQL local quando solicitado.
echo A senha nao aparece enquanto voce digita.
echo.

"%FINANCAS_PG_BIN%\pg_dump.exe" --host=127.0.0.1 --port=5432 --username="%FINANCAS_USUARIO%" --password --format=custom --no-owner --no-privileges --file="%FINANCAS_ARQUIVO%" "%FINANCAS_BANCO%"

if errorlevel 1 (
    echo.
    echo ERRO: nao foi possivel copiar o banco local.
    echo Confira se o PostgreSQL esta ligado e a senha esta correta.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] Enviando para o banco na nuvem...
echo.

"%FINANCAS_PG_BIN%\pg_restore.exe" --clean --if-exists --no-owner --no-privileges --dbname="%FINANCAS_URL%" "%FINANCAS_ARQUIVO%"

if errorlevel 1 (
    echo.
    echo O envio terminou com avisos ou erros. Confira as mensagens acima.
    echo Avisos sobre "schema public" ou "extension" podem ser ignorados.
    echo.
    pause
    exit /b 1
)

echo.
echo Banco enviado para a nuvem com sucesso.
echo.
pause

endlocal
