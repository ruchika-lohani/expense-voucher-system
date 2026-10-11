const bcrypt = require('bcrypt');
const { pool } = require('../db');

// Seed file for creating default roles and test users.
const users = [
  {
    full_name: 'Director User',
    email: 'director@company.com',
    password: 'Director@123',
    role: 'director',
    department: 'Management',
  },
  {
    full_name: 'Accounts User',
    email: 'accounts@company.com',
    password: 'Accounts@123',
    role: 'accounts',
    department: 'Accounts',
  },
  {
    full_name: 'Employee One',
    email: 'employee1@company.com',
    password: 'Employee1@123',
    role: 'employee',
    department: 'Operations',
  },
  {
    full_name: 'Employee Two',
    email: 'employee2@company.com',
    password: 'Employee2@123',
    role: 'employee',
    department: 'Finance',
  },
];

async function seedDatabase() {
  await pool.query('DELETE FROM vouchers;');
  await pool.query('DELETE FROM users;');

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await pool.query(
      `
        INSERT INTO users (full_name, email, password_hash, role, department)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [user.full_name, user.email, passwordHash, user.role, user.department]
    );
  }

  console.log('Seed data inserted successfully.');
}

seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed error:', error.message);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
