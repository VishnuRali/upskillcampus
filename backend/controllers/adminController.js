const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '../data/users.json');
const ORDERS_PATH = path.join(__dirname, '../data/orders.json');
const restaurants = require('../data/restaurants.json');

const readUsers = () => JSON.parse(fs.readFileSync(USERS_PATH, 'utf8') || '[]');
const writeUsers = (users) => fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
const readOrders = () => JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8') || '[]');

// @route GET /api/admin/dashboard
const getDashboard = (req, res) => {
  try {
    const orders = readOrders();
    const users = readUsers();
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

    // Orders per day (last 7 days)
    const ordersPerDay = {};
    const last7 = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7.forEach(day => { ordersPerDay[day] = 0; });
    orders.forEach(o => {
      const day = o.createdAt?.split('T')[0];
      if (ordersPerDay[day] !== undefined) ordersPerDay[day]++;
    });

    // Top food items
    const itemMap = {};
    orders.forEach(o => o.items?.forEach(i => {
      itemMap[i.name] = (itemMap[i.name] || 0) + i.qty;
    }));
    const topItems = Object.entries(itemMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    // Revenue per day
    const revenuePerDay = {};
    last7.forEach(day => { revenuePerDay[day] = 0; });
    orders.forEach(o => {
      const day = o.createdAt?.split('T')[0];
      if (revenuePerDay[day] !== undefined) revenuePerDay[day] += o.total;
    });

    res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        totalUsers: users.length,
        totalRestaurants: restaurants.length,
        totalRevenue,
        ordersPerDay,
        revenuePerDay,
        topItems,
        recentOrders: orders.slice(0, 10)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/admin/orders
const getAllOrders = (req, res) => {
  try {
    const orders = readOrders();
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/admin/users
const getAllUsers = (req, res) => {
  try {
    const users = readUsers();
    const orders = readOrders();

    const data = users.map(u => {
      const userOrders = orders.filter(o => o.userId === u.id);
      const totalSpent = userOrders.reduce((s, o) => s + (o.total || 0), 0);
      const { password, ...safeUser } = u;
      return {
        ...safeUser,
        status: u.status || 'active', // older accounts without this field default to active
        totalOrders: userOrders.length,
        totalSpent
      };
    });

    // Most recently joined first
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: data.length,
      activeCount: data.filter(u => u.status === 'active').length,
      data
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PATCH /api/admin/users/:id/status
const updateUserStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "active" or "inactive"' });
    }
    if (req.user.id === id) {
      return res.status(400).json({ message: 'You cannot change the status of your own account' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ message: 'User not found' });

    users[idx].status = status;
    writeUsers(users);

    const { password, ...safeUser } = users[idx];
    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: safeUser
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/admin/delivery-boys
const getDeliveryBoys = (req, res) => {
  try {
    const users = readUsers();
    const deliveryBoys = users
      .filter(u => u.role === 'delivery_boy')
      .map(u => {
        const { password, ...safeUser } = u;
        return {
          ...safeUser,
          status: u.status || 'active',
          assignedOrders: u.assignedOrders || 0,
          deliveredOrders: u.deliveredOrders || 0,
          rating: u.rating || 0
        };
      });

    res.json({ success: true, count: deliveryBoys.length, data: deliveryBoys });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route POST /api/admin/delivery-boys
const createDeliveryBoy = async (req, res) => {
  try {
    const { name, email, phone, password, vehicle, status, rating } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Name, email, phone and password are required' });
    }

    const users = readUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.phone === phone)) {
      return res.status(400).json({ message: 'Delivery Partner already exists' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newDeliveryBoy = {
      id: 'D' + Date.now(),
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'delivery_boy',
      status: status === 'inactive' ? 'inactive' : 'active',
      vehicle: vehicle || 'Bike',
      assignedOrders: 0,
      deliveredOrders: 0,
      rating: Number(rating) || 4.5,
      createdAt: new Date().toISOString()
    };

    users.push(newDeliveryBoy);
    writeUsers(users);

    const { password: pwd, ...safeUser } = newDeliveryBoy;
    res.status(201).json({ success: true, message: 'Delivery partner added successfully', data: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PUT /api/admin/delivery-boys/:id
const updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, vehicle, status, rating } = req.body;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === id && u.role === 'delivery_boy');
    if (idx === -1) return res.status(404).json({ message: 'Delivery partner not found' });

    if ((email && users.some((u, i) => i !== idx && u.email.toLowerCase() === email.toLowerCase())) ||
        (phone && users.some((u, i) => i !== idx && u.phone === phone))) {
      return res.status(400).json({ message: 'Delivery Partner already exists' });
    }

    if (name) users[idx].name = name;
    if (email) users[idx].email = email;
    if (phone) users[idx].phone = phone;
    if (vehicle) users[idx].vehicle = vehicle;
    if (status) users[idx].status = ['active', 'inactive'].includes(status) ? status : users[idx].status;
    if (rating !== undefined) users[idx].rating = Number(rating) || users[idx].rating;
    if (password) {
      const bcrypt = require('bcryptjs');
      users[idx].password = await bcrypt.hash(password, 10);
    }

    writeUsers(users);
    const { password: pwd, ...safeUser } = users[idx];
    res.json({ success: true, message: 'Delivery partner updated successfully', data: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route DELETE /api/admin/delivery-boys/:id
const deleteDeliveryBoy = (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    const filtered = users.filter(u => !(u.id === id && u.role === 'delivery_boy'));
    if (filtered.length === users.length) {
      return res.status(404).json({ message: 'Delivery partner not found' });
    }

    writeUsers(filtered);
    res.json({ success: true, message: 'Delivery partner removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PATCH /api/admin/delivery-boys/:id/status
const updateDeliveryBoyStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or inactive' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === id && u.role === 'delivery_boy');
    if (idx === -1) return res.status(404).json({ message: 'Delivery partner not found' });

    users[idx].status = status;
    writeUsers(users);
    const { password, ...safeUser } = users[idx];
    res.json({ success: true, message: `Delivery partner ${status === 'active' ? 'activated' : 'deactivated'}`, data: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PATCH /api/admin/delivery-boys/:id/assign-order
const assignOrderToDeliveryBoy = (req, res) => {
  try {
    const { id } = req.params;
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'Order ID required' });

    const users = readUsers();
    const deliveryBoy = users.find(u => u.id === id && u.role === 'delivery_boy');
    if (!deliveryBoy) return res.status(404).json({ message: 'Delivery partner not found' });

    const orders = readOrders();
    const orderIdx = orders.findIndex(o => o.orderId === orderId);
    if (orderIdx === -1) return res.status(404).json({ message: 'Order not found' });

    orders[orderIdx].status = 'assigned';
    orders[orderIdx].statusIndex = ORDER_STATUSES.indexOf('assigned');
    orders[orderIdx].deliveryPartner = {
      id: deliveryBoy.id,
      name: deliveryBoy.name,
      phone: deliveryBoy.phone,
      rating: deliveryBoy.rating || 4.5,
      vehicle: deliveryBoy.vehicle || 'Bike',
      estimatedArrival: '15 mins'
    };

    deliveryBoy.assignedOrders = (deliveryBoy.assignedOrders || 0) + 1;
    writeOrders(orders);
    writeUsers(users);

    const { password, ...safeDeliveryBoy } = deliveryBoy;
    res.json({ success: true, message: 'Order assigned to delivery partner', data: { order: orders[orderIdx], deliveryBoy: safeDeliveryBoy } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/admin/restaurants
const getAllRestaurants = (req, res) => {
  try {
    res.json({ success: true, count: restaurants.length, data: restaurants });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== COUPON MANAGEMENT ====================
const COUPONS_PATH = path.join(__dirname, '../data/coupons.json');

const readCoupons = () => {
  if (!fs.existsSync(COUPONS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(COUPONS_PATH, 'utf8') || '[]');
  } catch (err) {
    return [];
  }
};

const writeCoupons = (coupons) => {
  fs.writeFileSync(COUPONS_PATH, JSON.stringify(coupons, null, 2));
};

// @route GET /api/admin/coupons
const getCoupons = (req, res) => {
  try {
    const coupons = readCoupons();
    res.json({ success: true, count: coupons.length, data: coupons });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route POST /api/admin/coupons
const createCoupon = (req, res) => {
  try {
    let { code, type, discount, minOrder, expiryDate, isActive, desc } = req.body;
    if (!code || !type) {
      return res.status(400).json({ message: 'Code and type are required' });
    }
    
    code = code.trim().toUpperCase();
    type = type.trim().toLowerCase();
    
    const allowedTypes = ['flat', 'percent', 'delivery'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid coupon type. Allowed types: flat, percent, delivery' });
    }
    
    if (type !== 'delivery' && (discount === undefined || discount === null || isNaN(Number(discount)))) {
      return res.status(400).json({ message: 'Discount value is required' });
    }
    
    const coupons = readCoupons();
    if (coupons.find(c => c.code.toUpperCase() === code)) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }
    
    const newCoupon = {
      code,
      type,
      discount: type === 'delivery' ? 0 : Number(discount),
      minOrder: Number(minOrder || 0),
      expiryDate: expiryDate || '',
      isActive: isActive !== false,
      desc: desc || `${type === 'flat' ? '₹' + discount : (type === 'percent' ? discount + '%' : 'Free Delivery')} off!`
    };
    
    coupons.push(newCoupon);
    writeCoupons(coupons);
    
    res.status(201).json({ success: true, message: 'Coupon created successfully', data: newCoupon });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PUT /api/admin/coupons/:code
const updateCoupon = (req, res) => {
  try {
    const { code } = req.params;
    let { type, discount, minOrder, expiryDate, isActive, desc } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }
    
    const cleanCode = code.trim().toUpperCase();
    const coupons = readCoupons();
    const idx = coupons.findIndex(c => c.code.toUpperCase() === cleanCode);
    if (idx === -1) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    
    if (type) {
      type = type.trim().toLowerCase();
      const allowedTypes = ['flat', 'percent', 'delivery'];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid coupon type. Allowed types: flat, percent, delivery' });
      }
      coupons[idx].type = type;
      if (type === 'delivery') {
        coupons[idx].discount = 0;
      }
    }
    
    if (discount !== undefined) {
      coupons[idx].discount = coupons[idx].type === 'delivery' ? 0 : Number(discount);
    }
    if (minOrder !== undefined) coupons[idx].minOrder = Number(minOrder);
    if (expiryDate !== undefined) coupons[idx].expiryDate = expiryDate;
    if (isActive !== undefined) coupons[idx].isActive = !!isActive;
    if (desc !== undefined) coupons[idx].desc = desc;
    
    writeCoupons(coupons);
    res.json({ success: true, message: 'Coupon updated successfully', data: coupons[idx] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route DELETE /api/admin/coupons/:code
const deleteCoupon = (req, res) => {
  try {
    const { code } = req.params;
    const coupons = readCoupons();
    const newCoupons = coupons.filter(c => c.code.toUpperCase() !== code.toUpperCase());
    
    if (coupons.length === newCoupons.length) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    
    writeCoupons(newCoupons);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { 
  getDashboard, getAllOrders, getAllUsers, getAllRestaurants,
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  updateUserStatus,
  getDeliveryBoys, createDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy,
  updateDeliveryBoyStatus, assignOrderToDeliveryBoy
};