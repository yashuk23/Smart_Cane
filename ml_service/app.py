"""
FastAPI ML Inference Service for Intelligent Sugarcane Advisory
Exposes:
- Kalman Filter Noise Processing
- Fertilizer Prediction (ML Random Forest)
- Irrigation Need Prediction (ML Random Forest)
- Complete Advisory Orchestration
"""

import os
import random
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from kalman_filter import filter_soil_readings, ScalarKalmanFilter
from advisory_engine import AdvisoryEngine

app = FastAPI(
    title="Smart Cane ML & Kalman Filter Intelligence Service",
    description="IoT sensor noise reduction and ML advisory inference for sugarcane cultivation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Load legacy models (original endpoints preserved)
fertilizer_model = None
fertilizer_meta = None
irrigation_model = None
irrigation_meta = None

# Load new sugarcane-specific v2 models
fert_v2_model = None
fert_v2_preprocessor = None
fert_v2_target_le = None
fert_v2_meta = None

water_v2_model = None
water_v2_preprocessor = None
water_v2_target_le = None
water_v2_meta = None

try:
    fert_model_path = os.path.join(MODELS_DIR, "fertilizer_model.joblib")
    fert_meta_path = os.path.join(MODELS_DIR, "fertilizer_meta.joblib")
    if os.path.exists(fert_model_path) and os.path.exists(fert_meta_path):
        fertilizer_model = joblib.load(fert_model_path)
        fertilizer_meta = joblib.load(fert_meta_path)
        print("Fertilizer model (legacy) loaded successfully.")

    irr_model_path = os.path.join(MODELS_DIR, "irrigation_model.joblib")
    irr_meta_path = os.path.join(MODELS_DIR, "irrigation_meta.joblib")
    if os.path.exists(irr_model_path) and os.path.exists(irr_meta_path):
        irrigation_model = joblib.load(irr_model_path)
        irrigation_meta = joblib.load(irr_meta_path)
        print("Irrigation model (legacy) loaded successfully.")
except Exception as e:
    print(f"Error loading legacy models: {e}")

try:
    p = os.path.join(MODELS_DIR, "fertilizer_recommendation_model.joblib")
    pp = os.path.join(MODELS_DIR, "fertilizer_recommendation_preprocessor.joblib")
    pte = os.path.join(MODELS_DIR, "fertilizer_recommendation_target_encoder.joblib")
    pm = os.path.join(MODELS_DIR, "fertilizer_recommendation_meta.joblib")
    if all(os.path.exists(x) for x in [p, pp, pte, pm]):
        fert_v2_model = joblib.load(p)
        fert_v2_preprocessor = joblib.load(pp)
        fert_v2_target_le = joblib.load(pte)
        fert_v2_meta = joblib.load(pm)
        print(f"Fertilizer v2 model loaded: {fert_v2_meta.get('model_name')} "
              f"(acc={fert_v2_meta.get('accuracy', 0)*100:.1f}%)")
except Exception as e:
    print(f"Error loading fertilizer v2 model: {e}")

try:
    p = os.path.join(MODELS_DIR, "water_recommendation_model.joblib")
    pp = os.path.join(MODELS_DIR, "water_recommendation_preprocessor.joblib")
    pte = os.path.join(MODELS_DIR, "water_recommendation_target_encoder.joblib")
    pm = os.path.join(MODELS_DIR, "water_recommendation_meta.joblib")
    if all(os.path.exists(x) for x in [p, pp, pte, pm]):
        water_v2_model = joblib.load(p)
        water_v2_preprocessor = joblib.load(pp)
        water_v2_target_le = joblib.load(pte)
        water_v2_meta = joblib.load(pm)
        print(f"Water v2 model loaded: {water_v2_meta.get('model_name')} "
              f"(acc={water_v2_meta.get('accuracy', 0)*100:.1f}%)")
except Exception as e:
    print(f"Error loading water v2 model: {e}")


# Pydantic Schemas
class RepeatedReadingsRequest(BaseModel):
    readings: List[Dict[str, Any]]
    q_params: Optional[Dict[str, float]] = None
    r_params: Optional[Dict[str, float]] = None

class FertilizerInferenceRequest(BaseModel):
    Soil_Type: Optional[str] = "Loamy"
    Soil_pH: float = 6.8
    Soil_Moisture: float = 32.0
    Organic_Carbon: float = 0.65
    Electrical_Conductivity: float = 0.55
    Nitrogen_Level: float = 145.0
    Phosphorus_Level: float = 22.0
    Potassium_Level: float = 160.0
    Temperature: float = 29.5
    Humidity: float = 65.0
    Rainfall: float = 120.0
    Crop_Type: Optional[str] = "Sugarcane"
    Crop_Growth_Stage: Optional[str] = "Vegetative"
    Season: Optional[str] = "Kharif"
    Irrigation_Type: Optional[str] = "Drip"
    Previous_Crop: Optional[str] = "Legumes"
    Region: Optional[str] = "South"
    Fertilizer_Used_Last_Season: Optional[float] = 120.0
    Yield_Last_Season: Optional[float] = 6.5

class IrrigationInferenceRequest(BaseModel):
    Soil_Type: Optional[str] = "Loamy"
    Soil_pH: float = 6.8
    Soil_Moisture: float = 32.0
    Organic_Carbon: float = 0.65
    Electrical_Conductivity: float = 0.55
    Temperature_C: float = 29.5
    Humidity: float = 65.0
    Rainfall_mm: float = 12.0
    Sunlight_Hours: float = 7.5
    Wind_Speed_kmh: float = 8.5
    Crop_Type: Optional[str] = "Sugarcane"
    Crop_Growth_Stage: Optional[str] = "Vegetative"
    Season: Optional[str] = "Kharif"
    Irrigation_Type: Optional[str] = "Drip"
    Water_Source: Optional[str] = "Borewell"
    Field_Area_hectare: float = 1.5
    Mulching_Used: Optional[str] = "Yes"
    Previous_Irrigation_mm: Optional[float] = 30.0
    Region: Optional[str] = "South"

class CompleteAnalysisRequest(BaseModel):
    readings: List[Dict[str, Any]]
    field_metadata: Optional[Dict[str, Any]] = None
    q_params: Optional[Dict[str, float]] = None
    r_params: Optional[Dict[str, float]] = None


@app.get("/")
def root():
    fert_loaded = fert_v2_model is not None or fertilizer_model is not None
    fert_acc = (fert_v2_meta or {}).get("accuracy") or (fertilizer_meta or {}).get("accuracy")
    fert_classes = list(fert_v2_target_le.classes_) if fert_v2_target_le is not None else (fertilizer_meta.get("target_classes") if fertilizer_meta else [])

    irr_loaded = water_v2_model is not None or irrigation_model is not None
    irr_acc = (water_v2_meta or {}).get("accuracy") or (irrigation_meta or {}).get("accuracy")
    irr_classes = list(water_v2_target_le.classes_) if water_v2_target_le is not None else (irrigation_meta.get("target_classes") if irrigation_meta else [])

    return {
        "service": "Smart Cane ML Intelligence API",
        "status": "online",
        "models": {
            "fertilizer": {
                "loaded": fert_loaded,
                "accuracy": fert_acc,
                "classes": fert_classes
            },
            "irrigation": {
                "loaded": irr_loaded,
                "accuracy": irr_acc,
                "classes": irr_classes
            }
        }
    }


@app.post("/filter/kalman")
def apply_kalman_filter(req: RepeatedReadingsRequest):
    if not req.readings:
        raise HTTPException(status_code=400, detail="Readings array cannot be empty")
    return filter_soil_readings(req.readings, req.q_params, req.r_params)


@app.post("/predict/fertilizer")
def predict_fertilizer(req: FertilizerInferenceRequest):
    if fert_v2_model and fert_v2_preprocessor and fert_v2_target_le and fert_v2_meta:
        input_data = {
            "Soil_Type": req.Soil_Type or "Loamy",
            "Soil_pH": float(req.Soil_pH),
            "Soil_Moisture": float(req.Soil_Moisture),
            "Electrical_Conductivity": float(req.Electrical_Conductivity),
            "Nitrogen_Level": float(req.Nitrogen_Level),
            "Phosphorus_Level": float(req.Phosphorus_Level),
            "Potassium_Level": float(req.Potassium_Level),
            "Temperature": float(req.Temperature),
            "Humidity": float(req.Humidity),
            "Irrigation_Type": req.Irrigation_Type or "Drip",
            "Crop_Growth_Stage": req.Crop_Growth_Stage or "Vegetative"
        }
        df_in = pd.DataFrame([input_data])[fert_v2_meta["features"]]
        X_proc = fert_v2_preprocessor.transform(df_in)
        pred_idx = fert_v2_model.predict(X_proc)[0]
        probabilities = fert_v2_model.predict_proba(X_proc)[0]

        classes = fert_v2_target_le.classes_
        predicted_label = str(classes[pred_idx])
        confidence = float(np.max(probabilities))
        prob_map = {classes[i]: round(float(probabilities[i]), 4) for i in range(len(classes))}

        return {
            "recommended_fertilizer": predicted_label,
            "confidence": round(confidence, 4),
            "confidence_percentage": round(confidence * 100.0, 1),
            "probabilities": prob_map
        }
    elif fertilizer_model and fertilizer_meta:
        features = fertilizer_meta["features"]
        encoders = fertilizer_meta["encoders"]
        data_dict = req.model_dump()

        row_data = {}
        for col in features:
            val = data_dict.get(col)
            if col in encoders:
                classes = encoders[col]["classes"]
                val_str = str(val if val is not None else classes[0])
                encoded_val = classes.index(val_str) if val_str in classes else 0
                row_data[col] = encoded_val
            else:
                row_data[col] = float(val if val is not None else 0.0)

        df_in = pd.DataFrame([row_data])[features]
        pred_idx = fertilizer_model.predict(df_in)[0]
        probabilities = fertilizer_model.predict_proba(df_in)[0]

        target_classes = fertilizer_meta["target_classes"]
        predicted_label = target_classes[pred_idx]
        confidence = float(np.max(probabilities))
        prob_map = {target_classes[i]: round(float(probabilities[i]), 4) for i in range(len(target_classes))}

        return {
            "recommended_fertilizer": predicted_label,
            "confidence": round(confidence, 4),
            "confidence_percentage": round(confidence * 100.0, 1),
            "probabilities": prob_map
        }
    else:
        raise HTTPException(status_code=500, detail="Fertilizer model not loaded")


@app.post("/predict/irrigation")
def predict_irrigation(req: IrrigationInferenceRequest):
    if water_v2_model and water_v2_preprocessor and water_v2_target_le and water_v2_meta:
        input_data = {
            "Soil_Type": req.Soil_Type or "Loamy",
            "Soil_pH": float(req.Soil_pH),
            "Soil_Moisture": float(req.Soil_Moisture),
            "Electrical_Conductivity": float(req.Electrical_Conductivity),
            "Temperature_C": float(req.Temperature_C),
            "Humidity": float(req.Humidity),
            "Wind_Speed_kmh": float(req.Wind_Speed_kmh),
            "Rainfall_mm": float(req.Rainfall_mm),
            "Irrigation_Type": req.Irrigation_Type or "Drip",
            "Season": req.Season or "Kharif",
            "Crop_Growth_Stage": req.Crop_Growth_Stage or "Vegetative"
        }
        df_in = pd.DataFrame([input_data])[water_v2_meta["features"]]
        X_proc = water_v2_preprocessor.transform(df_in)
        pred_idx = water_v2_model.predict(X_proc)[0]
        probabilities = water_v2_model.predict_proba(X_proc)[0]

        classes = water_v2_target_le.classes_
        predicted_label = str(classes[pred_idx])
        confidence = float(np.max(probabilities))
        prob_map = {classes[i]: round(float(probabilities[i]), 4) for i in range(len(classes))}

        return {
            "irrigation_need": predicted_label,
            "confidence": round(confidence, 4),
            "confidence_percentage": round(confidence * 100.0, 1),
            "probabilities": prob_map
        }
    elif irrigation_model and irrigation_meta:
        features = irrigation_meta["features"]
        encoders = irrigation_meta["encoders"]
        data_dict = req.model_dump()

        row_data = {}
        for col in features:
            val = data_dict.get(col)
            if col in encoders:
                classes = encoders[col]["classes"]
                val_str = str(val if val is not None else classes[0])
                encoded_val = classes.index(val_str) if val_str in classes else 0
                row_data[col] = encoded_val
            else:
                row_data[col] = float(val if val is not None else 0.0)

        df_in = pd.DataFrame([row_data])[features]
        pred_idx = irrigation_model.predict(df_in)[0]
        probabilities = irrigation_model.predict_proba(df_in)[0]

        target_classes = irrigation_meta["target_classes"]
        predicted_label = target_classes[pred_idx]
        confidence = float(np.max(probabilities))
        prob_map = {target_classes[i]: round(float(probabilities[i]), 4) for i in range(len(target_classes))}

        return {
            "irrigation_need": predicted_label,
            "confidence": round(confidence, 4),
            "confidence_percentage": round(confidence * 100.0, 1),
            "probabilities": prob_map
        }
    else:
        raise HTTPException(status_code=500, detail="Irrigation model not loaded")


@app.post("/predict/complete-advisory")
def generate_complete_advisory(req: CompleteAnalysisRequest):
    """
    End-to-end advisory generation combining:
    1. Kalman filtering on repeated soil readings
    2. ML Fertilizer recommendation
    3. ML Irrigation need prediction
    4. Rule-based Fertilizer Quantity Engine
    5. Rule-based Water Requirement Engine
    6. Rule-based Soil Status Health Engine
    """
    if not req.readings:
        raise HTTPException(status_code=400, detail="Readings array cannot be empty")

    meta = req.field_metadata or {}
    soil_type = meta.get("soil_type", "Loamy")
    crop_stage = meta.get("crop_stage", "Vegetative")
    season = meta.get("season", "Kharif")
    irrigation_type = meta.get("irrigation_type", "Drip")
    field_area_acre = float(meta.get("field_area_acre") or (float(meta.get("field_area_ha", 1.0)) * 2.47105))
    field_area_ha = float(meta.get("field_area_ha") or (field_area_acre / 2.47105))
    region = meta.get("region", "South")

    # Step 1: Apply Kalman Filter
    filter_result = filter_soil_readings(req.readings, req.q_params, req.r_params)
    filtered = filter_result.get("filtered_parameters", {})

    # Step 2: Prepare inputs for Fertilizer ML
    fert_input = FertilizerInferenceRequest(
        Soil_Type=soil_type,
        Soil_pH=filtered.get("Soil_pH", 6.8),
        Soil_Moisture=filtered.get("Soil_Moisture", 30.0),
        Organic_Carbon=filtered.get("Organic_Carbon", 0.65),
        Electrical_Conductivity=filtered.get("Electrical_Conductivity", 0.55),
        Nitrogen_Level=filtered.get("Nitrogen_Level", 150.0),
        Phosphorus_Level=filtered.get("Phosphorus_Level", 20.0),
        Potassium_Level=filtered.get("Potassium_Level", 160.0),
        Temperature=filtered.get("Temperature", 30.0),
        Humidity=filtered.get("Humidity", 65.0),
        Rainfall=float(meta.get("rainfall_mm", 10.0)),
        Crop_Type="Sugarcane",
        Crop_Growth_Stage=crop_stage,
        Season=season,
        Irrigation_Type=irrigation_type,
        Previous_Crop=meta.get("previous_crop", "Legumes"),
        Region=region
    )
    fert_prediction = predict_fertilizer(fert_input)
    rec_fert = fert_prediction["recommended_fertilizer"]

    # Step 3: Prepare inputs for Irrigation ML
    irr_input = IrrigationInferenceRequest(
        Soil_Type=soil_type,
        Soil_pH=filtered.get("Soil_pH", 6.8),
        Soil_Moisture=filtered.get("Soil_Moisture", 30.0),
        Organic_Carbon=filtered.get("Organic_Carbon", 0.65),
        Electrical_Conductivity=filtered.get("Electrical_Conductivity", 0.55),
        Temperature_C=filtered.get("Temperature", 30.0),
        Humidity=filtered.get("Humidity", 65.0),
        Rainfall_mm=float(meta.get("rainfall_mm", 10.0)),
        Sunlight_Hours=float(meta.get("sunlight_hours", 7.5)),
        Wind_Speed_kmh=float(meta.get("wind_speed_kmh", 8.0)),
        Crop_Type="Sugarcane",
        Crop_Growth_Stage=crop_stage,
        Season=season,
        Irrigation_Type=irrigation_type,
        Water_Source=meta.get("water_source", "Borewell"),
        Field_Area_hectare=field_area_ha,
        Mulching_Used=meta.get("mulching_used", "Yes"),
        Previous_Irrigation_mm=float(meta.get("previous_irrigation_mm", 30.0)),
        Region=region
    )
    irr_prediction = predict_irrigation(irr_input)
    rec_irr_need = irr_prediction["irrigation_need"]

    # Step 4: Fertilizer Quantity Engine (VSI & ICAR Pune Guidelines)
    fert_quantity = AdvisoryEngine.calculate_fertilizer_quantity(
        fertilizer_type=rec_fert,
        crop_stage=crop_stage,
        field_area_acre_or_ha=field_area_acre,
        nitrogen_level=filtered.get("Nitrogen_Level", 150.0),
        phosphorus_level=filtered.get("Phosphorus_Level", 20.0),
        potassium_level=filtered.get("Potassium_Level", 160.0),
        soil_ph=filtered.get("Soil_pH", 7.0)
    )

    # Step 5: Water Requirement Engine (ICAR Drip Standards)
    water_req = AdvisoryEngine.calculate_water_requirement(
        irrigation_need=rec_irr_need,
        soil_moisture=filtered.get("Soil_Moisture", 30.0),
        crop_stage=crop_stage,
        field_area_acre_or_ha=field_area_acre,
        rainfall_mm=float(meta.get("rainfall_mm", 0.0)),
        temperature_c=filtered.get("Temperature", 30.0),
        humidity=filtered.get("Humidity", 65.0)
    )

    # Step 6: Soil Status Engine
    soil_status = AdvisoryEngine.evaluate_soil_status(filtered)

    return {
        "status": "success",
        "timestamp": pd.Timestamp.now().isoformat(),
        "kalman_filter": filter_result,
        "predictions": {
            "fertilizer": fert_prediction,
            "irrigation": irr_prediction
        },
        "advisory": {
            "fertilizer": fert_quantity,
            "water": water_req,
            "soil_status": soil_status
        },
        "metadata": {
            "field_name": meta.get("field_name", "Primary Cane Field"),
            "field_area_ha": field_area_ha,
            "crop_stage": crop_stage,
            "soil_type": soil_type,
            "reading_count": len(req.readings)
        }
    }


@app.get("/simulate-readings")
def simulate_sensor_readings(
    base_moisture: float = 28.0,
    base_ph: float = 6.8,
    base_n: float = 145.0,
    base_p: float = 22.0,
    base_k: float = 165.0,
    base_oc: float = 0.65,
    base_ec: float = 0.55,
    base_temp: float = 30.0,
    base_hum: float = 62.0,
    count: int = 5
):
    """
    Simulates repeated IoT soil probe measurements with realistic Gaussian sensor noise.
    Helps demonstrate Kalman filter smoothing.
    """
    readings = []
    for i in range(max(2, min(20, count))):
        readings.append({
            "sample_index": i + 1,
            "Soil_Moisture": round(max(5.0, random.gauss(base_moisture, 2.2)), 2),
            "Soil_pH": round(max(4.0, min(10.0, random.gauss(base_ph, 0.25))), 2),
            "Nitrogen_Level": round(max(10.0, random.gauss(base_n, 8.5)), 1),
            "Phosphorus_Level": round(max(2.0, random.gauss(base_p, 3.2)), 1),
            "Potassium_Level": round(max(10.0, random.gauss(base_k, 9.0)), 1),
            "Organic_Carbon": round(max(0.1, random.gauss(base_oc, 0.06)), 3),
            "Electrical_Conductivity": round(max(0.05, random.gauss(base_ec, 0.08)), 3),
            "Temperature": round(random.gauss(base_temp, 0.8), 1),
            "Humidity": round(max(10.0, min(100.0, random.gauss(base_hum, 2.5))), 1)
        })
    return {"status": "success", "count": len(readings), "readings": readings}



# ─────────────────────────────────────────────────────────────────────────────
# NEW V2 ENDPOINTS  –  Sugarcane-specific, independent ML models
# ─────────────────────────────────────────────────────────────────────────────

class FertilizerRecommendRequest(BaseModel):
    """11 input features for Fertilizer Recommendation (Sugarcane-specific model)"""
    soil_type: str = "Loamy"
    soil_ph: float = 6.8
    soil_moisture: float = 32.0
    electrical_conductivity: float = 0.55
    nitrogen_level: float = 145.0
    phosphorus_level: float = 22.0
    potassium_level: float = 160.0
    temperature: float = 29.5       # from weather API
    humidity: float = 65.0          # from weather API
    irrigation_type: str = "Drip"
    crop_growth_stage: str = "Vegetative"


class WaterRecommendRequest(BaseModel):
    """11 input features for Water Recommendation (Sugarcane-specific model)"""
    soil_type: str = "Loamy"
    soil_ph: float = 6.8
    soil_moisture: float = 32.0
    electrical_conductivity: float = 0.55
    temperature_c: float = 29.5     # from weather API
    humidity: float = 65.0          # from weather API
    wind_speed_kmh: float = 8.5     # from weather API
    rainfall_mm: float = 0.0        # from weather API
    irrigation_type: str = "Drip"
    season: str = "Kharif"
    crop_growth_stage: str = "Vegetative"


@app.post("/recommend/fertilizer")
def recommend_fertilizer_v2(req: FertilizerRecommendRequest):
    """
    Sugarcane-specific Fertilizer Recommendation using 11 features.
    Model: RandomForest trained on sugarcane-only records with pH and growth stage.
    """
    if not fert_v2_model or not fert_v2_preprocessor or not fert_v2_target_le:
        raise HTTPException(
            status_code=503,
            detail="Fertilizer v2 model not loaded. Run train_sugarcane_models.py first."
        )

    input_data = {
        "Soil_Type": req.soil_type,
        "Soil_pH": float(req.soil_ph),
        "Soil_Moisture": float(req.soil_moisture),
        "Electrical_Conductivity": float(req.electrical_conductivity),
        "Nitrogen_Level": float(req.nitrogen_level),
        "Phosphorus_Level": float(req.phosphorus_level),
        "Potassium_Level": float(req.potassium_level),
        "Temperature": float(req.temperature),
        "Humidity": float(req.humidity),
        "Irrigation_Type": req.irrigation_type,
        "Crop_Growth_Stage": req.crop_growth_stage
    }

    df_in = pd.DataFrame([input_data])
    feature_cols = fert_v2_meta["features"]
    df_in = df_in[feature_cols]

    X_proc = fert_v2_preprocessor.transform(df_in)
    pred_idx = fert_v2_model.predict(X_proc)[0]
    probabilities = fert_v2_model.predict_proba(X_proc)[0]

    classes = fert_v2_target_le.classes_
    predicted_label = classes[pred_idx]
    confidence = float(np.max(probabilities))
    prob_map = {classes[i]: round(float(probabilities[i]), 4) for i in range(len(classes))}

    return {
        "recommended_fertilizer": predicted_label,
        "confidence": round(confidence, 4),
        "confidence_percentage": round(confidence * 100.0, 1),
        "probabilities": prob_map,
        "model_info": {
            "algorithm": fert_v2_meta.get("model_name"),
            "accuracy": round(fert_v2_meta.get("accuracy", 0) * 100, 1),
            "f1_weighted": round(fert_v2_meta.get("f1_weighted", 0), 4),
            "training_records": fert_v2_meta.get("training_records"),
            "crop_filter": fert_v2_meta.get("crop_filter")
        },
        "source": "sugarcane_v2_model"
    }


@app.post("/recommend/water")
def recommend_water_v2(req: WaterRecommendRequest):
    """
    Sugarcane-specific Water/Irrigation Recommendation using 11 features.
    Model: RandomForest/GradientBoosting trained on sugarcane-only records with live rainfall.
    """
    if not water_v2_model or not water_v2_preprocessor or not water_v2_target_le:
        raise HTTPException(
            status_code=503,
            detail="Water v2 model not loaded. Run train_sugarcane_models.py first."
        )

    input_data = {
        "Soil_Type": req.soil_type,
        "Soil_pH": float(req.soil_ph),
        "Soil_Moisture": float(req.soil_moisture),
        "Electrical_Conductivity": float(req.electrical_conductivity),
        "Temperature_C": float(req.temperature_c),
        "Humidity": float(req.humidity),
        "Wind_Speed_kmh": float(req.wind_speed_kmh),
        "Rainfall_mm": float(req.rainfall_mm),
        "Irrigation_Type": req.irrigation_type,
        "Season": req.season,
        "Crop_Growth_Stage": req.crop_growth_stage
    }

    df_in = pd.DataFrame([input_data])
    feature_cols = water_v2_meta["features"]
    df_in = df_in[feature_cols]

    X_proc = water_v2_preprocessor.transform(df_in)
    pred_idx = water_v2_model.predict(X_proc)[0]
    probabilities = water_v2_model.predict_proba(X_proc)[0]

    classes = water_v2_target_le.classes_
    predicted_label = classes[pred_idx]
    confidence = float(np.max(probabilities))
    prob_map = {classes[i]: round(float(probabilities[i]), 4) for i in range(len(classes))}

    return {
        "irrigation_need": predicted_label,
        "confidence": round(confidence, 4),
        "confidence_percentage": round(confidence * 100.0, 1),
        "probabilities": prob_map,
        "model_info": {
            "algorithm": water_v2_meta.get("model_name"),
            "accuracy": round(water_v2_meta.get("accuracy", 0) * 100, 1),
            "f1_weighted": round(water_v2_meta.get("f1_weighted", 0), 4),
            "training_records": water_v2_meta.get("training_records"),
            "crop_filter": water_v2_meta.get("crop_filter")
        },
        "source": "sugarcane_v2_model"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models": {
            "fertilizer_legacy": fertilizer_model is not None,
            "irrigation_legacy": irrigation_model is not None,
            "fertilizer_v2": fert_v2_model is not None,
            "water_v2": water_v2_model is not None
        },
        "fertilizer_v2_info": {
            "algorithm": fert_v2_meta.get("model_name") if fert_v2_meta else None,
            "accuracy_pct": round(fert_v2_meta.get("accuracy", 0) * 100, 1) if fert_v2_meta else None,
            "classes": fert_v2_meta.get("target_classes") if fert_v2_meta else []
        },
        "water_v2_info": {
            "algorithm": water_v2_meta.get("model_name") if water_v2_meta else None,
            "accuracy_pct": round(water_v2_meta.get("accuracy", 0) * 100, 1) if water_v2_meta else None,
            "classes": water_v2_meta.get("target_classes") if water_v2_meta else []
        }
    }
