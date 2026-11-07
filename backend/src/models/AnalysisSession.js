const mongoose = require('mongoose');

const AnalysisSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  fieldId: { type: String, required: true },
  fieldName: { type: String, default: 'Sugarcane Plot' },
  fieldAreaHectare: { type: Number, default: 1.0 },
  soilType: { type: String, default: 'Loamy' },
  cropGrowthStage: { type: String, default: 'Vegetative' },
  
  // Repeated raw sensor measurements (typically 5 readings)
  rawReadings: [{
    sample_index: Number,
    Soil_Moisture: Number,
    Soil_pH: Number,
    Nitrogen_Level: Number,
    Phosphorus_Level: Number,
    Potassium_Level: Number,
    Organic_Carbon: Number,
    Electrical_Conductivity: Number,
    Temperature: Number,
    Humidity: Number
  }],

  // Kalman filter estimated values
  filteredReadings: {
    Soil_Moisture: Number,
    Soil_pH: Number,
    Nitrogen_Level: Number,
    Phosphorus_Level: Number,
    Potassium_Level: Number,
    Organic_Carbon: Number,
    Electrical_Conductivity: Number,
    Temperature: Number,
    Humidity: Number
  },

  kalmanDetails: mongoose.Schema.Types.Mixed,

  // ML Predictions
  fertilizerPrediction: {
    recommended_fertilizer: String,
    confidence: Number,
    confidence_percentage: Number,
    probabilities: mongoose.Schema.Types.Mixed
  },

  irrigationPrediction: {
    irrigation_need: String,
    confidence: Number,
    confidence_percentage: Number,
    probabilities: mongoose.Schema.Types.Mixed
  },

  // Final Actionable Advisory
  fertilizerAdvisory: {
    fertilizer_type: String,
    crop_stage: String,
    dosage_kg_per_ha: Number,
    total_dosage_kg: Number,
    package_estimate: String,
    application_method: String,
    split_schedule: String
  },

  waterAdvisory: {
    irrigation_required: Boolean,
    irrigation_need_level: String,
    recommended_depth_mm: Number,
    total_water_liters: Number,
    total_water_m3: Number,
    irrigation_interval_days: Number,
    recommended_method: String,
    reason: String
  },

  soilStatusAdvisory: {
    overall_health_score: Number,
    health_category: String,
    summary: String,
    evaluations: mongoose.Schema.Types.Mixed
  },

  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.AnalysisSession || mongoose.model('AnalysisSession', AnalysisSessionSchema);

