const { filterRepeatedReadings } = require('../services/kalmanFilter');
const AdvisoryEngine = require('../services/advisoryEngine');
const { predictFertilizer, predictIrrigation } = require('../services/mlClient');
const stores = require('../config/store');

/**
 * Generates realistic 5 repeated readings for IoT simulation
 */
function generateSimulatedReadings(baseParams = {}) {
  const base = {
    Soil_Moisture: baseParams.Soil_Moisture || 28.5,
    Soil_pH: baseParams.Soil_pH || 6.8,
    Nitrogen_Level: baseParams.Nitrogen_Level || 145.0,
    Phosphorus_Level: baseParams.Phosphorus_Level || 22.0,
    Potassium_Level: baseParams.Potassium_Level || 165.0,
    Organic_Carbon: baseParams.Organic_Carbon || 0.65,
    Electrical_Conductivity: baseParams.Electrical_Conductivity || 0.55,
    Temperature: baseParams.Temperature || 30.0,
    Humidity: baseParams.Humidity || 64.0
  };

  const readings = [];
  for (let i = 1; i <= 5; i++) {
    const jitter = (std) => (Math.random() - 0.5) * 2 * std;
    readings.push({
      sample_index: i,
      Soil_Moisture: Number(Math.max(5, base.Soil_Moisture + jitter(2.5)).toFixed(2)),
      Soil_pH: Number(Math.max(4.0, Math.min(9.5, base.Soil_pH + jitter(0.3))).toFixed(2)),
      Nitrogen_Level: Number(Math.max(10, base.Nitrogen_Level + jitter(12)).toFixed(1)),
      Phosphorus_Level: Number(Math.max(2, base.Phosphorus_Level + jitter(4)).toFixed(1)),
      Potassium_Level: Number(Math.max(10, base.Potassium_Level + jitter(14)).toFixed(1)),
      Organic_Carbon: Number(Math.max(0.1, base.Organic_Carbon + jitter(0.08)).toFixed(3)),
      Electrical_Conductivity: Number(Math.max(0.05, base.Electrical_Conductivity + jitter(0.1)).toFixed(3)),
      Temperature: Number((base.Temperature + jitter(1.0)).toFixed(1)),
      Humidity: Number(Math.max(10, Math.min(100, base.Humidity + jitter(3.5))).toFixed(1))
    });
  }
  return readings;
}

exports.simulateReadings = (req, res) => {
  const readings = generateSimulatedReadings(req.query);
  res.json({
    status: 'success',
    count: readings.length,
    description: '5 repeated IoT sensor readings with simulated measurement noise',
    readings
  });
};

exports.performAnalysis = async (req, res) => {
  try {
    const userId = req.user?.id;
    let { readings, fieldId, fieldMetadata, qParams, rParams } = req.body;

    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: 'Valid soil readings are required to perform analysis.' });
    }

    // Retrieve or merge field metadata
    let field = null;
    if (fieldId) {
      field = await stores.fields.findById(fieldId);
    }

    const areaAcre = field?.fieldAreaAcre || parseFloat(fieldMetadata?.fieldAreaAcre || (fieldMetadata?.fieldAreaHectare ? fieldMetadata.fieldAreaHectare * 2.47105 : (field?.fieldAreaHectare ? field.fieldAreaHectare * 2.47105 : 2.5)));
    const areaHa = parseFloat((areaAcre / 2.47105).toFixed(2));

    const metadata = {
      fieldName: field?.name || fieldMetadata?.fieldName || 'Sugarcane Block 1',
      fieldAreaAcre: areaAcre,
      fieldAreaHectare: areaHa,
      soilType: field?.soilType || fieldMetadata?.soilType || 'Loamy',
      cropVariety: field?.cropVariety || fieldMetadata?.cropVariety || 'Co 86032',
      cropGrowthStage: field?.cropGrowthStage || fieldMetadata?.cropGrowthStage || 'Vegetative',
      season: field?.season || fieldMetadata?.season || 'Kharif',
      irrigationType: field?.irrigationType || fieldMetadata?.irrigationType || 'Drip',
      waterSource: field?.waterSource || fieldMetadata?.waterSource || 'Borewell',
      mulchingUsed: field?.mulchingUsed || fieldMetadata?.mulchingUsed || 'Yes',
      region: field?.region || fieldMetadata?.region || 'South',
      rainfallMm: parseFloat(fieldMetadata?.rainfallMm || 10.0),
      sunlightHours: parseFloat(fieldMetadata?.sunlightHours || 7.5),
      windSpeedKmh: parseFloat(fieldMetadata?.windSpeedKmh || 8.0)
    };

    // Step 1: Kalman Filter Processing
    const kalmanResult = filterRepeatedReadings(readings, qParams, rParams);
    const filtered = kalmanResult.filteredParameters;

    // Step 2: ML Inference - Fertilizer
    const fertMLInput = {
      Soil_Type: metadata.soilType,
      Soil_pH: filtered.Soil_pH || 6.8,
      Soil_Moisture: filtered.Soil_Moisture || 30.0,
      Organic_Carbon: filtered.Organic_Carbon || 0.65,
      Electrical_Conductivity: filtered.Electrical_Conductivity || 0.55,
      Nitrogen_Level: filtered.Nitrogen_Level || 145.0,
      Phosphorus_Level: filtered.Phosphorus_Level || 22.0,
      Potassium_Level: filtered.Potassium_Level || 160.0,
      Temperature: filtered.Temperature || 30.0,
      Humidity: filtered.Humidity || 65.0,
      Rainfall: metadata.rainfallMm,
      Crop_Type: 'Sugarcane',
      Crop_Growth_Stage: metadata.cropGrowthStage,
      Season: metadata.season,
      Irrigation_Type: metadata.irrigationType,
      Previous_Crop: metadata.previousCrop || 'Legumes',
      Region: metadata.region,
      Fertilizer_Used_Last_Season: 120.0,
      Yield_Last_Season: 6.5
    };

    const fertPrediction = await predictFertilizer(fertMLInput);

    // Step 3: ML Inference - Irrigation
    const irrMLInput = {
      Soil_Type: metadata.soilType,
      Soil_pH: filtered.Soil_pH || 6.8,
      Soil_Moisture: filtered.Soil_Moisture || 30.0,
      Organic_Carbon: filtered.Organic_Carbon || 0.65,
      Electrical_Conductivity: filtered.Electrical_Conductivity || 0.55,
      Temperature_C: filtered.Temperature || 30.0,
      Humidity: filtered.Humidity || 65.0,
      Rainfall_mm: metadata.rainfallMm,
      Sunlight_Hours: metadata.sunlightHours,
      Wind_Speed_kmh: metadata.windSpeedKmh,
      Crop_Type: 'Sugarcane',
      Crop_Growth_Stage: metadata.cropGrowthStage,
      Season: metadata.season,
      Irrigation_Type: metadata.irrigationType,
      Water_Source: metadata.waterSource,
      Field_Area_hectare: metadata.fieldAreaHectare,
      Mulching_Used: metadata.mulchingUsed,
      Previous_Irrigation_mm: 30.0,
      Region: metadata.region
    };

    const irrPrediction = await predictIrrigation(irrMLInput);

    // Step 4: Advisory Calculation Engines (Rule Based - ICAR & VSI Pune Guidelines)
    const fertilizerAdvisory = AdvisoryEngine.calculateFertilizerQuantity(
      fertPrediction.recommended_fertilizer,
      metadata.cropGrowthStage,
      metadata.fieldAreaAcre,
      filtered.Nitrogen_Level,
      filtered.Phosphorus_Level,
      filtered.Potassium_Level,
      filtered.Soil_pH
    );

    const waterAdvisory = AdvisoryEngine.calculateWaterRequirement(
      irrPrediction.irrigation_need,
      filtered.Soil_Moisture,
      metadata.cropGrowthStage,
      metadata.fieldAreaAcre,
      metadata.rainfallMm,
      filtered.Temperature,
      filtered.Humidity
    );

    const soilStatusAdvisory = AdvisoryEngine.evaluateSoilStatus(filtered);

    // Step 5: Save Analysis Session to DB
    const sessionDoc = {
      userId,
      fieldId: fieldId || 'custom_field',
      fieldName: metadata.fieldName,
      fieldAreaAcre: metadata.fieldAreaAcre,
      fieldAreaHectare: metadata.fieldAreaHectare,
      soilType: metadata.soilType,
      cropGrowthStage: metadata.cropGrowthStage,
      rawReadings: readings,
      filteredReadings: filtered,
      kalmanDetails: kalmanResult.details,
      fertilizerPrediction: fertPrediction,
      irrigationPrediction: irrPrediction,
      fertilizerAdvisory,
      waterAdvisory,
      soilStatusAdvisory,
      metadata
    };

    const savedSession = await stores.analysisSessions.create(sessionDoc);

    res.json({
      success: true,
      sessionId: savedSession._id,
      timestamp: savedSession.createdAt,
      field: metadata,
      rawReadings: readings,
      kalmanFilter: kalmanResult,
      predictions: {
        fertilizer: fertPrediction,
        irrigation: irrPrediction
      },
      advisory: {
        fertilizer: fertilizerAdvisory,
        water: waterAdvisory,
        soilStatus: soilStatusAdvisory
      }
    });
  } catch (err) {
    console.error('Error during analysis orchestration:', err);
    res.status(500).json({ error: 'Analysis failed', message: err.message });
  }
};

