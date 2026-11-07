"""
Advisory Calculation Engines for Sugarcane Management
Implements rule-based agronomic intelligence as specified in system architecture:
1. Fertilizer Quantity Engine
2. Water Requirement Engine
3. Soil Status Engine
"""

import math
from typing import Dict, Any, Optional

class AdvisoryEngine:
    @staticmethod
    def calculate_fertilizer_quantity(
        fertilizer_type: str,
        crop_stage: str,
        field_area_acre_or_ha: float,
        nitrogen_level: float = 140,
        phosphorus_level: float = 20,
        potassium_level: float = 150,
        soil_ph: float = 7.0
    ) -> Dict[str, Any]:
        """
        Calculates recommended dosage based on predicted fertilizer type,
        sugarcane growth stage, and field size in acres.
        Follows ICAR-IISR and Vasantdada Sugar Institute (VSI) Pune RDF Standards.
        """
        stage = crop_stage.lower() if crop_stage else "vegetative"
        area_acre = max(0.1, float(field_area_acre_or_ha or 2.5))
        area_ha = round(area_acre / 2.47105, 2)
        ftype = (fertilizer_type or "Urea").strip()

        # Vasantdada Sugar Institute (VSI) Pune & ICAR Sugarcane RDF per Acre
        base_rates_acre = {
            "Urea": { "sowing": 35.0, "vegetative": 65.0, "flowering": 95.0, "harvest": 0.0 },
            "DAP": { "sowing": 50.0, "vegetative": 30.0, "flowering": 15.0, "harvest": 0.0 },
            "MOP": { "sowing": 30.0, "vegetative": 40.0, "flowering": 45.0, "harvest": 0.0 },
            "NPK": { "sowing": 75.0, "vegetative": 60.0, "flowering": 40.0, "harvest": 0.0 },
            "Compost": { "sowing": 4000.0, "vegetative": 1000.0, "flowering": 500.0, "harvest": 0.0 },
            "Zinc Sulphate": { "sowing": 10.0, "vegetative": 8.0, "flowering": 5.0, "harvest": 0.0 },
            "SSP": { "sowing": 125.0, "vegetative": 60.0, "flowering": 30.0, "harvest": 0.0 }
        }

        rates_for_type = base_rates_acre.get(ftype, base_rates_acre["Urea"])
        rate_per_acre = rates_for_type.get(stage, rates_for_type.get("vegetative", 50.0))

        # Adjust based on soil test nutrients
        if ftype == "Urea":
            if nitrogen_level < 140:
                rate_per_acre *= 1.20
            elif nitrogen_level > 250:
                rate_per_acre *= 0.80
        elif ftype in ["DAP", "SSP"]:
            if phosphorus_level < 15:
                rate_per_acre *= 1.20
            elif phosphorus_level > 35:
                rate_per_acre *= 0.80
        elif ftype == "MOP":
            if potassium_level < 120:
                rate_per_acre *= 1.20
            elif potassium_level > 240:
                rate_per_acre *= 0.80
        elif ftype == "Zinc Sulphate":
            if soil_ph > 7.8:
                rate_per_acre *= 1.25

        rate_per_acre = round(rate_per_acre, 1)
        total_quantity_kg = round(rate_per_acre * area_acre, 1)
        rate_per_ha = round(rate_per_acre * 2.47105, 1)

        pkg_sizes = { "Urea": 45, "DAP": 50, "MOP": 50, "NPK": 50, "SSP": 50, "Zinc Sulphate": 25, "Compost": 1000 }
        pkg_size = pkg_sizes.get(ftype, 50)
        bags_count = math.ceil(total_quantity_kg / float(pkg_size))
        bag_unit = "tonnes" if ftype == "Compost" else ("bags (25 kg)" if ftype == "Zinc Sulphate" else "bags (50 kg)")

        application_methods = {
            "Urea": "Broadcast along cane furrows in moist soil followed by earthing up and light irrigation. Avoid midday application.",
            "DAP": "Basal placement in furrows 5-7 cm below cane setts during planting or side placement during weeding.",
            "MOP": "Band application 10 cm away from cane stool. Essential for drought tolerance and sucrose accumulation.",
            "NPK": "Band placement near root zone prior to scheduled irrigation.",
            "Compost": "Incorporate thoroughly into top 15-20 cm of soil during primary tillage or inter-row mulching.",
            "Zinc Sulphate": "Apply 10 kg/acre as basal soil dressing mixed with 100 kg FYM. Never mix directly with phosphatic fertilizers (DAP/SSP).",
            "SSP": "Apply as basal placement in furrow bottoms before planting setts. Excellent for alkaline soils."
        }

        is_optimal = ftype in ["Compost", "No Fertilizer Needed"]
        if is_optimal:
            return {
                "fertilizer_type": "No Fertilizer Needed",
                "crop_stage": stage.capitalize(),
                "field_area_acre": area_acre,
                "field_area_ha": area_ha,
                "dosage_kg_per_acre": 0.0,
                "dosage_kg_per_ha": 0.0,
                "total_dosage_kg": 0.0,
                "package_estimate": "0 bags (None Needed)",
                "is_optimal_condition": True,
                "guideline_source": "ICAR-IISR & VSI Sugarcane Guidelines",
                "application_method": "Soil nutrients are in optimal balance. No fertilizer application required.",
                "split_schedule": "Maintain routine crop monitoring. Zero application needed at this stage."
            }

        return {
            "fertilizer_type": ftype,
            "crop_stage": stage.capitalize(),
            "field_area_acre": area_acre,
            "field_area_ha": area_ha,
            "dosage_kg_per_acre": rate_per_acre,
            "dosage_kg_per_ha": rate_per_ha,
            "total_dosage_kg": total_quantity_kg,
            "total_quantity_kg": total_quantity_kg,
            "package_estimate": f"{bags_count} {bag_unit}",
            "guideline_source": "VSI Pune & ICAR-IISR Sugarcane Guidelines",
            "application_method": application_methods.get(ftype, "Broadcast evenly and incorporate into soil."),
            "split_schedule": f"Apply {stage.capitalize()} dose within 3-5 days when soil has adequate moisture."
        }

    @staticmethod
    def calculate_water_requirement(
        irrigation_need: str,
        soil_moisture: float,
        crop_stage: str,
        field_area_acre_or_ha: float,
        rainfall_mm: float = 0.0,
        temperature_c: float = 30.0,
        humidity: float = 60.0
    ) -> Dict[str, Any]:
        """
        Calculates irrigation decision, required water depth (mm),
        and volume (liters and cubic meters) for the field in acres.
        Follows ICAR-IISR and VSI Sugarcane Drip Standards.
        """
        need = (irrigation_need or "Medium").capitalize()
        stage = (crop_stage or "Vegetative").lower()
        area_acre = max(0.1, float(field_area_acre_or_ha or 2.5))
        area_ha = round(area_acre / 2.47105, 2)
        moisture = float(soil_moisture if soil_moisture is not None else 30.0)
        rain = float(rainfall_mm or 0.0)

        stage_kc = {
            "sowing": 0.45,
            "vegetative": 0.85,
            "flowering": 1.25,
            "harvest": 0.60
        }
        kc = stage_kc.get(stage, 0.85)

        if rain > 30.0 or moisture > 42.0:
            irrigation_required = False
            recommended_depth_mm = 0.0
            reason = f"Adequate moisture present ({moisture}%). Significant recent rainfall ({rain} mm) recorded."
        elif need == "High" or moisture < 22.0:
            irrigation_required = True
            recommended_depth_mm = round(22.0 * kc, 1)
            reason = f"High water stress detected (Moisture: {moisture}%). Immediate irrigation needed to protect cane tillers."
        elif need == "Medium" or moisture < 32.0:
            irrigation_required = True
            recommended_depth_mm = round(15.0 * kc, 1)
            reason = f"Moderate water requirement. Cane is in {stage} stage with steady crop evapotranspiration."
        else:
            irrigation_required = False
            recommended_depth_mm = 0.0
            reason = f"Soil moisture ({moisture}%) is currently optimal for {stage} stage. Next review in 4 days."

        # Authentic calculation: 1 mm over 1 acre = 4,047 Liters
        total_liters = round(recommended_depth_mm * 4047.0 * area_acre)
        total_cubic_meters = round(total_liters / 1000.0, 1)
        pump_hours = round(recommended_depth_mm * 0.405, 1) if recommended_depth_mm > 0 else 0.0
        irrigation_interval_days = 4 if need == "High" else (7 if need == "Medium" else 10)

        return {
            "irrigation_required": irrigation_required,
            "irrigation_need_level": need,
            "recommended_depth_mm": recommended_depth_mm,
            "field_area_acre": area_acre,
            "field_area_ha": area_ha,
            "total_water_liters": total_liters,
            "total_water_m3": total_cubic_meters,
            "pump_runtime_hours": pump_hours,
            "irrigation_interval_days": irrigation_interval_days,
            "recommended_method": "Drip Irrigation (10,000 LPH discharge capacity per acre)",
            "guideline_source": "ICAR-IISR & VSI Pune Sugarcane Irrigation Standards",
            "reason": reason,
            "crop_coefficient_kc": kc
        }

    @staticmethod
    def evaluate_soil_status(filtered_params: Dict[str, float]) -> Dict[str, Any]:
        """
        Compares measured soil parameters against ICAR / Sugarcane agronomic benchmarks.
        Only evaluates parameters that were actually measured and provided.
        """
        evaluations = {}

        def get_val(key: str) -> Optional[float]:
            val = filtered_params.get(key)
            if val is None:
                val = filtered_params.get(key.lower())
            if val is not None:
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return None
            return None

        # 1. Soil pH (Optimal: 6.5 - 7.5)
        ph = get_val("Soil_pH")
        if ph is not None:
            if ph < 6.0:
                evaluations["Soil_pH"] = {
                    "value": ph,
                    "status": "Low (Acidic)",
                    "rating": "warning",
                    "recommendation": "Soil is acidic. Apply agricultural lime (CaCO3) or dolomite at 1-2 tons/ha to neutralize."
                }
            elif ph > 7.8:
                evaluations["Soil_pH"] = {
                    "value": ph,
                    "status": "High (Alkaline)",
                    "rating": "warning",
                    "recommendation": "Soil is alkaline/saline. Apply agricultural gypsum (CaSO4) and organic farmyard manure."
                }
            else:
                evaluations["Soil_pH"] = {
                    "value": ph,
                    "status": "Optimal",
                    "rating": "good",
                    "recommendation": "Soil pH is ideal for root nutrient uptake and cane growth."
                }

        # 2. Soil Moisture (Optimal: 25% - 38%)
        moisture = get_val("Soil_Moisture")
        if moisture is not None:
            if moisture < 20.0:
                evaluations["Soil_Moisture"] = {
                    "value": moisture,
                    "status": "Low (Drought Stress)",
                    "rating": "critical",
                    "recommendation": "Soil is dry. Risk of shoot borer attack and stunted internodes. Irrigate promptly."
                }
            elif moisture > 42.0:
                evaluations["Soil_Moisture"] = {
                    "value": moisture,
                    "status": "High (Waterlogged)",
                    "rating": "warning",
                    "recommendation": "Excessive moisture. Ensure proper drainage to avoid root rot and poor aeration."
                }
            else:
                evaluations["Soil_Moisture"] = {
                    "value": moisture,
                    "status": "Optimal",
                    "rating": "good",
                    "recommendation": "Moisture is within comfortable range for transpiration and nutrient transport."
                }

        # 3. Nitrogen Level
        n = get_val("Nitrogen_Level")
        if n is not None:
            if n < 120.0:
                evaluations["Nitrogen_Level"] = {
                    "value": n,
                    "status": "Low (Deficient)",
                    "rating": "warning",
                    "recommendation": "Nitrogen deficiency leads to yellowing of leaves and poor tillering. Urea/DAP top dressing required."
                }
            elif n > 260.0:
                evaluations["Nitrogen_Level"] = {
                    "value": n,
                    "status": "High",
                    "rating": "caution",
                    "recommendation": "Excessive nitrogen delays maturity, reduces sucrose content, and causes cane lodging."
                }
            else:
                evaluations["Nitrogen_Level"] = {
                    "value": n,
                    "status": "Normal / Optimal",
                    "rating": "good",
                    "recommendation": "Adequate nitrogen available for ongoing vegetative development."
                }

        # 4. Phosphorus Level
        p = get_val("Phosphorus_Level")
        if p is not None:
            if p < 15.0:
                evaluations["Phosphorus_Level"] = {
                    "value": p,
                    "status": "Low (Deficient)",
                    "rating": "warning",
                    "recommendation": "Low phosphorus inhibits root proliferation. Apply DAP or Single Super Phosphate."
                }
            else:
                evaluations["Phosphorus_Level"] = {
                    "value": p,
                    "status": "Sufficient",
                    "rating": "good",
                    "recommendation": "Good phosphorus reserve promoting strong root anchor and early vigorous tillering."
                }

        # 5. Potassium Level
        k = get_val("Potassium_Level")
        if k is not None:
            if k < 120.0:
                evaluations["Potassium_Level"] = {
                    "value": k,
                    "status": "Low (Deficient)",
                    "rating": "warning",
                    "recommendation": "Low potassium impairs sugar synthesis and pest resistance. Apply MOP (Muriate of Potash)."
                }
            else:
                evaluations["Potassium_Level"] = {
                    "value": k,
                    "status": "Sufficient",
                    "rating": "good",
                    "recommendation": "Optimal potassium enhances disease resistance, drought tolerance, and juice sucrose purity."
                }

        # 6. Organic Carbon (Optimal: > 0.65%)
        oc = get_val("Organic_Carbon")
        if oc is not None:
            if oc < 0.5:
                evaluations["Organic_Carbon"] = {
                    "value": oc,
                    "status": "Low",
                    "rating": "warning",
                    "recommendation": "Low organic matter. Incorporate green manuring crops (Sunn hemp) or press mud."
                }
            else:
                evaluations["Organic_Carbon"] = {
                    "value": oc,
                    "status": "Healthy",
                    "rating": "good",
                    "recommendation": "Good biological activity and cation exchange capacity in soil."
                }

        # 7. Electrical Conductivity (Optimal: < 1.0 dS/m)
        ec = get_val("Electrical_Conductivity")
        if ec is not None:
            if ec > 2.0:
                evaluations["Electrical_Conductivity"] = {
                    "value": ec,
                    "status": "Saline",
                    "rating": "critical",
                    "recommendation": "High salinity impedes osmosis and stunts cane length. Flush with fresh irrigation water."
                }
            else:
                evaluations["Electrical_Conductivity"] = {
                    "value": ec,
                    "status": "Normal (Non-saline)",
                    "rating": "good",
                    "recommendation": "EC is safe; low risk of osmotic drought stress."
                }

        overall_health_score = 100
        if evaluations:
            total_points = 0
            for item in evaluations.values():
                rating = item.get("rating")
                if rating == "good":
                    total_points += 100
                elif rating == "caution":
                    total_points += 80
                elif rating == "warning":
                    total_points += 60
                elif rating == "critical":
                    total_points += 40
                else:
                    total_points += 100
            overall_health_score = int(round(total_points / len(evaluations)))
            overall_health_score = max(30, min(100, overall_health_score))

        health_category = "Excellent" if overall_health_score >= 85 else ("Good" if overall_health_score >= 70 else "Needs Attention")

        return {
            "evaluations": evaluations,
            "overall_health_score": overall_health_score,
            "health_category": health_category,
            "summary": f"Soil health is graded '{health_category}' ({overall_health_score}/100) based on {len(evaluations)} evaluated parameter{'s' if len(evaluations) != 1 else ''}."
        }

