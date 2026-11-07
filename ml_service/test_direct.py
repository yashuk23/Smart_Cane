import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import (
    simulate_sensor_readings,
    generate_complete_advisory,
    CompleteAnalysisRequest
)

print("1. Simulating readings:")
sim_data = simulate_sensor_readings(count=5)
print("Count:", sim_data["count"])
print("Sample Reading 1:", sim_data["readings"][0])

print("\n2. Testing generate_complete_advisory directly:")
req = CompleteAnalysisRequest(
    readings=sim_data["readings"],
    field_metadata={
        "field_name": "South Canal Sugarcane Plot",
        "soil_type": "Clay",
        "crop_stage": "Vegetative",
        "season": "Kharif",
        "field_area_ha": 3.0,
        "irrigation_type": "Drip"
    }
)
res = generate_complete_advisory(req)
print("\n--- RESULTS ---")
print("Fertilizer Recommendation:", res["predictions"]["fertilizer"]["recommended_fertilizer"], 
      f"({res['predictions']['fertilizer']['confidence_percentage']}%)")
print("Irrigation Need:", res["predictions"]["irrigation"]["irrigation_need"],
      f"({res['predictions']['irrigation']['confidence_percentage']}%)")
print("Dosage (kg/ha):", res["advisory"]["fertilizer"]["dosage_kg_per_ha"])
print("Total Dosage (kg):", res["advisory"]["fertilizer"]["total_dosage_kg"])
print("Bags (50kg):", res["advisory"]["fertilizer"]["package_estimate"])
print("Irrigation Required:", res["advisory"]["water"]["irrigation_required"])
print("Total Water (Liters):", res["advisory"]["water"]["total_water_liters"])
print("Soil Health Category:", res["advisory"]["soil_status"]["health_category"], 
      f"({res['advisory']['soil_status']['overall_health_score']}/100)")
print("Kalman Filter Noise Reduction for Soil_Moisture:", 
      res["kalman_filter"]["details"]["Soil_Moisture"]["noise_reduction_pct"], "%")
print("\nDirect function test SUCCESS!")

