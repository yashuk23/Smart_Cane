"""
Smart Cane - Sugarcane-Specific Model Training Script (v2)
===========================================================
Trains TWO independent ML models using ONLY sugarcane records:

  1. FertilizerRecommendation  – 9 input features
  2. WaterRecommendation       – 10 input features

Outputs (saved to ml_service/models/):
  fertilizer_recommendation_model.joblib
  fertilizer_recommendation_preprocessor.joblib
  water_recommendation_model.joblib
  water_recommendation_preprocessor.joblib
"""

import os
import joblib
import warnings
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OrdinalEncoder
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix, f1_score
)
from sklearn.utils.class_weight import compute_class_weight
import pandas as pd

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Dataset")

# ─────────────────────────────────────────────────────────────────────────────
# FERTILIZER RECOMMENDATION MODEL  (11 features)
# ─────────────────────────────────────────────────────────────────────────────

FERT_FEATURES = [
    "Soil_Type",             # categorical
    "Soil_pH",               # numeric (crucial for fertilizer choice: Zn, SSP, Compost)
    "Soil_Moisture",         # numeric
    "Electrical_Conductivity",  # numeric
    "Nitrogen_Level",        # numeric
    "Phosphorus_Level",      # numeric
    "Potassium_Level",       # numeric
    "Temperature",           # numeric  (from weather API at inference)
    "Humidity",              # numeric  (from weather API at inference)
    "Irrigation_Type",       # categorical
    "Crop_Growth_Stage",     # categorical (from field metadata)
]
FERT_TARGET = "Recommended_Fertilizer"
FERT_CAT_FEATURES = ["Soil_Type", "Irrigation_Type", "Crop_Growth_Stage"]
FERT_NUM_FEATURES = [f for f in FERT_FEATURES if f not in FERT_CAT_FEATURES]


def evaluate_classifiers(X_train, X_test, y_train, y_test, label_names, name):
    candidates = {
        "RandomForest": RandomForestClassifier(
            n_estimators=200, max_depth=15, min_samples_leaf=2,
            class_weight="balanced", random_state=42, n_jobs=-1
        ),
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=100, max_depth=5, learning_rate=0.1,
            random_state=42
        ),
        "DecisionTree": DecisionTreeClassifier(
            max_depth=12, class_weight="balanced", random_state=42
        ),
    }
    best_name, best_model, best_f1 = None, None, -1.0
    print(f"\n{'-'*60}")
    print(f"Model comparison for {name}")
    print(f"{'-'*60}")
    for cname, clf in candidates.items():
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        f1 = f1_score(y_test, y_pred, average="weighted")
        acc = accuracy_score(y_test, y_pred)
        print(f"  {cname:<22}  Accuracy={acc*100:.1f}%  F1(weighted)={f1:.4f}")
        if f1 > best_f1:
            best_f1 = f1
            best_name = cname
            best_model = clf
    print(f"\n  ✓ Best model: {best_name}  (F1={best_f1:.4f})\n")
    return best_name, best_model


def train_fertilizer_model():
    fert_file = "sugarcane_fertilizer.xlsx" if os.path.exists(os.path.join(DATASET_DIR, "sugarcane_fertilizer.xlsx")) else "fertilizer_prediction.xlsx"
    file_path = os.path.join(DATASET_DIR, fert_file)
    print(f"\n{'='*60}")
    print("FERTILIZER RECOMMENDATION MODEL TRAINING")
    print(f"Dataset: {file_path}")
    print(f"{'='*60}")

    df = pd.read_excel(file_path)
    print(f"Full dataset shape: {df.shape}")

    # Filter to Sugarcane only (all records already are, but explicit for safety)
    if "Crop_Type" in df.columns:
        df_sc = df[df["Crop_Type"].str.strip().str.lower() == "sugarcane"].copy()
    else:
        df_sc = df.copy()
    print(f"Sugarcane records: {df_sc.shape[0]}")

    # Check required columns
    missing_cols = [c for c in FERT_FEATURES + [FERT_TARGET] if c not in df_sc.columns]
    if missing_cols:
        raise ValueError(f"Missing columns in fertilizer dataset: {missing_cols}")

    # Data quality
    print(f"\nMissing values:\n{df_sc[FERT_FEATURES + [FERT_TARGET]].isnull().sum().to_string()}")
    df_sc = df_sc.dropna(subset=FERT_FEATURES + [FERT_TARGET])
    print(f"Records after dropping NaN: {df_sc.shape[0]}")

    print(f"\nTarget distribution:")
    print(df_sc[FERT_TARGET].value_counts().to_string())

    X_raw = df_sc[FERT_FEATURES].copy()
    y_raw = df_sc[FERT_TARGET].copy()

    # Encode target
    target_le = LabelEncoder()
    y_encoded = target_le.fit_transform(y_raw.astype(str))

    # Build preprocessing pipeline
    cat_pipe = Pipeline([("ord", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))])
    num_pipe = Pipeline([("scaler", StandardScaler())])

    preprocessor = ColumnTransformer([
        ("cat", cat_pipe, FERT_CAT_FEATURES),
        ("num", num_pipe, FERT_NUM_FEATURES),
    ])

    X_proc = preprocessor.fit_transform(X_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X_proc, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    best_name, best_model = evaluate_classifiers(
        X_train, X_test, y_train, y_test, target_le.classes_, "Fertilizer"
    )

    y_pred = best_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")

    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=target_le.classes_))

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(best_model, X_proc, y_encoded, cv=cv, scoring="f1_weighted", n_jobs=-1)
    print(f"5-Fold Cross-Validation F1: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    print(f"\nConfusion Matrix:\n{cm}")

    # Get cat encoder classes for inference
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["ord"]
    cat_classes = {col: list(cats) for col, cats in zip(FERT_CAT_FEATURES, cat_encoder.categories_)}

    # Feature importances (RF/GB only)
    feat_names = FERT_CAT_FEATURES + FERT_NUM_FEATURES
    fi = {}
    if hasattr(best_model, "feature_importances_"):
        fi = dict(zip(feat_names, best_model.feature_importances_.tolist()))
        print("\nFeature Importances:")
        for k, v in sorted(fi.items(), key=lambda x: -x[1]):
            print(f"  {k:<35} {v:.4f}")

    meta = {
        "model_name": best_name,
        "features": FERT_FEATURES,
        "cat_features": FERT_CAT_FEATURES,
        "num_features": FERT_NUM_FEATURES,
        "cat_classes": cat_classes,
        "target_classes": target_le.classes_.tolist(),
        "accuracy": float(acc),
        "f1_weighted": float(f1),
        "cv_f1_mean": float(cv_scores.mean()),
        "cv_f1_std": float(cv_scores.std()),
        "feature_importances": fi,
        "training_records": int(df_sc.shape[0]),
        "crop_filter": "Sugarcane"
    }

    joblib.dump(best_model, os.path.join(MODELS_DIR, "fertilizer_recommendation_model.joblib"))
    joblib.dump(preprocessor, os.path.join(MODELS_DIR, "fertilizer_recommendation_preprocessor.joblib"))
    joblib.dump(target_le, os.path.join(MODELS_DIR, "fertilizer_recommendation_target_encoder.joblib"))
    joblib.dump(meta, os.path.join(MODELS_DIR, "fertilizer_recommendation_meta.joblib"))

    print(f"\nFertilizer model saved -> fertilizer_recommendation_model.joblib")
    print(f"   Test Accuracy: {acc*100:.2f}%  |  F1 (weighted): {f1:.4f}")
    return meta


# ─────────────────────────────────────────────────────────────────────────────
# WATER RECOMMENDATION MODEL  (11 features)
# ─────────────────────────────────────────────────────────────────────────────

WATER_FEATURES = [
    "Soil_Type",                # categorical
    "Soil_pH",                  # numeric
    "Soil_Moisture",            # numeric
    "Electrical_Conductivity",  # numeric
    "Temperature_C",            # numeric  (from weather API at inference)
    "Humidity",                 # numeric  (from weather API at inference)
    "Wind_Speed_kmh",           # numeric  (from weather API at inference)
    "Rainfall_mm",              # numeric  (from weather API at inference)
    "Irrigation_Type",          # categorical
    "Season",                   # categorical  (auto-determined in app)
    "Crop_Growth_Stage",        # categorical  (from field metadata)
]
WATER_TARGET = "Irrigation_Need"
WATER_CAT_FEATURES = ["Soil_Type", "Irrigation_Type", "Season", "Crop_Growth_Stage"]
WATER_NUM_FEATURES = [f for f in WATER_FEATURES if f not in WATER_CAT_FEATURES]


def train_water_model():
    irr_file = "irrigation_sugarcane.xlsx" if os.path.exists(os.path.join(DATASET_DIR, "irrigation_sugarcane.xlsx")) else "irrigation_prediction.xlsx"
    file_path = os.path.join(DATASET_DIR, irr_file)
    print(f"\n{'='*60}")
    print("WATER RECOMMENDATION MODEL TRAINING")
    print(f"Dataset: {file_path}")
    print(f"{'='*60}")

    df = pd.read_excel(file_path)
    print(f"Full dataset shape: {df.shape}")

    # Filter to Sugarcane only
    if "Crop_Type" in df.columns:
        df_sc = df[df["Crop_Type"].str.strip().str.lower() == "sugarcane"].copy()
    else:
        df_sc = df.copy()
    print(f"Sugarcane records: {df_sc.shape[0]}")

    # Check required columns
    missing_cols = [c for c in WATER_FEATURES + [WATER_TARGET] if c not in df_sc.columns]
    if missing_cols:
        raise ValueError(f"Missing columns in irrigation dataset: {missing_cols}")

    # Data quality
    print(f"\nMissing values:\n{df_sc[WATER_FEATURES + [WATER_TARGET]].isnull().sum().to_string()}")
    df_sc = df_sc.dropna(subset=WATER_FEATURES + [WATER_TARGET])
    print(f"Records after dropping NaN: {df_sc.shape[0]}")

    print(f"\nTarget distribution (Irrigation_Need):")
    print(df_sc[WATER_TARGET].value_counts().to_string())

    X_raw = df_sc[WATER_FEATURES].copy()
    y_raw = df_sc[WATER_TARGET].copy()

    # Encode target
    target_le = LabelEncoder()
    y_encoded = target_le.fit_transform(y_raw.astype(str))

    # Build preprocessing pipeline
    cat_pipe = Pipeline([("ord", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))])
    num_pipe = Pipeline([("scaler", StandardScaler())])

    preprocessor = ColumnTransformer([
        ("cat", cat_pipe, WATER_CAT_FEATURES),
        ("num", num_pipe, WATER_NUM_FEATURES),
    ])

    X_proc = preprocessor.fit_transform(X_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X_proc, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    best_name, best_model = evaluate_classifiers(
        X_train, X_test, y_train, y_test, target_le.classes_, "Water/Irrigation"
    )

    y_pred = best_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")

    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=target_le.classes_))

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(best_model, X_proc, y_encoded, cv=cv, scoring="f1_weighted", n_jobs=-1)
    print(f"5-Fold Cross-Validation F1: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    print(f"\nConfusion Matrix:\n{cm}")

    # Get cat encoder classes for inference
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["ord"]
    cat_classes = {col: list(cats) for col, cats in zip(WATER_CAT_FEATURES, cat_encoder.categories_)}

    # Feature importances
    feat_names = WATER_CAT_FEATURES + WATER_NUM_FEATURES
    fi = {}
    if hasattr(best_model, "feature_importances_"):
        fi = dict(zip(feat_names, best_model.feature_importances_.tolist()))
        print("\nFeature Importances:")
        for k, v in sorted(fi.items(), key=lambda x: -x[1]):
            print(f"  {k:<35} {v:.4f}")

    meta = {
        "model_name": best_name,
        "features": WATER_FEATURES,
        "cat_features": WATER_CAT_FEATURES,
        "num_features": WATER_NUM_FEATURES,
        "cat_classes": cat_classes,
        "target_classes": target_le.classes_.tolist(),
        "accuracy": float(acc),
        "f1_weighted": float(f1),
        "cv_f1_mean": float(cv_scores.mean()),
        "cv_f1_std": float(cv_scores.std()),
        "feature_importances": fi,
        "training_records": int(df_sc.shape[0]),
        "crop_filter": "Sugarcane"
    }

    joblib.dump(best_model, os.path.join(MODELS_DIR, "water_recommendation_model.joblib"))
    joblib.dump(preprocessor, os.path.join(MODELS_DIR, "water_recommendation_preprocessor.joblib"))
    joblib.dump(target_le, os.path.join(MODELS_DIR, "water_recommendation_target_encoder.joblib"))
    joblib.dump(meta, os.path.join(MODELS_DIR, "water_recommendation_meta.joblib"))

    print(f"\nWater model saved -> water_recommendation_model.joblib")
    print(f"   Test Accuracy: {acc*100:.2f}%  |  F1 (weighted): {f1:.4f}")
    return meta


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Smart Cane – Sugarcane-Specific Model Training (v2)")
    print("="*60)
    fert_meta = train_fertilizer_model()
    water_meta = train_water_model()

    print("\n" + "="*60)
    print("TRAINING COMPLETE – SUMMARY")
    print("="*60)
    print(f"Fertilizer Model: {fert_meta['model_name']}")
    print(f"  Accuracy: {fert_meta['accuracy']*100:.1f}%  F1: {fert_meta['f1_weighted']:.4f}")
    print(f"  CV F1: {fert_meta['cv_f1_mean']:.4f} ± {fert_meta['cv_f1_std']:.4f}")
    print(f"  Target classes: {fert_meta['target_classes']}")
    print()
    print(f"Water Model: {water_meta['model_name']}")
    print(f"  Accuracy: {water_meta['accuracy']*100:.1f}%  F1: {water_meta['f1_weighted']:.4f}")
    print(f"  CV F1: {water_meta['cv_f1_mean']:.4f} ± {water_meta['cv_f1_std']:.4f}")
    print(f"  Target classes: {water_meta['target_classes']}")
    print("\nAll model artifacts saved to ml_service/models/")
