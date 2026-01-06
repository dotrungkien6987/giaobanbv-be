// Work Management Module - Models Index (Updated Structure với tên tiếng Việt)
// Import all models for the work management system

// Helper: safe require để tránh lỗi khi file chưa tồn tại (giữ tương thích khi refactor dần)
const safeRequire = (p) => {
  try {
    return require(p);
  } catch (e) {
    return undefined;
  }
};

// Core Organization Models (Tên tiếng Việt)
const PhongBan = safeRequire("./PhongBan");
const NhanVienQuanLy = safeRequire("./NhanVienQuanLy");
const QuanLyNhanVien = require("./QuanLyNhanVien");

// Routine Duties and Employee Assignment (Tên tiếng Việt)
const NhiemVuThuongQuy = require("./NhiemVuThuongQuy");
const NhanVienNhiemVu = require("./NhanVienNhiemVu");

// Assignment History and State Management
const LichSuGanNhiemVu = safeRequire("./LichSuGanNhiemVu");
const {
  QuanLyTrangThaiCongViec,
  TRANG_THAI_CONG_VIEC,
} = require("./QuanLyTrangThaiCongViec");

// Evaluation Criteria (Legacy - keeping for backward compatibility)
const EvaluationCriteria = require("./EvaluationCriteria");
const EvaluationCycle = require("./EvaluationCycle");
const KpiEvaluation = require("./KpiEvaluation");
const RoutineDutyEvaluation = require("./RoutineDutyEvaluation");
const CriteriaScore = require("./CriteriaScore");

// KPI System (New Vietnamese models)
// TieuChiDanhGia deprecated - now using ChuKy.TieuChiCauHinh
const ChuKyDanhGia = require("./ChuKyDanhGia");
const DanhGiaKPI = require("./DanhGiaKPI");
const DanhGiaNhiemVuThuongQuy = require("./DanhGiaNhiemVuThuongQuy");

// Tasks and Assignments (legacy AssignedTask đã gỡ bỏ)
const NhomViecUser = require("./NhomViecUser");

// Files and Comments (legacy) — đã thay thế bằng TepTin/TepTinCongViec và BinhLuan/BinhLuanCongViec
// const File = require("./File");
// const Comment = require("./Comment");

// New Work Items (CongViec)
const CongViec = require("./CongViec");
const BinhLuan = require("./BinhLuan");
const TepTin = require("./TepTin");

// YeuCau System (Ticket/Support Request)
const DanhMucYeuCau = require("./DanhMucYeuCau");
const LyDoTuChoi = require("./LyDoTuChoi");
const CauHinhThongBaoKhoa = require("./CauHinhThongBaoKhoa");
const YeuCau = require("./YeuCau");
const YeuCauCounter = require("./YeuCauCounter");
const LichSuYeuCau = require("./LichSuYeuCau");

// Notification System (New)
const Notification = require("./Notification");
const NotificationType = require("./NotificationType");
const NotificationTemplate = require("./NotificationTemplate");
const UserNotificationSettings = require("./UserNotificationSettings");

module.exports = {
  // Core Organization (Tên tiếng Việt)
  PhongBan,
  NhanVienQuanLy,
  QuanLyNhanVien,

  // Routine Duties (Tên tiếng Việt)
  NhiemVuThuongQuy,
  NhanVienNhiemVu,

  // History and State Management
  LichSuGanNhiemVu,
  QuanLyTrangThaiCongViec,
  TRANG_THAI_CONG_VIEC,

  // Evaluation (Legacy - keeping for backward compatibility)
  EvaluationCriteria,
  EvaluationCycle,
  KpiEvaluation,
  RoutineDutyEvaluation,
  CriteriaScore,

  // KPI System (New Vietnamese models)
  // TieuChiDanhGia removed - now using ChuKy.TieuChiCauHinh
  ChuKyDanhGia,
  DanhGiaKPI,
  DanhGiaNhiemVuThuongQuy,

  // Tasks
  NhomViecUser,

  // Files & Comments — sử dụng TepTin/TepTinCongViec và BinhLuan/BinhLuanCongViec

  // New Work Items
  CongViec,
  BinhLuan,
  TepTin,

  // YeuCau System (Ticket/Support Request)
  DanhMucYeuCau,
  LyDoTuChoi,
  CauHinhThongBaoKhoa,
  YeuCau,
  YeuCauCounter,
  LichSuYeuCau,

  // Notification System (New)
  Notification,
  NotificationType,
  NotificationTemplate,
  UserNotificationSettings,
};
