const path = require('path');
const restaurants = require('../data/restaurants.json');

// @route GET /api/restaurants
const getRestaurants = (req, res) => {
  try {
    const { cuisine, sort, search } = req.query;
    let list = [...restaurants];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q)
      );
    }
    if (cuisine) {
      list = list.filter(r => r.cuisine.toLowerCase().includes(cuisine.toLowerCase()));
    }
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'delivery') list.sort((a, b) => parseInt(a.deliveryTime) - parseInt(b.deliveryTime));
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/restaurants/:id
const getRestaurantById = (req, res) => {
  try {
    const restaurant = restaurants.find(r => r.id === parseInt(req.params.id));
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json({ success: true, data: restaurant });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/restaurants/:id/menu
const getMenu = (req, res) => {
  try {
    const restaurant = restaurants.find(r => r.id === parseInt(req.params.id));
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json({ success: true, data: restaurant.menu });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/restaurants/search/items
const searchFoodItems = (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const query = q.toLowerCase();
    const results = [];
    restaurants.forEach(r => {
      r.menu.forEach(item => {
        if (item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)) {
          results.push({ ...item, restaurantName: r.name, restaurantId: r.id });
        }
      });
    });
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/restaurants/trending
const getTrending = (req, res) => {
  try {
    const trending = [...restaurants]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
    res.json({ success: true, data: trending });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getRestaurants, getRestaurantById, getMenu, searchFoodItems, getTrending };