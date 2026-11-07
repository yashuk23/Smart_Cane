const stores = require('../config/store');

exports.getFields = async (req, res) => {
  try {
    const userId = req.user.id;
    const fields = await stores.fields.find({ userId });
    res.json({ fields });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fields', message: err.message });
  }
};

exports.getFieldById = async (req, res) => {
  try {
    const field = await stores.fields.findById(req.params.id);
    if (!field) return res.status(404).json({ error: 'Field not found' });
    res.json({ field });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch field', message: err.message });
  }
};

exports.createField = async (req, res) => {
  try {
    const userId = req.user.id || 'demo_farmer_1';
    const {
      name,
      fieldAreaAcre,
      fieldAreaHectare,
      soilType,
      cropVariety,
      cropGrowthStage,
      season,
      irrigationType,
      waterSource,
      mulchingUsed,
      region,
      notes,
      latitude,
      longitude
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Field name is required' });
    }

    const areaAcre = parseFloat(fieldAreaAcre !== undefined ? fieldAreaAcre : (fieldAreaHectare !== undefined ? fieldAreaHectare * 2.47105 : 2.5));
    const areaHa = parseFloat((areaAcre / 2.47105).toFixed(2));

    const newField = await stores.fields.create({
      userId,
      name,
      fieldAreaAcre: areaAcre,
      fieldAreaHectare: areaHa,
      soilType: soilType || 'Loamy',
      cropVariety: cropVariety || 'Co 86032',
      cropGrowthStage: cropGrowthStage || 'Vegetative',
      season: season || 'Kharif',
      irrigationType: irrigationType || 'Drip',
      waterSource: waterSource || 'Borewell',
      mulchingUsed: mulchingUsed || 'Yes',
      region: region || 'South',
      notes: notes || '',
      latitude: latitude != null ? parseFloat(latitude) : null,
      longitude: longitude != null ? parseFloat(longitude) : null
    });

    res.status(201).json({ message: 'Field added successfully', field: newField });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create field', message: err.message });
  }
};

exports.updateField = async (req, res) => {
  try {
    const updated = await stores.fields.findByIdAndUpdate(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Field not found' });
    res.json({ message: 'Field updated', field: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update field', message: err.message });
  }
};

exports.deleteField = async (req, res) => {
  try {
    const deleted = await stores.fields.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Field not found' });
    res.json({ message: 'Field deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete field', message: err.message });
  }
};

