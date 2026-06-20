const express = require('express');
const router = express.Router();
const {
  getRestaurants, getRestaurantById,
  getMenu, searchFoodItems, getTrending
} = require('../controllers/restaurantController');

router.get('/', getRestaurants);
router.get('/trending', getTrending);
router.get('/search/items', searchFoodItems);
router.get('/:id', getRestaurantById);
router.get('/:id/menu', getMenu);

module.exports = router;
