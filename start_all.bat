@echo off
echo ===============================================
echo Starting Smart Cane ML Service (FastAPI)
echo ===============================================
cd /d "%~dp0ml_service"
start "Smart Cane ML Service" cmd /k "python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
echo ML Service started on http://localhost:8000
echo.
echo ===============================================
echo Starting Smart Cane Backend (Node.js)
echo ===============================================
cd /d "%~dp0backend"
start "Smart Cane Backend" cmd /k "node server.js"
echo Backend started on http://localhost:5000
echo.
echo ===============================================
echo Starting Smart Cane Mobile App (Expo)
echo ===============================================
cd /d "%~dp0mobile_app"
start "Smart Cane Expo" cmd /k "npx expo start -c"
echo Expo started (cache cleared) - scan QR code with Expo Go app
echo.
echo All Smart Cane services starting...
pause


