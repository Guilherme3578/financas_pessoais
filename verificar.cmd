@echo off
setlocal
title Verificar - Financas Pessoais

cd /d "%~dp0"

set "FINANCAS_FALHAS=0"

if not exist "backend\.venv\Scripts\python.exe" (
    echo ERRO: ambiente Python nao encontrado.
    pause
    exit /b 1
)

if not exist "scripts\verificar_api.py" (
    echo ERRO: scripts\verificar_api.py nao encontrado.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo ERRO: frontend\package.json nao encontrado.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1

if errorlevel 1 (
    echo ERRO: npm nao encontrado.
    pause
    exit /b 1
)

echo.
echo [1/5] Verificando a sintaxe do backend...
echo.

pushd "%~dp0backend"

".venv\Scripts\python.exe" -m compileall -q app migrations

if errorlevel 1 set /a FINANCAS_FALHAS+=1

echo.
echo [2/5] Verificando modelos e migracoes...
echo.

".venv\Scripts\python.exe" -m alembic check

if errorlevel 1 set /a FINANCAS_FALHAS+=1

popd

echo.
echo [3/5] Executando o lint do frontend...
echo.

pushd "%~dp0frontend"

call npm.cmd run lint

if errorlevel 1 set /a FINANCAS_FALHAS+=1

echo.
echo [4/5] Gerando o build do frontend...
echo.

call npm.cmd run build

if errorlevel 1 set /a FINANCAS_FALHAS+=1

popd

echo.
echo [5/5] Consultando as rotas da API...
echo A API deve estar ligada na porta 8000.
echo.

"%~dp0backend\.venv\Scripts\python.exe" "%~dp0scripts\verificar_api.py"

if errorlevel 1 set /a FINANCAS_FALHAS+=1

echo.

if "%FINANCAS_FALHAS%"=="0" (
    echo VERIFICACAO CONCLUIDA: todas as etapas passaram.
) else (
    echo ATENCAO: %FINANCAS_FALHAS% etapa(s) apresentaram falhas.
    echo Confira as mensagens acima.
)

echo.
pause

exit /b %FINANCAS_FALHAS%