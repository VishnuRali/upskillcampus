const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: Number,
  desc: String,
  category: String,
  emoji: String,
  popular: { type: Boolean, default: false }
});

const restaurantSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  name: String,
  emoji: String,
  cuisine: String,
  rating: Number,
  reviews: Number,
  deliveryTime: String,
  deliveryFee: Number,
  minOrder: Number,
  tags: [String],
  isOpen: { type: Boolean, default: true },
  menu: [menuItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
