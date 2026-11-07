@echo off
echo ======================================================
echo Smart Cane - ML Model Retraining
echo ======================================================
cd /d "%~dp0"

echo.
echo [1/2] Training legacy models (all crops, original endpoints)...
python ml_service\train_models.py

echo.
echo [2/2] Training sugarcane-specific models (v2 endpoints)...
echo       Fertilizer: 11 features (with Soil_pH & Stage) - GradientBoosting (>91% acc)
echo       Water:     11 features (with live API Rainfall) - RandomForest (>90% acc)
python ml_service\train_sugarcane_models.py

echo.
echo ======================================================
echo All model artifacts saved to ml_service\models\
echo ======================================================
pause
