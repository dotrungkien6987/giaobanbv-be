// Work Management Module - Models Index (Updated Structure với tên tiếng Việt)
// Import all models for the work management system

// Core Organization Models (Tên tiếng Việt)
const PhongBan = require("./PhongBan");
const NhanVienQuanLy = require("./NhanVienQuanLy");

// Routine Duties and Employee Assignment (Tên tiếng Việt)
const NhiemVuThuongQuy = require("./NhiemVuThuongQuy");
const NhanVienNhiemVu = require("./NhanVienNhiemVu");

// Assignment History and State Management
const LichSuGanNhiemVu = require("./LichSuGanNhiemVu");
const {
  QuanLyTrangThaiCongViec,
  TRANG_THAI_CONG_VIEC,
} = require("./QuanLyTrangThaiCongViec");

// Notification System
const QuyTacThongBao = require("./QuyTacThongBao");

// Evaluation Criteria
const EvaluationCriteria = require("./EvaluationCriteria");

// Evaluation Cycles and KPI
const EvaluationCycle = require("./EvaluationCycle");
const KpiEvaluation = require("./KpiEvaluation");
const RoutineDutyEvaluation = require("./RoutineDutyEvaluation");
const CriteriaScore = require("./CriteriaScore");

// Tasks and Assignments
const AssignedTask = require("./AssignedTask");
const TaskAssignee = require("./TaskAssignee");
const NhomViecUser = require("./NhomViecUser");

// Tickets System
const TicketCategory = require("./TicketCategory");
const Ticket = require("./Ticket");

// Files and Comments
const File = require("./File");
const Comment = require("./Comment");

// Notifications
const Notification = require("./Notification");

module.exports = {
  // Core Organization (Tên tiếng Việt)
  PhongBan,
  NhanVienQuanLy,

  // Routine Duties (Tên tiếng Việt)
  NhiemVuThuongQuy,
  NhanVienNhiemVu,

  // History and State Management
  LichSuGanNhiemVu,
  QuanLyTrangThaiCongViec,
  TRANG_THAI_CONG_VIEC,

  // Notification System
  QuyTacThongBao,

  // Evaluation
  EvaluationCriteria,
  EvaluationCycle,
  KpiEvaluation,
  RoutineDutyEvaluation,
  CriteriaScore,

  // Tasks
  AssignedTask,
  TaskAssignee,
  NhomViecUser,

  // Tickets
  TicketCategory,
  Ticket,

  // Files & Comments
  File,
  Comment,

  // Notifications
  Notification,
};
