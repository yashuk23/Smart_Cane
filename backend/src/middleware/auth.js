const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_cane_secret_key_2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For easy testing, allow a default demo user if header is not present
    req.user = { id: 'demo_farmer_1', name: 'Demo Cane Farmer', email: 'farmer@smartcane.org' };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', message: err.message });
  }
}

module.exports = { authMiddleware, JWT_SECRET };

