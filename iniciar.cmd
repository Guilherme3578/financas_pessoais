@echo off
setlocal
title Iniciar Financas Pessoais

cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
    echo.
    echo ERRO: ambiente Python nao encontrado.
    echo Caminho esperado: backend\.venv\Scripts\python.exe
    echo.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo.
    echo ERRO: frontend\package.json nao encontrado.
    echo Coloque este arquivo na raiz do projeto.
    echo.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1

if errorlevel 1 (
    echo.
    echo ERRO: npm nao encontrado no PATH.
    echo Verifique a instalacao do Node.js.
    echo.
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo.
    echo ERRO: as dependencias do frontend nao foram instaladas.
    echo Execute npm install dentro da pasta frontend.
    echo.
    pause
    exit /b 1
)

echo.
echo Iniciando a API...
start "Financas - API" /D "%~dp0backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo Iniciando o frontend...
start "Financas - Frontend" /D "%~dp0frontend" cmd /k "npm.cmd run dev -- --port 5173 --strictPort"

echo.
echo Os servidores estao iniciando em duas janelas.
echo Confira se ambas iniciaram sem erros.
echo.
echo Aplicacao: http://localhost:5173
echo API:       http://127.0.0.1:8000/docs
echo.
echo Mantenha as duas janelas abertas enquanto usar o sistema.
echo Para encerrar, pressione Ctrl+C em cada uma.
echo.
pause

endlocal