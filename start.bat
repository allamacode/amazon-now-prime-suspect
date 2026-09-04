@echo off
echo ===================================================
echo       Starting Prime Suspect Dashboard...
echo ===================================================

:: Start the Python FastAPI Backend in a new command window
echo [1/3] Starting Backend Server (Port 8000)...
start "Prime Suspect Backend" cmd /k "cd backend && venv\Scripts\activate.bat && uvicorn main:app --host 127.0.0.1 --port 8000"

:: Start the React Vite Frontend in a new command window
echo [2/3] Starting Frontend Server (Port 5173)...
start "Prime Suspect Frontend" cmd /k "cd frontend && npm run dev"

:: Wait a few seconds to let servers spin up
echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

:: Open the default browser to the localhost link
echo Opening browser...
start http://localhost:5173/

echo Done! You can close this window.
exit
