const pool = require("../../config/dbConfig");
const qDatLichKham = require("../../querySQL/qDatLichKham");

const DatLichKhamService = {};

/**
 * Báo cáo tổng hợp đặt lịch khám theo người giới thiệu
 */
DatLichKhamService.getBaoCaoTongHop = async (fromDate, toDate) => {
  try {
    const result = await pool.query(qDatLichKham.baoCaoNguoiGioiThieu, [
      fromDate,
      toDate,
    ]);
    return result.rows;
  } catch (error) {
    console.error("Error in getBaoCaoTongHop:", error);
    throw error;
  }
};

/**
 * Chi tiết từng lượt đặt lịch (không có lịch sử khám)
 */
DatLichKhamService.getChiTietDatLich = async (fromDate, toDate) => {
  try {
    const result = await pool.query(qDatLichKham.chiTietDatLich, [
      fromDate,
      toDate,
    ]);
    return result.rows;
  } catch (error) {
    console.error("Error in getChiTietDatLich:", error);
    throw error;
  }
};

/**
 * Chi tiết từng lượt đặt lịch + lịch sử khám 1 năm gần nhất (JSON)
 */
DatLichKhamService.getChiTietVoiLichSu = async (fromDate, toDate) => {
  try {
    const result = await pool.query(qDatLichKham.chiTietDatLich_voiLichSu, [
      fromDate,
      toDate,
    ]);
    return result.rows;
  } catch (error) {
    console.error("Error in getChiTietVoiLichSu:", error);
    throw error;
  }
};

module.exports = DatLichKhamService;
