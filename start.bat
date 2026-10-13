@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "VENV_PYTHON=%ROOT%venv\Scripts\python.exe"

if not exist "%VENV_PYTHON%" (
    echo Virtual environment not found. Run install-and-start.bat first.
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo Frontend dependencies not found. Run install-and-start.bat first.
    pause
    exit /b 1
)

echo Starting backend at http://127.0.0.1:8000 ...
start "Asistent Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && ""%VENV_PYTHON%"" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo Starting frontend at http://localhost:5173 ...
start "Asistent Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev -- --host 127.0.0.1"

echo.
echo Project is starting in two separate terminals.
echo Open: http://localhost:5173
pause
