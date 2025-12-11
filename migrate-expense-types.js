const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'delivery.db'));

console.log('Starting expense types migration...');

try {
  // Define the new expense types
  const newExpenseTypes = [
    'Oil change',
    'Traffic Challan',
    'Maintainance',
    'puncture/Hawa',
    "driver's wage"
  ];

  // Get existing expense types
  const existing = db.prepare('SELECT id, name FROM expense_types').all();
  console.log('\nCurrent expense types:', existing);

  // Ask for confirmation
  console.log('\nThis will DELETE all existing expense types and replace them with:');
  newExpenseTypes.forEach((type, index) => {
    console.log(`  ${index + 1}. ${type}`);
  });
  console.log('\nWARNING: This will also DELETE all associated expenses!');
  console.log('\nTo proceed with migration, run this script with --confirm flag:');
  console.log('  node migrate-expense-types.js --confirm\n');

  // Check if --confirm flag is provided
  if (process.argv.includes('--confirm')) {
    console.log('Confirmation received. Starting migration...\n');

    // Begin transaction
    const migrate = db.transaction(() => {
      // Delete all existing expense types (will cascade to expenses if FK is enabled)
      const deleteCount = db.prepare('DELETE FROM expense_types').run();
      console.log(`✓ Deleted ${deleteCount.changes} existing expense types`);

      // Insert new expense types
      const insertStmt = db.prepare('INSERT INTO expense_types (name) VALUES (?)');
      newExpenseTypes.forEach(type => {
        insertStmt.run(type);
        console.log(`✓ Added expense type: ${type}`);
      });
    });

    // Execute migration
    migrate();
    console.log('\n✓ Migration completed successfully!');

    // Show new expense types
    const updated = db.prepare('SELECT id, name FROM expense_types ORDER BY id').all();
    console.log('\nNew expense types:');
    updated.forEach(type => {
      console.log(`  ID ${type.id}: ${type.name}`);
    });

  } else {
    console.log('Migration cancelled. Use --confirm flag to proceed.');
  }

} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  db.close();
}
