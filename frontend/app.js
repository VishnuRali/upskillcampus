// ==================== STATE ====================
let currentUser = null;
let cart = [];
let orders = [];
let favorites = [];
let appliedCoupon = null;
let searchTimeout = null;
let currentRestaurant = null;
let trackingIntervals = {};
let RESTAURANTS = [];

// ==================== API SERVICE ====================
// Use absolute backend API base when frontend is served separately on a different port.
// When running frontend on http://localhost:8080 and backend on http://localhost:5000,
// set API_BASE to the backend base so fetches go to the correct origin.
const API_BASE = 'https://quickbite-backend-usab.onrender.com/api';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {};
  const token = localStorage.getItem('qb_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('No auth token found for request:', endpoint);
  }
  
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE}${endpoint}`;
  console.log('Request URL:', url);
  console.log('Request Method:', method);
  console.log('Request Headers:', headers);
  if (body) console.log('Request Body:', body);
  
  const config = {
    method,
    headers
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, config);
    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse JSON response from', url, 'raw response:', raw);
        throw new Error('Invalid response from server');
      }
    }
    console.log('Response:', { url, status: response.status, ok: response.ok, data });
    if (!response.ok) {
      if (response.status === 401 && currentUser) {
        logout();
      }
      throw new Error((data && data.message) ? data.message : 'Something went wrong');
    }
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

// ==================== INIT ====================
window.onload = async () => {
  loadFromStorage();
  const session = JSON.parse(localStorage.getItem('qb_session') || 'null');
  
  // First load restaurants from backend API to make sure they are available globally
  try {
    await loadRestaurants();
  } catch (err) {
    console.warn('Init restaurants fetch failed, using fallback.');
  }

  if (session) {
    currentUser = session;
    // Load fresh profile statistics
    try {
      await loadProfile();
    } catch (e) {
      console.warn('Init profile fetch failed.');
    }
    showMainApp();
  } else {
    goTo('auth');
  }
};

function loadFromStorage() {
  cart = JSON.parse(localStorage.getItem('qb_cart') || '[]');
  orders = JSON.parse(localStorage.getItem('qb_orders') || '[]');
  favorites = JSON.parse(localStorage.getItem('qb_favorites') || '[]');
}

function saveCart() { localStorage.setItem('qb_cart', JSON.stringify(cart)); }
function saveOrders() { localStorage.setItem('qb_orders', JSON.stringify(orders)); }
function saveFavorites() { localStorage.setItem('qb_favorites', JSON.stringify(favorites)); }

// ==================== AUTH ====================
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showToast('Please enter email and password', 'error'); return; }

  showLoading();
  try {
    const res = await apiRequest('/auth/login', 'POST', { email, password });
    if (res.success) {
      localStorage.setItem('qb_token', res.token);
      currentUser = res.user;
      localStorage.setItem('qb_session', JSON.stringify(currentUser));
      
      // Load user profile statistics and details
      await loadProfile();
      
      showMainApp();
      showToast(`Welcome back, ${currentUser.name}! 👋`, 'success');
    }
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  } finally {
    hideLoading();
  }
}

async function register() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  if (!name || !email || !phone || !password || !confirmPassword) { showToast('Please fill all fields', 'error'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  if (password !== confirmPassword) { showToast('Passwords must match', 'error'); return; }

  showLoading();
  try {
    const res = await apiRequest('/auth/register', 'POST', { name, email, phone, password, confirmPassword });
    if (res.success) {
      localStorage.setItem('qb_token', res.token);
      currentUser = res.user;
      localStorage.setItem('qb_session', JSON.stringify(currentUser));
      
      // Seed details locally
      currentUser.favorites = [];
      currentUser.addresses = [];
      
      showMainApp();
      showToast(`Account created! Welcome, ${name}! 🎉`, 'success');
    }
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
  } finally {
    hideLoading();
  }
}

function logout() {
  localStorage.removeItem('qb_session');
  localStorage.removeItem('qb_token');
  localStorage.removeItem('qb_cart');
  localStorage.removeItem('qb_orders');
  localStorage.removeItem('qb_favorites');
  currentUser = null;
  cart = [];
  orders = [];
  favorites = [];
  appliedCoupon = null;
  updateCartCount();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-page').classList.remove('hidden');
  showLogin();
  showToast('Logged out successfully', 'info');
}

function showLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('reg-form').classList.add('hidden');
}
function showRegister() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('reg-form').classList.remove('hidden');
}

function showMainApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('nav-uname').textContent = currentUser.name.split(' ')[0];
  
  const av = document.getElementById('nav-av');
  if (av) {
    av.textContent = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  
  if (currentUser.role === 'admin') {
    document.getElementById('admin-nav-link').classList.remove('hidden');
  } else {
    document.getElementById('admin-nav-link').classList.add('hidden');
  }
  
  updateCartCount();
  goTo('home');
}

function fillDemo(email, password) {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  if (emailInput && passwordInput) {
    emailInput.value = email;
    passwordInput.value = password;
  }
}

// ==================== NAVIGATION ====================
function goTo(page) {
  showPage(page);
}

function showPage(page) {
  if (page === 'auth') {
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    return;
  }
  
  // Hide all pages
  document.querySelectorAll('.pg').forEach(p => p.classList.add('hidden'));
  
  // Map page name to element ID
  let targetId = `pg-${page}`;
  if (page === 'restaurant-detail') {
    targetId = 'pg-rdetail';
  }
  
  const target = document.getElementById(targetId);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo(0, 0);
  }
  
  // Render page content
  switch(page) {
    case 'home':
      renderHome();
      break;
    case 'restaurants':
      loadRestaurants().then(() => renderRestaurants(RESTAURANTS));
      break;
    case 'cart':
      renderCart();
      break;
    case 'orders':
      loadOrders().then(() => renderOrders());
      break;
    case 'favorites':
      loadProfile().then(() => renderFavorites());
      break;
    case 'addresses':
      renderAddresses();
      break;
    case 'profile':
      loadProfile().then(() => renderProfile());
      break;
    case 'admin':
      renderAdmin();
      break;
  }
  closeUserMenu();
}

function toggleUMenu() {
  document.getElementById('umenu').classList.toggle('hidden');
}
function closeUserMenu() {
  const menu = document.getElementById('umenu');
  if (menu) menu.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-user-wrap')) closeUserMenu();
  if (!e.target.closest('.nav-search') && !e.target.closest('.hero-search-box')) {
    closeSearch();
  }
});

// ==================== HOME ====================
function renderHome() {
  if (RESTAURANTS.length === 0) return;
  
  // Trending restaurants (top 6 by rating)
  const trending = [...RESTAURANTS].sort((a,b) => b.rating - a.rating).slice(0, 6);
  const trendingGrid = document.getElementById('trending-grid');
  if (trendingGrid) {
    trendingGrid.innerHTML = trending.map(r => restaurantCard(r)).join('');
  }

  // Recommended food items
  const popularGrid = document.getElementById('popular-grid');
  if (popularGrid) {
    const allItems = RESTAURANTS.flatMap(r => r.menu.filter(m => m.popular).map(m => ({...m, restaurantName: r.name, restaurantId: r.id})));
    const recommended = allItems.sort(() => Math.random() - 0.5).slice(0, 8);
    popularGrid.innerHTML = recommended.map(item => foodCard(item)).join('');
  }
}

function restaurantCard(r) {
  const isFav = favorites.some(f => f.restaurantId === r.id);
  return `
  <div class="restaurant-card" onclick="openRestaurant(${r.id})" style="border: 1px solid var(--border-color); padding: 16px; border-radius: 16px; background: white; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; position: relative;">
    <div class="r-img" style="font-size: 54px; text-align: center; padding: 20px; background: var(--bg-light); border-radius: 12px; margin-bottom: 12px; position: relative;">
      ${r.emoji}
      <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavoriteRestaurant(${r.id})" style="position: absolute; top: 8px; right: 8px; border: none; background: white; width: 32px; height: 32px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center;">
        ${isFav ? '❤️' : '🤍'}
      </button>
      ${!r.isOpen ? '<div class="closed-badge" style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">CLOSED</div>' : ''}
    </div>
    <div class="r-info">
      <h3 style="font-size: 1.25rem; margin-bottom: 6px; font-weight: 700; color: var(--text-dark);">${r.name}</h3>
      <p class="r-cuisine" style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 12px;">${r.cuisine}</p>
      <div class="r-meta" style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-light); margin-bottom: 12px;">
        <span class="r-rating">⭐ ${r.rating} (${r.reviews?.toLocaleString()})</span>
        <span class="r-time">🕐 ${r.deliveryTime}</span>
      </div>
      <div class="r-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--bg-light); padding-top: 12px; flex-wrap: wrap; gap: 8px;">
        <span class="r-fee" style="font-weight: 600; font-size: 0.85rem; color: var(--primary);">${r.deliveryFee === 0 ? '🎉 Free Delivery' : `🛵 ₹${r.deliveryFee} delivery`}</span>
        ${r.tags && r.tags[0] ? `<span class="r-tag" style="background: var(--bg-light); color: var(--text-dark); font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; font-weight: 500;">${r.tags[0]}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function foodCard(item) {
  const inCart = cart.find(c => c.id === item.id);
  return `
  <div class="food-card" style="border: 1px solid var(--border-color); padding: 16px; border-radius: 16px; background: white; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
    <div class="food-emoji" style="font-size: 48px; text-align: center; padding: 16px; background: var(--bg-light); border-radius: 12px;">${item.emoji}</div>
    <div class="food-info" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
      <div>
        <h4 style="font-size: 1.1rem; margin-bottom: 4px; font-weight: 700;">${item.name}</h4>
        <p style="color: var(--text-light); font-size: 0.85rem; line-height: 1.3; margin-bottom: 6px;">${item.desc}</p>
        <p class="food-restaurant" style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">📍 ${item.restaurantName}</p>
      </div>
      <div class="food-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--bg-light); padding-top: 12px;">
        <span class="food-price" style="font-weight: 800; font-size: 1.15rem; color: var(--text-dark);">₹${item.price}</span>
        ${inCart 
          ? `<div class="qty-ctrl"><button onclick="updateQty(${item.id}, -1)">-</button><span>${inCart.qty}</span><button onclick="updateQty(${item.id}, 1)">+</button></div>`
          : `<button class="add-btn" onclick="addToCart(${JSON.stringify(item).replace(/"/g, '&quot;')})">+ Add</button>`
        }
      </div>
    </div>
  </div>`;
}

// ==================== RESTAURANTS ====================
async function loadRestaurants() {
  try {
    const res = await apiRequest('/restaurants');
    if (res.success) {
      RESTAURANTS = res.data;
    }
  } catch (err) {
    showToast('Failed to load restaurants from API, using fallback data', 'warning');
    RESTAURANTS = RESTAURANTS_DATA;
  }
}

function renderRestaurants(list) {
  const countEl = document.getElementById('r-count');
  if (countEl) countEl.textContent = `${list.length} restaurants available`;

  const grid = document.getElementById('all-r-grid');
  if (!grid) return;
  
  grid.innerHTML = list.length
    ? list.map(r => restaurantCard(r)).join('')
    : '<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-light);">😔 No restaurants found</div>';
}

function filterCat(cat) {
  showPage('restaurants');
  const cuisineSelect = document.getElementById('r-cuisine');
  if (cuisineSelect) {
    cuisineSelect.value = cat;
  }
  filterRestaurants();
}

async function filterRestaurants() {
  const search = document.getElementById('r-search')?.value || '';
  const sort = document.getElementById('r-sort')?.value || '';
  const cuisine = document.getElementById('r-cuisine')?.value || '';
  
  try {
    const res = await apiRequest(`/restaurants?search=${encodeURIComponent(search)}&sort=${sort}&cuisine=${encodeURIComponent(cuisine)}`);
    if (res.success) {
      renderRestaurants(res.data);
    }
  } catch (err) {
    // Local fallback search/filtering
    let list = [...RESTAURANTS];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q));
    }
    if (cuisine) {
      list = list.filter(r => r.cuisine.toLowerCase().includes(cuisine.toLowerCase()));
    }
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'delivery') list.sort((a, b) => parseInt(a.deliveryTime) - parseInt(b.deliveryTime));
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    renderRestaurants(list);
  }
}

async function openRestaurant(id) {
  showLoading();
  try {
    const res = await apiRequest(`/restaurants/${id}`);
    if (res.success) {
      currentRestaurant = res.data;
      showPage('restaurant-detail');
      renderRestaurantDetail();
    }
  } catch (err) {
    // local fallback
    currentRestaurant = RESTAURANTS.find(r => r.id === id);
    if (currentRestaurant) {
      showPage('restaurant-detail');
      renderRestaurantDetail();
    } else {
      showToast('Restaurant not found', 'error');
    }
  } finally {
    hideLoading();
  }
}

function renderRestaurantDetail() {
  const r = currentRestaurant;
  if (!r) return;
  const isFav = favorites.some(f => f.restaurantId === r.id);
  const categories = [...new Set(r.menu.map(m => m.category))];

  const content = document.getElementById('rdetail-content');
  if (!content) return;
  
  content.innerHTML = `
    <div class="rd-hero">${r.emoji}</div>
    <div class="rd-header">
      <div class="rd-title">
        <h1>${r.name} ${!r.isOpen ? '<span class="closed-tag">Closed</span>' : ''}</h1>
        <p>${r.cuisine}</p>
        <div class="rd-meta">
          <span>⭐ ${r.rating} (${r.reviews?.toLocaleString()} reviews)</span>
          <span>🕐 ${r.deliveryTime}</span>
          <span>🛵 ${r.deliveryFee === 0 ? 'Free Delivery' : '₹'+r.deliveryFee+' delivery'}</span>
          <span>📦 Min order: ₹${r.minOrder}</span>
        </div>
      </div>
      <button class="fav-big ${isFav ? 'active' : ''}" onclick="toggleFavoriteRestaurant(${r.id})">${isFav ? '❤️ Saved' : '🤍 Save'}</button>
    </div>
    <div class="rd-body">
      <aside class="menu-cats">
        ${categories.map(cat => `<div class="mc-item" onclick="scrollToCategory('${cat}')">${cat}</div>`).join('')}
      </aside>
      <section class="menu-content">
        ${categories.map(cat => `
          <div id="cat-${cat.replace(/\s/g,'-')}" class="menu-sec" style="scroll-margin-top: 100px;">
            <h3>${cat}</h3>
            ${r.menu.filter(m => m.category === cat).map(item => menuItemCard(item)).join('')}
          </div>
        `).join('')}
      </section>
    </div>`;
}

function menuItemCard(item) {
  const inCart = cart.find(c => c.id === item.id);
  return `
  <div class="menu-item-card" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color); padding: 16px; border-radius: 12px; background: white;">
    <div class="menu-item-info">
      <div class="menu-item-top">
        <h4 style="font-size: 1.1rem; margin-bottom: 6px;">${item.name} ${item.popular ? '<span class="popular-tag" style="font-size: 0.8rem; background: #fff3e0; color: #ff9800; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">🔥 Popular</span>' : ''}</h4>
      </div>
      <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 8px; max-width: 500px;">${item.desc}</p>
      <span class="food-price" style="font-weight: 700; font-size: 1.15rem; color: var(--primary);">₹${item.price}</span>
    </div>
    <div class="menu-item-right" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <div class="menu-emoji" style="font-size: 40px; margin-bottom: 8px;">${item.emoji}</div>
      ${inCart
        ? `<div class="qty-ctrl"><button onclick="updateQty(${item.id}, -1); renderRestaurantDetail()">-</button><span>${inCart.qty}</span><button onclick="updateQty(${item.id}, 1); renderRestaurantDetail()">+</button></div>`
        : `<button class="add-btn" onclick="addToCartFromMenu(${item.id})">+ Add</button>`
      }
    </div>
  </div>`;
}

function scrollToCategory(cat) {
  const el = document.getElementById(`cat-${cat.replace(/\s/g,'-')}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addToCartFromMenu(itemId) {
  const item = currentRestaurant.menu.find(m => m.id === itemId);
  if (item) {
    addToCart({...item, restaurantName: currentRestaurant.name, restaurantId: currentRestaurant.id});
    renderRestaurantDetail();
  }
}

// ==================== CART ====================
function addToCart(item) {
  if (!currentUser) { showToast('Please login first', 'error'); return; }
  // Check if from different restaurant
  if (cart.length > 0 && item.restaurantId && cart[0].restaurantId && cart[0].restaurantId !== item.restaurantId) {
    if (!confirm('Your cart has items from another restaurant. Clear cart and add this item?')) return;
    cart = [];
  }
  const existing = cart.find(c => c.id === item.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart();
  updateCartCount();
  showToast(`${item.name} added to cart! 🛒`, 'success');
}

function updateQty(itemId, delta) {
  const idx = cart.findIndex(c => c.id === itemId);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
  updateCartCount();
  renderCart();
}

function updateCartCount() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cbadge');
  if (badge) {
    badge.textContent = total;
    if (total > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  }
}

function renderCart() {
  const list = document.getElementById('cart-list');
  if (!list) return;
  
  if (cart.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 40px;">
        <span style="font-size: 64px;">🛒</span>
        <h3 style="font-size: 1.3rem; margin-top: 16px; margin-bottom: 8px;">Your cart is empty!</h3>
        <p style="color: var(--text-light); margin-bottom: 20px;">Add items from your favorite restaurants to place an order</p>
        <button class="btn-primary" onclick="goTo('restaurants')" style="padding: 10px 24px;">Browse Restaurants</button>
      </div>`;
    updateCartTotals();
    renderCartAddressChoices();
    return;
  }
  
  list.innerHTML = cart.map(item => `
    <div class="cart-item" style="display: flex; align-items: center; gap: 16px; border: 1px solid var(--border-color); padding: 16px; border-radius: 12px; margin-bottom: 12px; background: white;">
      <span class="cart-item-emoji" style="font-size: 36px;">${item.emoji}</span>
      <div class="cart-item-info" style="flex-grow: 1;">
        <h4 style="font-size: 1.05rem; margin-bottom: 4px;">${item.name}</h4>
        <p style="color: var(--text-light); font-size: 0.85rem;">₹${item.price} each</p>
      </div>
      <div class="qty-ctrl" style="display: flex; align-items: center; gap: 12px;">
        <button onclick="updateQty(${item.id}, -1)" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border-color); background: white; font-weight: bold; cursor: pointer;">-</button>
        <span style="font-weight: 600;">${item.qty}</span>
        <button onclick="updateQty(${item.id}, 1)" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border-color); background: white; font-weight: bold; cursor: pointer;">+</button>
      </div>
      <span class="cart-item-total" style="font-weight: 700; font-size: 1.1rem; width: 80px; text-align: right;">₹${item.price * item.qty}</span>
    </div>
  `).join('');
  
  updateCartTotals();
  renderCartAddressChoices();
  loadActiveCouponsForCheckout();
}

function updateCartTotals() {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const deliveryFee = subtotal >= 299 ? 0 : 39;
  const tax = Math.round(subtotal * 0.05);
  let discount = 0;
  
  if (appliedCoupon) {
    if (appliedCoupon.type === 'flat') discount = appliedCoupon.discount;
    else if (appliedCoupon.type === 'percent') discount = Math.round(subtotal * appliedCoupon.discount / 100);
    else if (appliedCoupon.type === 'delivery') discount = 0;
  }
  
  const hasDeliveryCoupon = appliedCoupon && appliedCoupon.type === 'delivery';
  const finalDeliveryFee = hasDeliveryCoupon ? 0 : deliveryFee;
  
  const total = subtotal + finalDeliveryFee + tax - discount;
  
  const sSub = document.getElementById('s-sub');
  if (sSub) sSub.textContent = `₹${subtotal}`;
  
  const sDel = document.getElementById('s-del');
  if (sDel) sDel.textContent = (subtotal >= 299 || hasDeliveryCoupon) ? '🎉 FREE' : `₹${deliveryFee}`;
  
  const sTax = document.getElementById('s-tax');
  if (sTax) sTax.textContent = `₹${tax}`;
  
  const sTotal = document.getElementById('s-total');
  if (sTotal) sTotal.textContent = `₹${Math.max(0, total)}`;
  
  const discRow = document.getElementById('disc-row');
  const sDisc = document.getElementById('s-disc');
  if (discRow && sDisc) {
    if (discount > 0 || hasDeliveryCoupon) {
      discRow.classList.remove('hidden');
      sDisc.textContent = hasDeliveryCoupon ? 'Free Delivery' : `-₹${discount}`;
    } else {
      discRow.classList.add('hidden');
    }
  }
}

async function applyCoupon() {
  const code = document.getElementById('coup-code').value.trim().toUpperCase();
  if (!code) {
    showToast('Please enter coupon code', 'error');
    return;
  }
  
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const msg = document.getElementById('coup-msg');
  
  try {
    const res = await apiRequest('/orders/validate-coupon', 'POST', {
      code,
      subtotal
    });
    
    if (res.success) {
      appliedCoupon = res.coupon; // code, discount, type, minOrder, desc
      msg.innerHTML = `<span class="success-msg" style="color: var(--success); font-weight: 500;">✅ ${res.coupon.desc}</span>`;
      updateCartTotals();
      showToast('Coupon applied! 🎉', 'success');
    }
  } catch (err) {
    msg.innerHTML = `<span class="error-msg" style="color: var(--primary); font-weight: 500;">❌ ${err.message}</span>`;
    appliedCoupon = null;
    updateCartTotals();
  }
}

async function loadActiveCouponsForCheckout() {
  const container = document.getElementById('active-coupons-list');
  if (!container) return;
  
  try {
    const res = await apiRequest('/orders/active-coupons');
    if (res.success && res.data && res.data.length > 0) {
      container.innerHTML = `
        <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #4b5563; margin-bottom: 6px;">Available Coupons</label>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${res.data.map(c => `
            <div class="active-coupon-item" onclick="applySelectedCoupon('${c.code}')" style="display: flex; justify-content: space-between; align-items: center; border: 1.5px dashed var(--border-color); padding: 8px 12px; border-radius: 8px; background: var(--bg-light); cursor: pointer; transition: all 0.2s;">
              <div>
                <span style="font-weight: 700; font-family: monospace; font-size: 0.9rem; color: var(--primary); background: #fee2e2; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.2);">${c.code}</span>
                <span style="font-size: 0.8rem; color: var(--text-light); margin-left: 6px;">${c.desc || ''}</span>
              </div>
              <span style="font-size: 0.8rem; font-weight: 600; color: var(--primary);">Apply</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      container.innerHTML = '';
    }
  } catch (err) {
    console.error('Failed to load active coupons for checkout:', err);
    container.innerHTML = '';
  }
}

async function applySelectedCoupon(code) {
  const input = document.getElementById('coup-code');
  if (input) {
    input.value = code;
    await applyCoupon();
  }
}

async function checkout() {
  if (cart.length === 0) { showToast('Your cart is empty!', 'error'); return; }
  const address = document.getElementById('del-addr').value.trim();
  if (!address) { showToast('Please enter delivery address', 'error'); return; }

  showLoading();
  try {
    const orderItems = cart.map(c => ({
      id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
      emoji: c.emoji,
      restaurantId: c.restaurantId,
      restaurantName: c.restaurantName
    }));
    
    const res = await apiRequest('/orders', 'POST', {
      items: orderItems,
      address,
      coupon: appliedCoupon ? appliedCoupon.code : null
    });
    
    if (res.success) {
      const order = res.data;
      
      // Add order to local memory & clear cart
      orders.unshift(order);
      saveOrders();
      
      cart = [];
      appliedCoupon = null;
      saveCart();
      updateCartCount();
      
      showToast(`Order placed successfully! ID: ${order.orderId} 🎉`, 'success');
      showNotification('Order Confirmed! 🎉', `Your order ${order.orderId} has been placed successfully!`);
      
      // Start real-time order tracking simulation
      startOrderTracking(order.orderId);
      showOrderTracking(order.orderId);
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ==================== ORDER TRACKING ====================
function startOrderTracking(orderId) {
  // Clear any existing interval for this order
  if (trackingIntervals[orderId]) {
    clearInterval(trackingIntervals[orderId]);
  }
  
  // Advance order status every 12 seconds
  trackingIntervals[orderId] = setInterval(async () => {
    try {
      const res = await apiRequest(`/orders/${orderId}/status`, 'PUT');
      if (res.success) {
        const updatedOrder = res.data;
        
        // Sync local orders list
        const idx = orders.findIndex(o => o.orderId === orderId);
        if (idx !== -1) {
          orders[idx] = updatedOrder;
          saveOrders();
        }
        
        const statusMap = {
          placed: { icon: '📝', label: 'Order Placed' },
          accepted: { icon: '👍', label: 'Order Accepted' },
          preparing: { icon: '🍳', label: 'Preparing Food' },
          assigned: { icon: '🧑‍🍳', label: 'Assigned to Delivery Boy' },
          out_for_delivery: { icon: '🛵', label: 'Out for Delivery' },
          delivered: { icon: '🎉', label: 'Delivered' }
        };
        
        const statusDetails = statusMap[updatedOrder.status] || { icon: '📦', label: updatedOrder.status };
        showToast(`${statusDetails.icon} Status Update: ${statusDetails.label}`, 'info');
        
        // Re-render live order tracking view if currently open
        const trackingPage = document.getElementById('pg-tracking');
        if (trackingPage && !trackingPage.classList.contains('hidden')) {
          showOrderTracking(orderId);
        }
        
        // If delivered, stop interval
        if (updatedOrder.status === 'delivered') {
          clearInterval(trackingIntervals[orderId]);
          delete trackingIntervals[orderId];
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err.message);
    }
  }, 12000); // 12 seconds per state transition
}

async function showOrderTracking(orderId) {
  showPage('tracking');
  const trackingBody = document.getElementById('tracking-body');
  if (!trackingBody) return;
  
  trackingBody.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p>Fetching order tracking details...</p></div>`;
  
  try {
    const res = await apiRequest(`/orders/${orderId}`);
    if (res.success) {
      const order = res.data;
      
      const ORDER_STATUSES_L = [
        { key: 'placed', icon: '📝', label: 'Order Placed', desc: 'Your order has been received' },
        { key: 'accepted', icon: '👍', label: 'Order Accepted', desc: 'Restaurant has accepted your order' },
        { key: 'preparing', icon: '🍳', label: 'Preparing Food', desc: 'Our chef is preparing your meal' },
        { key: 'assigned', icon: '🧑‍🍳', label: 'Assigned to Delivery Boy', desc: 'A delivery partner has been assigned to your order' },
        { key: 'out_for_delivery', icon: '🛵', label: 'Out for Delivery', desc: 'Your delivery partner is on the way with your food' },
        { key: 'delivered', icon: '🎉', label: 'Delivered', desc: 'Enjoy your delicious meal!' }
      ];
      
      trackingBody.innerHTML = `
        <div class="tracking-header section" style="margin-bottom: 24px;">
          <button class="btn-outline" onclick="goTo('orders')" style="margin-bottom: 16px;">← Back to Orders</button>
          <h1 style="font-size: 1.8rem; margin-bottom: 12px;">Live Order Tracking 🛵</h1>
          <div class="tracking-id-box" style="background: var(--bg-light); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
            <p style="margin-bottom: 4px;">Order ID: <b style="font-family: monospace; font-size: 1rem;">${order.orderId}</b></p>
            <p style="margin-bottom: 4px;">Estimated Time: <b>${order.estimatedTime}</b></p>
            <p>Placed: <b>${formatDate(order.createdAt)}</b></p>
          </div>
        </div>
        <div class="section">
          <div class="tracking-timeline" style="display: flex; flex-direction: column; gap: 24px; position: relative; margin-top: 24px;">
            ${ORDER_STATUSES_L.map((status, idx) => {
              const isActive = idx <= order.statusIndex;
              const isCurrent = idx === order.statusIndex;
              return `
                <div class="tracking-step" style="display: flex; align-items: flex-start; gap: 16px; position: relative; opacity: ${isActive ? 1 : 0.4};">
                  <div class="step-icon" style="font-size: 24px; width: 44px; height: 44px; border-radius: 50%; background: ${isCurrent ? 'var(--primary)' : (isActive ? 'var(--success-light)' : '#e0e0e0')}; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid ${isCurrent ? 'var(--primary-light)' : 'transparent'}; box-shadow: 0 4px 6px rgba(0,0,0,0.05); z-index: 2;">
                    ${status.icon}
                  </div>
                  <div class="step-info" style="flex-grow: 1; margin-top: 2px;">
                    <h4 style="font-size: 1.05rem; margin-bottom: 4px; font-weight: ${isCurrent ? '700' : '600'}; color: ${isCurrent ? 'var(--primary)' : 'var(--text-dark)'};">${status.label}</h4>
                    <p style="color: var(--text-light); font-size: 0.9rem;">${status.desc}</p>
                  </div>
                  ${idx < ORDER_STATUSES_L.length - 1 ? `
                    <div class="step-line" style="position: absolute; left: 20px; top: 44px; bottom: -24px; width: 4px; background: ${idx < order.statusIndex ? 'var(--success)' : '#e0e0e0'}; z-index: 1;"></div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
          <div class="tracking-items section" style="margin-top: 32px; border-top: 2px dashed var(--border-color); padding-top: 24px;">
            <h3 style="font-size: 1.25rem; margin-bottom: 16px;">Order Items</h3>
            <div style="background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
              ${order.items.map(i => `
                <div class="order-item-row" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--bg-light);">
                  <span>${i.emoji} ${i.name} x${i.qty}</span>
                  <span style="font-weight: 600;">₹${i.price * i.qty}</span>
                </div>
              `).join('')}
              <div class="order-item-row total-row" style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; font-weight: 700; font-size: 1.1rem; border-top: 2px solid var(--border-color);">
                <span>Total</span>
                <span style="color: var(--primary);">₹${order.total}</span>
              </div>
            </div>
          </div>
        </div>`;
    }
  } catch (err) {
    trackingBody.innerHTML = `<div class="empty-state" style="text-align: center; padding: 40px; color: var(--primary);">❌ Failed to load tracking details: ${err.message}</div>`;
  }
}

// ==================== ORDERS ====================
async function loadOrders() {
  try {
    const res = await apiRequest('/orders');
    if (res.success) {
      orders = res.data;
      saveOrders();
    }
  } catch (err) {
    showToast('Failed to load orders from API, using cached data', 'warning');
  }
}

function renderOrders() {
  const list = document.getElementById('orders-body');
  if (!list) return;
  
  if (!orders || orders.length === 0) {
    list.innerHTML = `<div class="empty-state" style="text-align:center; padding:40px;">📦 No orders yet!<br><br><button class="btn-primary" onclick="showPage('home')">Order Now</button></div>`;
    return;
  }
  
  const ORDER_STATUS_DETAILS = {
    confirmed: { icon: '📝', label: 'Confirmed' },
    accepted: { icon: '👍', label: 'Accepted' },
    preparing: { icon: '🍳', label: 'Preparing' },
    packed: { icon: '📦', label: 'Packed' },
    pickup: { icon: '🛵', label: 'Out for Delivery' },
    delivered: { icon: '🎉', label: 'Delivered' }
  };
  
  list.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 24px;">
      ${orders.map(o => {
        const details = ORDER_STATUS_DETAILS[o.status] || { icon: '📦', label: o.status };
        return `
          <div class="order-card" style="border: 1px solid var(--border-color); padding: 20px; border-radius: 16px; background: white; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 style="font-size: 1.2rem; margin-bottom: 4px;">${o.restaurantName}</h3>
                <p class="order-id" style="color: var(--text-light); font-size: 0.85rem; font-family: monospace;">ID: ${o.orderId}</p>
                <p class="order-date" style="color: var(--text-light); font-size: 0.85rem;">${formatDate(o.createdAt)}</p>
              </div>
              <div class="order-status-badge status-${o.status}" style="background: var(--primary-light); color: var(--primary); padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <span>${details.icon}</span> <span>${details.label}</span>
              </div>
            </div>
            <div class="order-items-preview" style="color: var(--text-light); font-size: 0.95rem; border-top: 1px solid var(--bg-light); border-bottom: 1px solid var(--bg-light); padding: 10px 0;">
              ${o.items.slice(0,3).map(i => `<span>${i.emoji} ${i.name} x${i.qty}</span>`).join(' · ')}
              ${o.items.length > 3 ? ` +${o.items.length - 3} more` : ''}
            </div>
            <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 4px;">
              <span class="order-total" style="font-weight: 800; font-size: 1.25rem; color: var(--text-dark);">Total: ₹${o.total}</span>
              <div class="order-actions" style="display: flex; gap: 10px;">
                <button class="btn-outline" onclick="showOrderTracking('${o.orderId}')" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem;">Track Order</button>
                <button class="btn-outline" onclick="reorder('${o.orderId}')" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem;">Reorder</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function reorder(orderId) {
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;
  cart = order.items.map(i => ({...i}));
  saveCart();
  updateCartCount();
  showToast('Items added to cart! 🛒', 'success');
  goTo('cart');
}

// ==================== FAVORITES ====================
async function toggleFavoriteRestaurant(restaurantId) {
  if (!currentUser) { showToast('Please login first', 'error'); return; }
  
  // Find restaurant name and emoji
  const restaurant = RESTAURANTS.find(r => r.id === restaurantId);
  if (!restaurant) return;
  
  try {
    const res = await apiRequest('/users/favorites', 'POST', {
      restaurantId,
      name: restaurant.name,
      emoji: restaurant.emoji
    });
    
    if (res.success) {
      showToast(res.message, 'success');
      // Update favorites list locally
      if (res.action === 'added') {
        favorites.push({ restaurantId, name: restaurant.name, emoji: restaurant.emoji });
      } else {
        favorites = favorites.filter(f => f.restaurantId !== restaurantId);
      }
      saveFavorites();
      
      // Update page if we are currently viewing it
      if (!document.getElementById('pg-favorites').classList.contains('hidden')) {
        renderFavorites();
      }
      // Re-render restaurant detail to update save button status
      if (!document.getElementById('pg-rdetail').classList.contains('hidden')) {
        renderRestaurantDetail();
      }
      // Re-render home page
      if (!document.getElementById('pg-home').classList.contains('hidden')) {
        renderHome();
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderFavorites() {
  const list = document.getElementById('favs-body');
  if (!list) return;
  if (!favorites || favorites.length === 0) {
    list.innerHTML = `<div class="empty-state" style="text-align:center; padding: 40px;">❤️ No favorites yet!<br><br><button class="btn-primary" onclick="showPage('restaurants')">Browse Restaurants</button></div>`;
    return;
  }
  
  list.innerHTML = `
    <div class="favs-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 24px;">
      ${favorites.map(f => `
        <div class="fav-card" onclick="openRestaurant(${f.restaurantId})" style="display: flex; align-items: center; gap: 16px; border: 1px solid var(--border-color); padding: 16px; border-radius: 16px; background: white; cursor: pointer; position: relative;">
          <span class="fav-emoji" style="font-size: 40px;">${f.emoji}</span>
          <div>
            <h3 style="font-size: 1.15rem; margin-bottom: 4px;">${f.name}</h3>
            <p style="color: var(--text-light); font-size: 0.9rem;">Tap to view menu</p>
          </div>
          <button class="remove-fav" onclick="event.stopPropagation(); toggleFavoriteRestaurant(${f.restaurantId})" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 1.1rem; cursor: pointer;">❌</button>
        </div>
      `).join('')}
    </div>`;
}

// ==================== ADDRESSES ====================
function renderAddresses() {
  const list = document.getElementById('addrs-list');
  if (!list) return;
  
  if (!currentUser.addresses || currentUser.addresses.length === 0) {
    list.innerHTML = `<p style="color: var(--text-light); margin-bottom: 24px;">No saved addresses yet.</p>`;
    renderCartAddressChoices();
    return;
  }
  
  list.innerHTML = currentUser.addresses.map(a => `
    <div class="address-item" style="border: 1px solid var(--border-color); padding: 16px; border-radius: 12px; margin-bottom: 12px; background: white; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h4 style="margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
          <span>${a.label}</span>
          ${a.isDefault ? '<span class="default-badge" style="font-size: 0.8rem; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 12px;">Default</span>' : ''}
        </h4>
        <p style="color: var(--text-light); font-size: 0.95rem;">${a.address}</p>
      </div>
      <button class="btn-outline" onclick="selectAddress('${a.address.replace(/'/g, "\\'")}')" style="padding: 6px 12px; font-size: 0.85rem;">Use Address</button>
    </div>
  `).join('');
  
  // Also populate address suggestions in cart page
  renderCartAddressChoices();
}

function selectAddress(addr) {
  const input = document.getElementById('del-addr');
  if (input) {
    input.value = addr;
    showToast('Address selected!', 'info');
    goTo('cart');
  }
}

function renderCartAddressChoices() {
  const div = document.getElementById('saved-addrs');
  if (!div) return;
  
  if (!currentUser.addresses || currentUser.addresses.length === 0) {
    div.innerHTML = '';
    return;
  }
  
  div.innerHTML = `
    <div style="margin-top: 12px; font-size: 0.9rem; color: var(--text-light);">
      <p style="margin-bottom: 8px; font-weight: 500;">Or select from saved addresses:</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${currentUser.addresses.map(a => `
          <button type="button" class="btn-outline" onclick="document.getElementById('del-addr').value = \`${a.address.replace(/"/g, '&quot;')}\`" style="text-align: left; padding: 8px 12px; font-size: 0.85rem; border-radius: 8px; width: 100%;">
            <b>${a.label}</b>: ${a.address.substring(0, 50)}${a.address.length > 50 ? '...' : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

async function saveAddress() {
  const label = document.getElementById('addr-label').value.trim();
  const addressText = document.getElementById('addr-text').value.trim();
  const isDefault = document.getElementById('addr-default').checked;
  
  if (!label || !addressText) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  showLoading();
  try {
    const res = await apiRequest('/users/addresses', 'POST', {
      label,
      address: addressText,
      isDefault
    });
    
    if (res.success) {
      showToast('Address saved successfully!', 'success');
      // Update local current user data
      currentUser.addresses = res.data;
      localStorage.setItem('qb_session', JSON.stringify(currentUser));
      
      // Reset form
      document.getElementById('addr-label').value = '';
      document.getElementById('addr-text').value = '';
      document.getElementById('addr-default').checked = false;
      
      renderAddresses();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ==================== PROFILE ====================
async function loadProfile() {
  try {
    const res = await apiRequest('/users/profile');
    if (res.success) {
      // Sync currentUser favorites & addresses & stats
      currentUser.favorites = res.data.favorites || [];
      currentUser.addresses = res.data.addresses || [];
      currentUser.totalOrders = res.data.totalOrders || 0;
      currentUser.totalSpent = res.data.totalSpent || 0;
      localStorage.setItem('qb_session', JSON.stringify(currentUser));
      
      favorites = currentUser.favorites;
      saveFavorites();
    }
  } catch (err) {
    console.error('Failed to load profile:', err.message);
  }
}

function renderProfile() {
  document.getElementById('p-name').textContent = currentUser.name;
  document.getElementById('p-email').textContent = currentUser.email;
  document.getElementById('p-role').textContent = currentUser.role === 'admin' ? '⚙️ Admin' : '👤 User';
  
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('p-av').textContent = initials;
  
  document.getElementById('ps-orders').textContent = currentUser.totalOrders || 0;
  document.getElementById('ps-favs').textContent = favorites.length;
  document.getElementById('ps-spent').textContent = `₹${currentUser.totalSpent || 0}`;
}

// ==================== ADMIN ====================
async function renderAdmin() {
  if (currentUser.role !== 'admin') { goTo('home'); return; }
  
  showLoading();
  try {
    const res = await apiRequest('/admin/dashboard');
    if (res.success) {
      const data = res.data;
      
      document.getElementById('a-orders').textContent = data.totalOrders;
      document.getElementById('a-users').textContent = data.totalUsers;
      document.getElementById('a-restaurants').textContent = data.totalRestaurants;
      document.getElementById('a-revenue').textContent = `₹${data.totalRevenue.toLocaleString()}`;
      
      // Render recent orders
      const list = document.getElementById('a-orders-list');
      if (data.recentOrders && data.recentOrders.length > 0) {
        list.innerHTML = data.recentOrders.map(o => `
          <div class="admin-order-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color); font-size: 0.95rem;">
            <span style="font-weight: 600; font-family: monospace;">${o.orderId}</span>
            <span style="color: var(--text-light);">${o.restaurantName}</span>
            <span style="font-weight: 700;">₹${o.total}</span>
            <span class="status-badge" style="background: var(--primary-light); color: var(--primary); padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${o.status}</span>
          </div>
        `).join('');
      } else {
        list.innerHTML = `<p style="padding: 12px; color: var(--text-light);">No orders placed yet.</p>`;
      }
      
      // Render top items
      const topList = document.getElementById('a-top-items');
      if (data.topItems && data.topItems.length > 0) {
        topList.innerHTML = data.topItems.map(item => `
          <div class="top-item-row" style="display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-color); font-size: 0.95rem;">
            <span>${item.name}</span>
            <span style="font-weight: 600; color: var(--primary);">${item.qty} orders</span>
          </div>
        `).join('');
      } else {
        topList.innerHTML = `<p style="padding: 12px; color: var(--text-light);">No items sold yet.</p>`;
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ==================== ADMIN SUB-TABS & COUPON MANAGEMENT ====================
let adminCoupons = [];
let adminDeliveryBoys = [];

function switchAdminTab(tab) {
  const btnOverview = document.getElementById('btn-admin-overview');
  const btnCoupons = document.getElementById('btn-admin-coupons');
  const btnUsers = document.getElementById('btn-admin-users');
  const btnDelivery = document.getElementById('btn-admin-delivery');
  const viewOverview = document.getElementById('admin-overview');
  const viewCoupons = document.getElementById('admin-coupons');
  const viewUsers = document.getElementById('admin-users');
  const viewDelivery = document.getElementById('admin-delivery');

  [btnOverview, btnCoupons, btnUsers, btnDelivery].forEach(b => b?.classList.remove('active'));
  [viewOverview, viewCoupons, viewUsers, viewDelivery].forEach(v => v?.classList.add('hidden'));

  if (tab === 'overview') {
    btnOverview.classList.add('active');
    viewOverview.classList.remove('hidden');
    renderAdmin();
  } else if (tab === 'coupons') {
    btnCoupons.classList.add('active');
    viewCoupons.classList.remove('hidden');
    loadAdminCoupons();
  } else if (tab === 'users') {
    btnUsers.classList.add('active');
    viewUsers.classList.remove('hidden');
    loadAdminUsers();
  } else if (tab === 'delivery') {
    btnDelivery.classList.add('active');
    viewDelivery.classList.remove('hidden');
    loadAdminDeliveryBoys();
  }
}

async function loadAdminCoupons() {
  const list = document.getElementById('admin-coupons-list');
  if (!list) return;
  list.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;"><div class="spinner" style="width:24px; height:24px; margin:auto;"></div></td></tr>`;
  
  try {
    const res = await apiRequest('/admin/coupons');
    if (res.success) {
      adminCoupons = res.data;
      renderAdminCoupons();
    }
  } catch (err) {
    list.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--primary);">❌ Failed to load coupons: ${err.message}</td></tr>`;
  }
}

async function loadAdminDeliveryBoys() {
  const list = document.getElementById('admin-delivery-list');
  if (list) list.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px;"><div class="spinner" style="width:24px; height:24px; margin:auto;"></div></td></tr>`;
  try {
    const res = await apiRequest('/admin/delivery-boys');
    console.log('Delivery API Response:', res);
    if (res.success) {
      adminDeliveryBoys = res.data;
      updateDeliveryStatsCards();
      renderAdminDeliveryBoys();
    }
  } catch (err) {
    if (list) list.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: var(--primary);">❌ Failed to load delivery partners: ${err.message}</td></tr>`;
  }
}

function updateDeliveryStatsCards() {
  const total = adminDeliveryBoys.length;
  const active = adminDeliveryBoys.filter(u => u.status === 'active').length;
  const inactive = total - active;
  const elTotal = document.getElementById('d-total-count');
  const elActive = document.getElementById('d-active-count');
  const elInactive = document.getElementById('d-inactive-count');
  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elInactive) elInactive.textContent = inactive;
}

function renderAdminDeliveryBoys() {
  const tbody = document.getElementById('admin-delivery-list');
  if (!tbody) return;
  if (adminDeliveryBoys.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-light);">No delivery partners found.</td></tr>`;
    return;
  }
  tbody.innerHTML = adminDeliveryBoys.map(u => {
    const status = u.status || 'active';
    const isActive = status === 'active';
    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 14px 16px; font-weight: 600;">${u.name}</td>
        <td style="padding: 14px 16px; color: var(--text-light);">${u.email}</td>
        <td style="padding: 14px 16px; color: var(--text-light);">${u.phone || '—'}</td>
        <td style="padding: 14px 16px;">${u.vehicle || 'Bike'}</td>
        <td style="padding: 14px 16px;">${u.rating?.toFixed?.(1) ?? u.rating ?? '—'}</td>
        <td style="padding: 14px 16px;">${u.assignedOrders ?? 0}</td>
        <td style="padding: 14px 16px;">${u.deliveredOrders ?? 0}</td>
        <td style="padding: 14px 16px;"><span style="padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: ${isActive ? '#d1fae5' : '#f3f4f6'}; color: ${isActive ? '#10b981' : '#6b7280'};">${isActive ? 'Active' : 'Inactive'}</span></td>
        <td style="padding: 14px 16px; text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
            <button onclick="editDeliveryBoy('${u.id}')" class="btn-outline" style="padding: 4px 10px; font-size: 0.75rem;">Edit</button>
            <button onclick="toggleDeliveryBoyStatus('${u.id}', '${status}')" class="btn-outline" style="padding: 4px 10px; font-size: 0.75rem; border-color: ${isActive ? '#9ca3af' : '#10b981'}; color: ${isActive ? '#4b5563' : '#10b981'};">${isActive ? 'Deactivate' : 'Activate'}</button>
            <button onclick="deleteDeliveryBoy('${u.id}')" class="btn-outline" style="padding: 4px 10px; font-size: 0.75rem; border-color: var(--primary); color: var(--primary);">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openDeliveryBoyModal(id = '') {
  const modal = document.getElementById('delivery-boy-modal');
  const title = document.getElementById('delivery-boy-modal-title');
  const form = document.getElementById('delivery-boy-form');
  form.reset();
  document.getElementById('delivery-boy-id').value = '';
  document.getElementById('delivery-boy-password').required = !id;
  if (id) {
    title.textContent = '🛵 Edit Delivery Partner';
    const partner = adminDeliveryBoys.find(d => d.id === id);
    if (partner) {
      document.getElementById('delivery-boy-id').value = partner.id;
      document.getElementById('delivery-boy-name').value = partner.name;
      document.getElementById('delivery-boy-email').value = partner.email;
      document.getElementById('delivery-boy-phone').value = partner.phone;
      document.getElementById('delivery-boy-vehicle').value = partner.vehicle || 'Bike';
      document.getElementById('delivery-boy-rating').value = partner.rating || 4.5;
      document.getElementById('delivery-boy-status').value = partner.status || 'active';
    }
  } else {
    title.textContent = '🛵 Add Delivery Partner';
    document.getElementById('delivery-boy-status').value = 'active';
    document.getElementById('delivery-boy-rating').value = 4.5;
  }
  if (modal) modal.classList.remove('hidden');
}

function closeDeliveryBoyModal() {
  const modal = document.getElementById('delivery-boy-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleDeliveryBoySubmit(e) {
  e.preventDefault();
  const id = document.getElementById('delivery-boy-id').value;
  const name = document.getElementById('delivery-boy-name').value.trim();
  const email = document.getElementById('delivery-boy-email').value.trim();
  const phone = document.getElementById('delivery-boy-phone').value.trim();
  const vehicle = document.getElementById('delivery-boy-vehicle').value.trim();
  const rating = Number(document.getElementById('delivery-boy-rating').value) || 4.5;
  const status = document.getElementById('delivery-boy-status').value;
  const password = document.getElementById('delivery-boy-password').value;

  if (!name || !email || !phone) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  // Frontend duplicate check against currently loaded delivery partners
  const duplicate = adminDeliveryBoys.find(u => {
    if (id && u.id === id) return false; // allow same record when editing
    return (u.email || '').toLowerCase() === email.toLowerCase() || (u.phone || '') === phone;
  });
  if (duplicate) {
    showToast('Delivery Partner already exists', 'error');
    return;
  }

  showLoading();
  try {
    const payload = { name, email, phone, vehicle, rating, status };
    if (password) payload.password = password;

    let res;
    if (id) {
      res = await apiRequest(`/admin/delivery-boys/${id}`, 'PUT', payload);
    } else {
      if (!password) {
        showToast('Password is required for new delivery partners', 'error');
        return;
      }
      res = await apiRequest('/admin/delivery-boys', 'POST', payload);
    }

    if (res.success) {
      showToast(res.message || 'Delivery partner saved successfully', 'success');
      closeDeliveryBoyModal();
      loadAdminDeliveryBoys();
    }
  } catch (err) {
    showToast(err.message || 'Failed to save partner', 'error');
  } finally {
    hideLoading();
  }
}

async function editDeliveryBoy(id) {
  openDeliveryBoyModal(id);
}

async function deleteDeliveryBoy(id) {
  if (!confirm('Remove this delivery partner? This cannot be undone.')) return;
  showLoading();
  try {
    const res = await apiRequest(`/admin/delivery-boys/${id}`, 'DELETE');
    if (res.success) {
      showToast(res.message || 'Delivery partner removed', 'success');
      loadAdminDeliveryBoys();
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete partner', 'error');
  } finally {
    hideLoading();
  }
}

async function toggleDeliveryBoyStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  showLoading();
  try {
    const res = await apiRequest(`/admin/delivery-boys/${id}/status`, 'PATCH', { status: newStatus });
    if (res.success) {
      showToast(res.message || 'Status updated', 'success');
      loadAdminDeliveryBoys();
    }
  } catch (err) {
    showToast(err.message || 'Failed to update status', 'error');
  } finally {
    hideLoading();
  }
}

function renderAdminCoupons() {
  const list = document.getElementById('admin-coupons-list');
  if (!list) return;
  
  if (adminCoupons.length === 0) {
    list.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-light); text-align: center;">No coupons available. Click "+ Add New Coupon" to create one.</td></tr>`;
    return;
  }
  
  list.innerHTML = adminCoupons.map(c => {
    let isExpired = false;
    if (c.expiryDate) {
      const expiry = new Date(c.expiryDate);
      expiry.setHours(23, 59, 59, 999);
      if (new Date() > expiry) isExpired = true;
    }
    
    const statusText = isExpired ? 'Expired' : (c.isActive ? 'Active' : 'Inactive');
    const statusColor = isExpired ? '#ef4444' : (c.isActive ? '#10b981' : '#6b7280');
    const statusBg = isExpired ? '#fee2e2' : (c.isActive ? '#d1fae5' : '#f3f4f6');
    
    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 14px 16px; font-weight: 700; font-family: monospace; font-size: 0.95rem;">${c.code}</td>
        <td style="padding: 14px 16px; color: var(--text-light);">${c.desc || '-'}</td>
        <td style="padding: 14px 16px; font-weight: 600;">${c.type === 'delivery' ? 'Free Delivery' : (c.type === 'percent' ? c.discount + '%' : '₹' + c.discount)}</td>
        <td style="padding: 14px 16px; color: var(--text-light);">₹${c.minOrder || 0}</td>
        <td style="padding: 14px 16px; color: ${isExpired ? '#ef4444' : 'var(--text-light)'}; font-weight: ${isExpired ? '600' : 'normal'};">${c.expiryDate ? formatDateShort(c.expiryDate) : 'Never'}</td>
        <td style="padding: 14px 16px;">
          <span class="c-status-badge" style="padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; color: ${statusColor}; background: ${statusBg};">${statusText}</span>
        </td>
        <td style="padding: 14px 16px; text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
            <button onclick="toggleCoupon(${JSON.stringify(c.code).replace(/"/g, '&quot;')}, ${c.isActive})" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem; border-color: ${c.isActive ? '#9ca3af' : '#10b981'}; color: ${c.isActive ? '#4b5563' : '#10b981'}; min-width: 64px;">
              ${c.isActive ? 'Disable' : 'Enable'}
            </button>
            <button onclick="editCoupon(${JSON.stringify(c.code).replace(/"/g, '&quot;')})" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;">Edit</button>
            <button onclick="deleteCoupon(${JSON.stringify(c.code).replace(/"/g, '&quot;')})" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--primary); color: var(--primary);">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function openCouponModal(code = '') {
  const modal = document.getElementById('coupon-modal');
  const title = document.getElementById('coupon-modal-title');
  const form = document.getElementById('coupon-form');
  
  form.reset();
  document.getElementById('coupon-old-code').value = '';
  document.getElementById('coupon-code-input').disabled = false;
  
  if (code) {
    const c = adminCoupons.find(x => x.code === code);
    if (c) {
      title.textContent = '🎫 Edit Coupon';
      document.getElementById('coupon-old-code').value = c.code;
      document.getElementById('coupon-code-input').value = c.code;
      document.getElementById('coupon-code-input').disabled = true;
      document.getElementById('coupon-type-input').value = c.type;
      document.getElementById('coupon-discount-input').value = c.discount;
      document.getElementById('coupon-min-order-input').value = c.minOrder || 0;
      document.getElementById('coupon-expiry-input').value = c.expiryDate || '';
      document.getElementById('coupon-desc-input').value = c.desc || '';
      document.getElementById('coupon-active-input').checked = c.isActive;
      adjustDiscountPlaceholder();
    }
  } else {
    title.textContent = '🎫 Add New Coupon';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 30);
    document.getElementById('coupon-expiry-input').value = tomorrow.toISOString().split('T')[0];
    adjustDiscountPlaceholder();
  }
  
  modal.classList.remove('hidden');
}

function closeCouponModal() {
  document.getElementById('coupon-modal').classList.add('hidden');
}

function adjustDiscountPlaceholder() {
  const type = document.getElementById('coupon-type-input').value;
  const unit = document.getElementById('discount-unit');
  const input = document.getElementById('coupon-discount-input');
  
  if (type === 'percent') {
    unit.textContent = '%';
    input.placeholder = '20';
    input.disabled = false;
    input.required = true;
  } else if (type === 'delivery') {
    unit.textContent = '₹';
    input.value = '39';
    input.placeholder = '39';
    input.disabled = true;
    input.required = false;
  } else {
    unit.textContent = '₹';
    input.placeholder = '50';
    input.disabled = false;
    input.required = true;
  }
}

async function handleCouponSubmit(e) {
  e.preventDefault();
  
  const oldCode = document.getElementById('coupon-old-code').value;
  const code = document.getElementById('coupon-code-input').value.trim().toUpperCase();
  const type = document.getElementById('coupon-type-input').value;
  let discount = Number(document.getElementById('coupon-discount-input').value || 0);
  if (type === 'delivery') discount = 39;
  const minOrder = Number(document.getElementById('coupon-min-order-input').value || 0);
  const expiryDate = document.getElementById('coupon-expiry-input').value;
  const desc = document.getElementById('coupon-desc-input').value.trim();
  const isActive = document.getElementById('coupon-active-input').checked;
  
  const body = { type, discount, minOrder, expiryDate, isActive, desc };
  
  showLoading();
  try {
    let res;
    if (oldCode) {
      res = await apiRequest(`/admin/coupons/${oldCode}`, 'PUT', body);
    } else {
      body.code = code;
      res = await apiRequest('/admin/coupons', 'POST', body);
    }
    
    if (res.success) {
      showToast(res.message || 'Coupon saved successfully!', 'success');
      closeCouponModal();
      loadAdminCoupons();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function toggleCoupon(code, currentStatus) {
  showLoading();
  try {
    const res = await apiRequest(`/admin/coupons/${code}`, 'PUT', {
      isActive: !currentStatus
    });
    if (res.success) {
      showToast(`Coupon ${!currentStatus ? 'enabled' : 'disabled'}!`, 'success');
      loadAdminCoupons();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function editCoupon(code) {
  openCouponModal(code);
}

async function deleteCoupon(code) {
  if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;
  
  showLoading();
  try {
    const res = await apiRequest(`/admin/coupons/${code}`, 'DELETE');
    if (res.success) {
      showToast('Coupon deleted successfully', 'success');
      loadAdminCoupons();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ==================== ADMIN USER MANAGEMENT ====================
let adminUsers = [];

async function loadAdminUsers() {
  const list = document.getElementById('admin-users-list');
  if (list) list.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;"><div class="spinner" style="width:24px; height:24px; margin:auto;"></div></td></tr>`;

  try {
    const res = await apiRequest('/admin/users');
    if (res.success) {
      adminUsers = res.data;
      updateUserStatsCards();
      filterAdminUsers();
    }
  } catch (err) {
    if (list) list.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--primary);">❌ Failed to load users: ${err.message}</td></tr>`;
  }
}

function updateUserStatsCards() {
  const total = adminUsers.length;
  const active = adminUsers.filter(u => (u.status || 'active') === 'active').length;
  const inactive = total - active;

  const elTotal = document.getElementById('u-total-count');
  const elActive = document.getElementById('u-active-count');
  const elInactive = document.getElementById('u-inactive-count');
  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elInactive) elInactive.textContent = inactive;
}

function filterAdminUsers() {
  const q = (document.getElementById('user-search-input')?.value || '').toLowerCase().trim();
  const role = document.getElementById('user-role-filter')?.value || '';

  let list = [...adminUsers];
  if (q) {
    list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  if (role) {
    list = list.filter(u => u.role === role);
  }
  renderAdminUsers(list);
}

function renderAdminUsers(list) {
  const tbody = document.getElementById('admin-users-list');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-light);">😔 No users found</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => {
    const status = u.status || 'active';
    const isActive = status === 'active';
    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const roleStyle = u.role === 'admin' ? { bg: '#fce4ec', color: '#c2185b' } : { bg: '#e3f2fd', color: '#1565c0' };

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 14px 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: var(--primary-gradient); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;">${initials}</div>
            <span style="font-weight: 600;">${u.name}</span>
          </div>
        </td>
        <td style="padding: 14px 16px; color: var(--text-light);">${u.email}</td>
        <td style="padding: 14px 16px; color: var(--text-light);">${u.phone || '—'}</td>
        <td style="padding: 14px 16px;">
          <span style="padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: ${roleStyle.bg}; color: ${roleStyle.color}; text-transform: capitalize;">${u.role}</span>
        </td>
        <td style="padding: 14px 16px; color: var(--text-light);">${formatDateShort(u.createdAt)}</td>
        <td style="padding: 14px 16px; font-weight: 700; text-align: center;">${u.totalOrders ?? 0}</td>
        <td style="padding: 14px 16px;">
          <span style="padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: ${isActive ? '#d1fae5' : '#f3f4f6'}; color: ${isActive ? '#10b981' : '#6b7280'};">${isActive ? 'Active' : 'Inactive'}</span>
        </td>
        <td style="padding: 14px 16px; text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button onclick="viewUserDetails('${u.id}')" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;">View</button>
            <button onclick="toggleUserStatus('${u.id}', '${status}')" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem; border-color: ${isActive ? '#9ca3af' : '#10b981'}; color: ${isActive ? '#4b5563' : '#10b981'}; min-width: 80px;">${isActive ? 'Deactivate' : 'Activate'}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleUserStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const confirmMsg = newStatus === 'active'
    ? 'Activate this user? They will be able to log in again.'
    : 'Deactivate this user? They will not be able to log in until reactivated.';
  if (!confirm(confirmMsg)) return;

  showLoading();
  try {
    const res = await apiRequest(`/admin/users/${id}/status`, 'PATCH', { status: newStatus });
    if (res.success) {
      showToast(res.message || 'User status updated', 'success');
      const idx = adminUsers.findIndex(u => u.id === id);
      if (idx !== -1) adminUsers[idx].status = newStatus;
      updateUserStatsCards();
      filterAdminUsers();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function viewUserDetails(id) {
  const u = adminUsers.find(x => x.id === id);
  if (!u) return;

  const status = u.status || 'active';
  const isActive = status === 'active';
  const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const body = document.getElementById('user-details-body');
  body.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
      <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--primary-gradient); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; flex-shrink: 0;">${initials}</div>
      <div>
        <h3 style="font-size: 1.2rem; font-weight: 800;">${u.name}</h3>
        <span style="padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: ${isActive ? '#d1fae5' : '#f3f4f6'}; color: ${isActive ? '#10b981' : '#6b7280'};">${isActive ? 'Active' : 'Inactive'}</span>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--bg-light); padding-bottom: 8px;"><span style="color: var(--text-light);">📧 Email</span><span style="font-weight: 600;">${u.email}</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--bg-light); padding-bottom: 8px;"><span style="color: var(--text-light);">📱 Phone</span><span style="font-weight: 600;">${u.phone || 'Not provided'}</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--bg-light); padding-bottom: 8px;"><span style="color: var(--text-light);">🏷️ Role</span><span style="font-weight: 600; text-transform: capitalize;">${u.role}</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--bg-light); padding-bottom: 8px;"><span style="color: var(--text-light);">📅 Joined</span><span style="font-weight: 600;">${formatDateShort(u.createdAt)}</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--bg-light); padding-bottom: 8px;"><span style="color: var(--text-light);">📦 Total Orders</span><span style="font-weight: 600;">${u.totalOrders ?? 0}</span></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--bg-light); padding-bottom: 8px;"><span style="color: var(--text-light);">💰 Total Spent</span><span style="font-weight: 600;">₹${u.totalSpent ?? 0}</span></div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 4px;"><span style="color: var(--text-light);">📍 Saved Addresses</span><span style="font-weight: 600;">${(u.addresses || []).length}</span></div>
    </div>
  `;

  document.getElementById('user-details-modal').classList.remove('hidden');
}

function closeUserDetailsModal() {
  document.getElementById('user-details-modal').classList.add('hidden');
}

// ==================== SEARCH ====================
function liveSearch(val) {
  clearTimeout(searchTimeout);
  if (!val || val.length < 2) {
    document.getElementById('search-drop').classList.add('hidden');
    return;
  }
  
  searchTimeout = setTimeout(async () => {
    try {
      const dropdown = document.getElementById('search-drop');
      const q = val.toLowerCase();
      
      // Search items via API
      const res = await apiRequest(`/restaurants/search/items?q=${encodeURIComponent(q)}`);
      if (res.success) {
        const matchedItems = res.data; // array of items with restaurantId, restaurantName
        
        // Also match restaurants locally
        const matchedRestaurants = RESTAURANTS.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)).slice(0, 3);
        
        if (matchedRestaurants.length === 0 && matchedItems.length === 0) {
          dropdown.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-light);">😔 No results for "${val}"</div>`;
          dropdown.classList.remove('hidden');
          return;
        }
        
        dropdown.innerHTML = `
          ${matchedRestaurants.length ? `<div style="padding: 8px 12px; font-weight: 700; font-size: 0.85rem; background: var(--bg-light); color: var(--text-light); text-transform: uppercase;">🍽️ Restaurants</div>` : ''}
          ${matchedRestaurants.map(r => `
            <div class="search-item" onclick="openRestaurant(${r.id}); closeSearch()" style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer; transition: background 0.2s;">
              <span style="font-size: 24px;">${r.emoji}</span>
              <div>
                <b style="font-size: 0.95rem; color: var(--text-dark);">${r.name}</b>
                <p style="margin: 0; font-size: 0.8rem; color: var(--text-light);">${r.cuisine}</p>
              </div>
            </div>
          `).join('')}
          ${matchedItems.length ? `<div style="padding: 8px 12px; font-weight: 700; font-size: 0.85rem; background: var(--bg-light); color: var(--text-light); text-transform: uppercase;">🍕 Dishes</div>` : ''}
          ${matchedItems.map(i => `
            <div class="search-item" onclick="openRestaurant(${i.restaurantId}); closeSearch()" style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer; transition: background 0.2s;">
              <span style="font-size: 24px;">${i.emoji}</span>
              <div>
                <b style="font-size: 0.95rem; color: var(--text-dark);">${i.name}</b>
                <p style="margin: 0; font-size: 0.8rem; color: var(--text-light);">${i.restaurantName} · ₹${i.price}</p>
              </div>
            </div>
          `).join('')}
        `;
        dropdown.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Search error:', err.message);
    }
  }, 300);
}

function closeSearch() {
  const drop = document.getElementById('search-drop');
  if (drop) drop.classList.add('hidden');
  const nsearch = document.getElementById('nsearch');
  if (nsearch) nsearch.value = '';
}

// ==================== NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `${icons[type] || ''} ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function showNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

// ==================== LOADING ====================
function showLoading() { 
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.classList.remove('hidden'); 
}
function hideLoading() { 
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.classList.add('hidden'); 
}

// ==================== UTILS ====================
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}