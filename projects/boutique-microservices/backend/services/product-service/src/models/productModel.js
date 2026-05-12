const pool = require("../config/db");

async function init() {
  // Database already exists with proper schema
}

async function getAll() {
  const { rows } = await pool.query(
    "SELECT * FROM products ORDER BY created_at DESC"
  );
  return rows;
}

async function create(data) {
  const { name, description, price, image_url } = data;

  const { rows } = await pool.query(
    `INSERT INTO products(name, description, price, image_url)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, description, price, image_url]
  );

  return rows[0];
}

async function remove(id) {
  await pool.query(
    "DELETE FROM products WHERE id=$1",
    [id]
  );
}

module.exports = { init, getAll, create, remove };
