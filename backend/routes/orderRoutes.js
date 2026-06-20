const express = require('express');
const router = express.Router();
const {
  createOrder, getMyOrders,
  getOrderById, updateOrderStatus, validateCoupon, getActiveCoupons
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);
router.post('/validate-coupon', validateCoupon);
router.get('/active-coupons', getActiveCoupons);
router.get('/:orderId', protect, getOrderById);
router.put('/:orderId/status', protect, updateOrderStatus);

module.exports = router;
