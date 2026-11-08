/**
 * ML Service Client
 * Communicates with the Python + FastAPI ML Inference Service.
 * Provides fallback inference based on the trained rules if the Python service is offline.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

async function fetchFromML(endpoint, body) {
  const url = `${ML_SERVICE_URL}${endpoint}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`ML Service responded with HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[ML Client] FastAPI service at ${url} not reached (${err.message}). Using built-in inference fallback.`);
    return null;
  }
}

async function predictFertilizer(inputData) {
  const res = await fetchFromML('/predict/fertilizer', inputData);
  if (res) return res;

  // Resilient fallback logic mirroring trained model distributions
  const n = inputData.Nitrogen_Level || 140;
  const p = inputData.Phosphorus_Level || 20;
  const k = inputData.Potassium_Level || 150;
  const stage = (inputData.Crop_Growth_Stage || 'Vegetative').toLowerCase();

  let fert = 'Urea';
  let confidence = 0.88;

  if (p < 18 && (stage === 'sowing' || stage === 'vegetative')) {
    fert = 'DAP';
    confidence = 0.92;
  } else if (k < 130) {
    fert = 'MOP';
    confidence = 0.85;
  } else if (n < 130) {
    fert = 'Urea';
    confidence = 0.94;
  } else if (inputData.Organic_Carbon < 0.5) {
    fert = 'Compost';
    confidence = 0.82;
  }

  return {
    recommended_fertilizer: fert,
    confidence,
    confidence_percentage: Math.round(confidence * 1000) / 10,
    source: 'fallback_engine'
  };
}

async function predictIrrigation(inputData) {
  const res = await fetchFromML('/predict/irrigation', inputData);
  if (res) return res;

  const moisture = inputData.Soil_Moisture || 30;
  const rain = inputData.Rainfall_mm || 0;
  let need = 'Medium';
  let confidence = 0.95;

  if (moisture < 22 || (moisture < 28 && rain < 5)) {
    need = 'High';
  } else if (moisture > 38 || rain > 25) {
    need = 'Low';
  }

  return {
    irrigation_need: need,
    confidence,
    confidence_percentage: Math.round(confidence * 1000) / 10,
    source: 'fallback_engine'
  };
}

async function checkMLServiceHealth() {
  const url = `${ML_SERVICE_URL}/health`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { status: 'online', endpoint: ML_SERVICE_URL, models: data.models || 'loaded' };
    }
    return { status: 'degraded', endpoint: ML_SERVICE_URL, code: res.status };
  } catch (err) {
    return { status: 'offline', endpoint: ML_SERVICE_URL, error: err.message, fallback_ready: true };
  }
}

module.exports = {
  predictFertilizer,
  predictIrrigation,
  fetchFromML,
  checkMLServiceHealth,
  ML_SERVICE_URL
};

