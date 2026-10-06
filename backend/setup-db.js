// One-command DB setup: creates the database (if missing), runs schema.sql + seed.sql
require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs'), path = require('path'), { Client } = require('pg');
const cfg = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432 };
const dbName = process.env.DB_NAME || 'food_delivery';
const useUrl = !!process.env.DATABASE_URL;
(async () => {
  if (!useUrl) {
    const admin = new Client({ ...cfg, database: 'postgres' });
    await admin.connect();
    const ex = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
    if (!ex.rowCount) { await admin.query(`CREATE DATABASE "${dbName}"`); console.log('Created database', dbName); }
    await admin.end();
  }
  if (useUrl) {
    console.warn('WARNING: DATABASE_URL is set. Running schema.sql will DROP all tables and wipe the cloud database!');
  }
  const c = new Client(useUrl
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { ...cfg, database: dbName });
  await c.connect();
  for (const f of ['schema.sql', 'procedures.sql', 'seed.sql']) {
    await c.query(fs.readFileSync(path.join(__dirname, '..', 'database', f), 'utf8'));
    console.log('Ran', f);
  }
  // Idempotent photo_url fallback for fresh DBs
  await c.query("UPDATE Restaurants SET photo_url = 'images/r' || restaurant_id || '.jpg' WHERE photo_url IS NULL");

  // demo restaurant login (customers sign up on the site; restaurant accounts are only created here / by add-restaurant-user.js)
  const email = process.env.RESTAURANT_EMAIL || 'restaurant@multieats.test', pw = process.env.RESTAURANT_PASSWORD || 'restaurant123';
  await c.query('SELECT sp_create_platform_admin($1,$2,$3)', ['MultiEats Main Admin', email, await bcrypt.hash(pw, 10)]);
  console.log('Main admin login:', email, '/', pw, '(change it in .env before the demo goes public)');
  const owners = await c.query('SELECT restaurant_id,name FROM Restaurants ORDER BY restaurant_id');
  for (const r of owners.rows) { const ownerEmail = `owner${r.restaurant_id}@multieats.test`; await c.query('SELECT sp_create_restaurant_user($1,$2,$3,$4)', [r.name + ' Owner', ownerEmail, await bcrypt.hash('owner123', 10), r.restaurant_id]); }
  console.log('Restaurant-owner demo accounts: owner<restaurant_id>@multieats.test / owner123');
  const r = await c.query('SELECT (SELECT COUNT(*) FROM Restaurants) r, (SELECT COUNT(*) FROM MenuItems) m, (SELECT COUNT(*) FROM DeliveryPartners) d');
  console.log('Restaurants:', r.rows[0].r, '| Menu items:', r.rows[0].m, '| Partners:', r.rows[0].d);
  await c.end();
})().catch(e => { console.error('Setup failed:', e.message); process.exit(1); });
