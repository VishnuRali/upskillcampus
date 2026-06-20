const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure data folder and JSON files exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const usersFile = path.join(dataDir, 'users.json');
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]');
if (!fs.existsSync(path.join(dataDir, 'orders.json'))) fs.writeFileSync(path.join(dataDir, 'orders.json'), '[]');

// Seed demo users if they don't exist
try {
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]');
  const bcrypt = require('bcryptjs');
  let changed = false;
  
  if (!users.find(u => u.id === 'U001')) {
    users.push({
      id: 'U001',
      name: 'Vishnu Vardhan',
      email: 'user@quickbite.com',
      password: bcrypt.hashSync('user123', 10),
      role: 'user',
      phone: '9876543210',
      status: 'active',
      addresses: [
        { id: 1, label: 'Home', address: 'Flat 402, Sunshine Apartments, Madhapur, Hyderabad, 500081', isDefault: true }
      ],
      favorites: [],
      createdAt: new Date().toISOString()
    });
    changed = true;
  }
  
  if (!users.find(u => u.id === 'A001')) {
    users.push({
      id: 'A001',
      name: 'Admin User',
      email: 'admin@quickbite.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      phone: '9999999999',
      status: 'active',
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
      assignedOrders: 0,
      deliveredOrders: 0,
      rating: 0
    });
    changed = true;
  }

  if (!users.find(u => u.role === 'delivery_boy' && u.phone === '9876543210')) {
    users.push({
      id: 'D001',
      name: 'Ravi Kumar',
      email: 'ravi@quickbite.com',
      password: bcrypt.hashSync('delivery123', 10),
      role: 'delivery_boy',
      phone: '9876543210',
      status: 'active',
      addresses: [],
      favorites: [],
      createdAt: new Date().toISOString(),
      assignedOrders: 12,
      deliveredOrders: 10,
      rating: 4.8
    });
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    console.log('✅ Demo accounts successfully seeded in users.json');
  }
} catch (err) {
  console.error('❌ Error seeding demo accounts:', err.message);
}

// Seed default coupons if they don't exist
try {
  const couponsFile = path.join(dataDir, 'coupons.json');
  let coupons = [];
  if (fs.existsSync(couponsFile)) {
    try {
      coupons = JSON.parse(fs.readFileSync(couponsFile, 'utf8') || '[]');
    } catch (e) {
      coupons = [];
    }
  }
  
  const defaultCoupons = [
    { code: 'WELCOME50', type: 'flat', discount: 50, minOrder: 0, expiryDate: '2026-12-31', isActive: true, desc: '₹50 off!' },
    { code: 'QUICK20', type: 'percent', discount: 20, minOrder: 0, expiryDate: '2026-12-31', isActive: true, desc: '20% off!' },
    { code: 'FREEDEL', type: 'delivery', discount: 0, minOrder: 0, expiryDate: '2026-12-31', isActive: true, desc: 'Free Delivery!' }
  ];
  
  let changed = false;
  defaultCoupons.forEach(dc => {
    const idx = coupons.findIndex(c => c.code.toUpperCase() === dc.code.toUpperCase());
    if (idx === -1) {
      coupons.push(dc);
      changed = true;
    } else {
      const existing = coupons[idx];
      if (existing.type !== dc.type || existing.discount !== dc.discount || existing.minOrder !== dc.minOrder || existing.isActive !== dc.isActive) {
        coupons[idx] = { ...existing, ...dc };
        changed = true;
      }
    }
  });
  
  if (changed || !fs.existsSync(couponsFile)) {
    fs.writeFileSync(couponsFile, JSON.stringify(coupons, null, 2));
    console.log('✅ Default coupons successfully seeded/verified in coupons.json');
  }
} catch (err) {
  console.error('❌ Error seeding coupons:', err.message);
}


// ==================== ROUTES ====================
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/restaurants', require('./routes/restaurantRoutes'));
app.use('/api/orders',      require('./routes/orderRoutes'));
app.use('/api/users',       require('./routes/userRoutes'));
app.use('/api/admin',       require('./routes/adminRoutes'));

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🍔 QuickBite Backend is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ==================== SERVE FRONTEND ====================
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 QuickBite Server running on http://localhost:${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`\n📌 Available Routes:`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/restaurants`);
  console.log(`   GET  /api/restaurants/trending`);
  console.log(`   GET  /api/restaurants/:id`);
  console.log(`   POST /api/orders`);
  console.log(`   GET  /api/orders`);
  console.log(`   GET  /api/users/profile`);
  console.log(`   GET  /api/admin/dashboard`);
  console.log(`\n🔑 Demo Accounts:`);
  console.log(`   User:  user@quickbite.com  / user123`);
  console.log(`   Admin: admin@quickbite.com / admin123\n`);
});