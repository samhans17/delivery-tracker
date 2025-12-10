// Global state
let currentTab = 'dashboard';
let routes = [];
let products = [];
let entries = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initializeDateSelectors();
  setupFormListeners();
});

// Check authentication status
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();

    if (data.authenticated) {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboardScreen').classList.remove('hidden');
      document.getElementById('welcomeText').textContent = `Welcome, ${data.username}`;
      loadAllData();
    } else {
      document.getElementById('loginScreen').classList.remove('hidden');
      document.getElementById('dashboardScreen').classList.add('hidden');
    }
  } catch (err) {
    console.error('Auth check failed:', err);
  }
}

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      checkAuth();
    } else {
      errorDiv.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    errorDiv.textContent = 'Connection error';
  }
});

// Logout
async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  checkAuth();
}

// Initialize date selectors
function initializeDateSelectors() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Month selector
  const monthSelect = document.getElementById('statsMonth');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  months.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index + 1;
    option.textContent = month;
    if (index + 1 === currentMonth) option.selected = true;
    monthSelect.appendChild(option);
  });

  // Year selector
  const yearSelect = document.getElementById('statsYear');
  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }

  // Set default date in entry form
  document.getElementById('entryDate').valueAsDate = currentDate;
}

// Tab switching
function showTab(tabName) {
  currentTab = tabName;

  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');

  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

  // Show selected tab
  const tabMap = {
    'dashboard': 'dashboardTab',
    'entries': 'entriesTab',
    'routes': 'routesTab',
    'products': 'productsTab'
  };

  document.getElementById(tabMap[tabName]).classList.remove('hidden');

  // Load data for the tab
  if (tabName === 'dashboard') loadStats();
  if (tabName === 'entries') loadEntries();
  if (tabName === 'routes') loadRoutes();
  if (tabName === 'products') loadProducts();
}

// Load all data
function loadAllData() {
  loadStats();
  loadRoutes();
  loadProducts();
  loadEntries();
}

// ============= DASHBOARD / STATS =============

async function loadStats() {
  const month = document.getElementById('statsMonth').value;
  const year = document.getElementById('statsYear').value;

  try {
    const res = await fetch(`/api/stats/monthly?month=${month}&year=${year}`);
    const data = await res.json();

    document.getElementById('statTotalEntries').textContent = data.total_entries || 0;
    document.getElementById('statTotalTons').textContent = (data.total_tons || 0).toFixed(2);
    document.getElementById('statTotalRevenue').textContent = `Rs ${(data.total_revenue || 0).toLocaleString()}`;
    document.getElementById('statAvgRate').textContent = `Rs ${(data.avg_rate || 0).toLocaleString()}`;

    // Product breakdown table
    const tbody = document.querySelector('#productBreakdownTable tbody');
    tbody.innerHTML = '';

    if (data.product_breakdown && data.product_breakdown.length > 0) {
      data.product_breakdown.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.count}</td>
          <td>${item.total_tons.toFixed(2)}</td>
          <td>Rs ${item.total_revenue.toLocaleString()}</td>
        `;
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No data available</td></tr>';
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// ============= ROUTES MANAGEMENT =============

async function loadRoutes() {
  try {
    const res = await fetch('/api/routes');
    routes = await res.json();

    // Update routes table
    const tbody = document.querySelector('#routesTable tbody');
    tbody.innerHTML = '';

    routes.forEach(route => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${route.name}</td>
        <td>${route.description || '-'}</td>
        <td>
          <button class="btn-edit" onclick="editRoute(${route.id})">Edit</button>
          <button class="btn-danger" onclick="deleteRoute(${route.id})">Delete</button>
        </td>
      `;
    });

    // Update route dropdown in entry form
    updateRouteDropdown();
  } catch (err) {
    console.error('Failed to load routes:', err);
  }
}

function updateRouteDropdown() {
  const select = document.getElementById('entryRoute');
  select.innerHTML = '<option value="">Select a route</option>';
  routes.forEach(route => {
    const option = document.createElement('option');
    option.value = route.id;
    option.textContent = route.name;
    select.appendChild(option);
  });
}

function showAddRouteForm() {
  document.getElementById('routeFormContainer').classList.remove('hidden');
  document.getElementById('routeFormTitle').textContent = 'Add New Route';
  document.getElementById('routeForm').reset();
  document.getElementById('routeId').value = '';
}

function cancelRouteForm() {
  document.getElementById('routeFormContainer').classList.add('hidden');
}

function editRoute(id) {
  const route = routes.find(r => r.id === id);
  if (!route) return;

  document.getElementById('routeFormContainer').classList.remove('hidden');
  document.getElementById('routeFormTitle').textContent = 'Edit Route';
  document.getElementById('routeId').value = route.id;
  document.getElementById('routeName').value = route.name;
  document.getElementById('routeDescription').value = route.description || '';
}

async function deleteRoute(id) {
  if (!confirm('Are you sure you want to delete this route?')) return;

  try {
    const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadRoutes();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  } catch (err) {
    alert('Failed to delete route');
  }
}

// ============= PRODUCTS MANAGEMENT =============

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    products = await res.json();

    // Update products table
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';

    products.forEach(product => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${product.name}</td>
        <td>Rs ${product.price_per_ton.toLocaleString()}</td>
        <td>
          <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
          <button class="btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
        </td>
      `;
    });

    // Update product dropdown in entry form
    updateProductDropdown();
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

function updateProductDropdown() {
  const select = document.getElementById('entryProduct');
  select.innerHTML = '<option value="">Select a product</option>';
  products.forEach(product => {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = `${product.name} (Rs ${product.price_per_ton}/ton)`;
    select.appendChild(option);
  });
}

function showAddProductForm() {
  document.getElementById('productFormContainer').classList.remove('hidden');
  document.getElementById('productFormTitle').textContent = 'Add New Product';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
}

function cancelProductForm() {
  document.getElementById('productFormContainer').classList.add('hidden');
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById('productFormContainer').classList.remove('hidden');
  document.getElementById('productFormTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productPrice').value = product.price_per_ton;
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadProducts();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  } catch (err) {
    alert('Failed to delete product');
  }
}

// ============= ENTRIES MANAGEMENT =============

async function loadEntries() {
  try {
    const res = await fetch('/api/entries');
    entries = await res.json();

    // Update entries table
    const tbody = document.querySelector('#entriesTable tbody');
    tbody.innerHTML = '';

    entries.forEach(entry => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${entry.entry_date}</td>
        <td>${entry.car_number}</td>
        <td>${entry.route_name}</td>
        <td>${entry.product_name}</td>
        <td>${entry.quantity_tons.toFixed(2)}</td>
        <td>Rs ${entry.calculated_rate.toLocaleString()}</td>
        <td>
          <button class="btn-edit" onclick="editEntry(${entry.id})">Edit</button>
          <button class="btn-danger" onclick="deleteEntry(${entry.id})">Delete</button>
        </td>
      `;
    });
  } catch (err) {
    console.error('Failed to load entries:', err);
  }
}

function showAddEntryForm() {
  document.getElementById('entryFormContainer').classList.remove('hidden');
  document.getElementById('entryFormTitle').textContent = 'Add New Entry';
  document.getElementById('entryForm').reset();
  document.getElementById('entryId').value = '';
  document.getElementById('entryCalculatedRate').value = '';
  document.getElementById('entryDate').valueAsDate = new Date();
}

function cancelEntryForm() {
  document.getElementById('entryFormContainer').classList.add('hidden');
}

function editEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  // Find the route and product IDs from the loaded data
  const route = routes.find(r => r.name === entry.route_name);
  const product = products.find(p => p.name === entry.product_name);

  document.getElementById('entryFormContainer').classList.remove('hidden');
  document.getElementById('entryFormTitle').textContent = 'Edit Entry';
  document.getElementById('entryId').value = entry.id;
  document.getElementById('entryCarNumber').value = entry.car_number;
  document.getElementById('entryDate').value = entry.entry_date;
  document.getElementById('entryRoute').value = route ? route.id : '';
  document.getElementById('entryProduct').value = product ? product.id : '';
  document.getElementById('entryQuantity').value = entry.quantity_tons;
  document.getElementById('entryCalculatedRate').value = `Rs ${entry.calculated_rate.toLocaleString()}`;
}

async function deleteEntry(id) {
  if (!confirm('Are you sure you want to delete this entry?')) return;

  try {
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadEntries();
      loadStats();
    } else {
      alert('Failed to delete entry');
    }
  } catch (err) {
    alert('Failed to delete entry');
  }
}

// Calculate rate preview when quantity or product changes
function updateRatePreview() {
  const productId = document.getElementById('entryProduct').value;
  const quantity = parseFloat(document.getElementById('entryQuantity').value) || 0;

  if (productId && quantity > 0) {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      const rate = quantity * product.price_per_ton;
      document.getElementById('entryCalculatedRate').value = `Rs ${rate.toLocaleString()}`;
    }
  } else {
    document.getElementById('entryCalculatedRate').value = '';
  }
}

// ============= FORM SUBMISSIONS =============

function setupFormListeners() {
  // Route form
  document.getElementById('routeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('routeId').value;
    const data = {
      name: document.getElementById('routeName').value,
      description: document.getElementById('routeDescription').value
    };

    try {
      const url = id ? `/api/routes/${id}` : '/api/routes';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        cancelRouteForm();
        loadRoutes();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (err) {
      alert('Failed to save route');
    }
  });

  // Product form
  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const data = {
      name: document.getElementById('productName').value,
      price_per_ton: parseFloat(document.getElementById('productPrice').value)
    };

    try {
      const url = id ? `/api/products/${id}` : '/api/products';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        cancelProductForm();
        loadProducts();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (err) {
      alert('Failed to save product');
    }
  });

  // Entry form
  document.getElementById('entryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('entryId').value;
    const data = {
      car_number: document.getElementById('entryCarNumber').value,
      route_id: parseInt(document.getElementById('entryRoute').value),
      product_id: parseInt(document.getElementById('entryProduct').value),
      quantity_tons: parseFloat(document.getElementById('entryQuantity').value),
      entry_date: document.getElementById('entryDate').value
    };

    try {
      const url = id ? `/api/entries/${id}` : '/api/entries';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        cancelEntryForm();
        loadEntries();
        loadStats();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (err) {
      alert('Failed to save entry');
    }
  });

  // Real-time rate calculation
  document.getElementById('entryProduct').addEventListener('change', updateRatePreview);
  document.getElementById('entryQuantity').addEventListener('input', updateRatePreview);
}
