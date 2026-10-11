const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = require('./app');
const { pool } = require('./db');

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected successfully.');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error.message);
    process.exit(1);
  }
}

startServer();
