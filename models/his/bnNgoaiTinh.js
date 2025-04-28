const pool = require('../../config/dbConfig');
const qBnNgoaitinh = require('../../querySQL/qBnNgoaitinh');

const getNgoaiTinhNgoaiTru = async (fromdate, todate) => {
  // Xử lý fromdate
  let startDate;
  if (fromdate) {
    // Chuyển đổi chuỗi ISO thành đối tượng Date
    const dateFrom = new Date(fromdate);
    
    // Chuyển sang múi giờ Việt Nam (UTC+7) bằng cách thêm 7 giờ vào UTC
    dateFrom.setUTCHours(dateFrom.getUTCHours() + 7);
    
    // Đặt giờ, phút, giây và mili giây thành 0 (đầu ngày)
    dateFrom.setUTCHours(0, 0, 0, 0);
    
    // Định dạng ngày giờ theo yêu cầu: YYYY-MM-DD HH:MM:SS
    startDate = dateFrom.getUTCFullYear() + '-' +
      String(dateFrom.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(dateFrom.getUTCDate()).padStart(2, '0') + ' ' +
      '00:00:00';
  } else {
    // Nếu không có fromdate, lấy ngày hiện tại ở múi giờ Việt Nam
    const today = new Date();
    today.setUTCHours(today.getUTCHours() + 7);
    today.setUTCHours(0, 0, 0, 0);
    
    startDate = today.getUTCFullYear() + '-' +
      String(today.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(today.getUTCDate()).padStart(2, '0') + ' ' +
      '00:00:00';
  }

  // Xử lý todate
  let endDate;
  if (todate) {
    // Chuyển đổi chuỗi ISO thành đối tượng Date
    const dateTo = new Date(todate);
    
    // Chuyển sang múi giờ Việt Nam (UTC+7)
    dateTo.setUTCHours(dateTo.getUTCHours() + 7);
    
    // Đặt giờ, phút, giây và mili giây thành cuối ngày (23:59:59)
    dateTo.setUTCHours(23, 59, 59, 999);
    
    // Định dạng ngày giờ theo yêu cầu: YYYY-MM-DD HH:MM:SS
    endDate = dateTo.getUTCFullYear() + '-' +
      String(dateTo.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(dateTo.getUTCDate()).padStart(2, '0') + ' ' +
      '23:59:59';
  } else {
    // Nếu không có todate, lấy ngày hiện tại ở múi giờ Việt Nam
    const today = new Date();
    today.setUTCHours(today.getUTCHours() + 7);
    today.setUTCHours(23, 59, 59, 999);
    
    endDate = today.getUTCFullYear() + '-' +
      String(today.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(today.getUTCDate()).padStart(2, '0') + ' ' +
      '23:59:59';
  }

  console.log('getNgoaiTinhNgoaiTru - VN time:', startDate, endDate);
  
  // Thêm LIMIT để tránh lỗi RangeError khi dữ liệu quá lớn
  const res = await pool.query(qBnNgoaitinh.getByDateRange + ' LIMIT 1000', [startDate, endDate]);
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