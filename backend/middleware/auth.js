const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/users.json');

const readUsers = () => {
  if (!fs.existsSync(DB_PATH)) return [];
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '[]');
};

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'quickbite_secret_2026');
      
      const users = readUsers();
      const user = users.find(u => u.id === decoded.id);
      
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;
      
      req.user = userWithoutPassword;
      return next();
    } catch (error) {
      console.error('Auth protect error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  
  return res.status(401).json({ message: 'Not authorized, no token' });
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ message: 'Admin access required' });
};

module.exports = { protect, adminOnly };