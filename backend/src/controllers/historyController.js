const stores = require('../config/store');

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessions = await stores.analysisSessions.find({ userId });
    
    // Summary view for list screen
    const summaries = sessions.map(s => ({
      id: s._id,
      fieldName: s.fieldName || s.metadata?.fieldName || 'Sugarcane Field',
      fieldAreaHectare: s.fieldAreaHectare || s.metadata?.fieldAreaHectare || 1.5,
      cropGrowthStage: s.cropGrowthStage || s.input?.crop_growth_stage || s.metadata?.cropGrowthStage || 'Vegetative',
      createdAt: s.createdAt,
      advisoryType: s.advisoryType || (s.fertilizerPrediction ? 'fertilizer' : 'water'),
      recommendedFertilizer: s.fertilizerPrediction?.recommended_fertilizer,
      fertilizerDosage: s.fertilizerAdvisory?.dosage_kg_per_ha ? `${s.fertilizerAdvisory.dosage_kg_per_ha} kg/ha` : s.fertilizerAdvisory?.package_estimate,
      irrigationNeed: s.irrigationPrediction?.irrigation_need,
      irrigationRequired: s.waterAdvisory?.irrigation_required,
      waterVolumeLiters: s.waterAdvisory?.total_water_liters || s.waterAdvisory?.total_water_litres,
      soilHealthCategory: s.soilStatusAdvisory?.health_category,
      soilHealthScore: s.soilStatusAdvisory?.overall_health_score,
      filteredMoisture: s.filteredReadings?.Soil_Moisture || s.input?.soil_moisture,
      filteredPH: s.filteredReadings?.Soil_pH || s.input?.soil_ph
    }));

    res.json({ count: summaries.length, history: summaries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history', message: err.message });
  }
};

exports.getSessionById = async (req, res) => {
  try {
    const session = await stores.analysisSessions.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Analysis session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session', message: err.message });
  }
};

exports.exportSession = async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const session = await stores.analysisSessions.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (format === 'csv') {
      let csv = 'Parameter,Raw_Mean,Kalman_Filtered,Unit,Status\n';
      const details = session.kalmanDetails || {};
      const evals = session.soilStatusAdvisory?.evaluations || {};

      for (const [param, d] of Object.entries(details)) {
        const ev = evals[param] || {};
        csv += `${param},${d.rawMean},${d.filteredValue},,${ev.status || 'OK'}\n`;
      }
      csv += `\nAdvisory\n`;
      csv += `Recommended Fertilizer,${session.fertilizerPrediction?.recommended_fertilizer}\n`;
      csv += `Fertilizer Quantity,${session.fertilizerAdvisory?.total_dosage_kg} kg (${session.fertilizerAdvisory?.package_estimate})\n`;
      csv += `Irrigation Required,${session.waterAdvisory?.irrigation_required ? 'YES' : 'NO'}\n`;
      csv += `Water Volume,${session.waterAdvisory?.total_water_liters} Liters (${session.waterAdvisory?.total_water_m3} m3)\n`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="smart_cane_advisory_${session._id}.csv"`);
      return res.send(csv);
    }

    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: 'Export failed', message: err.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const deleted = await stores.analysisSessions.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Session record not found' });
    res.json({ message: 'History record deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete history session', message: err.message });
  }
};

exports.clearAllHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userSessions = await stores.analysisSessions.find({ userId });
    for (const s of userSessions) {
      await stores.analysisSessions.findByIdAndDelete(s._id);
    }
    res.json({ message: 'All history records cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history', message: err.message });
  }
};


