const pool = require('../../config/dbConfig');
const qSoThuTu = require('../../querySQL/qSoThuTu');

/**
 * Get statistics by type and departments
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} departmentIds - Array of department IDs
 * @param {string} type - Type of query (2, 7, or 38)
 * @returns {Promise<Array>} - Results from query
 */
const getStatsByTypeAndDepartments = async (date, departmentIds, type) => {
  let query;
  
  switch (type.toString()) {
    case '2':
      query = qSoThuTu.getByDateAndDepartments_Type_2;
      break;
    case '7':
      query = qSoThuTu.getByDateAndDepartments_Type_7;
      break;
    case '38':
      query = qSoThuTu.getByDateAndDepartments_Type_38;
      break;
    default:
      throw new Error('Type không hợp lệ');
  }

  try {
    const { rows } = await pool.query(query, [date, departmentIds]);
    return rows;
  } catch (error) {
    console.error('Lỗi khi truy vấn số thứ tự:', error);
    throw new Error(`Lỗi khi truy vấn dữ liệu: ${error.message}`);
  }
};

module.exports = {
  getStatsByTypeAndDepartments
};