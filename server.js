const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'delivery-tracker-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// ============= AUTHENTICATION ROUTES =============

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, username: user.username });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check authentication status
app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

// ============= ROUTES MANAGEMENT =============

// Get all routes
app.get('/api/routes', requireAuth, (req, res) => {
  const routes = db.prepare('SELECT * FROM routes ORDER BY name').all();
  res.json(routes);
});

// Add route
app.post('/api/routes', requireAuth, (req, res) => {
  const { name, description } = req.body;
  try {
    const result = db.prepare('INSERT INTO routes (name, description) VALUES (?, ?)').run(name, description || '');
    res.json({ id: result.lastInsertRowid, name, description });
  } catch (err) {
    res.status(400).json({ error: 'Route already exists or invalid data' });
  }
});

// Update route
app.put('/api/routes/:id', requireAuth, (req, res) => {
  const { name, description } = req.body;
  try {
    db.prepare('UPDATE routes SET name = ?, description = ? WHERE id = ?').run(name, description || '', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update route' });
  }
});

// Delete route
app.delete('/api/routes/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM routes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete route (may have associated entries)' });
  }
});

// ============= PRODUCTS MANAGEMENT =============

// Get all products
app.get('/api/products', requireAuth, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  res.json(products);
});

// Add product
app.post('/api/products', requireAuth, (req, res) => {
  const { name, price_per_ton } = req.body;
  try {
    const result = db.prepare('INSERT INTO products (name, price_per_ton) VALUES (?, ?)').run(name, parseFloat(price_per_ton));
    res.json({ id: result.lastInsertRowid, name, price_per_ton: parseFloat(price_per_ton) });
  } catch (err) {
    res.status(400).json({ error: 'Product already exists or invalid data' });
  }
});

// Update product
app.put('/api/products/:id', requireAuth, (req, res) => {
  const { name, price_per_ton } = req.body;
  try {
    db.prepare('UPDATE products SET name = ?, price_per_ton = ? WHERE id = ?').run(name, parseFloat(price_per_ton), req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete product (may have associated entries)' });
  }
});

// ============= CARS MANAGEMENT =============

// Get all cars
app.get('/api/cars', requireAuth, (req, res) => {
  const cars = db.prepare('SELECT * FROM cars ORDER BY car_number').all();
  res.json(cars);
});

// Add car
app.post('/api/cars', requireAuth, (req, res) => {
  const { car_number, description } = req.body;

  try {
    const result = db.prepare('INSERT INTO cars (car_number, description) VALUES (?, ?)').run(car_number, description || '');
    res.json({
      id: result.lastInsertRowid,
      car_number,
      description: description || ''
    });
  } catch (err) {
    res.status(400).json({ error: 'Car already exists or invalid data' });
  }
});

// Update car
app.put('/api/cars/:id', requireAuth, (req, res) => {
  const { car_number, description } = req.body;

  try {
    db.prepare('UPDATE cars SET car_number = ?, description = ? WHERE id = ?').run(car_number, description || '', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update car' });
  }
});

// Delete car
app.delete('/api/cars/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM cars WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete car (may have associated entries)' });
  }
});

// ============= EXPENSE TYPES MANAGEMENT =============

// Get all expense types
app.get('/api/expense-types', requireAuth, (req, res) => {
  const expenseTypes = db.prepare('SELECT * FROM expense_types ORDER BY name').all();
  res.json(expenseTypes);
});

// Add expense type
app.post('/api/expense-types', requireAuth, (req, res) => {
  const { name } = req.body;
  try {
    const result = db.prepare('INSERT INTO expense_types (name) VALUES (?)').run(name);
    res.json({ id: result.lastInsertRowid, name });
  } catch (err) {
    res.status(400).json({ error: 'Expense type already exists or invalid data' });
  }
});

// Update expense type
app.put('/api/expense-types/:id', requireAuth, (req, res) => {
  const { name } = req.body;
  try {
    db.prepare('UPDATE expense_types SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update expense type' });
  }
});

// Delete expense type
app.delete('/api/expense-types/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM expense_types WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete expense type (may have associated expenses)' });
  }
});

// ============= EXPENSES MANAGEMENT =============

// Get all expenses with details
app.get('/api/expenses', requireAuth, (req, res) => {
  const { car_id, month, year, expense_type_id } = req.query;

  let query = `
    SELECT
      e.id,
      e.car_id,
      c.car_number,
      e.expense_type_id,
      et.name as expense_type_name,
      e.amount,
      e.description,
      e.expense_date,
      e.created_at
    FROM expenses e
    JOIN cars c ON e.car_id = c.id
    JOIN expense_types et ON e.expense_type_id = et.id
    WHERE 1=1
  `;

  const params = [];

  if (car_id) {
    query += ` AND e.car_id = ?`;
    params.push(car_id);
  }

  if (month && year) {
    query += ` AND strftime('%Y-%m', e.expense_date) = ?`;
    params.push(`${year}-${month.padStart(2, '0')}`);
  }

  if (expense_type_id) {
    query += ` AND e.expense_type_id = ?`;
    params.push(expense_type_id);
  }

  query += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

  const expenses = db.prepare(query).all(...params);
  res.json(expenses);
});

// Add expense
app.post('/api/expenses', requireAuth, (req, res) => {
  const { car_id, expense_type_id, amount, description, expense_date } = req.body;

  try {
    const result = db.prepare(
      'INSERT INTO expenses (car_id, expense_type_id, amount, description, expense_date) VALUES (?, ?, ?, ?, ?)'
    ).run(car_id, expense_type_id, parseFloat(amount), description || '', expense_date);

    res.json({
      id: result.lastInsertRowid,
      car_id,
      expense_type_id,
      amount: parseFloat(amount),
      description: description || '',
      expense_date
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create expense' });
  }
});

// Update expense
app.put('/api/expenses/:id', requireAuth, (req, res) => {
  const { car_id, expense_type_id, amount, description, expense_date } = req.body;

  try {
    db.prepare(
      'UPDATE expenses SET car_id = ?, expense_type_id = ?, amount = ?, description = ?, expense_date = ? WHERE id = ?'
    ).run(car_id, expense_type_id, parseFloat(amount), description || '', expense_date, req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
app.delete('/api/expenses/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete expense' });
  }
});

// Get expense statistics
app.get('/api/stats/expenses', requireAuth, (req, res) => {
  const { car_id, month, year } = req.query;

  let query = `
    SELECT
      COUNT(*) as total_expenses,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount
    FROM expenses
    WHERE 1=1
  `;

  const params = [];

  if (car_id) {
    query += ` AND car_id = ?`;
    params.push(car_id);
  }

  if (month && year) {
    query += ` AND strftime('%Y-%m', expense_date) = ?`;
    params.push(`${year}-${month.padStart(2, '0')}`);
  }

  const stats = db.prepare(query).get(...params);

  // Get breakdown by expense type
  let typeQuery = `
    SELECT
      et.name,
      COUNT(e.id) as count,
      SUM(e.amount) as total_amount
    FROM expenses e
    JOIN expense_types et ON e.expense_type_id = et.id
    WHERE 1=1
  `;

  if (car_id) {
    typeQuery += ` AND e.car_id = ?`;
  }

  if (month && year) {
    typeQuery += ` AND strftime('%Y-%m', e.expense_date) = ?`;
  }

  typeQuery += ` GROUP BY et.id, et.name ORDER BY total_amount DESC`;

  const typeBreakdown = db.prepare(typeQuery).all(...params);

  // Get breakdown by car
  let carQuery = `
    SELECT
      c.car_number,
      COUNT(e.id) as count,
      SUM(e.amount) as total_amount
    FROM expenses e
    JOIN cars c ON e.car_id = c.id
    WHERE 1=1
  `;

  const carParams = [];

  if (month && year) {
    carQuery += ` AND strftime('%Y-%m', e.expense_date) = ?`;
    carParams.push(`${year}-${month.padStart(2, '0')}`);
  }

  carQuery += ` GROUP BY c.id, c.car_number ORDER BY total_amount DESC`;

  const carBreakdown = db.prepare(carQuery).all(...carParams);

  res.json({
    ...stats,
    type_breakdown: typeBreakdown,
    car_breakdown: carBreakdown
  });
});

// ============= ROUTE-PRODUCT PRICING MANAGEMENT =============

// Get all pricing for a specific route
app.get('/api/route-product-pricing/:routeId', requireAuth, (req, res) => {
  const routeId = req.params.routeId;

  const pricing = db.prepare(`
    SELECT
      p.id as product_id,
      p.name as product_name,
      p.price_per_ton as base_price,
      rpp.price_per_ton,
      rpp.is_available,
      rpp.id as pricing_id
    FROM products p
    LEFT JOIN route_product_pricing rpp
      ON p.id = rpp.product_id AND rpp.route_id = ?
    ORDER BY p.name
  `).all(routeId);

  res.json(pricing);
});

// Get available products for a route (with effective pricing)
app.get('/api/products/available/:routeId', requireAuth, (req, res) => {
  const routeId = req.params.routeId;

  const products = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.price_per_ton as base_price,
      COALESCE(rpp.price_per_ton, p.price_per_ton) as effective_price,
      COALESCE(rpp.is_available, 1) as is_available
    FROM products p
    LEFT JOIN route_product_pricing rpp
      ON p.id = rpp.product_id AND rpp.route_id = ?
    WHERE COALESCE(rpp.is_available, 1) = 1
    ORDER BY p.name
  `).all(routeId);

  res.json(products);
});

// Update individual route-product pricing
app.put('/api/route-product-pricing/:routeId/:productId', requireAuth, (req, res) => {
  const { routeId, productId } = req.params;
  const { price_per_ton, is_available } = req.body;

  try {
    db.prepare(`
      INSERT INTO route_product_pricing (route_id, product_id, price_per_ton, is_available, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(route_id, product_id)
      DO UPDATE SET
        price_per_ton = excluded.price_per_ton,
        is_available = excluded.is_available,
        updated_at = CURRENT_TIMESTAMP
    `).run(routeId, productId, parseFloat(price_per_ton), is_available ? 1 : 0);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update pricing' });
  }
});

// Bulk update pricing for multiple products
app.post('/api/route-product-pricing/bulk', requireAuth, (req, res) => {
  const { route_id, pricing } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO route_product_pricing (route_id, product_id, price_per_ton, is_available, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(route_id, product_id)
      DO UPDATE SET
        price_per_ton = excluded.price_per_ton,
        is_available = excluded.is_available,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = db.transaction((pricingList) => {
      for (const item of pricingList) {
        stmt.run(route_id, item.product_id, parseFloat(item.price_per_ton), item.is_available ? 1 : 0);
      }
    });

    transaction(pricing);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to save pricing' });
  }
});

// ============= ENTRIES MANAGEMENT =============

// Get all entries with details
app.get('/api/entries', requireAuth, (req, res) => {
  const { month, year, car_id } = req.query;

  let query = `
    SELECT
      e.id,
      e.car_id,
      COALESCE(c.car_number, e.car_number) as car_number,
      e.quantity_tons,
      e.calculated_rate,
      e.entry_date,
      e.created_at,
      r.name as route_name,
      p.name as product_name,
      p.price_per_ton
    FROM entries e
    JOIN routes r ON e.route_id = r.id
    JOIN products p ON e.product_id = p.id
    LEFT JOIN cars c ON e.car_id = c.id
    WHERE 1=1
  `;

  const params = [];

  if (car_id) {
    query += ` AND e.car_id = ?`;
    params.push(car_id);
  }

  if (month && year) {
    query += ` AND strftime('%Y-%m', e.entry_date) = ?`;
    params.push(`${year}-${month.padStart(2, '0')}`);
  }

  query += ` ORDER BY e.entry_date DESC, e.created_at DESC`;

  const entries = db.prepare(query).all(...params);
  res.json(entries);
});

// Add entry
app.post('/api/entries', requireAuth, (req, res) => {
  const { car_id, route_id, product_id, quantity_tons, entry_date } = req.body;

  // Get car number for the entry
  const car = db.prepare('SELECT car_number FROM cars WHERE id = ?').get(car_id);
  if (!car) {
    return res.status(400).json({ error: 'Invalid car' });
  }

  // Get route-specific price or fallback to base price
  const pricing = db.prepare(`
    SELECT
      COALESCE(rpp.price_per_ton, p.price_per_ton) as price_per_ton,
      COALESCE(rpp.is_available, 1) as is_available
    FROM products p
    LEFT JOIN route_product_pricing rpp
      ON p.id = rpp.product_id AND rpp.route_id = ?
    WHERE p.id = ?
  `).get(route_id, product_id);

  if (!pricing) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  if (!pricing.is_available) {
    return res.status(400).json({ error: 'Product not available for this route' });
  }

  // Calculate rate with route-specific price
  const calculated_rate = parseFloat(quantity_tons) * pricing.price_per_ton;

  try {
    const result = db.prepare(
      'INSERT INTO entries (car_id, car_number, route_id, product_id, quantity_tons, calculated_rate, entry_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(car_id, car.car_number, route_id, product_id, parseFloat(quantity_tons), calculated_rate, entry_date);

    res.json({
      id: result.lastInsertRowid,
      car_id,
      car_number: car.car_number,
      route_id,
      product_id,
      quantity_tons: parseFloat(quantity_tons),
      calculated_rate,
      entry_date
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create entry' });
  }
});

// Update entry
app.put('/api/entries/:id', requireAuth, (req, res) => {
  const { car_id, route_id, product_id, quantity_tons, entry_date } = req.body;

  // Get car number for the entry
  const car = db.prepare('SELECT car_number FROM cars WHERE id = ?').get(car_id);
  if (!car) {
    return res.status(400).json({ error: 'Invalid car' });
  }

  // Get route-specific price or fallback to base price
  const pricing = db.prepare(`
    SELECT
      COALESCE(rpp.price_per_ton, p.price_per_ton) as price_per_ton,
      COALESCE(rpp.is_available, 1) as is_available
    FROM products p
    LEFT JOIN route_product_pricing rpp
      ON p.id = rpp.product_id AND rpp.route_id = ?
    WHERE p.id = ?
  `).get(route_id, product_id);

  if (!pricing) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  if (!pricing.is_available) {
    return res.status(400).json({ error: 'Product not available for this route' });
  }

  // Recalculate rate with route-specific price
  const calculated_rate = parseFloat(quantity_tons) * pricing.price_per_ton;

  try {
    db.prepare(
      'UPDATE entries SET car_id = ?, car_number = ?, route_id = ?, product_id = ?, quantity_tons = ?, calculated_rate = ?, entry_date = ? WHERE id = ?'
    ).run(car_id, car.car_number, route_id, product_id, parseFloat(quantity_tons), calculated_rate, entry_date, req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update entry' });
  }
});

// Delete entry
app.delete('/api/entries/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete entry' });
  }
});

// ============= DASHBOARD STATISTICS =============

// Get monthly statistics
app.get('/api/stats/monthly', requireAuth, (req, res) => {
  const { month, year, car_id } = req.query;
  const dateFilter = month && year ? `${year}-${month.padStart(2, '0')}` : null;

  let query = `
    SELECT
      COUNT(*) as total_entries,
      SUM(quantity_tons) as total_tons,
      SUM(calculated_rate) as total_revenue,
      AVG(calculated_rate) as avg_rate
    FROM entries
    WHERE 1=1
  `;

  const params = [];

  if (car_id) {
    query += ` AND car_id = ?`;
    params.push(car_id);
  }

  if (dateFilter) {
    query += ` AND strftime('%Y-%m', entry_date) = ?`;
    params.push(dateFilter);
  }

  const stats = db.prepare(query).get(...params);

  // Get breakdown by product
  let productQuery = `
    SELECT
      p.name,
      COUNT(e.id) as count,
      SUM(e.quantity_tons) as total_tons,
      SUM(e.calculated_rate) as total_revenue
    FROM entries e
    JOIN products p ON e.product_id = p.id
    WHERE 1=1
  `;

  if (car_id) {
    productQuery += ` AND e.car_id = ?`;
  }

  if (dateFilter) {
    productQuery += ` AND strftime('%Y-%m', e.entry_date) = ?`;
  }

  productQuery += ` GROUP BY p.id, p.name ORDER BY total_revenue DESC`;

  const productBreakdown = db.prepare(productQuery).all(...params);

  res.json({
    ...stats,
    product_breakdown: productBreakdown
  });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✓ Delivery Tracker server running on http://localhost:${PORT}`);
  console.log('✓ Default login - username: admin, password: Bashir@1234\n');
});
