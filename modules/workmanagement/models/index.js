// Work Management Module - Models Index (Vietnamese Naming)
// Import all models for the work management system

// Core Organization Models
const PhongBan = require("./PhongBan");
const ViTriCongViec = require("./ViTriCongViec");
const NhanVienQuanLy = require("./NhanVienQuanLy");
const LichSuViTriNhanVien = require("./LichSuViTriNhanVien");

// Routine Duties and Evaluation Criteria
const NhiemVuThuongQuy = require("./NhiemVuThuongQuy");
const ViTriNhiemVuThuongQuy = require("./ViTriNhiemVuThuongQuy");
const TieuChiDanhGia = require("./TieuChiDanhGia");
const TieuChiTheoViTri = require("./TieuChiTheoViTri");

// Evaluation Cycles and KPI
const ChuKyDanhGia = require("./ChuKyDanhGia");
const DanhGiaKPI = require("./DanhGiaKPI");
const DanhGiaNhiemVuThuongQuy = require("./DanhGiaNhiemVuThuongQuy");
const DiemTieuChi = require("./DiemTieuChi");

// Tasks and Assignments
const CongViecDuocGiao = require("./CongViecDuocGiao");
const NguoiThucHienCongViec = require("./NguoiThucHienCongViec");

// Tickets System
const LoaiYeuCauHoTro = require("./LoaiYeuCauHoTro");
const YeuCauHoTro = require("./YeuCauHoTro");

// Files and Comments
const TepTin = require("./TepTin");
const BinhLuan = require("./BinhLuan");

// Notifications
const ThongBao = require("./ThongBao");

module.exports = {
  // Core Organization
  PhongBan,
  ViTriCongViec,
  NhanVienQuanLy,
  LichSuViTriNhanVien,

  // Routine Duties
  NhiemVuThuongQuy,
  ViTriNhiemVuThuongQuy,

  // Evaluation
  TieuChiDanhGia,
  TieuChiTheoViTri,
  ChuKyDanhGia,
  DanhGiaKPI,
  DanhGiaNhiemVuThuongQuy,
  DiemTieuChi,

  // Tasks
  CongViecDuocGiao,
  NguoiThucHienCongViec,

  // Tickets
  LoaiYeuCauHoTro,
  YeuCauHoTro,

  // Files & Comments
  TepTin,
  BinhLuan,

  // Notifications
  ThongBao,
};
