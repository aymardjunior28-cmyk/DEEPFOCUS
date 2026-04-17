import pool from './db.js';
console.log('pool loaded');
await pool.query('SELECT 1 AS ok').then((res) => {
  console.log('query ok', res.rows[0]);
}).catch((err) => {
  console.error('query error', err);
  process.exit(1);
});
