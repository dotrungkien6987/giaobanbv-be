const pool = require('../../config/dbConfig');
const qBnNgoaitinh = require('../../controllers/SQL/qBnNgoaitinh');
const getNgoaiTinhNgoaiTru = async (fromdate, todate) => {
  // Set default values if parameters are not provided
  const startDate = fromdate || new Date().toISOString().split('T')[0]; // Default to today if not provided
  const endDate = todate || new Date().toISOString().split('T')[0];     // Default to today if not provided

  const res = await pool.query(qBnNgoaitinh.getByDateRange, [startDate, endDate]);
  return res.rows;
};

const getItemById = async (id) => {
  const res = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
  return res.rows[0];
};

module.exports = {
  getNgoaiTinhNgoaiTru,
  getItemById,
};