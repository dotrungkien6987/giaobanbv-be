/**
 * @fileoverview Model layer cho Dịch Vụ Trùng (Duplicate Services)
 * @module models/his/dichvutrung
 */

const pool = require("../../config/dbConfig");
const qDichVuTrung = require("../../querySQL/qDichVuTrung");

const DichVuTrungService = {};

/**
 * Tìm các dịch vụ trùng lặp với phân trang
 *
 * @param {string} fromDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} toDate - Ngày kết thúc (YYYY-MM-DD)
 * @param {string[]} serviceTypes - Loại dịch vụ (e.g., ['04CDHA', '03XN'])
 * @param {number} limit - Số bản ghi trên mỗi trang
 * @param {number} offset - Vị trí bắt đầu
 * @param {string} filterByService - Lọc theo tên dịch vụ (optional)
 * @param {string} filterByDepartment - Lọc theo tên khoa (optional)
 * @returns {Promise<Array>} Danh sách dịch vụ trùng lặp
 */
DichVuTrungService.findDuplicateServices = async (
  fromDate,
  toDate,
  serviceTypes,
  limit = 50,
  offset = 0,
  filterByService = null,
  filterByDepartment = null
) => {
  try {
    const result = await pool.query(qDichVuTrung.findDuplicates, [
      fromDate,
      toDate,
      serviceTypes,
      limit,
      offset,
      filterByService,
      filterByDepartment,
    ]);

    return result.rows;
  } catch (error) {
    console.error("Error in findDuplicateServices:", error);
    throw error;
  }
};

/**
 * Đếm tổng số bản ghi dịch vụ trùng lặp
 *
 * @param {string} fromDate - Ngày bắt đầu
 * @param {string} toDate - Ngày kết thúc
 * @param {string[]} serviceTypes - Loại dịch vụ
 * @param {string} filterByService - Lọc theo tên dịch vụ (optional)
 * @param {string} filterByDepartment - Lọc theo tên khoa (optional)
 * @returns {Promise<number>} Tổng số bản ghi
 */
DichVuTrungService.countDuplicates = async (
  fromDate,
  toDate,
  serviceTypes,
  filterByService = null,
  filterByDepartment = null
) => {
  try {
    const result = await pool.query(qDichVuTrung.countDuplicates, [
      fromDate,
      toDate,
      serviceTypes,
      filterByService,
      filterByDepartment,
    ]);

    return parseInt(result.rows[0]?.total_count || 0, 10);
  } catch (error) {
    console.error("Error in countDuplicates:", error);
    throw error;
  }
};

/**
 * Lấy danh sách top dịch vụ bị trùng lặp nhiều nhất
 *
 * @param {string} fromDate - Ngày bắt đầu
 * @param {string} toDate - Ngày kết thúc
 * @param {string[]} serviceTypes - Loại dịch vụ
 * @param {number} limit - Số lượng top services
 * @returns {Promise<Array>} Top services với số lần trùng, số BN, tổng tiền
 */
DichVuTrungService.getTopServices = async (
  fromDate,
  toDate,
  serviceTypes,
  limit = 5
) => {
  try {
    const result = await pool.query(qDichVuTrung.getTopServices, [
      fromDate,
      toDate,
      serviceTypes,
      limit,
    ]);

    return result.rows;
  } catch (error) {
    console.error("Error in getTopServices:", error);
    throw error;
  }
};

/**
 * Lấy danh sách top khoa chỉ định trùng lặp nhiều nhất
 *
 * @param {string} fromDate - Ngày bắt đầu
 * @param {string} toDate - Ngày kết thúc
 * @param {string[]} serviceTypes - Loại dịch vụ
 * @param {number} limit - Số lượng top departments
 * @returns {Promise<Array>} Top departments với số lần trùng, số BN, tổng tiền
 */
DichVuTrungService.getTopDepartments = async (
  fromDate,
  toDate,
  serviceTypes,
  limit = 5
) => {
  try {
    const result = await pool.query(qDichVuTrung.getTopDepartments, [
      fromDate,
      toDate,
      serviceTypes,
      limit,
    ]);

    return result.rows;
  } catch (error) {
    console.error("Error in getTopDepartments:", error);
    throw error;
  }
};

module.exports = DichVuTrungService;
