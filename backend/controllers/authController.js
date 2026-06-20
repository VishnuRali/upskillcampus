const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Simple JSON file as database (free, no MongoDB needed)
const DB_PATH = path.join(__dirname, '../data/users.json');

const readUsers = () => {
  if (!fs.existsSync(DB_PATH)) return [];
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
};

const writeUsers = (users) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'quickbite_secret_2026', { expiresIn: '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;
    if (!name || !email || !phone || !password || !confirmPassword)
      return res.status(400).json({ message: 'Please fill all fields' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (password !== confirmPassword)
      return res.status(400).json({ message: 'Passwords do not match' });

    const users = readUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return res.status(400).json({ message: 'Email already registered' });
    if (users.find(u => u.phone === phone))
      return res.status(400).json({ message: 'Phone number already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'U' + Date.now(),
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      status: 'active',
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
      assignedOrders: 0,
      deliveredOrders: 0,
      rating: 0
    };
    users.push(newUser);
    writeUsers(users);

    const token = generateToken(newUser.id, newUser.role);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name,
        email,
        phone,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const identifier = req.body.email || req.body.emailOrPhone || req.body.phone;
    const password = req.body.password;
    if (!identifier || !password)
      return res.status(400).json({ message: 'Please enter email/phone and password' });

    const users = readUsers();
    const user = users.find(u => u.email.toLowerCase() === String(identifier).toLowerCase() || u.phone === String(identifier));
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user.id, user.role);
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, getMe };