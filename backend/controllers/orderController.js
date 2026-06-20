const fs = require('fs');
const path = require('path');

const ORDERS_PATH = path.join(__dirname, '../data/orders.json');
const COUPONS_PATH = path.join(__dirname, '../data/coupons.json');
const USERS_PATH = path.join(__dirname, '../data/users.json');

const readOrders = () => {
  if (!fs.existsSync(ORDERS_PATH)) return [];
  return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));
};
const writeOrders = (orders) => {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
};

const readCoupons = () => {
  if (!fs.existsSync(COUPONS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(COUPONS_PATH, 'utf8') || '[]');
  } catch (err) {
    return [];
  }
};

const readUsers = () => {
  if (!fs.existsSync(USERS_PATH)) return [];
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
};
const writeUsers = (users) => {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
};

const generateOrderId = () => `QB-2026-${Math.floor(100000 + Math.random() * 900000)}`;

const ORDER_STATUSES = ['placed', 'accepted', 'preparing', 'assigned', 'out_for_delivery', 'delivered'];

// @desc    Create new order
// @route   POST /api/orders
const createOrder = (req, res) => {
  try {
    const { items, address, coupon } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: 'No items in order' });
    if (!address) return res.status(400).json({ message: 'Delivery address required' });

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const deliveryFee = subtotal >= 299 ? 0 : 39;
    const tax = Math.round(subtotal * 0.05);
    
    let discount = 0;
    let finalDeliveryFee = deliveryFee;
    let appliedCoupon = null;

    if (coupon) {
      const coupons = readCoupons();
      const c = coupons.find(x => x.code.toUpperCase() === coupon.trim().toUpperCase());
      if (c && c.isActive && subtotal >= c.minOrder) {
        let isExpired = false;
        if (c.expiryDate) {
          const expiry = new Date(c.expiryDate);
          expiry.setHours(23, 59, 59, 999);
          if (new Date() > expiry) isExpired = true;
        }
        
        if (!isExpired) {
          appliedCoupon = c.code;
          if (c.type === 'flat') {
            discount = c.discount;
          } else if (c.type === 'percent') {
            discount = Math.round(subtotal * c.discount / 100);
          } else if (c.type === 'delivery') {
            discount = 0;
            finalDeliveryFee = 0;
          }
        }
      }
    }

    const total = Math.max(0, subtotal + finalDeliveryFee + tax - discount);

    const order = {
      orderId: generateOrderId(),
      userId: req.user?.id || 'guest',
      userEmail: req.user?.email || 'guest',
      items,
      subtotal,
      deliveryFee: finalDeliveryFee,
      tax,
      discount,
      total,
      address,
      restaurantName: items[0]?.restaurantName || 'QuickBite',
      coupon: appliedCoupon,
      status: 'placed',
      statusIndex: 0,
      estimatedTime: '30-45 min',
      deliveryPartner: null,
      createdAt: new Date().toISOString()
    };

    const orders = readOrders();
    orders.unshift(order);
    writeOrders(orders);

    res.status(201).json({ success: true, data: order, message: `Order placed! ID: ${order.orderId}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// @route GET /api/orders
const getMyOrders = (req, res) => {
  try {
    const orders = readOrders();
    const userId = req.user?.id;
    const myOrders = orders.filter(o => o.userId === userId);
    res.json({ success: true, count: myOrders.length, data: myOrders });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/orders/:orderId
const getOrderById = (req, res) => {
  try {
    const orders = readOrders();
    const order = orders.find(o => o.orderId === req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route PUT /api/orders/:orderId/status
const updateOrderStatus = (req, res) => {
  try {
    const orders = readOrders();
    const idx = orders.findIndex(o => o.orderId === req.params.orderId);
    if (idx === -1) return res.status(404).json({ message: 'Order not found' });

    const currentIdx = orders[idx].statusIndex;
    if (currentIdx < ORDER_STATUSES.length - 1) {
      const nextIdx = currentIdx + 1;
      const nextStatus = ORDER_STATUSES[nextIdx];
      orders[idx].statusIndex = nextIdx;
      orders[idx].status = nextStatus;

      if (nextStatus === 'assigned' && !orders[idx].deliveryPartner) {
        const users = readUsers();
        const deliveryBoys = users.filter(u => u.role === 'delivery_boy' && u.status === 'active');
        const randomBoy = deliveryBoys.length ? deliveryBoys[Math.floor(Math.random() * deliveryBoys.length)] : null;
        const partner = randomBoy ? {
          id: randomBoy.id,
          name: randomBoy.name,
          phone: randomBoy.phone,
          rating: randomBoy.rating || 4.6,
          vehicle: randomBoy.vehicle || 'Bike',
          estimatedArrival: '15 mins'
        } : {
          id: 'D000',
          name: 'Delivery Partner',
          phone: '+91 98765 43210',
          rating: 4.8,
          vehicle: 'Bike',
          estimatedArrival: '15 mins'
        };
        orders[idx].deliveryPartner = partner;

        if (randomBoy) {
          const userIdx = users.findIndex(u => u.id === randomBoy.id);
          if (userIdx !== -1) {
            users[userIdx].assignedOrders = (users[userIdx].assignedOrders || 0) + 1;
            writeUsers(users);
          }
        }
      }

      if (nextStatus === 'out_for_delivery' && orders[idx].deliveryPartner) {
        orders[idx].deliveryPartner.estimatedArrival = '10 mins';
      }

      if (nextStatus === 'delivered') {
        if (orders[idx].deliveryPartner) {
          const users = readUsers();
          const partnerIdx = users.findIndex(u => u.id === orders[idx].deliveryPartner.id);
          if (partnerIdx !== -1) {
            users[partnerIdx].deliveredOrders = (users[partnerIdx].deliveredOrders || 0) + 1;
            writeUsers(users);
          }
        }
      }
    }
    writeOrders(orders);
    res.json({ success: true, data: orders[idx] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route POST /api/orders/validate-coupon
const validateCoupon = (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code required' });
    
    const coupons = readCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
    if (!coupon.isActive) return res.status(400).json({ message: 'Coupon is inactive' });
    
    if (coupon.expiryDate) {
      const expiry = new Date(coupon.expiryDate);
      expiry.setHours(23, 59, 59, 999);
      if (new Date() > expiry) {
        return res.status(400).json({ message: 'Coupon has expired' });
      }
    }
    
    if (subtotal < coupon.minOrder)
      return res.status(400).json({ message: `Min order ₹${coupon.minOrder} required` });
      
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/orders/active-coupons
const getActiveCoupons = (req, res) => {
  try {
    const coupons = readCoupons();
    const active = coupons.filter(c => {
      if (!c.isActive) return false;
      if (c.expiryDate) {
        const expiry = new Date(c.expiryDate);
        expiry.setHours(23, 59, 59, 999);
        if (new Date() > expiry) return false;
      }
      return true;
    });
    res.json({ success: true, data: active });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, updateOrderStatus, validateCoupon, getActiveCoupons };