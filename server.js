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

// ============= ENTRIES MANAGEMENT =============

// Get all entries with details
app.get('/api/entries', requireAuth, (req, res) => {
  const { month, year } = req.query;

  let query = `
    SELECT
      e.id,
      e.car_number,
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
  `;

  const params = [];
  if (month && year) {
    query += ` WHERE strftime('%Y-%m', e.entry_date) = ?`;
    params.push(`${year}-${month.padStart(2, '0')}`);
  }

  query += ` ORDER BY e.entry_date DESC, e.created_at DESC`;

  const entries = db.prepare(query).all(...params);
  res.json(entries);
});

// Add entry
app.post('/api/entries', requireAuth, (req, res) => {
  const { car_number, route_id, product_id, quantity_tons, entry_date } = req.body;

  // Get product price
  const product = db.prepare('SELECT price_per_ton FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  // Calculate rate
  const calculated_rate = parseFloat(quantity_tons) * product.price_per_ton;

  try {
    const result = db.prepare(
      'INSERT INTO entries (car_number, route_id, product_id, quantity_tons, calculated_rate, entry_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(car_number, route_id, product_id, parseFloat(quantity_tons), calculated_rate, entry_date);

    res.json({
      id: result.lastInsertRowid,
      car_number,
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
  const { car_number, route_id, product_id, quantity_tons, entry_date } = req.body;

  // Get product price
  const product = db.prepare('SELECT price_per_ton FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  // Recalculate rate
  const calculated_rate = parseFloat(quantity_tons) * product.price_per_ton;

  try {
    db.prepare(
      'UPDATE entries SET car_number = ?, route_id = ?, product_id = ?, quantity_tons = ?, calculated_rate = ?, entry_date = ? WHERE id = ?'
    ).run(car_number, route_id, product_id, parseFloat(quantity_tons), calculated_rate, entry_date, req.params.id);

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
  const { month, year } = req.query;
  const dateFilter = month && year ? `${year}-${month.padStart(2, '0')}` : null;

  let query = `
    SELECT
      COUNT(*) as total_entries,
      SUM(quantity_tons) as total_tons,
      SUM(calculated_rate) as total_revenue,
      AVG(calculated_rate) as avg_rate
    FROM entries
  `;

  const params = [];
  if (dateFilter) {
    query += ` WHERE strftime('%Y-%m', entry_date) = ?`;
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
  `;

  if (dateFilter) {
    productQuery += ` WHERE strftime('%Y-%m', e.entry_date) = ?`;
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
