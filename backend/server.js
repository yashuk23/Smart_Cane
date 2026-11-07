const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB, getDBStatus } = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const fieldRoutes = require('./src/routes/fieldRoutes');
const analysisRoutes = require('./src/routes/analysisRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const recommendationRoutes = require('./src/routes/recommendationRoutes');
const weatherRoutes = require('./src/routes/weatherRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Connect to Database
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/weather', weatherRoutes);

const { checkMLServiceHealth } = require('./src/services/mlClient');

// Health check endpoint
app.get('/health', async (req, res) => {
  const mlStatus = await checkMLServiceHealth();
  res.json({
    status: 'healthy',
    system: 'Smart Cane Intelligent Sugarcane Advisory API',
    version: '1.0.0',
    database: getDBStatus(),
    ml_service: mlStatus,
    timestamp: new Date().toISOString()
  });
});

// Root info endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Smart Cane Backend API',
    endpoints: {
      auth: '/api/auth',
      fields: '/api/fields',
      analysis: '/api/analysis/analyze',
      simulate: '/api/analysis/simulate',
      history: '/api/history',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`Smart Cane Node.js API Server running on port ${PORT}`);
  console.log(`Local Access:  http://localhost:${PORT}/health`);
  console.log(`Mobile Access: http://192.168.43.46:${PORT}/health`);
  console.log(`====================================================`);
});

