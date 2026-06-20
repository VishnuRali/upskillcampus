const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '../data/users.json');
const ORDERS_PATH = path.join(__dirname, '../data/orders.json');

const readUsers = () => JSON.parse(fs.readFileSync(USERS_PATH, 'utf8') || '[]');
const writeUsers = (u) => fs.writeFileSync(USERS_PATH, JSON.stringify(u, null, 2));
const readOrders = () => JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8') || '[]');

// @route GET /api/users/profile
const getProfile = (req, res) => {
  try {
    const orders = readOrders().filter(o => o.userId === req.user.id);
    const totalSpent = orders.reduce((s, o) => s + o.total, 0);
    res.json({
      success: true,
      data: {
        ...req.user,
        totalOrders: orders.length,
        totalSpent
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PUT /api/users/profile
const updateProfile = (req, res) => {
  try {
    const { name, phone } = req.body;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx !== -1) {
      if (name) users[idx].name = name;
      if (phone) users[idx].phone = phone;
      writeUsers(users);
    }
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route POST /api/users/favorites
const toggleFavorite = (req, res) => {
  try {
    const { restaurantId, name, emoji } = req.body;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ message: 'User not found' });

    const favIdx = users[idx].favorites.findIndex(f => f.restaurantId === restaurantId);
    if (favIdx > -1) {
      users[idx].favorites.splice(favIdx, 1);
      writeUsers(users);
      return res.json({ success: true, action: 'removed', message: 'Removed from favorites' });
    }
    users[idx].favorites.push({ restaurantId, name, emoji });
    writeUsers(users);
    res.json({ success: true, action: 'added', message: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route POST /api/users/addresses
const saveAddress = (req, res) => {
  try {
    const { label, address, isDefault } = req.body;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ message: 'User not found' });
    if (isDefault) users[idx].addresses.forEach(a => a.isDefault = false);
    users[idx].addresses.push({ id: Date.now(), label, address, isDefault: !!isDefault });
    writeUsers(users);
    res.json({ success: true, message: 'Address saved', data: users[idx].addresses });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getProfile, updateProfile, toggleFavorite, saveAddress };