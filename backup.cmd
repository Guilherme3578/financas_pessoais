@echo off
setlocal
title Backup - Financas Pessoais

cd /d "%~dp0"

set "FINANCAS_PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "FINANCAS_BANCO=financas_controle"
set "FINANCAS_USUARIO=postgres"

if not exist "%FINANCAS_PG_BIN%\pg_dump.exe" (
    echo.
    echo ERRO: pg_dump.exe nao encontrado.
    echo Confira a pasta de instalacao do PostgreSQL.
    echo Ajuste FINANCAS_PG_BIN neste arquivo.
    echo.
    pause
    exit /b 1
)

if not exist "backups" mkdir "backups"

if not exist "backups" (
    echo.
    echo ERRO: nao foi possivel criar a pasta backups.
    pause
    exit /b 1
)

set "FINANCAS_DATA="

for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss_fff"') do set "FINANCAS_DATA=%%i"

if not defined FINANCAS_DATA (
    echo.
    echo ERRO: nao foi possivel gerar o nome do backup.
    pause
    exit /b 1
)

set "FINANCAS_NOME=financas_%FINANCAS_DATA%.backup"
set "FINANCAS_TEMP=%~dp0backups\%FINANCAS_NOME%.partial"
set "FINANCAS_ARQUIVO=%~dp0backups\%FINANCAS_NOME%"

if exist "%FINANCAS_ARQUIVO%" (
    echo.
    echo ERRO: ja existe um backup com esse nome.
    pause
    exit /b 1
)

echo.
echo Banco: %FINANCAS_BANCO%
echo Usuario: %FINANCAS_USUARIO%
echo.
echo Digite a senha do PostgreSQL quando solicitado.
echo A senha nao aparece enquanto voce digita.
echo.

"%FINANCAS_PG_BIN%\pg_dump.exe" --host=127.0.0.1 --port=5432 --username="%FINANCAS_USUARIO%" --password --format=custom --file="%FINANCAS_TEMP%" "%FINANCAS_BANCO%"

if errorlevel 1 (
    echo.
    echo ERRO: o backup nao foi concluido.
    echo Confira a mensagem acima.
    echo Um arquivo .partial pode ter sido deixado na pasta backups.
    echo.
    pause
    exit /b 1
)

move /Y "%FINANCAS_TEMP%" "%FINANCAS_ARQUIVO%" >nul

if errorlevel 1 (
    echo.
    echo ERRO: o arquivo foi gerado, mas nao foi possivel renomea-lo.
    echo Verifique o arquivo .partial na pasta backups.
    pause
    exit /b 1
)

echo.
echo Backup criado:
echo "%FINANCAS_ARQUIVO%"
echo.
echo Guarde uma copia em outro disco ou armazenamento privado.
echo.
pause

endlocal