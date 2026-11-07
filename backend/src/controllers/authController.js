const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stores = require('../config/store');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, region, preferredLanguage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await stores.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await stores.users.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: (phone || '').trim(),
      region: (region || 'South').trim(),
      preferredLanguage: preferredLanguage || 'en'
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      message: 'Farmer account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        region: user.region,
        preferredLanguage: user.preferredLanguage
      }
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Registration failed', message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !email.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await stores.users.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        region: user.region,
        preferredLanguage: user.preferredLanguage || 'en'
      }
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Login failed', message: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await stores.users.findById(req.user.id);
    if (!user) {
      return res.json({ user: req.user });
    }
    const { password, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile', message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { preferredLanguage, name, phone } = req.body;

    // Build the update object — only include fields that were provided
    const update = {};
    if (preferredLanguage !== undefined) update.preferredLanguage = preferredLanguage;
    if (name !== undefined && name.trim()) update.name = name.trim();
    if (phone !== undefined) update.phone = phone.trim();

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    const updatedUser = await stores.users.findByIdAndUpdate(req.user.id, update);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...safeUser } = updatedUser;
    return res.json({ message: 'Profile updated successfully', user: safeUser });
  } catch (err) {
    console.error('[Auth UpdateProfile Error]:', err);
    return res.status(500).json({ error: 'Failed to update profile', message: err.message });
  }
};
