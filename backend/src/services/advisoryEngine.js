/**
 * Agronomic Advisory Calculation Engines for Sugarcane Cultivation
 * 1. Fertilizer Quantity Engine
 * 2. Water Requirement Engine
 * 3. Soil Status Engine
 */

class AdvisoryEngine {
  static calculateFertilizerQuantity(fertilizerType, cropStage, fieldAreaAcreOrHa, nLevel = 140, pLevel = 20, kLevel = 150, phLevel = 7.0) {
    const stage = (cropStage || 'Vegetative').toLowerCase();
    // Accept area in acres (if > 0.05). If given area seems to be ha, convert, but standard input is now acres.
    const areaAcre = Math.max(0.1, parseFloat(fieldAreaAcreOrHa || 2.5));
    const areaHa = parseFloat((areaAcre / 2.47105).toFixed(2));
    const ftype = (fertilizerType || 'Urea').trim();

    // Vasantdada Sugar Institute (VSI) Pune & ICAR Sugarcane RDF per Acre
    const baseRatesAcre = {
      Urea: { sowing: 35.0, vegetative: 65.0, flowering: 95.0, harvest: 0.0 },
      DAP: { sowing: 50.0, vegetative: 30.0, flowering: 15.0, harvest: 0.0 },
      MOP: { sowing: 30.0, vegetative: 40.0, flowering: 45.0, harvest: 0.0 },
      NPK: { sowing: 75.0, vegetative: 60.0, flowering: 40.0, harvest: 0.0 },
      Compost: { sowing: 4000.0, vegetative: 1000.0, flowering: 500.0, harvest: 0.0 },
      'Zinc Sulphate': { sowing: 10.0, vegetative: 8.0, flowering: 5.0, harvest: 0.0 },
      SSP: { sowing: 125.0, vegetative: 60.0, flowering: 30.0, harvest: 0.0 }
    };

    const rates = baseRatesAcre[ftype] || baseRatesAcre.Urea;
    let ratePerAcre = rates[stage] !== undefined ? rates[stage] : (rates.vegetative || 50.0);

    if (ftype === 'Urea') {
      if (nLevel < 140) ratePerAcre *= 1.20;
      else if (nLevel > 250) ratePerAcre *= 0.80;
    } else if (ftype === 'DAP' || ftype === 'SSP') {
      if (pLevel < 15) ratePerAcre *= 1.20;
      else if (pLevel > 35) ratePerAcre *= 0.80;
    } else if (ftype === 'MOP') {
      if (kLevel < 120) ratePerAcre *= 1.20;
      else if (kLevel > 240) ratePerAcre *= 0.80;
    } else if (ftype === 'Zinc Sulphate') {
      if (phLevel > 7.8) ratePerAcre *= 1.25;
    }

    ratePerAcre = Number(ratePerAcre.toFixed(1));
    const totalDosageKg = Number((ratePerAcre * areaAcre).toFixed(1));
    const ratePerHa = Number((ratePerAcre * 2.47105).toFixed(1));

    const pkgSizes = { Urea: 45, DAP: 50, MOP: 50, NPK: 50, SSP: 50, 'Zinc Sulphate': 25, Compost: 1000 };
    const pkgSize = pkgSizes[ftype] || 50;
    const bagsCount = Math.ceil(totalDosageKg / pkgSize);
    const unitWord = bagsCount === 1 ? 'bag' : 'bags';
    const bagUnit = ftype === 'Compost' ? (bagsCount === 1 ? 'tonne' : 'tonnes') : (ftype === 'Zinc Sulphate' ? `${unitWord} (25 kg)` : `${unitWord} (50 kg)`);

    const methods = {
      Urea: 'Broadcast along cane furrows in moist soil followed by earthing up and light irrigation. Avoid midday application.',
      DAP: 'Basal placement in furrows 5-7 cm below the cane setts during planting or side placement during weeding.',
      MOP: 'Band application 10 cm away from cane stool. Essential for drought tolerance and sucrose accumulation.',
      NPK: 'Band placement near root zone prior to scheduled irrigation.',
      Compost: 'Incorporate into top 15-20 cm of soil during primary tillage or inter-row mulching.',
      'Zinc Sulphate': 'Apply 10 kg/acre as basal soil dressing mixed with 100 kg FYM. Never mix directly with phosphatic fertilizers (DAP/SSP).',
      SSP: 'Apply as basal placement in furrow bottoms before planting setts. Excellent for alkaline soils.'
    };

    const isOptimal = ftype === 'Compost' || ftype === 'No Fertilizer Needed';
    if (isOptimal) {
      return {
        fertilizer_type: 'No Fertilizer Needed',
        crop_stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        field_area_acre: areaAcre,
        field_area_ha: areaHa,
        dosage_kg_per_acre: 0,
        dosage_kg_per_ha: 0,
        total_dosage_kg: 0,
        package_estimate: '0 bags (None Needed)',
        is_optimal_condition: true,
        guideline_source: 'VSI Pune & ICAR-IISR Sugarcane Guidelines',
        application_method: 'Soil nutrients are optimal. No chemical fertilizer application required.',
        split_schedule: 'Maintain crop monitoring. Zero application needed at this stage.'
      };
    }

    return {
      fertilizer_type: ftype,
      crop_stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      field_area_acre: areaAcre,
      field_area_ha: areaHa,
      dosage_kg_per_acre: ratePerAcre,
      dosage_kg_per_ha: ratePerHa,
      total_dosage_kg: totalDosageKg,
      package_estimate: `${bagsCount} ${bagUnit}`,
      guideline_source: 'VSI Pune & ICAR-IISR Sugarcane Guidelines',
      application_method: methods[ftype] || 'Broadcast evenly and incorporate into soil.',
      split_schedule: `Apply ${stage.charAt(0).toUpperCase() + stage.slice(1)} dose within 3-5 days in moist soil conditions.`
    };
  }

  static calculateWaterRequirement(irrigationNeed, soilMoisture, cropStage, fieldAreaAcreOrHa, rainfallMm = 0, tempC = 30, humidity = 60) {
    const need = (irrigationNeed || 'Medium').toLowerCase();
    const stage = (cropStage || 'Vegetative').toLowerCase();
    const areaAcre = Math.max(0.1, parseFloat(fieldAreaAcreOrHa || 2.5));
    const areaHa = parseFloat((areaAcre / 2.47105).toFixed(2));
    const moisture = parseFloat(soilMoisture !== undefined ? soilMoisture : 30.0);
    const rain = parseFloat(rainfallMm || 0);

    const stageKc = {
      sowing: 0.45,
      vegetative: 0.85,
      flowering: 1.25,
      harvest: 0.60
    };
    const kc = stageKc[stage] || 0.85;

    let irrigationRequired = false;
    let recommendedDepthMm = 0;
    let reason = '';

    if (rain > 30.0 || moisture > 42.0) {
      irrigationRequired = false;
      recommendedDepthMm = 0;
      reason = `Adequate moisture available (${moisture}%). Significant recent rainfall (${rain} mm) recorded.`;
    } else if (need === 'high' || moisture < 22.0) {
      irrigationRequired = true;
      recommendedDepthMm = Number((22.0 * kc).toFixed(1));
      reason = `High water stress detected (Soil Moisture: ${moisture}%). Immediate irrigation needed to protect cane tillering.`;
    } else if (need === 'medium' || moisture < 32.0) {
      irrigationRequired = true;
      recommendedDepthMm = Number((15.0 * kc).toFixed(1));
      reason = `Moderate water requirement. Sugarcane is in ${stage} stage with steady crop evapotranspiration.`;
    } else {
      irrigationRequired = false;
      recommendedDepthMm = 0;
      reason = `Soil moisture (${moisture}%) is optimal for ${stage} stage. Next sensor review in 4-5 days.`;
    }

    // Authentic calculation: 1 mm depth over 1 acre = 4,047 liters
    const totalLiters = Math.round(recommendedDepthMm * 4047 * areaAcre);
    const totalM3 = Number((totalLiters / 1000).toFixed(1));
    const pumpHours = recommendedDepthMm > 0 ? Number((recommendedDepthMm * 0.405).toFixed(1)) : 0;
    const intervalDays = need === 'high' ? 4 : (need === 'medium' ? 7 : 10);

    return {
      irrigation_required: irrigationRequired,
      irrigation_need_level: need.charAt(0).toUpperCase() + need.slice(1),
      recommended_depth_mm: recommendedDepthMm,
      field_area_acre: areaAcre,
      field_area_ha: areaHa,
      total_water_liters: totalLiters,
      total_water_m3: totalM3,
      pump_runtime_hours: pumpHours,
      irrigation_interval_days: intervalDays,
      recommended_method: 'Drip Irrigation (10,000 LPH discharge per acre capacity)',
      guideline_source: 'ICAR-IISR & VSI Pune Sugarcane Irrigation Standards',
      reason,
      crop_coefficient_kc: kc
    };
  }

  static evaluateSoilStatus(filteredParams = {}) {
    const evaluations = {};

    const getParam = (name) => {
      let val = filteredParams[name];
      if (val === undefined || val === null || val === '') {
        val = filteredParams[name.toLowerCase()];
      }
      if (val === undefined || val === null || val === '') {
        const snake = name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        val = filteredParams[snake];
      }
      if (val !== undefined && val !== null && val !== '') {
        const num = parseFloat(val);
        if (!isNaN(num)) return num;
      }
      return null;
    };

    const ph = getParam('Soil_pH');
    const moisture = getParam('Soil_Moisture');
    const n = getParam('Nitrogen_Level');
    const p = getParam('Phosphorus_Level');
    const k = getParam('Potassium_Level');
    const oc = getParam('Organic_Carbon');
    const ec = getParam('Electrical_Conductivity');

    // pH
    if (ph !== null) {
      if (ph < 6.0) {
        evaluations.Soil_pH = {
          value: ph,
          status: 'Low (Acidic)',
          rating: 'warning',
          recommendation: 'Soil is acidic. Apply agricultural lime (CaCO3) or dolomite at 1-2 tons/ha to neutralize.'
        };
      } else if (ph > 7.8) {
        evaluations.Soil_pH = {
          value: ph,
          status: 'High (Alkaline)',
          rating: 'warning',
          recommendation: 'Soil is alkaline/saline. Apply agricultural gypsum (CaSO4) and farmyard manure.'
        };
      } else {
        evaluations.Soil_pH = {
          value: ph,
          status: 'Optimal',
          rating: 'good',
          recommendation: 'Soil pH is ideal for root nutrient uptake and healthy cane internodes.'
        };
      }
    }

    // Moisture
    if (moisture !== null) {
      if (moisture < 20.0) {
        evaluations.Soil_Moisture = {
          value: moisture,
          status: 'Low (Drought Stress)',
          rating: 'critical',
          recommendation: 'Soil is dry. Risk of shoot borer attack and stunted internodes. Irrigate promptly.'
        };
      } else if (moisture > 42.0) {
        evaluations.Soil_Moisture = {
          value: moisture,
          status: 'High (Waterlogged)',
          rating: 'warning',
          recommendation: 'Excessive moisture. Ensure furrow drainage to avoid root rot.'
        };
      } else {
        evaluations.Soil_Moisture = {
          value: moisture,
          status: 'Optimal',
          rating: 'good',
          recommendation: 'Moisture is in comfortable range for steady cane elongation.'
        };
      }
    }

    // Nitrogen
    if (n !== null) {
      if (n < 120.0) {
        evaluations.Nitrogen_Level = {
          value: n,
          status: 'Low (Deficient)',
          rating: 'warning',
          recommendation: 'Low nitrogen leads to leaf chlorosis and thin stalks. Urea top dressing required.'
        };
      } else if (n > 260.0) {
        evaluations.Nitrogen_Level = {
          value: n,
          status: 'High',
          rating: 'caution',
          recommendation: 'Excessive nitrogen delays sucrose ripening and causes cane lodging.'
        };
      } else {
        evaluations.Nitrogen_Level = {
          value: n,
          status: 'Normal / Optimal',
          rating: 'good',
          recommendation: 'Balanced nitrogen available for ongoing tillering.'
        };
      }
    }

    // Phosphorus
    if (p !== null) {
      if (p < 15.0) {
        evaluations.Phosphorus_Level = {
          value: p,
          status: 'Low (Deficient)',
          rating: 'warning',
          recommendation: 'Low phosphorus impairs root proliferation. Apply DAP or Single Super Phosphate.'
        };
      } else {
        evaluations.Phosphorus_Level = {
          value: p,
          status: 'Sufficient',
          rating: 'good',
          recommendation: 'Good phosphorus reserve promoting strong root anchorage.'
        };
      }
    }

    // Potassium
    if (k !== null) {
      if (k < 120.0) {
        evaluations.Potassium_Level = {
          value: k,
          status: 'Low (Deficient)',
          rating: 'warning',
          recommendation: 'Low potassium impairs sucrose synthesis and drought resistance. Apply MOP.'
        };
      } else {
        evaluations.Potassium_Level = {
          value: k,
          status: 'Sufficient',
          rating: 'good',
          recommendation: 'Optimal potassium enhances sugar content and pest resilience.'
        };
      }
    }

    // Organic Carbon
    if (oc !== null) {
      if (oc < 0.5) {
        evaluations.Organic_Carbon = {
          value: oc,
          status: 'Low',
          rating: 'warning',
          recommendation: 'Low organic matter. Incorporate green manuring crops (Sunn hemp) or filter press mud.'
        };
      } else {
        evaluations.Organic_Carbon = {
          value: oc,
          status: 'Healthy',
          rating: 'good',
          recommendation: 'Good soil microbial activity and moisture retention capacity.'
        };
      }
    }

    // EC
    if (ec !== null) {
      if (ec > 2.0) {
        evaluations.Electrical_Conductivity = {
          value: ec,
          status: 'Saline',
          rating: 'critical',
          recommendation: 'High salinity impedes osmosis and stunts cane elongation. Flush with fresh water.'
        };
      } else {
        evaluations.Electrical_Conductivity = {
          value: ec,
          status: 'Normal (Safe)',
          rating: 'good',
          recommendation: 'Electrical conductivity is safe for sugarcane root development.'
        };
      }
    }

    const evalEntries = Object.values(evaluations);
    let overallScore = 100;
    if (evalEntries.length > 0) {
      let totalPoints = 0;
      for (const item of evalEntries) {
        if (item.rating === 'good') totalPoints += 100;
        else if (item.rating === 'caution') totalPoints += 80;
        else if (item.rating === 'warning') totalPoints += 60;
        else if (item.rating === 'critical') totalPoints += 40;
        else totalPoints += 100;
      }
      overallScore = Math.round(totalPoints / evalEntries.length);
    }
    overallScore = Math.max(30, Math.min(100, overallScore));

    const category = overallScore >= 85 ? 'Excellent' : (overallScore >= 70 ? 'Good' : 'Needs Attention');

    return {
      evaluations,
      overall_health_score: overallScore,
      health_category: category,
      summary: `Soil health is graded '${category}' (${overallScore}/100) based on ${evalEntries.length} evaluated parameter${evalEntries.length === 1 ? '' : 's'}.`
    };
  }
}

module.exports = AdvisoryEngine;

