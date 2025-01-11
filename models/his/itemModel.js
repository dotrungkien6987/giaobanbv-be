// src/models/itemModel.js
const pool = require('../../config/dbConfig');

const getAllItems = async () => {
  const res = await pool.query('SELECT * FROM items');
  return res.rows;
};

const getItemById = async (id) => {
  const res = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
  return res.rows[0];
};

const createItem = async (item) => {
  const { name, description } = item;
  const res = await pool.query(
    'INSERT INTO items (name, description) VALUES ($1, $2) RETURNING *',
    [name, description]
  );
  return res.rows[0];
};

const updateItem = async (id, item) => {
  const { name, description } = item;
  const res = await pool.query(
    'UPDATE items SET name = $1, description = $2 WHERE id = $3 RETURNING *',
    [name, description, id]
  );
  return res.rows[0];
};

const deleteItem = async (id) => {
  const res = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
  return res.rows[0];
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};