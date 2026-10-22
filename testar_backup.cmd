@echo off
setlocal
title Testar backup - Financas Pessoais

cd /d "%~dp0"

set "FINANCAS_PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "FINANCAS_USUARIO=postgres"

if not exist "%FINANCAS_PG_BIN%\createdb.exe" (
    echo ERRO: createdb.exe nao encontrado.
    pause
    exit /b 1
)

if not exist "%FINANCAS_PG_BIN%\pg_restore.exe" (
    echo ERRO: pg_restore.exe nao encontrado.
    pause
    exit /b 1
)

if not exist "%FINANCAS_PG_BIN%\psql.exe" (
    echo ERRO: psql.exe nao encontrado.
    pause
    exit /b 1
)

set "FINANCAS_BACKUP="

for /f "delims=" %%f in ('dir /b /a-d /o-n "backups\financas_*.backup" 2^>nul') do if not defined FINANCAS_BACKUP set "FINANCAS_BACKUP=%~dp0backups\%%f"

if not defined FINANCAS_BACKUP (
    echo.
    echo Nenhum backup encontrado na pasta backups.
    echo Execute backup.cmd primeiro.
    pause
    exit /b 1
)

set "FINANCAS_DATA="

for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss_fff"') do set "FINANCAS_DATA=%%i"

if not defined FINANCAS_DATA (
    echo ERRO: nao foi possivel gerar o nome do banco de teste.
    pause
    exit /b 1
)

set "FINANCAS_TESTE=financas_teste_%FINANCAS_DATA%"

echo.
echo Backup selecionado:
echo "%FINANCAS_BACKUP%"
echo.
echo Banco de teste: %FINANCAS_TESTE%
echo Seu banco principal nao sera alterado.
echo.
echo A senha do PostgreSQL sera solicitada em cada etapa.
echo.

"%FINANCAS_PG_BIN%\createdb.exe" --host=127.0.0.1 --port=5432 --username="%FINANCAS_USUARIO%" --password --template=template0 "%FINANCAS_TESTE%"

if errorlevel 1 (
    echo.
    echo ERRO: nao foi possivel criar o banco de teste.
    pause
    exit /b 1
)

"%FINANCAS_PG_BIN%\pg_restore.exe" --host=127.0.0.1 --port=5432 --username="%FINANCAS_USUARIO%" --password --dbname="%FINANCAS_TESTE%" --no-owner --no-privileges --single-transaction --exit-on-error "%FINANCAS_BACKUP%"

if errorlevel 1 (
    echo.
    echo ERRO: a restauracao falhou.
    echo Confira a mensagem acima.
    echo O banco de teste foi mantido: %FINANCAS_TESTE%
    pause
    exit /b 1
)

echo.
echo Restauracao concluida. Conferindo os registros...
echo.

"%FINANCAS_PG_BIN%\psql.exe" --host=127.0.0.1 --port=5432 --username="%FINANCAS_USUARIO%" --password --dbname="%FINANCAS_TESTE%" --no-psqlrc --set=ON_ERROR_STOP=1 --pset=pager=off --command="SELECT 'categorias' AS tabela, COUNT(*) AS registros FROM categorias UNION ALL SELECT 'lancamentos', COUNT(*) FROM lancamentos UNION ALL SELECT 'recorrencias', COUNT(*) FROM recorrencias UNION ALL SELECT 'orcamentos', COUNT(*) FROM orcamentos;"

if errorlevel 1 (
    echo.
    echo O backup foi restaurado, mas a consulta de verificacao falhou.
    echo Confira a mensagem acima.
    pause
    exit /b 1
)

echo.
echo TESTE CONCLUIDO: backup restaurado e tabelas consultadas.
echo Banco de teste: %FINANCAS_TESTE%
echo.
echo O banco de teste foi mantido para conferencia no pgAdmin.
echo A aplicacao continua usando o banco principal.
echo.
pause

endlocal