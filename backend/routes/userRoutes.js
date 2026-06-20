const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, toggleFavorite, saveAddress } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/favorites', protect, toggleFavorite);
router.post('/addresses', protect, saveAddress);

module.exports = router;
