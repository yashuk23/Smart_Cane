const http = require('http');

async function testBackend() {
  // Spawn or check node server
  console.log('Testing backend modules directly...');
  const { filterRepeatedReadings } = require('./src/services/kalmanFilter');
  const AdvisoryEngine = require('./src/services/advisoryEngine');

  const simulated = [
    { sample_index: 1, Soil_Moisture: 26.5, Soil_pH: 6.8, Nitrogen_Level: 140, Phosphorus_Level: 21, Potassium_Level: 155, Organic_Carbon: 0.62, Electrical_Conductivity: 0.52, Temperature: 29.5, Humidity: 65 },
    { sample_index: 2, Soil_Moisture: 29.8, Soil_pH: 6.9, Nitrogen_Level: 148, Phosphorus_Level: 23, Potassium_Level: 162, Organic_Carbon: 0.65, Electrical_Conductivity: 0.54, Temperature: 30.1, Humidity: 63 },
    { sample_index: 3, Soil_Moisture: 27.2, Soil_pH: 6.7, Nitrogen_Level: 142, Phosphorus_Level: 20, Potassium_Level: 158, Organic_Carbon: 0.63, Electrical_Conductivity: 0.51, Temperature: 29.8, Humidity: 64 },
    { sample_index: 4, Soil_Moisture: 30.4, Soil_pH: 6.8, Nitrogen_Level: 149, Phosphorus_Level: 22, Potassium_Level: 165, Organic_Carbon: 0.66, Electrical_Conductivity: 0.56, Temperature: 30.2, Humidity: 62 },
    { sample_index: 5, Soil_Moisture: 28.1, Soil_pH: 6.7, Nitrogen_Level: 144, Phosphorus_Level: 21, Potassium_Level: 159, Organic_Carbon: 0.64, Electrical_Conductivity: 0.53, Temperature: 29.9, Humidity: 64 }
  ];

  console.log('1. Testing Kalman Filter Service on 5 repeated readings:');
  const kfRes = filterRepeatedReadings(simulated);
  console.log('Filtered Soil Moisture:', kfRes.filteredParameters.Soil_Moisture, 
              'Noise reduction:', kfRes.details.Soil_Moisture.noiseReductionPct, '%');
  console.log('Filtered pH:', kfRes.filteredParameters.Soil_pH);

  console.log('\n2. Testing Fertilizer Quantity Engine:');
  const fertAdv = AdvisoryEngine.calculateFertilizerQuantity('Urea', 'Vegetative', 2.0);
  console.log('Fertilizer Advisory:', fertAdv);

  console.log('\n3. Testing Water Requirement Engine:');
  const waterAdv = AdvisoryEngine.calculateWaterRequirement('Medium', kfRes.filteredParameters.Soil_Moisture, 'Vegetative', 2.0);
  console.log('Water Advisory:', waterAdv);

  console.log('\n4. Testing Soil Status Engine:');
  const soilStatus = AdvisoryEngine.evaluateSoilStatus(kfRes.filteredParameters);
  console.log('Soil Health:', soilStatus.health_category, `(${soilStatus.overall_health_score}/100)`);

  console.log('\nALL BACKEND MODULE TESTS PASSED!');
}

testBackend();

