// Global state
let currentTab = 'dashboard';
let routes = [];
let products = [];
let cars = [];
let entries = [];
let expenseTypes = [];
let expenses = [];

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

  // Initialize expense filter date selectors
  const expenseFilterMonth = document.getElementById('expenseFilterMonth');
  const expenseFilterYear = document.getElementById('expenseFilterYear');

  months.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index + 1;
    option.textContent = month;
    if (index + 1 === currentMonth) option.selected = true;
    expenseFilterMonth.appendChild(option);
  });

  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    expenseFilterYear.appendChild(option);
  }
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
    'products': 'productsTab',
    'cars': 'carsTab',
    'expenses': 'expensesTab',
    'pricing': 'pricingTab'
  };

  document.getElementById(tabMap[tabName]).classList.remove('hidden');

  // Load data for the tab
  if (tabName === 'dashboard') loadStats();
  if (tabName === 'entries') loadEntries();
  if (tabName === 'routes') loadRoutes();
  if (tabName === 'products') loadProducts();
  if (tabName === 'cars') loadCars();
  if (tabName === 'expenses') loadExpenses();
  if (tabName === 'pricing') loadPricingManagement();
}

// Load all data
function loadAllData() {
  loadStats();
  loadRoutes();
  loadProducts();
  loadCars();
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

async function updateProductDropdown(routeId = null) {
  const select = document.getElementById('entryProduct');
  select.innerHTML = '<option value="">Select a product</option>';

  if (!routeId) {
    // No route selected - show placeholder
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Please select a route first';
    option.disabled = true;
    select.appendChild(option);
    return;
  }

  try {
    // Fetch only available products for selected route
    const res = await fetch(`/api/products/available/${routeId}`);
    const availableProducts = await res.json();

    availableProducts.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      const priceLabel = product.effective_price !== product.base_price
        ? `Rs ${product.effective_price}/ton (route price)`
        : `Rs ${product.base_price}/ton`;
      option.textContent = `${product.name} (${priceLabel})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load available products:', err);
  }
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

// ============= CARS MANAGEMENT =============

async function loadCars() {
  try {
    const res = await fetch('/api/cars');
    cars = await res.json();

    // Update cars table
    const tbody = document.querySelector('#carsTable tbody');
    tbody.innerHTML = '';

    cars.forEach(car => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${car.car_number}</td>
        <td>${car.description || '-'}</td>
        <td class="actions">
          <button onclick="editCar(${car.id})" class="btn-small">Edit</button>
          <button onclick="deleteCar(${car.id})" class="btn-small btn-danger">Delete</button>
        </td>
      `;
    });

    // Update car dropdown in entry form
    updateCarDropdown();
  } catch (err) {
    console.error('Failed to load cars:', err);
  }
}

function updateCarDropdown() {
  const select = document.getElementById('entryCarNumber');
  select.innerHTML = '<option value="">Select a car</option>';
  cars.forEach(car => {
    const option = document.createElement('option');
    option.value = car.id;
    option.textContent = car.car_number;
    select.appendChild(option);
  });
}

function showAddCarForm() {
  document.getElementById('carFormContainer').classList.remove('hidden');
  document.getElementById('carFormTitle').textContent = 'Add New Car';
  document.getElementById('carForm').reset();
  document.getElementById('carId').value = '';
}

function cancelCarForm() {
  document.getElementById('carFormContainer').classList.add('hidden');
}

function editCar(id) {
  const car = cars.find(c => c.id === id);
  if (!car) return;

  document.getElementById('carFormContainer').classList.remove('hidden');
  document.getElementById('carFormTitle').textContent = 'Edit Car';
  document.getElementById('carId').value = car.id;
  document.getElementById('carNumber').value = car.car_number;
  document.getElementById('carDescription').value = car.description || '';
}

async function deleteCar(id) {
  if (!confirm('Are you sure you want to delete this car?')) return;

  try {
    const res = await fetch(`/api/cars/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadCars();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  } catch (err) {
    alert('Failed to delete car');
  }
}

// ============= EXPENSES MANAGEMENT =============

async function loadExpenseTypes() {
  try {
    const res = await fetch('/api/expense-types');
    expenseTypes = await res.json();
    updateExpenseTypeDropdown();
  } catch (err) {
    console.error('Failed to load expense types:', err);
  }
}

function updateExpenseTypeDropdown() {
  // Update expense form dropdown
  const formSelect = document.getElementById('expenseType');
  formSelect.innerHTML = '<option value="">Select expense type</option>';
  expenseTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.id;
    option.textContent = type.name;
    formSelect.appendChild(option);
  });

  // Update filter dropdown
  const filterSelect = document.getElementById('expenseFilterType');
  filterSelect.innerHTML = '<option value="">All Types</option>';
  expenseTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.id;
    option.textContent = type.name;
    filterSelect.appendChild(option);
  });
}

function updateExpenseCarDropdown() {
  // Update expense form dropdown
  const formSelect = document.getElementById('expenseCar');
  formSelect.innerHTML = '<option value="">Select a car</option>';
  cars.forEach(car => {
    const option = document.createElement('option');
    option.value = car.id;
    option.textContent = car.car_number;
    formSelect.appendChild(option);
  });

  // Update filter dropdown
  const filterSelect = document.getElementById('expenseFilterCar');
  filterSelect.innerHTML = '<option value="">All Cars</option>';
  cars.forEach(car => {
    const option = document.createElement('option');
    option.value = car.id;
    option.textContent = car.car_number;
    filterSelect.appendChild(option);
  });
}

async function loadExpenses() {
  // Ensure we have expense types and cars loaded
  if (expenseTypes.length === 0) await loadExpenseTypes();
  if (cars.length === 0) await loadCars();

  updateExpenseCarDropdown();
  updateExpenseTypeDropdown();

  try {
    const carId = document.getElementById('expenseFilterCar').value;
    const month = document.getElementById('expenseFilterMonth').value;
    const year = document.getElementById('expenseFilterYear').value;
    const typeId = document.getElementById('expenseFilterType').value;

    let url = '/api/expenses?';
    const params = [];
    if (carId) params.push(`car_id=${carId}`);
    if (month && year) {
      params.push(`month=${month}`);
      params.push(`year=${year}`);
    }
    if (typeId) params.push(`expense_type_id=${typeId}`);

    url += params.join('&');

    const res = await fetch(url);
    expenses = await res.json();

    // Update expenses table
    const tbody = document.querySelector('#expensesTable tbody');
    tbody.innerHTML = '';

    expenses.forEach(expense => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${expense.expense_date}</td>
        <td>${expense.car_number}</td>
        <td>${expense.expense_type_name}</td>
        <td>Rs ${parseFloat(expense.amount).toLocaleString()}</td>
        <td>${expense.description || '-'}</td>
        <td>
          <button class="btn-edit" onclick="editExpense(${expense.id})">Edit</button>
          <button class="btn-danger" onclick="deleteExpense(${expense.id})">Delete</button>
        </td>
      `;
    });

    // Load expense statistics
    loadExpenseStats();
  } catch (err) {
    console.error('Failed to load expenses:', err);
  }
}

async function loadExpenseStats() {
  try {
    const carId = document.getElementById('expenseFilterCar').value;
    const month = document.getElementById('expenseFilterMonth').value;
    const year = document.getElementById('expenseFilterYear').value;

    let url = '/api/stats/expenses?';
    const params = [];
    if (carId) params.push(`car_id=${carId}`);
    if (month && year) {
      params.push(`month=${month}`);
      params.push(`year=${year}`);
    }

    url += params.join('&');

    const res = await fetch(url);
    const data = await res.json();

    // Update summary cards
    document.getElementById('expenseTotalCount').textContent = data.total_expenses || 0;
    document.getElementById('expenseTotalAmount').textContent = `Rs ${(data.total_amount || 0).toLocaleString()}`;
    document.getElementById('expenseAvgAmount').textContent = `Rs ${(data.avg_amount || 0).toLocaleString()}`;

    // Update type breakdown table
    const typeBody = document.querySelector('#expenseTypeBreakdownTable tbody');
    typeBody.innerHTML = '';

    if (data.type_breakdown && data.type_breakdown.length > 0) {
      data.type_breakdown.forEach(item => {
        const row = typeBody.insertRow();
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.count}</td>
          <td>Rs ${parseFloat(item.total_amount).toLocaleString()}</td>
        `;
      });
    } else {
      typeBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">No data available</td></tr>';
    }

    // Update car breakdown table
    const carBody = document.querySelector('#expenseCarBreakdownTable tbody');
    carBody.innerHTML = '';

    if (data.car_breakdown && data.car_breakdown.length > 0) {
      data.car_breakdown.forEach(item => {
        const row = carBody.insertRow();
        row.innerHTML = `
          <td>${item.car_number}</td>
          <td>${item.count}</td>
          <td>Rs ${parseFloat(item.total_amount).toLocaleString()}</td>
        `;
      });
    } else {
      carBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">No data available</td></tr>';
    }
  } catch (err) {
    console.error('Failed to load expense stats:', err);
  }
}

function showAddExpenseForm() {
  document.getElementById('expenseFormContainer').classList.remove('hidden');
  document.getElementById('expenseFormTitle').textContent = 'Add New Expense';
  document.getElementById('expenseForm').reset();
  document.getElementById('expenseId').value = '';
  document.getElementById('expenseDate').valueAsDate = new Date();
}

function cancelExpenseForm() {
  document.getElementById('expenseFormContainer').classList.add('hidden');
}

function editExpense(id) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;

  document.getElementById('expenseFormContainer').classList.remove('hidden');
  document.getElementById('expenseFormTitle').textContent = 'Edit Expense';
  document.getElementById('expenseId').value = expense.id;
  document.getElementById('expenseCar').value = expense.car_id;
  document.getElementById('expenseType').value = expense.expense_type_id;
  document.getElementById('expenseAmount').value = expense.amount;
  document.getElementById('expenseDescription').value = expense.description || '';
  document.getElementById('expenseDate').value = expense.expense_date;
}

async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;

  try {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadExpenses();
    } else {
      alert('Failed to delete expense');
    }
  } catch (err) {
    alert('Failed to delete expense');
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
  document.getElementById('entryCarNumber').value = entry.car_id || '';
  document.getElementById('entryDate').value = entry.entry_date;
  document.getElementById('entryRoute').value = route ? route.id : '';

  // Update product dropdown for selected route
  if (route) {
    updateProductDropdown(route.id);
  }

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
async function updateRatePreview() {
  const productId = document.getElementById('entryProduct').value;
  const routeId = document.getElementById('entryRoute').value;
  const quantity = parseFloat(document.getElementById('entryQuantity').value) || 0;

  if (productId && routeId && quantity > 0) {
    try {
      const res = await fetch(`/api/products/available/${routeId}`);
      const availableProducts = await res.json();
      const product = availableProducts.find(p => p.id === parseInt(productId));

      if (product) {
        const rate = quantity * product.effective_price;
        document.getElementById('entryCalculatedRate').value = `Rs ${rate.toLocaleString()}`;
      }
    } catch (err) {
      console.error('Failed to calculate rate:', err);
      document.getElementById('entryCalculatedRate').value = '';
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
        const result = await res.json();

        if (!id) {
          // New route - optionally configure pricing
          const configure = confirm(
            `Route "${data.name}" created. Would you like to configure product pricing for this route now?\n\n` +
            `Click OK to set prices, or Cancel to use default base prices.`
          );

          if (configure) {
            await showRoutePricingConfiguration(result.id, data.name);
          } else {
            cancelRouteForm();
            loadRoutes();
          }
        } else {
          cancelRouteForm();
          loadRoutes();
        }
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
        const result = await res.json();

        if (!id) {
          // New product - show pricing configuration
          await showProductPricingConfiguration(result.id, data.name, data.price_per_ton);
        } else {
          cancelProductForm();
          loadProducts();
        }
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (err) {
      alert('Failed to save product');
    }
  });

  // Car form
  document.getElementById('carForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('carId').value;
    const data = {
      car_number: document.getElementById('carNumber').value,
      description: document.getElementById('carDescription').value
    };

    try {
      const url = id ? `/api/cars/${id}` : '/api/cars';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        cancelCarForm();
        loadCars();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (err) {
      alert('Failed to save car');
    }
  });

  // Entry form
  document.getElementById('entryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('entryId').value;
    const data = {
      car_id: parseInt(document.getElementById('entryCarNumber').value),
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

  // Expense form
  document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('expenseId').value;
    const data = {
      car_id: parseInt(document.getElementById('expenseCar').value),
      expense_type_id: parseInt(document.getElementById('expenseType').value),
      amount: parseFloat(document.getElementById('expenseAmount').value),
      description: document.getElementById('expenseDescription').value,
      expense_date: document.getElementById('expenseDate').value
    };

    try {
      const url = id ? `/api/expenses/${id}` : '/api/expenses';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        cancelExpenseForm();
        loadExpenses();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (err) {
      alert('Failed to save expense');
    }
  });

  // Route change listener - update product dropdown when route changes
  document.getElementById('entryRoute').addEventListener('change', (e) => {
    const routeId = e.target.value;
    updateProductDropdown(routeId);
    // Reset product selection and rate when route changes
    document.getElementById('entryProduct').value = '';
    document.getElementById('entryCalculatedRate').value = '';
  });

  // Real-time rate calculation
  document.getElementById('entryProduct').addEventListener('change', updateRatePreview);
  document.getElementById('entryQuantity').addEventListener('input', updateRatePreview);
}

// ============= PRICING CONFIGURATION FUNCTIONS =============

async function showProductPricingConfiguration(productId, productName, basePrice) {
  // Load all routes
  const routesRes = await fetch('/api/routes');
  const allRoutes = await routesRes.json();

  if (allRoutes.length === 0) {
    // No routes exist yet - skip pricing step
    cancelProductForm();
    loadProducts();
    return;
  }

  // Show pricing modal
  const modal = document.getElementById('pricingConfigModal');
  document.getElementById('pricingModalTitle').textContent = `Set Pricing for "${productName}"`;
  document.getElementById('pricingModalSubtitle').textContent = `Base price: Rs ${basePrice}/ton`;

  const tbody = document.getElementById('pricingConfigTable').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';

  allRoutes.forEach(route => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${route.name}</td>
      <td>
        <input type="number"
               class="pricing-input"
               data-route-id="${route.id}"
               data-product-id="${productId}"
               step="0.01"
               placeholder="${basePrice}"
               value="${basePrice}">
      </td>
      <td>
        <input type="checkbox"
               class="availability-checkbox"
               data-route-id="${route.id}"
               data-product-id="${productId}"
               checked>
      </td>
    `;
  });

  modal.classList.remove('hidden');
  modal.dataset.productId = productId;
}

async function showRoutePricingConfiguration(routeId, routeName) {
  // Load all products
  const productsRes = await fetch('/api/products');
  const allProducts = await productsRes.json();

  if (allProducts.length === 0) {
    cancelRouteForm();
    loadRoutes();
    return;
  }

  const modal = document.getElementById('pricingConfigModal');
  document.getElementById('pricingModalTitle').textContent = `Set Pricing for Route "${routeName}"`;
  document.getElementById('pricingModalSubtitle').textContent = `Configure which products are available and their prices`;

  const tbody = document.getElementById('pricingConfigTable').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';

  allProducts.forEach(product => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${product.name}</td>
      <td>
        <input type="number"
               class="pricing-input"
               data-route-id="${routeId}"
               data-product-id="${product.id}"
               step="0.01"
               placeholder="${product.price_per_ton}"
               value="${product.price_per_ton}">
      </td>
      <td>
        <input type="checkbox"
               class="availability-checkbox"
               data-route-id="${routeId}"
               data-product-id="${product.id}"
               checked>
      </td>
    `;
  });

  modal.classList.remove('hidden');
  modal.dataset.isRouteConfig = 'true';
}

async function savePricingConfiguration() {
  const modal = document.getElementById('pricingConfigModal');
  const isRouteConfig = modal.dataset.isRouteConfig === 'true';

  // Collect all pricing data
  const pricingData = [];
  const rows = document.getElementById('pricingConfigTable').getElementsByTagName('tbody')[0].rows;

  for (let row of rows) {
    const priceInput = row.querySelector('.pricing-input');
    const availabilityCheckbox = row.querySelector('.availability-checkbox');

    pricingData.push({
      product_id: parseInt(priceInput.dataset.productId),
      route_id: parseInt(priceInput.dataset.routeId),
      price_per_ton: parseFloat(priceInput.value),
      is_available: availabilityCheckbox.checked
    });
  }

  // Save pricing for each route-product combination
  try {
    for (let pricing of pricingData) {
      await fetch(`/api/route-product-pricing/${pricing.route_id}/${pricing.product_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_per_ton: pricing.price_per_ton,
          is_available: pricing.is_available
        })
      });
    }

    closePricingModal();

    if (isRouteConfig) {
      cancelRouteForm();
      loadRoutes();
    } else {
      cancelProductForm();
      loadProducts();
    }
  } catch (err) {
    alert('Failed to save pricing configuration');
  }
}

function closePricingModal() {
  const modal = document.getElementById('pricingConfigModal');
  modal.classList.add('hidden');
  modal.dataset.isRouteConfig = 'false';
}

// ============= PRICING MANAGEMENT TAB FUNCTIONS =============

async function loadPricingManagement() {
  const viewMode = document.getElementById('pricingViewMode').value;
  const viewSelect = document.getElementById('pricingViewId');
  viewSelect.innerHTML = '<option value="">Select...</option>';

  if (viewMode === 'route') {
    routes.forEach(route => {
      const option = document.createElement('option');
      option.value = route.id;
      option.textContent = route.name;
      viewSelect.appendChild(option);
    });
  } else {
    products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.name;
      viewSelect.appendChild(option);
    });
  }

  // Clear table
  document.getElementById('pricingTableHead').innerHTML = '';
  document.getElementById('pricingTableBody').innerHTML = '';
}

async function loadPricingDetails() {
  const viewMode = document.getElementById('pricingViewMode').value;
  const viewId = document.getElementById('pricingViewId').value;

  if (!viewId) return;

  const thead = document.getElementById('pricingTableHead');
  const tbody = document.getElementById('pricingTableBody');

  if (viewMode === 'route') {
    // Show all products for this route
    thead.innerHTML = `
      <tr>
        <th>Product</th>
        <th>Base Price</th>
        <th>Route Price</th>
        <th>Available</th>
      </tr>
    `;

    try {
      const res = await fetch(`/api/route-product-pricing/${viewId}`);
      const pricing = await res.json();

      tbody.innerHTML = '';
      pricing.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${item.product_name}</td>
          <td>Rs ${item.base_price.toLocaleString()}</td>
          <td>
            <input type="number"
                   class="pricing-edit-input"
                   data-route-id="${viewId}"
                   data-product-id="${item.product_id}"
                   step="0.01"
                   value="${item.price_per_ton || item.base_price}">
          </td>
          <td>
            <input type="checkbox"
                   class="availability-edit-checkbox"
                   data-route-id="${viewId}"
                   data-product-id="${item.product_id}"
                   ${(item.is_available === null || item.is_available === 1) ? 'checked' : ''}>
          </td>
        `;
      });
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
  } else {
    // Show all routes for this product
    thead.innerHTML = `
      <tr>
        <th>Route</th>
        <th>Base Price</th>
        <th>Route Price</th>
        <th>Available</th>
      </tr>
    `;

    try {
      // Fetch pricing across all routes for this product
      const allPricing = [];
      for (const route of routes) {
        const res = await fetch(`/api/route-product-pricing/${route.id}`);
        const routePricing = await res.json();
        const productPricing = routePricing.find(p => p.product_id === parseInt(viewId));
        if (productPricing) {
          allPricing.push({
            route_id: route.id,
            route_name: route.name,
            ...productPricing
          });
        }
      }

      tbody.innerHTML = '';
      allPricing.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${item.route_name}</td>
          <td>Rs ${item.base_price.toLocaleString()}</td>
          <td>
            <input type="number"
                   class="pricing-edit-input"
                   data-route-id="${item.route_id}"
                   data-product-id="${viewId}"
                   step="0.01"
                   value="${item.price_per_ton || item.base_price}">
          </td>
          <td>
            <input type="checkbox"
                   class="availability-edit-checkbox"
                   data-route-id="${item.route_id}"
                   data-product-id="${viewId}"
                   ${(item.is_available === null || item.is_available === 1) ? 'checked' : ''}>
          </td>
        `;
      });
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
  }
}

async function savePricingChanges() {
  const inputs = document.querySelectorAll('.pricing-edit-input');
  const checkboxes = document.querySelectorAll('.availability-edit-checkbox');

  try {
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const checkbox = checkboxes[i];

      await fetch(`/api/route-product-pricing/${input.dataset.routeId}/${input.dataset.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_per_ton: parseFloat(input.value),
          is_available: checkbox.checked
        })
      });
    }

    alert('Pricing updated successfully');
    loadPricingDetails();
  } catch (err) {
    alert('Failed to save pricing changes');
  }
}
