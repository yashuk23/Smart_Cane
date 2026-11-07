/**
 * Discrete 1D Kalman Filter for Soil Parameter Noise Filtering
 * 
 * Prediction:
 *   x_hat_prior = x_hat
 *   P_prior = P + Q
 * 
 * Update:
 *   K = P_prior / (P_prior + R)
 *   x_hat = x_hat_prior + K * (z - x_hat_prior)
 *   P = (1 - K) * P_prior
 */

class ScalarKalmanFilter {
  constructor(q = 0.001, r = 0.1, initialEstimate = 0.0, initialError = 1.0) {
    this.q = parseFloat(q);
    this.r = parseFloat(r);
    this.xHat = parseFloat(initialEstimate);
    this.p = parseFloat(initialError);
    this.history = [];
  }

  update(measurement) {
    const z = parseFloat(measurement);
    const pPrior = this.p + this.q;
    const kalmanGain = pPrior / (pPrior + this.r);

    this.xHat = this.xHat + kalmanGain * (z - this.xHat);
    this.p = (1.0 - kalmanGain) * pPrior;

    const step = {
      measurement: Number(z.toFixed(4)),
      estimate: Number(this.xHat.toFixed(4)),
      kalmanGain: Number(kalmanGain.toFixed(4)),
      errorCovariance: Number(this.p.toFixed(6))
    };
    this.history.push(step);
    return step;
  }

  filterSeries(measurements) {
    if (!measurements || measurements.length === 0) {
      return { filteredValue: 0, rawValues: [], steps: [] };
    }

    this.xHat = parseFloat(measurements[0]);
    this.p = 1.0;
    this.history = [];

    for (const m of measurements) {
      this.update(m);
    }

    const n = measurements.length;
    const rawMean = measurements.reduce((a, b) => a + b, 0) / n;
    const rawVariance = n > 1 
      ? measurements.reduce((sum, m) => sum + Math.pow(m - rawMean, 2), 0) / n 
      : 0;

    const filteredSteps = this.history.map(h => h.estimate);
    const filteredMean = filteredSteps.reduce((a, b) => a + b, 0) / n;
    const filteredVariance = n > 1 
      ? filteredSteps.reduce((sum, s) => sum + Math.pow(s - filteredMean, 2), 0) / n 
      : 0;

    let noiseReductionPct = 0;
    if (rawVariance > 1e-6) {
      noiseReductionPct = Math.max(0, Math.min(100, (1.0 - (filteredVariance / rawVariance)) * 100));
    }

    return {
      filteredValue: Number(this.xHat.toFixed(3)),
      rawMean: Number(rawMean.toFixed(3)),
      rawValues: measurements.map(m => Number(m.toFixed(3))),
      filteredSteps: filteredSteps.map(s => Number(s.toFixed(3))),
      noiseReductionPct: Number(noiseReductionPct.toFixed(1)),
      history: this.history
    };
  }
}

const defaultQParams = {
  Soil_pH: 0.001,
  Soil_Moisture: 0.01,
  Nitrogen_Level: 0.05,
  Phosphorus_Level: 0.05,
  Potassium_Level: 0.05,
  Organic_Carbon: 0.001,
  Electrical_Conductivity: 0.005,
  Temperature: 0.01,
  Humidity: 0.02
};

const defaultRParams = {
  Soil_pH: 0.1,
  Soil_Moisture: 0.5,
  Nitrogen_Level: 1.5,
  Phosphorus_Level: 1.2,
  Potassium_Level: 1.5,
  Organic_Carbon: 0.05,
  Electrical_Conductivity: 0.08,
  Temperature: 0.3,
  Humidity: 1.0
};

function filterRepeatedReadings(readings, customQ = {}, customR = {}) {
  if (!Array.isArray(readings) || readings.length === 0) {
    return { filteredParameters: {}, details: {}, readingCount: 0 };
  }

  const qMap = { ...defaultQParams, ...customQ };
  const rMap = { ...defaultRParams, ...customR };

  const firstReading = readings[0];
  const numericalKeys = Object.keys(firstReading).filter(
    k => typeof firstReading[k] === 'number' && k !== 'sample_index'
  );

  const filteredParameters = {};
  const details = {};

  for (const key of numericalKeys) {
    const series = readings.map(r => parseFloat(r[key] || 0));
    const qVal = qMap[key] || 0.005;
    const rVal = rMap[key] || 0.2;

    const kf = new ScalarKalmanFilter(qVal, rVal);
    const res = kf.filterSeries(series);

    filteredParameters[key] = res.filteredValue;
    details[key] = res;
  }

  return {
    filteredParameters,
    details,
    readingCount: readings.length
  };
}

module.exports = {
  ScalarKalmanFilter,
  filterRepeatedReadings,
  defaultQParams,
  defaultRParams
};

