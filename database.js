const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'delivery.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Users table (admin authentication)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Routes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      price_per_ton REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cars table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_number TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Expense Types table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default expense types if table is empty
  const expenseTypeCount = db.prepare('SELECT COUNT(*) as count FROM expense_types').get();
  if (expenseTypeCount.count === 0) {
    const insertExpenseType = db.prepare('INSERT INTO expense_types (name) VALUES (?)');
    insertExpenseType.run('Petrol');
    insertExpenseType.run('Maintainance');
    insertExpenseType.run('Service');
    insertExpenseType.run('Other');
  }

  // Expenses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      expense_type_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      expense_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars(id),
      FOREIGN KEY (expense_type_id) REFERENCES expense_types(id)
    )
  `);

  // Route-Product Pricing table (route-specific pricing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS route_product_pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      price_per_ton REAL NOT NULL,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(route_id, product_id)
    )
  `);

  // Create index for faster route-product pricing lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_route_product_pricing_lookup
    ON route_product_pricing(route_id, product_id)
  `);

  // Entries table (delivery entries)
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_number TEXT NOT NULL,
      route_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity_tons REAL NOT NULL,
      calculated_rate REAL NOT NULL,
      entry_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Add car_id column to entries table if it doesn't exist
  const entriesColumns = db.prepare("PRAGMA table_info(entries)").all();
  const hasCarId = entriesColumns.some(col => col.name === 'car_id');

  if (!hasCarId) {
    db.exec(`ALTER TABLE entries ADD COLUMN car_id INTEGER REFERENCES cars(id)`);
  }

  // Migrate existing car numbers to cars table
  const existingCarNumbers = db.prepare('SELECT DISTINCT car_number FROM entries WHERE car_number IS NOT NULL').all();

  for (const row of existingCarNumbers) {
    // Insert car if it doesn't exist
    const carExists = db.prepare('SELECT id FROM cars WHERE car_number = ?').get(row.car_number);
    let carId;

    if (!carExists) {
      const result = db.prepare('INSERT INTO cars (car_number) VALUES (?)').run(row.car_number);
      carId = result.lastInsertRowid;
    } else {
      carId = carExists.id;
    }

    // Update entries with car_id
    db.prepare('UPDATE entries SET car_id = ? WHERE car_number = ? AND car_id IS NULL').run(carId, row.car_number);
  }

  // Create default admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

  if (!adminExists) {
    const defaultPassword = 'Bashir@1234';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', passwordHash);
    console.log('✓ Default admin user created (username: admin, password: Bashir@1234)');
  }
}

// Initialize on module load
initializeDatabase();

module.exports = db;
