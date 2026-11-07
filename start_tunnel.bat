@echo off
echo ===================================================
echo   Smart Cane - Expo Go Remote Sharing (Tunnel Mode)
echo ===================================================
echo.

echo [1/3] Starting Smart Cane ML Service (FastAPI)...
cd /d "%~dp0ml_service"
start "Smart Cane ML Service" cmd /k "python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Smart Cane Backend (Node.js)...
cd /d "%~dp0backend"
start "Smart Cane Backend" cmd /k "node server.js"

echo.
echo [3/3] Starting Expo Metro Bundler in Tunnel Mode...
echo Metro will generate a QR code anyone can scan with Expo Go!
echo.
cd /d "%~dp0mobile_app"
npx expo start --tunnel ngrok -c
pause


ngrok http 5000
