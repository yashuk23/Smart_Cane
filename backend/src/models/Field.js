const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  fieldAreaAcre: { type: Number, required: true, default: 2.5 },
  fieldAreaHectare: { type: Number, default: 1.0 },
  soilType: {
    type: String,
    enum: ['Clay', 'Sandy', 'Silt', 'Loamy'],
    default: 'Loamy'
  },
  cropVariety: { type: String, default: 'Co 86032' },
  cropGrowthStage: {
    type: String,
    enum: ['Sowing', 'Vegetative', 'Flowering', 'Harvest'],
    default: 'Vegetative'
  },
  season: {
    type: String,
    enum: ['Kharif', 'Rabi', 'Zaid'],
    default: 'Kharif'
  },
  irrigationType: {
    type: String,
    enum: ['Drip', 'Sprinkler', 'Furrow', 'Canal'],
    default: 'Drip'
  },
  waterSource: { type: String, default: 'Borewell' },
  mulchingUsed: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
  region: { type: String, default: 'South' },
  previousCrop: { type: String, default: 'Legumes' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Field || mongoose.model('Field', FieldSchema);

