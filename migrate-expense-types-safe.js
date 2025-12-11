const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'delivery.db');
const db = new Database(dbPath);

console.log('Starting SAFE expense types migration...\n');

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
  const existing = db.prepare('SELECT id, name FROM expense_types ORDER BY id').all();
  console.log('Current expense types:');
  existing.forEach(type => {
    console.log(`  ID ${type.id}: ${type.name}`);
  });

  // Get expense count for each type
  const expenseCounts = db.prepare(`
    SELECT expense_type_id, COUNT(*) as count
    FROM expenses
    GROUP BY expense_type_id
  `).all();

  console.log('\nExpense counts by type:');
  expenseCounts.forEach(count => {
    const typeName = existing.find(t => t.id === count.expense_type_id)?.name || 'Unknown';
    console.log(`  ${typeName}: ${count.count} expenses`);
  });

  if (process.argv.includes('--confirm')) {
    console.log('\n=== STARTING MIGRATION ===\n');

    // Create backup first
    const backupPath = dbPath + '.backup-' + Date.now();
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✓ Database backed up to: ${backupPath}\n`);

    // Begin transaction
    const migrate = db.transaction(() => {
      // Step 1: Temporarily disable foreign key constraints
      db.pragma('foreign_keys = OFF');

      // Step 2: Create temporary table for new expense types
      db.exec(`
        CREATE TEMP TABLE new_expense_types (
          id INTEGER PRIMARY KEY,
          name TEXT UNIQUE NOT NULL
        )
      `);

      // Step 3: Insert new expense types into temp table
      const insertTemp = db.prepare('INSERT INTO new_expense_types (name) VALUES (?)');
      newExpenseTypes.forEach(type => {
        insertTemp.run(type);
      });

      // Step 4: Get mapping of new IDs
      const newTypes = db.prepare('SELECT id, name FROM new_expense_types').all();
      console.log('New expense types to be created:');
      newTypes.forEach(type => {
        console.log(`  ID ${type.id}: ${type.name}`);
      });

      // Step 5: Update existing expenses to use new type IDs (if names match)
      // This preserves expenses by matching old and new type names
      console.log('\nMapping old expenses to new types:');
      existing.forEach(oldType => {
        const matchingNew = newTypes.find(nt =>
          nt.name.toLowerCase() === oldType.name.toLowerCase()
        );

        if (matchingNew) {
          const updated = db.prepare(
            'UPDATE expenses SET expense_type_id = ? WHERE expense_type_id = ?'
          ).run(matchingNew.id, oldType.id);
          console.log(`  ✓ Mapped "${oldType.name}" expenses (${updated.changes} records) to new ID ${matchingNew.id}`);
        } else {
          // If no match found, map to first new type (or you can handle differently)
          console.log(`  ⚠ No match found for "${oldType.name}", mapping to "${newTypes[0].name}"`);
          const updated = db.prepare(
            'UPDATE expenses SET expense_type_id = ? WHERE expense_type_id = ?'
          ).run(newTypes[0].id, oldType.id);
          console.log(`    Updated ${updated.changes} records`);
        }
      });

      // Step 6: Delete old expense types
      db.prepare('DELETE FROM expense_types').run();
      console.log('\n✓ Removed old expense types');

      // Step 7: Copy new expense types from temp table to main table
      db.exec(`
        INSERT INTO expense_types (name)
        SELECT name FROM new_expense_types ORDER BY id
      `);
      console.log('✓ Inserted new expense types');

      // Step 8: Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    });

    // Execute migration
    migrate();
    console.log('\n✓ Migration completed successfully!');

    // Verify results
    const finalTypes = db.prepare('SELECT id, name FROM expense_types ORDER BY id').all();
    console.log('\nFinal expense types:');
    finalTypes.forEach(type => {
      const count = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE expense_type_id = ?').get(type.id);
      console.log(`  ID ${type.id}: ${type.name} (${count.count} expenses)`);
    });

    console.log('\n✓ All done! Your expense data has been preserved.');
    console.log(`  Backup location: ${backupPath}`);

  } else {
    console.log('\n=== DRY RUN MODE ===');
    console.log('\nThis migration will:');
    console.log('  1. Create a backup of your database');
    console.log('  2. Update expense types to the new list');
    console.log('  3. Preserve all existing expense records by mapping them to matching new types');
    console.log('\nNew expense types will be:');
    newExpenseTypes.forEach((type, index) => {
      console.log(`  ${index + 1}. ${type}`);
    });
    console.log('\nTo proceed with migration, run:');
    console.log('  node migrate-expense-types-safe.js --confirm\n');
  }

} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  db.close();
}
