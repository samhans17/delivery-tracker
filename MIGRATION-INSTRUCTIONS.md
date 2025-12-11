# Expense Types Migration Instructions

## Problem
The expense types in your AWS database are outdated. The new expense types defined in `database.js` are:
1. Oil change
2. Traffic Challan
3. Maintainance
4. puncture/Hawa
5. driver's wage

However, these only get inserted when the database is **empty**, so your AWS database (which already has data) won't be updated automatically.

## Solution
Use the migration script to safely update your expense types.

## Steps to Migrate on AWS

### 1. Connect to your AWS server
```bash
ssh your-aws-server
cd /path/to/ahmad-software
```

### 2. Pull the latest changes
```bash
git pull
```

### 3. Run the migration script in DRY RUN mode first
This will show you what will happen WITHOUT making any changes:
```bash
node migrate-expense-types-safe.js
```

Review the output carefully to see:
- Current expense types
- How many expenses are using each type
- What the new expense types will be

### 4. Run the actual migration
Once you're comfortable with what will happen:
```bash
node migrate-expense-types-safe.js --confirm
```

This will:
- ✅ Create an automatic backup of your database
- ✅ Update the expense types to the new list
- ✅ **PRESERVE all your existing expense records** by mapping them to the new types
- ✅ Show you a summary of the changes

### 5. Restart your Node.js server
```bash
# If using PM2:
pm2 restart all

# If using a simple process:
# Kill the old process and start new one
pkill -f "node server.js"
node server.js &
```

### 6. Verify in the browser
- Go to your application
- Navigate to Expenses tab
- Add a new expense and verify the new expense types appear in the dropdown

## Backup Information
The migration script automatically creates a backup file named:
```
delivery.db.backup-[timestamp]
```

If anything goes wrong, you can restore from this backup:
```bash
cp delivery.db.backup-[timestamp] delivery.db
```

## Alternative: Manual Database Update
If you prefer to update manually, you can run these SQL commands directly:

```bash
sqlite3 delivery.db
```

Then run:
```sql
-- Disable foreign keys temporarily
PRAGMA foreign_keys = OFF;

-- Delete old expense types
DELETE FROM expense_types;

-- Insert new expense types
INSERT INTO expense_types (name) VALUES
  ('Oil change'),
  ('Traffic Challan'),
  ('Maintainance'),
  ('puncture/Hawa'),
  ('driver''s wage');

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;

-- Verify
SELECT * FROM expense_types;

-- Exit
.quit
```

**WARNING:** The manual method will delete all existing expenses! Use the safe migration script instead.
