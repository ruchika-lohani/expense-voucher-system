const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

// Reads all .sql files from the migrations folder in order and runs them.
async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No migration files found.');
    return;
  }

  console.log(`Running ${files.length} migration(s)...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Applying: ${file}`);
    await pool.query(sql);
  }

  console.log('All migrations completed successfully.');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration error:', error.message);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
