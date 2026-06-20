const express = require('express');
const router = express.Router();
const { 
  getDashboard, getAllOrders, getAllUsers, getAllRestaurants,
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  updateUserStatus,
  // Delivery handlers
  getDeliveryBoys, createDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, updateDeliveryBoyStatus, assignOrderToDeliveryBoy
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/dashboard', protect, adminOnly, getDashboard);
router.get('/orders', protect, adminOnly, getAllOrders);
router.get('/users', protect, adminOnly, getAllUsers);
router.patch('/users/:id/status', protect, adminOnly, updateUserStatus);
router.get('/restaurants', protect, adminOnly, getAllRestaurants);

// Delivery Boy Management routes
router.get('/delivery-boys', protect, adminOnly, getDeliveryBoys);
router.post('/delivery-boys', protect, adminOnly, createDeliveryBoy);
router.put('/delivery-boys/:id', protect, adminOnly, updateDeliveryBoy);
router.delete('/delivery-boys/:id', protect, adminOnly, deleteDeliveryBoy);
router.patch('/delivery-boys/:id/status', protect, adminOnly, updateDeliveryBoyStatus);
router.patch('/delivery-boys/:id/assign-order', protect, adminOnly, assignOrderToDeliveryBoy);

// Coupon Management routes
router.get('/coupons', protect, adminOnly, getCoupons);
router.post('/coupons', protect, adminOnly, createCoupon);
router.put('/coupons/:code', protect, adminOnly, updateCoupon);
router.delete('/coupons/:code', protect, adminOnly, deleteCoupon);

module.exports = router;

