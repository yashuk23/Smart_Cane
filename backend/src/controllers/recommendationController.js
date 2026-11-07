/**
 * Recommendation Controller
 * Handles two independent ML-based recommendation modules:
 *   POST /api/recommendations/fertilizer
 *   POST /api/recommendations/water
 *
 * Each endpoint calls ONLY its respective ML model.
 * No cross-contamination of features between models.
 */

const { fetchFromML, ML_SERVICE_URL } = require('../services/mlClient');
const stores = require('../config/store');
const { filterRepeatedReadings } = require('../services/kalmanFilter');
const AdvisoryEngine = require('../services/advisoryEngine');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER – call the new v2 endpoints on the Python ML service
// ─────────────────────────────────────────────────────────────────────────────

// Resilient fallback using agronomic rules
async function callFertilizerV2(payload) {
  const res = await fetchFromML('/recommend/fertilizer', payload);
  if (res) return res;

  const { nitrogen_level = 140, phosphorus_level = 20, potassium_level = 150 } = payload;
  let fertilizer = 'No Fertilizer Needed';
  let confidence = 0.85;

  if (phosphorus_level < 15) { fertilizer = 'DAP'; confidence = 0.88; }
  else if (potassium_level < 120) { fertilizer = 'MOP'; confidence = 0.85; }
  else if (nitrogen_level < 130) { fertilizer = 'Urea'; confidence = 0.90; }

  return {
    recommended_fertilizer: fertilizer,
    confidence: parseFloat(confidence.toFixed(4)),
    confidence_percentage: Math.round(confidence * 1000) / 10,
    source: 'fallback_engine',
    fallback_reason: 'ML service unreachable'
  };
}

async function callWaterV2(payload) {
  const res = await fetchFromML('/recommend/water', payload);
  if (res) return res;

  // Resilient fallback
  const { soil_moisture = 30, humidity = 60, wind_speed_kmh = 8, season = 'Kharif', crop_growth_stage = 'Vegetative' } = payload;
  let need = 'Medium';
  let confidence = 0.80;

  if (soil_moisture < 22 || wind_speed_kmh > 20) { need = 'High'; confidence = 0.85; }
  else if (soil_moisture > 45 || humidity > 85) { need = 'Low'; confidence = 0.88; }

  return {
    irrigation_need: need,
    confidence: parseFloat(confidence.toFixed(4)),
    confidence_percentage: Math.round(confidence * 1000) / 10,
    source: 'fallback_engine',
    fallback_reason: 'ML service unreachable'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED ICAR-IISR & VASANTDADA SUGAR INSTITUTE (VSI) PUNE GUIDELINES
// ─────────────────────────────────────────────────────────────────────────────

const VSI_ICAR_FERTILIZER_GUIDELINES = {
  'Zinc Sulphate': {
    nutrient: 'Zinc (Zn) Micronutrient - 21%',
    base_dosage_per_acre: 10.0, // 10 kg/acre (standard ICAR/VSI dose)
    package_size_kg: 25,
    package_name: 'bag (25 kg)',
    description: 'Zinc Sulphate (ZnSO₄·7H₂O, 21% Zn) corrects zinc micronutrient deficiency, enhances chlorophyll synthesis, and improves internode elongation in sugarcane.',
    application_instructions: 'Apply 10 kg/acre as a basal soil dressing mixed with 100 kg well-rotted FYM. CAUTION: Never mix directly with DAP or SSP to prevent insoluble zinc phosphate formation.',
    stage_factors: { sowing: 10.0, vegetative: 8.0, flowering: 5.0, harvest: 0.0 },
    guideline_source: 'VSI Pune & ICAR-IISR Sugarcane Micronutrient Management'
  },
  'Urea': {
    nutrient: 'Nitrogen (N) - 46%',
    base_dosage_per_acre: 65.0, // 65 kg/acre per vegetative split (~1.4 bags of 45 kg)
    package_size_kg: 45,
    package_name: 'bags (45 kg)',
    description: 'Neem-Coated Urea (46% N) supplies nitrogen for rapid cane tillering, thick stalk development, and dense green canopy.',
    application_instructions: 'Broadcast along cane furrows in moist soil followed by earthing up and light irrigation. Split applications prevent leaching and volatilization.',
    stage_factors: { sowing: 35.0, vegetative: 65.0, flowering: 95.0, harvest: 0.0 },
    guideline_source: 'VSI Pune Sugarcane RDF Guidelines (250-115-115 kg/ha)'
  },
  'DAP': {
    nutrient: 'Nitrogen + Phosphorus (18:46:0)',
    base_dosage_per_acre: 50.0, // 1 bag of 50 kg per acre
    package_size_kg: 50,
    package_name: 'bags (50 kg)',
    description: 'Di-Ammonium Phosphate (18% N, 46% P₂O₅) promotes deep root proliferation, vigorous early tillering, and healthy sett sprouting.',
    application_instructions: 'Place in furrow bottoms 5–7 cm below cane setts during planting, or band-apply near root zone during early tillering. Incorporate into moist soil.',
    stage_factors: { sowing: 50.0, vegetative: 30.0, flowering: 15.0, harvest: 0.0 },
    guideline_source: 'ICAR-SBI Coimbatore & VSI Fertilizer Recommendations'
  },
  'MOP': {
    nutrient: 'Potassium (K₂O) - 60%',
    base_dosage_per_acre: 40.0, // ~0.8 bag of 50 kg per acre
    package_size_kg: 50,
    package_name: 'bags (50 kg)',
    description: 'Muriate of Potash (60% K₂O) strengthens cane rind against pest attacks, prevents lodging, improves drought tolerance, and maximizes sucrose synthesis in stalks.',
    application_instructions: 'Band application 10 cm away from stools followed by inter-cultivation and irrigation. Essential during earthing up.',
    stage_factors: { sowing: 30.0, vegetative: 40.0, flowering: 45.0, harvest: 0.0 },
    guideline_source: 'VSI Pune & MPKV Rahuri Potash Management in Sugarcane'
  },
  'NPK': {
    nutrient: 'Balanced NPK (10:26:26 or 12:32:16)',
    base_dosage_per_acre: 75.0, // 1.5 bags of 50 kg
    package_size_kg: 50,
    package_name: 'bags (50 kg)',
    description: 'Complex NPK fertilizer delivers balanced primary macronutrients ensuring steady root establishment, sturdy stalk formation, and balanced vegetative growth.',
    application_instructions: 'Band place along furrows in moist soil during early vegetative growth or fertigate through drip system.',
    stage_factors: { sowing: 75.0, vegetative: 60.0, flowering: 40.0, harvest: 0.0 },
    guideline_source: 'ICAR-IISR Package of Practices for Sugarcane'
  },
  'SSP': {
    nutrient: 'Phosphorus (16% P₂O₅) + Sulphur (11% S) + Calcium (19% Ca)',
    base_dosage_per_acre: 125.0, // 2.5 bags of 50 kg
    package_size_kg: 50,
    package_name: 'bags (50 kg)',
    description: 'Single Super Phosphate provides water-soluble phosphate along with essential sulphur and calcium. Excellent for saline/alkaline soils and soils with high pH.',
    application_instructions: 'Distribute in planting furrows and mix with compost or pressmud before setts placement.',
    stage_factors: { sowing: 125.0, vegetative: 60.0, flowering: 30.0, harvest: 0.0 },
    guideline_source: 'VSI Pune Alkaline Soil Reclamation & Phosphate Guidelines'
  },
  'Compost': {
    nutrient: 'Organic Matter, Humus & Microbial Biomass',
    base_dosage_per_acre: 4000.0, // 4 tonnes/acre
    package_size_kg: 1000,
    package_name: 'tonnes',
    is_optimal_condition: true,
    condition_status: 'Optimal Soil Health',
    description: 'Optimal Field Condition Detected! Your primary soil nutrients (N-P-K) are in healthy balance. No harsh chemical fertilizers (Urea/DAP) are needed right now. Applying Organic Compost (FYM) is highly beneficial to sustain soil organic carbon, feed beneficial soil microbes, and boost moisture retention without chemical salt buildup.',
    application_instructions: 'Apply well-decomposed FYM, vermicompost, or pressmud cake into topsoil or mulch between rows. This maintains high sugar recovery and soil vitality.',
    stage_factors: { sowing: 4000.0, vegetative: 1000.0, flowering: 500.0, harvest: 0.0 },
    guideline_source: 'ICAR-IISR & VSI Organic Soil Health Standards'
  }
};

function buildFertilizerAdvisory(mlResult, payload) {
  const fert = mlResult.recommended_fertilizer || 'Urea';
  const info = VSI_ICAR_FERTILIZER_GUIDELINES[fert] || VSI_ICAR_FERTILIZER_GUIDELINES['Urea'];

  // Accept farm size in acres (default 2.5 acres, or convert if legacy ha was passed)
  const areaAcre = parseFloat(payload.field_area_acre || (payload.field_area_ha ? payload.field_area_ha * 2.47105 : 2.5));
  const areaHa = parseFloat((areaAcre / 2.47105).toFixed(2));
  const stage = (payload.crop_growth_stage || 'Vegetative').toLowerCase();

  // Stage-adjusted dosage rate per acre
  let ratePerAcre = info.stage_factors[stage] || info.base_dosage_per_acre;

  // Real-time soil nutrient buffer adjustment
  if (fert === 'Urea') {
    const n = parseFloat(payload.nitrogen_level || 150);
    if (n < 140) ratePerAcre *= 1.20;
    else if (n > 250) ratePerAcre *= 0.80;
  } else if (fert === 'DAP' || fert === 'SSP') {
    const p = parseFloat(payload.phosphorus_level || 20);
    if (p < 15) ratePerAcre *= 1.20;
    else if (p > 35) ratePerAcre *= 0.80;
  } else if (fert === 'MOP') {
    const k = parseFloat(payload.potassium_level || 150);
    if (k < 120) ratePerAcre *= 1.20;
    else if (k > 240) ratePerAcre *= 0.80;
  } else if (fert === 'Zinc Sulphate') {
    const ph = parseFloat(payload.soil_ph || 7.0);
    if (ph > 7.8) ratePerAcre *= 1.25;
  }

  ratePerAcre = parseFloat(ratePerAcre.toFixed(1));
  const totalDosage = parseFloat((ratePerAcre * areaAcre).toFixed(1));
  const ratePerHa = parseFloat((ratePerAcre * 2.47105).toFixed(1));
  const bagCount = Math.ceil(totalDosage / info.package_size_kg);
  const packageNameResolved = bagCount === 1 ? info.package_name.replace('bags', 'bag') : info.package_name;
  const packageEstimate = fert === 'Compost'
    ? (bagCount === 1 ? '1.0 tonne' : `${(totalDosage / 1000).toFixed(1)} tonnes`)
    : `${bagCount} ${packageNameResolved}`;

  const isOptimal = fert === 'Compost' || fert === 'No Fertilizer Needed';
  const displayFert = isOptimal ? 'No Fertilizer Needed' : fert;
  const displayNutrient = isOptimal ? 'All Primary Nutrients in Healthy Balance' : info.nutrient;
  const displayDosageAcre = isOptimal ? 0 : ratePerAcre;
  const displayDosageHa = isOptimal ? 0 : ratePerHa;
  const displayTotalDosage = isOptimal ? 0 : totalDosage;
  const displayPackageEstimate = isOptimal ? '0 bags (None Needed)' : packageEstimate;
  const displayTitle = isOptimal ? 'Optimal Field Condition — No Fertilizer Needed' : 'Nutrient Correction Required';
  const displayDescription = isOptimal
    ? 'Optimal Field Condition Detected! All primary nutrients (Nitrogen, Phosphorus, Potassium) and electrical conductivity are in healthy balance. Your sugarcane crop has sufficient nutrient reserves for this growth stage. No fertilizer application is needed right now! Keeping fertilizer dosage at 0 kg saves expenses, prevents chemical salt accumulation, and protects soil vitality.'
    : info.description;
  const displayInstructions = isOptimal
    ? 'No chemical or supplemental fertilizer application is required at this stage. Maintain regular crop monitoring and keep dry cane trash mulching in place.'
    : info.application_instructions;

  return {
    recommended_fertilizer: displayFert,
    nutrient_supplied: displayNutrient,
    is_optimal_condition: isOptimal,
    condition_title: displayTitle,
    description: displayDescription,
    application_instructions: displayInstructions,
    dosage_kg_per_acre: displayDosageAcre,
    dosage_kg_per_ha: displayDosageHa,
    total_dosage_kg: displayTotalDosage,
    field_area_acre: areaAcre,
    field_area_ha: areaHa,
    package_estimate: displayPackageEstimate,
    guideline_source: info.guideline_source,
    confidence: mlResult.confidence,
    confidence_percentage: mlResult.confidence_percentage,
    ml_source: mlResult.source || 'ml_model',
    important_notes: [
      isOptimal
        ? 'Great news: Soil nutrients are already well-balanced. Zero fertilizer purchase required today!'
        : `Application dosage is tailored for your ${areaAcre} acre field (${packageEstimate}).`,
      isOptimal
        ? 'Applying 0 kg avoids unnecessary farming expenses and prevents chemical salt buildup.'
        : `Adheres to ${info.guideline_source}.`,
      fert === 'Zinc Sulphate'
        ? 'CRITICAL: Never mix Zinc Sulphate directly with DAP or SSP to prevent phosphorus lock-up.'
        : 'Apply when soil is moist, followed by earthing up to prevent nutrient loss.'
    ]
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD WATER ADVISORY (ICAR-IISR & VSI Pune Drip Irrigation Guidelines)
// ─────────────────────────────────────────────────────────────────────────────

const IRRIGATION_GUIDANCE = {
  'High': {
    irrigation_required: true,
    is_optimal_condition: false,
    condition_title: 'High Water Stress Detected',
    urgency: 'Irrigate within 24 hours',
    description: 'Soil moisture is critically low. Sugarcane is undergoing severe water stress which reduces stalk elongation and cane girth.',
    depth_mm: 22,
    frequency: 'Every 3–4 days in summer, 5–6 days in winter'
  },
  'Medium': {
    irrigation_required: true,
    is_optimal_condition: false,
    condition_title: 'Moderate Water Requirement',
    urgency: 'Irrigate within 2–3 days',
    description: 'Soil moisture is below optimal field capacity. Schedule watering to support steady cane vegetative growth.',
    depth_mm: 14,
    frequency: 'Every 6–8 days under current conditions'
  },
  'Low': {
    irrigation_required: false,
    is_optimal_condition: true,
    condition_title: 'Optimal Moisture Condition',
    urgency: 'No Need to Water (Moisture is Optimal)',
    description: 'Soil moisture is in optimal condition! Sugarcane roots have adequate available water. No watering is needed right now! Keep pumps turned off to conserve groundwater, save electricity, and prevent root hypoxia.',
    depth_mm: 0,
    frequency: 'Check moisture again in 7–10 days'
  }
};

function buildWaterAdvisory(mlResult, payload) {
  const need = mlResult.irrigation_need || 'Medium';
  const guidance = IRRIGATION_GUIDANCE[need] || IRRIGATION_GUIDANCE['Medium'];

  // Accept farm size in acres (default 2.5 acres, or convert if legacy ha was passed)
  const areaAcre = parseFloat(payload.field_area_acre || (payload.field_area_ha ? payload.field_area_ha * 2.47105 : 2.5));
  const areaHa = parseFloat((areaAcre / 2.47105).toFixed(2));

  // Authentic Sugarcane Irrigation Water Calculations (ICAR-IISR & VSI Pune Drip Standards)
  // 1 mm depth of water over 1 acre = 4,046.86 Litres
  const depthMm = guidance.depth_mm;
  const totalWaterLitres = Math.round(depthMm * 4047 * areaAcre);
  const totalWaterM3 = parseFloat((totalWaterLitres / 1000).toFixed(1));

  // Drip system runtime estimate: standard sugarcane drip discharge capacity is ~10,000 Litres/hr per acre
  const pumpRuntimeHours = depthMm > 0 ? parseFloat((depthMm * 0.405).toFixed(1)) : 0;

  return {
    irrigation_need: need,
    irrigation_required: guidance.irrigation_required,
    is_optimal_condition: !guidance.irrigation_required,
    condition_title: guidance.condition_title || (guidance.irrigation_required ? 'Irrigation Needed' : 'No Watering Needed (Optimal)'),
    urgency: guidance.urgency,
    description: guidance.description,
    recommended_depth_mm: depthMm,
    total_water_litres: totalWaterLitres,
    total_water_m3: totalWaterM3,
    pump_runtime_hours: pumpRuntimeHours,
    frequency: guidance.frequency,
    field_area_acre: areaAcre,
    field_area_ha: areaHa,
    confidence: mlResult.confidence,
    confidence_percentage: mlResult.confidence_percentage,
    ml_source: mlResult.source || 'ml_model',
    guideline_source: 'ICAR-IISR & VSI Pune Sugarcane Irrigation Standards',
    weather_used: {
      temperature_c: payload.temperature_c,
      humidity: payload.humidity,
      wind_speed_kmh: payload.wind_speed_kmh
    },
    important_notes: [
      `Estimated water volume is ${totalWaterLitres > 0 ? Math.round(totalWaterLitres/1000) + 'k Litres' : '0 Litres'} for your ${areaAcre} acre field.`,
      pumpRuntimeHours > 0 ? `Run your 5-7.5 HP drip pump for approximately ~${pumpRuntimeHours} hours.` : 'No pump run required today.',
      'Operate irrigation during early morning or late evening to minimize evaporative losses.',
      'Apply sugarcane trash mulching (1.5–2 tonnes/acre) to conserve up to 30% soil moisture.'
    ]
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/recommendations/fertilizer
 * Body: { soil_type, soil_moisture, electrical_conductivity, nitrogen_level,
 *         phosphorus_level, potassium_level, temperature_c, humidity,
 *         irrigation_type, field_area_ha? }
 */
exports.getFertilizerRecommendation = async (req, res) => {
  try {
    const {
      soil_type,
      soil_moisture,
      electrical_conductivity,
      nitrogen_level,
      phosphorus_level,
      potassium_level,
      temperature_c,
      humidity,
      irrigation_type,
      field_area_ha,
      field_area_acre
    } = req.body;

    // Harmonize field area in Acre (standard Indian land unit)
    const areaAcre = parseFloat(field_area_acre !== undefined ? field_area_acre : (field_area_ha !== undefined ? field_area_ha * 2.47105 : 2.5));
    const areaHa = parseFloat((areaAcre / 2.47105).toFixed(2));

    // Validation
    const required = {
      soil_type, soil_moisture, electrical_conductivity,
      nitrogen_level, phosphorus_level, potassium_level,
      temperature_c, humidity, irrigation_type
    };
    const missing = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required parameters',
        missing_fields: missing,
        message: `Please provide: ${missing.join(', ')}`
      });
    }

    // Numeric validation
    const numericFields = { soil_moisture, electrical_conductivity, nitrogen_level, phosphorus_level, potassium_level, temperature_c, humidity };
    for (const [key, val] of Object.entries(numericFields)) {
      if (isNaN(parseFloat(val))) {
        return res.status(400).json({ error: 'Invalid value', message: `${key} must be a number.` });
      }
    }

    // Kalman Filter on 5 repeated samples if provided
    let finalPh = parseFloat(req.body.soil_ph !== undefined ? req.body.soil_ph : 6.8);
    let finalMoisture = parseFloat(soil_moisture);
    let finalEC = parseFloat(electrical_conductivity);
    let finalN = parseFloat(nitrogen_level);
    let finalP = parseFloat(phosphorus_level);
    let finalK = parseFloat(potassium_level);
    let kalmanResult = null;

    if (Array.isArray(req.body.samples) && req.body.samples.length > 0) {
      kalmanResult = filterRepeatedReadings(req.body.samples);
      if (kalmanResult.filteredParameters.soil_ph != null) {
        finalPh = kalmanResult.filteredParameters.soil_ph;
      }
      if (kalmanResult.filteredParameters.soil_moisture != null) {
        finalMoisture = kalmanResult.filteredParameters.soil_moisture;
      }
      if (kalmanResult.filteredParameters.electrical_conductivity != null) {
        finalEC = kalmanResult.filteredParameters.electrical_conductivity;
      }
      if (kalmanResult.filteredParameters.nitrogen_level != null) {
        finalN = kalmanResult.filteredParameters.nitrogen_level;
      }
      if (kalmanResult.filteredParameters.phosphorus_level != null) {
        finalP = kalmanResult.filteredParameters.phosphorus_level;
      }
      if (kalmanResult.filteredParameters.potassium_level != null) {
        finalK = kalmanResult.filteredParameters.potassium_level;
      }
    }

    const cropStage = req.body.crop_growth_stage || 'Vegetative';

    // Build ML payload – 11 features (with Soil_pH & Crop_Growth_Stage for >90% accuracy)
    const mlPayload = {
      soil_type: String(soil_type).trim(),
      soil_ph: finalPh,
      soil_moisture: finalMoisture,
      electrical_conductivity: finalEC,
      nitrogen_level: finalN,
      phosphorus_level: finalP,
      potassium_level: finalK,
      temperature: parseFloat(temperature_c),
      humidity: parseFloat(humidity),
      irrigation_type: String(irrigation_type).trim(),
      crop_growth_stage: String(cropStage).trim()
    };

    const mlResult = await callFertilizerV2(mlPayload);
    const advisory = buildFertilizerAdvisory(mlResult, { ...req.body, soil_ph: finalPh, field_area_ha: areaHa, field_area_acre: areaAcre });
    if (kalmanResult) {
      advisory.kalman_filter = kalmanResult;
    }

    // Evaluate Soil Status & Parameter Health Details (only measured params)
    const soilParams = {
      Soil_pH: finalPh,
      Soil_Moisture: finalMoisture,
      Electrical_Conductivity: finalEC,
      Nitrogen_Level: finalN,
      Phosphorus_Level: finalP,
      Potassium_Level: finalK
    };
    if (req.body.organic_carbon !== undefined && req.body.organic_carbon !== null && req.body.organic_carbon !== '') {
      soilParams.Organic_Carbon = parseFloat(req.body.organic_carbon);
    }
    const soilStatus = AdvisoryEngine.evaluateSoilStatus(soilParams);
    advisory.soil_status = soilStatus;

    // Save advisory session to history
    const userId = req.user?.id || 'demo_farmer_1';
    const fieldName = req.body.field_name || req.body.fieldName || 'Sugarcane Plot';
    const fieldId = req.body.field_id || req.body.fieldId || 'custom_field';

    const sessionDoc = {
      userId,
      fieldId,
      fieldName,
      fieldAreaAcre: areaAcre,
      fieldAreaHectare: areaHa,
      soilType: mlPayload.soil_type,
      cropGrowthStage: cropStage,
      advisoryType: 'fertilizer',
      fertilizerPrediction: {
        recommended_fertilizer: mlResult.recommended_fertilizer,
        confidence: mlResult.confidence,
        confidence_percentage: mlResult.confidence_percentage,
        probabilities: mlResult.probabilities
      },
      fertilizerAdvisory: advisory,
      soilStatusAdvisory: soilStatus,
      input: mlPayload,
      metadata: {
        fieldName,
        cropGrowthStage: cropStage,
        soilType: mlPayload.soil_type,
        fieldAreaAcre: areaAcre,
        fieldAreaHectare: areaHa,
        irrigationType: mlPayload.irrigation_type
      }
    };

    let savedSession = null;
    try {
      savedSession = await stores.analysisSessions.create(sessionDoc);
    } catch (saveErr) {
      console.warn('[RecommendationController] Failed to persist fertilizer session to history:', saveErr.message);
    }

    res.json({
      success: true,
      sessionId: savedSession?._id,
      module: 'fertilizer_recommendation',
      timestamp: new Date().toISOString(),
      input: mlPayload,
      result: advisory
    });
  } catch (err) {
    console.error('[RecommendationController/fertilizer]', err.message);
    res.status(500).json({ error: 'Fertilizer recommendation failed', message: err.message });
  }
};

/**
 * POST /api/recommendations/water
 * Body: { soil_type, soil_ph, soil_moisture, electrical_conductivity,
 *         temperature_c, humidity, wind_speed_kmh, irrigation_type,
 *         season, crop_growth_stage, field_area_ha? }
 */
exports.getWaterRecommendation = async (req, res) => {
  try {
    const {
      soil_type,
      soil_ph,
      soil_moisture,
      electrical_conductivity,
      temperature_c,
      humidity,
      wind_speed_kmh,
      irrigation_type,
      season,
      crop_growth_stage,
      field_area_ha,
      field_area_acre
    } = req.body;

    // Harmonize field area in Acre (standard Indian land unit)
    const areaAcre = parseFloat(field_area_acre !== undefined ? field_area_acre : (field_area_ha !== undefined ? field_area_ha * 2.47105 : 2.5));
    const areaHa = parseFloat((areaAcre / 2.47105).toFixed(2));

    // Validation
    const required = {
      soil_type, soil_ph, soil_moisture, electrical_conductivity,
      temperature_c, humidity, wind_speed_kmh, irrigation_type,
      season, crop_growth_stage
    };
    const missing = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required parameters',
        missing_fields: missing,
        message: `Please provide: ${missing.join(', ')}`
      });
    }

    const numericFields = { soil_ph, soil_moisture, electrical_conductivity, temperature_c, humidity, wind_speed_kmh };
    for (const [key, val] of Object.entries(numericFields)) {
      if (isNaN(parseFloat(val))) {
        return res.status(400).json({ error: 'Invalid value', message: `${key} must be a number.` });
      }
    }

    // Kalman Filter on 5 repeated samples if provided
    let finalPh = parseFloat(soil_ph);
    let finalMoisture = parseFloat(soil_moisture);
    let finalEC = parseFloat(electrical_conductivity);
    let kalmanResult = null;

    if (Array.isArray(req.body.samples) && req.body.samples.length > 0) {
      kalmanResult = filterRepeatedReadings(req.body.samples);
      if (kalmanResult.filteredParameters.soil_ph != null) {
        finalPh = kalmanResult.filteredParameters.soil_ph;
      }
      if (kalmanResult.filteredParameters.soil_moisture != null) {
        finalMoisture = kalmanResult.filteredParameters.soil_moisture;
      }
      if (kalmanResult.filteredParameters.electrical_conductivity != null) {
        finalEC = kalmanResult.filteredParameters.electrical_conductivity;
      }
    }

    const rainfallMm = parseFloat(req.body.rainfall_mm !== undefined ? req.body.rainfall_mm : 0.0);

    // Build ML payload – 11 features (with live API Rainfall for >90% accuracy)
    const mlPayload = {
      soil_type: String(soil_type).trim(),
      soil_ph: finalPh,
      soil_moisture: finalMoisture,
      electrical_conductivity: finalEC,
      temperature_c: parseFloat(temperature_c),
      humidity: parseFloat(humidity),
      wind_speed_kmh: parseFloat(wind_speed_kmh),
      rainfall_mm: rainfallMm,
      irrigation_type: String(irrigation_type).trim(),
      season: String(season).trim(),
      crop_growth_stage: String(crop_growth_stage).trim()
    };

    const mlResult = await callWaterV2(mlPayload);
    const advisory = buildWaterAdvisory(mlResult, { ...req.body, rainfall_mm: rainfallMm, field_area_ha: areaHa, field_area_acre: areaAcre });
    if (kalmanResult) {
      advisory.kalman_filter = kalmanResult;
    }

    // Evaluate Soil Status & Parameter Health Details (only measured params)
    const soilParams = {
      Soil_pH: finalPh,
      Soil_Moisture: finalMoisture,
      Electrical_Conductivity: finalEC
    };
    if (req.body.nitrogen_level !== undefined && req.body.nitrogen_level !== null && req.body.nitrogen_level !== '') {
      soilParams.Nitrogen_Level = parseFloat(req.body.nitrogen_level);
    }
    if (req.body.phosphorus_level !== undefined && req.body.phosphorus_level !== null && req.body.phosphorus_level !== '') {
      soilParams.Phosphorus_Level = parseFloat(req.body.phosphorus_level);
    }
    if (req.body.potassium_level !== undefined && req.body.potassium_level !== null && req.body.potassium_level !== '') {
      soilParams.Potassium_Level = parseFloat(req.body.potassium_level);
    }
    if (req.body.organic_carbon !== undefined && req.body.organic_carbon !== null && req.body.organic_carbon !== '') {
      soilParams.Organic_Carbon = parseFloat(req.body.organic_carbon);
    }
    const soilStatus = AdvisoryEngine.evaluateSoilStatus(soilParams);
    advisory.soil_status = soilStatus;

    // Save advisory session to history
    const userId = req.user?.id || 'demo_farmer_1';
    const fieldName = req.body.field_name || req.body.fieldName || 'Sugarcane Plot';
    const fieldId = req.body.field_id || req.body.fieldId || 'custom_field';

    const sessionDoc = {
      userId,
      fieldId,
      fieldName,
      fieldAreaAcre: areaAcre,
      fieldAreaHectare: areaHa,
      soilType: mlPayload.soil_type,
      cropGrowthStage: mlPayload.crop_growth_stage,
      season: mlPayload.season,
      advisoryType: 'water',
      irrigationPrediction: {
        irrigation_need: mlResult.irrigation_need,
        confidence: mlResult.confidence,
        confidence_percentage: mlResult.confidence_percentage,
        probabilities: mlResult.probabilities
      },
      waterAdvisory: advisory,
      soilStatusAdvisory: soilStatus,
      input: mlPayload,
      metadata: {
        fieldName,
        cropGrowthStage: mlPayload.crop_growth_stage,
        soilType: mlPayload.soil_type,
        fieldAreaAcre: areaAcre,
        fieldAreaHectare: areaHa,
        irrigationType: mlPayload.irrigation_type,
        weather: advisory.weather_used
      }
    };

    let savedSession = null;
    try {
      savedSession = await stores.analysisSessions.create(sessionDoc);
    } catch (saveErr) {
      console.warn('[RecommendationController] Failed to persist water session to history:', saveErr.message);
    }

    res.json({
      success: true,
      sessionId: savedSession?._id,
      module: 'water_recommendation',
      timestamp: new Date().toISOString(),
      input: mlPayload,
      result: advisory
    });
  } catch (err) {
    console.error('[RecommendationController/water]', err.message);
    res.status(500).json({ error: 'Water recommendation failed', message: err.message });
  }
};

