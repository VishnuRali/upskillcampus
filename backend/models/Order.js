const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: Number,
  qty: Number,
  emoji: String,
  restaurantName: String,
  restaurantId: Number
});

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: String,
  items: [orderItemSchema],
  subtotal: Number,
  deliveryFee: Number,
  tax: Number,
  discount: { type: Number, default: 0 },
  total: Number,
  address: { type: String, required: true },
  restaurantName: String,
  coupon: { type: String, default: null },
  status: {
    type: String,
    enum: ['confirmed', 'accepted', 'preparing', 'packed', 'pickup', 'delivered', 'cancelled'],
    default: 'confirmed'
  },
  statusIndex: { type: Number, default: 0 },
  estimatedTime: { type: String, default: '30-45 min' },
  paymentMethod: { type: String, default: 'COD' },
  paymentStatus: { type: String, default: 'pending' }
}, { timestamps: true });

// Auto-generate unique order ID before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    this.orderId = `QB-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
