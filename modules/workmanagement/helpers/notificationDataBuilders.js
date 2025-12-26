/**
 * Centralized Notification Data Builders
 *
 * Purpose: Build complete notification data objects with ALL variables
 * available for template rendering. Templates pick what they need.
 *
 * Benefits:
 * - Single source of truth for each domain
 * - Guaranteed variable availability for templates
 * - Easy to maintain (add variable = 1 line change)
 * - No more missing variable bugs
 * - Auto-computes array variables (arrNguoiDieuPhoiID, arrQuanLyKhoaID, arrNguoiLienQuanID)
 *
 * Usage:
 *   const data = await buildYeuCauNotificationData(yeuCau, { context });
 *   await notificationService.send({ type: 'yeucau-tao-moi', data });
 */

const dayjs = require("dayjs");
const CauHinhThongBaoKhoa = require("../models/CauHinhThongBaoKhoa");

/**
 * Build YeuCau Notification Data
 * Returns ALL 29 YeuCau variables for any notification type
 *
 * @param {Object} yeuCau - YeuCau document (will be populated if needed)
 * @param {Object} context - Additional context fields
 * @param {string} context.nguoiSuaId - ID of person who edited
 * @param {string} context.tenNguoiSua - Name of person who edited
 * @param {string} context.nguoiBinhLuanId - ID of commenter
 * @param {string} context.tenNguoiBinhLuan - Name of commenter
 * @param {string} context.noiDungComment - Comment content
 * @param {string} context.noiDungThayDoi - Changes description
 * @param {string} context.tenNguoiXoa - Name of person who deleted
 * @param {string} context.nguoiXoaId - ID of person who deleted
 * @param {string} context.tenNguoiThucHien - Name of person who performed action
 * @param {Array} context.arrNguoiDieuPhoiID - Array of dispatcher IDs
 * @param {Array} context.arrQuanLyKhoaID - Array of department manager IDs
 * @param {string} context.thoiGianHenCu - Old deadline (formatted)
 * @param {string} context.nguoiDuocDieuPhoiID - ID of assigned handler
 * @param {string} context.nguoiNhanID - ID of receiver
 * @returns {Object} Complete data object with 29 fields
 */
async function buildYeuCauNotificationData(yeuCau, context = {}) {
  // Ensure yeuCau is populated (unless already passed via context.populated)
  let populated = context.populated || yeuCau;
  if (!populated.NguoiYeuCauID?.Ten && yeuCau.populate) {
    populated = await yeuCau.populate([
      "NguoiYeuCauID",
      "NguoiXuLyID",
      "NguoiDuocDieuPhoiID",
      "KhoaNguonID",
      "KhoaDichID",
      "DanhMucYeuCauID",
    ]);
  }

  // ============================================
  // AUTO-COMPUTE ARRAY VARIABLES
  // ============================================

  // 1. arrNguoiDieuPhoiID & arrQuanLyKhoaID from CauHinhThongBaoKhoa
  let arrNguoiDieuPhoiID = context.arrNguoiDieuPhoiID;
  let arrQuanLyKhoaID = context.arrQuanLyKhoaID;

  if (!arrNguoiDieuPhoiID?.length || !arrQuanLyKhoaID?.length) {
    try {
      const khoaDichId =
        populated.KhoaDichID?._id || populated.KhoaDichID || yeuCau.KhoaDichID;
      if (khoaDichId) {
        const config = await CauHinhThongBaoKhoa.findOne({
          KhoaID: khoaDichId,
        });
        if (config) {
          if (!arrNguoiDieuPhoiID?.length) {
            arrNguoiDieuPhoiID = config.layDanhSachNguoiDieuPhoiIDs?.() || [];
          }
          if (!arrQuanLyKhoaID?.length) {
            arrQuanLyKhoaID = config.layDanhSachQuanLyKhoaIDs?.() || [];
          }
        }
      }
    } catch (error) {
      console.error(
        "[NotificationDataBuilders] Error computing department config:",
        error.message
      );
    }
  }

  // 2. arrNguoiLienQuanID from YeuCau model
  let arrNguoiLienQuanID = context.arrNguoiLienQuanID;

  if (!arrNguoiLienQuanID?.length) {
    try {
      // Try model method if available (for Mongoose documents)
      if (typeof yeuCau.getRelatedNhanVien === "function") {
        arrNguoiLienQuanID = yeuCau.getRelatedNhanVien();
      } else {
        // Manual compute from fields (for .lean() objects or when method unavailable)
        const extractId = (field) => {
          if (!field) return null;
          if (field._id) return field._id.toString();
          return field.toString();
        };

        const ids = [
          extractId(yeuCau.NguoiYeuCauID || populated?.NguoiYeuCauID),
          extractId(yeuCau.NguoiXuLyID || populated?.NguoiXuLyID),
          extractId(yeuCau.NguoiDieuPhoiID || populated?.NguoiDieuPhoiID),
          extractId(
            yeuCau.NguoiDuocDieuPhoiID || populated?.NguoiDuocDieuPhoiID
          ),
          extractId(yeuCau.NguoiNhanID || populated?.NguoiNhanID),
        ].filter(Boolean);

        arrNguoiLienQuanID = [...new Set(ids)];
      }
    } catch (error) {
      console.error(
        "[NotificationDataBuilders] Error computing related people:",
        error.message
      );
    }
  }

  // Ensure arrays (never null/undefined)
  arrNguoiDieuPhoiID = arrNguoiDieuPhoiID || [];
  arrQuanLyKhoaID = arrQuanLyKhoaID || [];
  arrNguoiLienQuanID = arrNguoiLienQuanID || [];

  return {
    // ============================================
    // RECIPIENT CANDIDATES (10 fields)
    // ============================================
    _id: yeuCau._id.toString(),
    NguoiYeuCauID: populated.NguoiYeuCauID?._id?.toString() || null,
    NguoiXuLyID: populated.NguoiXuLyID?._id?.toString() || null,
    NguoiDuocDieuPhoiID:
      populated.NguoiDuocDieuPhoiID?._id?.toString() ||
      context.nguoiDuocDieuPhoiID ||
      null,
    arrNguoiDieuPhoiID, // Auto-computed from CauHinhThongBaoKhoa
    arrQuanLyKhoaID, // Auto-computed from CauHinhThongBaoKhoa
    arrNguoiLienQuanID, // Auto-computed from yeuCau.getRelatedNhanVien()
    NguoiSuaID: context.nguoiSuaId || null,
    NguoiBinhLuanID: context.nguoiBinhLuanId || null,
    NguoiXoaID: context.nguoiXoaId || null,
    NguoiNhanID: context.nguoiNhanId || null,

    // ============================================
    // DISPLAY FIELDS (20 fields)
    // ============================================
    MaYeuCau: yeuCau.MaYeuCau || "",
    TieuDe: yeuCau.TieuDe || "",
    MoTa: yeuCau.MoTa || "",
    TenKhoaGui: populated.KhoaNguonID?.TenKhoa || "",
    TenKhoaNhan: populated.KhoaDichID?.TenKhoa || "",
    TenLoaiYeuCau:
      context.snapshotDanhMuc?.TenLoaiYeuCau ||
      populated.DanhMucYeuCauID?.TenLoaiYeuCau ||
      "",
    TenNguoiYeuCau: populated.NguoiYeuCauID?.Ten || "",
    TenNguoiXuLy: populated.NguoiXuLyID?.Ten || "",
    TenNguoiDuocDieuPhoi: populated.NguoiDuocDieuPhoiID?.Ten || "",
    TenNguoiSua: context.tenNguoiSua || context.nguoiSua?.Ten || "",
    TenNguoiThucHien: context.tenNguoiThucHien || "",
    TenNguoiXoa: context.tenNguoiXoa || "",
    TenNguoiComment:
      context.tenNguoiBinhLuan || context.nguoiBinhLuan?.Ten || "",
    ThoiGianHen: yeuCau.ThoiGianHen
      ? dayjs(yeuCau.ThoiGianHen).format("DD/MM/YYYY HH:mm")
      : "",
    ThoiGianHenCu: context.thoiGianHenCu || "",
    TrangThai: yeuCau.TrangThai || "",
    LyDoTuChoi: yeuCau.LyDoTuChoi || "",
    DiemDanhGia: yeuCau.DiemDanhGia || 0,
    NoiDungDanhGia: yeuCau.NoiDungDanhGia || "",
    NoiDungComment: context.noiDungComment || context.NoiDungComment || "",
    NoiDungThayDoi: context.noiDungThayDoi || context.NoiDungThayDoi || "",
  };
}

/**
 * Build CongViec Notification Data
 * Returns ALL 29 CongViec variables for any notification type
 *
 * @param {Object} congViec - CongViec document (will be populated if needed)
 * @param {Object} context - Additional context fields
 * @param {string} context.nguoiGiaoViecId - ID of assigner
 * @param {string} context.tenNguoiGiao - Name of assigner
 * @param {string} context.nguoiChinhMoiId - ID of new main person
 * @param {string} context.tenNguoiChinhMoi - Name of new main person
 * @param {string} context.nguoiThamGiaMoiId - ID of new participant
 * @param {string} context.nguoiThamGiaBiXoaId - ID of removed participant
 * @param {string} context.tenNguoiCapNhat - Name of person who updated
 * @param {string} context.tenNguoiThucHien - Name of person who performed action
 * @param {string} context.tenNguoiComment - Name of commenter
 * @param {string} context.noiDungComment - Comment content
 * @param {string} context.mucDoUuTienCu - Old priority level
 * @param {string} context.ngayHetHanCu - Old deadline
 * @param {string} context.tienDoMoi - New progress percentage
 * @param {string} context.tenFile - File name
 * @param {Array} context.nguoiThamGiaIds - Array of participant IDs
 * @returns {Object} Complete data object with 29 fields
 */
async function buildCongViecNotificationData(congViec, context = {}) {
  // Ensure congViec is populated
  let populated = congViec;
  if (!congViec.NguoiChinhID?.Ten) {
    populated = await congViec.populate([
      "NguoiChinhID",
      "NguoiGiaoViecID",
      "NguoiThamGia",
    ]);
  }

  return {
    // ============================================
    // RECIPIENT CANDIDATES (6 fields)
    // ============================================
    _id: congViec._id.toString(),
    NguoiChinhID: populated.NguoiChinhID?._id?.toString() || null,
    NguoiGiaoViecID:
      context.nguoiGiaoViecId ||
      populated.NguoiGiaoViecID?._id?.toString() ||
      null,
    NguoiThamGia:
      context.nguoiThamGiaIds ||
      (populated.NguoiThamGia || []).map(
        (p) => p._id?.toString() || p.toString()
      ),
    NguoiThamGiaMoi: context.nguoiThamGiaMoiId || null,
    NguoiThamGiaBiXoa: context.nguoiThamGiaBiXoaId || null,
    NguoiChinhMoi: context.nguoiChinhMoiId || null,

    // ============================================
    // DISPLAY FIELDS (22 fields)
    // ============================================
    MaCongViec: congViec.MaCongViec || "",
    TieuDe: congViec.TieuDe || "",
    MoTa: congViec.MoTa || "",
    TenNguoiChinh: populated.NguoiChinhID?.Ten || "",
    TenNguoiGiao: context.tenNguoiGiao || populated.NguoiGiaoViecID?.Ten || "",
    TenNguoiCapNhat: context.tenNguoiCapNhat || "",
    TenNguoiChinhMoi: context.tenNguoiChinhMoi || "",
    TenNguoiThucHien: context.tenNguoiThucHien || "",
    MucDoUuTienMoi: congViec.DoUuTien || "Bình thường",
    MucDoUuTienCu: context.mucDoUuTienCu || "",
    TrangThai: congViec.TrangThai || "",
    TienDoMoi:
      context.tienDoMoi !== undefined
        ? context.tienDoMoi
        : congViec.TienDo || 0,
    NgayHetHan: congViec.NgayHetHan
      ? dayjs(congViec.NgayHetHan).format("DD/MM/YYYY")
      : "",
    NgayHetHanCu: context.ngayHetHanCu || "",
    NgayHetHanMoi: congViec.NgayHetHan
      ? dayjs(congViec.NgayHetHan).format("DD/MM/YYYY")
      : "",
    TenFile: context.tenFile || "",
    NoiDungComment: context.noiDungComment || "",
    TenNguoiComment: context.tenNguoiComment || "",
  };
}

/**
 * Build KPI Notification Data
 * Returns ALL 16 KPI variables for any notification type
 *
 * @param {Object} danhGiaKPI - DanhGiaKPI document (will be populated if needed)
 * @param {Object} context - Additional context fields
 * @param {string} context.nguoiDanhGiaId - ID of evaluator
 * @param {string} context.tenNguoiDanhGia - Name of evaluator
 * @param {string} context.tenChuKy - Cycle name
 * @param {string} context.tenTieuChi - Criteria name
 * @param {string} context.tenNhiemVu - Task/duty name
 * @param {string} context.tenNguoiDuyet - Name of approver
 * @param {number} context.diemTuDanhGia - Self-evaluation score
 * @param {number} context.diemQL - Manager evaluation score
 * @param {number} context.tongDiemKPI - Total KPI score
 * @param {string} context.phanHoi - Feedback content
 * @param {string} context.lyDo - Reason (for rejection/undo)
 * @returns {Object} Complete data object with 16 fields
 */
async function buildKPINotificationData(danhGiaKPI, context = {}) {
  // Ensure danhGiaKPI is populated
  let populated = danhGiaKPI;
  if (!danhGiaKPI.NhanVienID?.Ten) {
    populated = await danhGiaKPI.populate(["NhanVienID", "ChuKyID"]);
  }

  return {
    // ============================================
    // RECIPIENT CANDIDATES (2 fields)
    // ============================================
    _id: danhGiaKPI._id.toString(),
    NhanVienID: populated.NhanVienID?._id?.toString() || null,
    NguoiDanhGiaID: context.nguoiDanhGiaId || null,

    // ============================================
    // DISPLAY FIELDS (13 fields)
    // ============================================
    TenNhanVien: populated.NhanVienID?.Ten || "",
    TenNguoiDanhGia: context.tenNguoiDanhGia || "",
    TenChuKy: context.tenChuKy || populated.ChuKyID?.TenChuKy || "",
    TenTieuChi: context.tenTieuChi || "",
    TenNhiemVu: context.tenNhiemVu || "",
    TenNguoiDuyet: context.tenNguoiDuyet || "",
    TongDiemKPI:
      context.tongDiemKPI !== undefined
        ? context.tongDiemKPI
        : danhGiaKPI.TongDiemKPI || 0,
    DiemTuDanhGia:
      context.diemTuDanhGia !== undefined
        ? context.diemTuDanhGia
        : danhGiaKPI.DiemTuDanhGia || 0,
    DiemQL:
      context.diemQL !== undefined
        ? context.diemQL
        : danhGiaKPI.DiemQuanLy || 0,
    PhanHoi: context.phanHoi || "",
    LyDo: context.lyDo || "",
  };
}

module.exports = {
  buildYeuCauNotificationData,
  buildCongViecNotificationData,
  buildKPINotificationData,
};
