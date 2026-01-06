console.log("🔥🔥🔥 congViec.service.js LOADED AT:", new Date().toISOString());

const mongoose = require("mongoose");
const { AppError } = require("../../../helpers/utils");

const User = require("../../../models/User");
const NhanVien = require("../../../models/NhanVien");
const CongViec = require("../models/CongViec");
const Counter = require("../models/Counter");
const BinhLuan = require("../models/BinhLuan");
const TepTin = require("../models/TepTin");
const ChuKyDanhGia = require("../models/ChuKyDanhGia");
const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const notificationService = require("./notificationService");
const deadlineScheduler = require("../helpers/deadlineScheduler");
const dayjs = require("dayjs");

function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

/**
 * Helper function kiểm tra quyền xem công việc (relationship-based)
 * User có quyền xem nếu là: Assigner, Main, Participant, Manager, hoặc Admin
 */
async function checkTaskViewPermission(congviec, req) {
  const currentUser = await User.findById(req.userId).lean();
  if (!currentUser?.NhanVienID) {
    throw new AppError(
      400,
      "Tài khoản chưa liên kết với nhân viên. Vui lòng liên hệ quản trị viên."
    );
  }

  const currentNhanVienId = String(currentUser.NhanVienID);
  const isAssigner = String(congviec.NguoiGiaoViecID) === currentNhanVienId;
  const isMain = String(congviec.NguoiChinhID) === currentNhanVienId;
  const isParticipant = congviec.NguoiThamGia?.some(
    (p) => String(p.NhanVienID || p.NhanVienID?._id) === currentNhanVienId
  );

  const vaiTro = currentUser.PhanQuyen?.toLowerCase();
  const isAdmin = ["admin", "superadmin"].includes(vaiTro);

  const hasPermission = isAssigner || isMain || isParticipant || isAdmin;

  if (!hasPermission) {
    throw new AppError(403, "Bạn không có quyền xem công việc này");
  }

  return true;
}

/**
 * Helper function kiểm tra quyền cập nhật công việc với field-level validation
 * @returns {Object} { allowed: boolean, role: string, invalidFields?: string[], message?: string }
 */
function checkUpdatePermission(congViec, nhanVienId, vaiTro, updateFields) {
  const normalizedRole = (vaiTro || "").toLowerCase();
  const isAdmin = ["admin", "superadmin"].includes(normalizedRole);
  const isOwner = String(congViec.NguoiGiaoViecID) === String(nhanVienId);
  const isMain = String(congViec.NguoiChinhID) === String(nhanVienId);

  // Admin: Có thể sửa tất cả trường cấu hình (trừ auto-calculated)
  if (isAdmin) {
    return { allowed: true, role: "admin" };
  }

  // Owner: Có thể sửa các trường cấu hình chính
  const ownerAllowedFields = [
    "TieuDe",
    "MoTa",
    "NgayBatDau",
    "NgayHetHan",
    "MucDoUuTien",
    "CoDuyetHoanThanh",
    "CanhBaoMode",
    "CanhBaoSapHetHanPercent",
    "NgayCanhBao",
    "NguoiChinhID",
    "NguoiThamGia",
    "NhomViecUserID",
  ];

  if (isOwner) {
    const invalidFields = updateFields.filter(
      (f) => !ownerAllowedFields.includes(f)
    );
    if (invalidFields.length > 0) {
      return {
        allowed: false,
        role: "owner",
        invalidFields,
        message: `Người giao việc không được sửa các trường: ${invalidFields.join(
          ", "
        )}`,
      };
    }
    return { allowed: true, role: "owner" };
  }

  // Main: CHỈ được sửa 2 trường
  const mainAllowedFields = ["NhiemVuThuongQuyID", "FlagNVTQKhac"];

  if (isMain) {
    const invalidFields = updateFields.filter(
      (f) => !mainAllowedFields.includes(f)
    );
    if (invalidFields.length > 0) {
      return {
        allowed: false,
        role: "main",
        invalidFields,
        message: `Người chính chỉ có thể sửa: Nhiệm vụ thường quy (NhiemVuThuongQuyID), Cờ NVTQ khác (FlagNVTQKhac). Không được sửa: ${invalidFields.join(
          ", "
        )}`,
      };
    }
    return { allowed: true, role: "main" };
  }

  // Người khác: Không có quyền
  return {
    allowed: false,
    role: "none",
    message: "Bạn không có quyền cập nhật công việc này",
  };
}

const service = {};
const { default: mongooseLeanVirtuals } = (() => {
  try {
    return require("mongoose-lean-virtuals");
  } catch (e) {
    return { default: null };
  }
})();

// Helper: map nhan vien + khoa to a compact Profile
function toProfileFromAgg(nvArr, khoaArr) {
  const nv = Array.isArray(nvArr) ? nvArr[0] : null;
  const khoa = Array.isArray(khoaArr) ? khoaArr[0] : null;
  if (!nv) return null;
  return {
    _id: String(nv._id),
    Ten: nv.Ten || null,
    Email: nv.Email || null,
    Khoa: khoa
      ? {
          _id: String(khoa._id),
          TenKhoa: khoa.TenKhoa || null,
          MaKhoa: khoa.MaKhoa || null,
        }
      : null,
  };
}

function toProfileFromPop(nv) {
  if (!nv) return null;
  const khoa = nv.KhoaID && typeof nv.KhoaID === "object" ? nv.KhoaID : null;
  return {
    _id: String(nv._id),
    Ten: nv.Ten || null,
    Email: nv.Email || null,
    Khoa: khoa
      ? {
          _id: String(khoa._id),
          TenKhoa: khoa.TenKhoa || null,
          MaKhoa: khoa.MaKhoa || null,
        }
      : null,
  };
}

function mapCongViecDTO(doc) {
  // Works for both aggregate results (with *Info arrays) and populated docs
  const hasAgg =
    doc &&
    (doc.NguoiGiaoViecInfo || doc.NguoiChinhInfo || doc.NguoiGiaoKhoaInfo);
  const NguoiGiaoProfile = hasAgg
    ? toProfileFromAgg(doc.NguoiGiaoViecInfo, doc.NguoiGiaoKhoaInfo)
    : toProfileFromPop(doc.NguoiGiaoViec || doc.NguoiGiaoViecID);
  const NguoiChinhProfile = hasAgg
    ? toProfileFromAgg(doc.NguoiChinhInfo, doc.NguoiChinhKhoaInfo)
    : toProfileFromPop(doc.NguoiChinh || doc.NguoiChinhID);

  // Strip internal lookup arrays to keep payload clean
  const {
    NguoiGiaoViecInfo,
    NguoiGiaoKhoaInfo,
    NguoiChinhInfo,
    NguoiChinhKhoaInfo,
    ...rest
  } = doc || {};
  // Clone then prune heavy/internal fields
  const cleanDoc = { ...rest };
  delete cleanDoc.NguoiGiaoViecInfo;
  delete cleanDoc.NguoiChinhInfo;
  delete cleanDoc.NguoiGiaoKhoaInfo;
  delete cleanDoc.NguoiChinhKhoaInfo;
  delete cleanDoc.NguoiGiaoViec; // populated doc if any
  delete cleanDoc.NguoiChinh; // populated doc if any

  const SoThuTu = doc.SoThuTu != null ? Number(doc.SoThuTu) : undefined;
  const MaCongViec =
    doc.MaCongViec ||
    (SoThuTu != null ? `CV${String(SoThuTu).padStart(5, "0")}` : undefined);

  const dto = {
    ...cleanDoc,
    MaCongViec,
    SoThuTu,
    NguoiGiaoViecID: doc.NguoiGiaoViecID ? String(doc.NguoiGiaoViecID) : "",
    NguoiChinhID: doc.NguoiChinhID ? String(doc.NguoiChinhID) : "",
    NguoiGiaoProfile,
    NguoiChinhProfile,
    updatedAt: doc.updatedAt,
    NhiemVuThuongQuyID: doc.NhiemVuThuongQuyID
      ? String(doc.NhiemVuThuongQuyID)
      : null,
    FlagNVTQKhac: !!doc.FlagNVTQKhac,
  };
  // Chuẩn hóa kiểu Date thành JS Date (giữ nguyên nếu đã là string/Date)
  if (doc.NgayGiaoViec) dto.NgayGiaoViec = new Date(doc.NgayGiaoViec);
  if (doc.NgayCanhBao) dto.NgayCanhBao = new Date(doc.NgayCanhBao);
  if (doc.NgayBatDau) dto.NgayBatDau = new Date(doc.NgayBatDau);
  if (doc.NgayHetHan) dto.NgayHetHan = new Date(doc.NgayHetHan);
  if (doc.NgayHoanThanh) dto.NgayHoanThanh = new Date(doc.NgayHoanThanh);
  // Virtual có thể đã được lean virtuals; nếu không, tự tính đơn giản
  dto.TinhTrangThoiHan =
    doc.TinhTrangThoiHan ||
    (function () {
      try {
        const now = new Date();
        const isDone = doc.TrangThai === "HOAN_THANH";
        const hetHan = doc.NgayHetHan ? new Date(doc.NgayHetHan) : null;
        const canhBao = doc.NgayCanhBao ? new Date(doc.NgayCanhBao) : null;
        if (isDone) return null;
        if (hetHan && now > hetHan) return "QUA_HAN";
        if (canhBao && hetHan && now >= canhBao && now < hetHan)
          return "SAP_QUA_HAN";
        return null;
      } catch (_) {
        return null;
      }
    })();

  // Map lịch sử trạng thái (nếu có) – đảm bảo không trả về object Mongoose thô
  if (Array.isArray(doc?.LichSuTrangThai)) {
    dto.LichSuTrangThai = doc.LichSuTrangThai.map((h) => {
      const performer = h.NguoiThucHienID;
      const performerIsObj = performer && typeof performer === "object";
      const performerId = performerIsObj ? performer._id : performer;
      return {
        CongViecID: String(doc._id),
        HanhDong: h.HanhDong,
        NguoiThucHienID: performerId ? String(performerId) : null,
        NguoiThucHien: performerIsObj
          ? {
              _id: String(performerId),
              Ten:
                performer.Ten || performer.HoTen || performer.UserName || null,
              Email: performer.Email || null,
            }
          : undefined,
        TuTrangThai: h.TuTrangThai || null,
        DenTrangThai: h.DenTrangThai || null,
        ThoiGian: h.ThoiGian || h.createdAt || null,
        GhiChu: h.GhiChu || "",
        IsRevert: !!h.IsRevert,
        ResetFields:
          h.ResetFields && h.ResetFields.length ? h.ResetFields : undefined,
        Snapshot: h.Snapshot || undefined,
      };
    });
  }
  // Map lịch sử tiến độ nếu có
  if (Array.isArray(doc?.LichSuTienDo)) {
    dto.LichSuTienDo = doc.LichSuTienDo.map((p) => {
      const performer = p.NguoiThucHienID;
      const performerIsObj = performer && typeof performer === "object";
      const performerId = performerIsObj ? performer._id : performer;
      return {
        CongViecID: String(doc._id),
        Tu: typeof p.Tu === "number" ? p.Tu : null,
        Den: typeof p.Den === "number" ? p.Den : null,
        ThoiGian: p.ThoiGian || p.createdAt || null,
        NguoiThucHienID: performerId ? String(performerId) : null,
        NguoiThucHien: performerIsObj
          ? {
              _id: String(performerId),
              Ten:
                performer.Ten || performer.HoTen || performer.UserName || null,
              Email: performer.Email || null,
            }
          : undefined,
        GhiChu: p.GhiChu || "",
      };
    });
  }
  return dto;
}

// Cập nhật ghi chú cho một entry lịch sử trạng thái (inline edit)
async function updateLichSuTrangThaiNote(congViecId, index, note, userId) {
  if (!congViecId) throw new Error("INVALID_ID");
  const cv = await CongViec.findById(congViecId).populate(
    "LichSuTrangThai.NguoiThucHienID",
    "Ten HoTen Email"
  );
  if (!cv) throw new Error("NOT_FOUND");
  if (!Array.isArray(cv.LichSuTrangThai)) throw new Error("NO_HISTORY");
  if (index < 0 || index >= cv.LichSuTrangThai.length)
    throw new Error("INVALID_INDEX");
  const entry = cv.LichSuTrangThai[index];
  if (!entry) throw new Error("ENTRY_NOT_FOUND");
  const performerIdRaw = entry.NguoiThucHienID;
  const performerId =
    performerIdRaw && typeof performerIdRaw === "object" && performerIdRaw._id
      ? performerIdRaw._id
      : performerIdRaw; // nếu đã populate thì lấy _id, nếu chưa thì dùng trực tiếp ObjectId
  if (String(performerId) !== String(userId)) {
    console.warn("[updateLichSuTrangThaiNote] FORBIDDEN", {
      congViecId: String(congViecId),
      requestedIndex: index,
      entryNguoiThucHienID: performerIdRaw, // log object đầy đủ để debug
      extractedPerformerId: String(performerId),
      requesterNhanVienId: String(userId),
      historyLength: cv.LichSuTrangThai.length,
    });
    const err = new Error("FORBIDDEN");
    err.statusCode = 403;
    throw err;
  }
  entry.GhiChu = note || "";
  await cv.save();
  return mapCongViecDTO(cv);
}

service.updateLichSuTrangThaiNote = updateLichSuTrangThaiNote;

// Cập nhật ghi chú cho một entry lịch sử tiến độ
async function updateLichSuTienDoNote(congViecId, index, note, userId) {
  if (!congViecId) throw new Error("INVALID_ID");
  const cv = await CongViec.findById(congViecId).populate(
    "LichSuTienDo.NguoiThucHienID",
    "Ten HoTen Email UserName"
  );
  if (!cv) throw new Error("NOT_FOUND");
  if (!Array.isArray(cv.LichSuTienDo)) throw new Error("NO_HISTORY");
  if (index < 0 || index >= cv.LichSuTienDo.length)
    throw new Error("INVALID_INDEX");
  const entry = cv.LichSuTienDo[index];
  if (!entry) throw new Error("ENTRY_NOT_FOUND");
  const performer = entry.NguoiThucHienID;
  const performerId =
    performer && typeof performer === "object" && performer._id
      ? performer._id
      : performer;
  if (String(performerId) !== String(userId)) {
    const err = new Error("FORBIDDEN");
    err.statusCode = 403;
    throw err;
  }
  entry.GhiChu = note || "";
  await cv.save();
  return mapCongViecDTO(cv);
}

service.updateLichSuTienDoNote = updateLichSuTienDoNote;

/**
 * Cập nhật tiến độ (PhanTramTienDoTong) với lịch sử LichSuTienDo.
 * Chỉ Người Chính được phép. Cho phép giảm tiến độ.
 * Nếu cập nhật lên 100% và TrangThai chưa HOAN_THANH: tự chuyển TrangThai=HOAN_THANH + set NgayHoanThanh.
 */
service.updateProgress = async (congviecId, payload, req) => {
  if (!mongoose.Types.ObjectId.isValid(congviecId)) {
    throw new AppError(400, "ID công việc không hợp lệ");
  }
  const { value, ghiChu, expectedVersion } = payload || {};
  if (typeof value !== "number" || value < 0 || value > 100) {
    throw new AppError(400, "Giá trị tiến độ phải trong [0,100]");
  }
  const cv = await CongViec.findOne({
    _id: congviecId,
    isDeleted: { $ne: true },
  }).populate("LichSuTienDo.NguoiThucHienID", "Ten Email HoTen UserName");
  if (!cv) throw new AppError(404, "Không tìm thấy công việc");
  const performerId = req.user?.NhanVienID;
  if (!performerId) {
    throw new AppError(401, "Không xác định được nhân viên thực hiện");
  }
  if (String(cv.NguoiChinhID) !== String(performerId)) {
    throw new AppError(403, "Chỉ Người Chính được cập nhật tiến độ");
  }
  // Concurrency guard: compare updatedAt (millisecond) with expectedVersion (ISO string) if provided
  if (expectedVersion) {
    const currentVersion = cv.updatedAt ? cv.updatedAt.toISOString() : null;
    if (currentVersion && currentVersion !== expectedVersion) {
      throw new AppError(
        409,
        "Dữ liệu đã thay đổi, vui lòng tải lại (progress)"
      );
    }
  }
  const old =
    typeof cv.PhanTramTienDoTong === "number" ? cv.PhanTramTienDoTong : 0;
  if (old === value) {
    // Still log history? Business: nếu không đổi không tạo entry
    return mapCongViecDTO(cv);
  }
  cv.PhanTramTienDoTong = value;
  // Append history entry
  cv.LichSuTienDo.push({
    Tu: old,
    Den: value,
    NguoiThucHienID: performerId,
    GhiChu: ghiChu || undefined,
  });
  // Auto-complete if 100%
  let autoCompleted = false;
  if (value === 100 && cv.TrangThai !== "HOAN_THANH") {
    const prevStatus = cv.TrangThai;
    cv.TrangThai = "HOAN_THANH";
    cv.NgayHoanThanh = new Date();
    autoCompleted = true;
    cv.LichSuTrangThai.push({
      HanhDong: "AUTO_COMPLETE_BY_PROGRESS",
      NguoiThucHienID: performerId,
      TuTrangThai: prevStatus,
      DenTrangThai: "HOAN_THANH",
      GhiChu: "Tự động chuyển hoàn thành do tiến độ đạt 100%",
    });
  }
  await cv.save();

  // Fire notification trigger for progress update
  try {
    const performer = await NhanVien.findById(performerId).select("Ten").lean();

    // Lấy danh sách người liên quan (NguoiGiaoViec, NguoiChinh, NguoiThamGia)
    const arrNguoiLienQuanID = [
      cv.NguoiGiaoViecID?.toString(),
      cv.NguoiChinhID?.toString(),
      ...(cv.NguoiThamGia || []).map((p) => p.NhanVienID?.toString()),
    ].filter((id) => id && id !== performerId.toString());

    const {
      buildCongViecNotificationData,
    } = require("../helpers/notificationDataBuilders");
    const notificationData = await buildCongViecNotificationData(cv, {
      tenNguoiCapNhat: performer?.Ten || "",
      tienDoMoi: value,
    });
    await notificationService.send({
      type: "congviec-cap-nhat-tien-do",
      data: notificationData,
    });
    console.log(
      "[CongViecService] ✅ Sent notification: congviec-cap-nhat-tien-do"
    );
  } catch (error) {
    console.error(
      "[CongViecService] ❌ Progress notification trigger failed:",
      error.message
    );
  }

  // Populate performers for mapping (only need main & progress performers; reuse get detail populate subset)
  const populated = await CongViec.findById(cv._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "LichSuTienDo.NguoiThucHienID",
      select: "Ten Email HoTen UserName",
    })
    .select(
      "MaCongViec SoThuTu PhanTramTienDoTong TrangThai NgayHoanThanh NguoiGiaoViecID NguoiChinhID LichSuTienDo LichSuTrangThai updatedAt"
    )
    .lean();
  const dto = mapCongViecDTO(populated);
  // Patch response optimization could be added later; for now return full subset
  dto._progressAutoCompleted = autoCompleted;
  return dto;
};

/**
 * Gán nhiệm vụ thường quy cho công việc
 * Chỉ Người Chính hoặc Người Giao Việc được phép
 */
service.assignRoutineTask = async (congviecId, payload, req) => {
  if (!mongoose.Types.ObjectId.isValid(congviecId)) {
    throw new AppError(400, "ID công việc không hợp lệ");
  }

  const { nhiemVuThuongQuyID, isKhac, expectedVersion } = payload || {};

  // Validate: không thể vừa có ID vừa có flag Khác
  if (nhiemVuThuongQuyID && isKhac) {
    throw new AppError(
      400,
      "Không thể vừa chọn nhiệm vụ thường quy vừa đánh dấu 'Khác'"
    );
  }

  // Validate: nhiemVuThuongQuyID nếu có phải là ObjectId hợp lệ
  if (
    nhiemVuThuongQuyID &&
    !mongoose.Types.ObjectId.isValid(nhiemVuThuongQuyID)
  ) {
    throw new AppError(400, "ID nhiệm vụ thường quy không hợp lệ");
  }

  // Lấy công việc
  const cv = await CongViec.findOne({
    _id: congviecId,
    isDeleted: { $ne: true },
  });

  if (!cv) {
    throw new AppError(404, "Không tìm thấy công việc");
  }

  // Check permission
  const currentUser = await User.findById(req.userId).lean();
  if (!currentUser?.NhanVienID) {
    throw new AppError(400, "Tài khoản chưa liên kết với nhân viên");
  }

  const performerId = String(currentUser.NhanVienID);
  const isMain = String(cv.NguoiChinhID) === performerId;
  const isOwner = String(cv.NguoiGiaoViecID) === performerId;
  const normalizedRole = (currentUser.PhanQuyen || "").toLowerCase();
  const isAdmin = ["admin", "superadmin"].includes(normalizedRole);

  if (!isMain && !isOwner && !isAdmin) {
    throw new AppError(
      403,
      "Chỉ người thực hiện chính, người giao việc hoặc admin được gán nhiệm vụ thường quy"
    );
  }

  // Version guard: check optimistic concurrency
  if (expectedVersion) {
    const currentVersion = cv.updatedAt ? cv.updatedAt.toISOString() : null;
    if (currentVersion && currentVersion !== expectedVersion) {
      throw new AppError(
        409,
        "VERSION_CONFLICT",
        "Dữ liệu đã thay đổi, vui lòng tải lại"
      );
    }
  }

  // Validate nhiemVuThuongQuyID nếu có: phải tồn tại trong hệ thống
  if (nhiemVuThuongQuyID) {
    const nvtqExists = await NhiemVuThuongQuy.exists({
      _id: nhiemVuThuongQuyID,
    });
    if (!nvtqExists) {
      throw new AppError(404, "Nhiệm vụ thường quy không tồn tại");
    }

    // Optional: Validate rằng nhiệm vụ này được giao cho nhân viên trong chu kỳ hiện tại
    // (Có thể bỏ qua nếu muốn cho phép gán linh hoạt)
    const assignment = await NhanVienNhiemVu.findOne({
      NhanVienID: cv.NguoiChinhID,
      NhiemVuThuongQuyID: nhiemVuThuongQuyID,
    }).lean();

    if (!assignment) {
      // Warning nhưng vẫn cho phép gán (có thể chuyển thành throw AppError nếu muốn strict)
      console.warn(
        `[assignRoutineTask] Warning: Nhiệm vụ ${nhiemVuThuongQuyID} không được giao cho nhân viên ${cv.NguoiChinhID} trong bất kỳ chu kỳ nào`
      );
    }
  }

  // Update công việc
  const oldNhiemVuID = cv.NhiemVuThuongQuyID;
  const oldFlagKhac = cv.FlagNVTQKhac;

  if (isKhac) {
    // Đánh dấu "Khác" - xóa liên kết nhiệm vụ
    cv.NhiemVuThuongQuyID = null;
    cv.FlagNVTQKhac = true;
  } else if (nhiemVuThuongQuyID) {
    // Gán nhiệm vụ cụ thể
    cv.NhiemVuThuongQuyID = nhiemVuThuongQuyID;
    cv.FlagNVTQKhac = false;
  } else {
    // Clear cả hai (unassign)
    cv.NhiemVuThuongQuyID = null;
    cv.FlagNVTQKhac = false;
  }

  await cv.save();

  // Populate để trả về DTO đầy đủ
  const populated = await CongViec.findById(cv._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NhiemVuThuongQuyID",
      select: "TenNhiemVu MoTa MucDoKho",
    })
    .lean();

  const dto = mapCongViecDTO(populated);

  // Log audit trail (optional)
  console.log(
    `[assignRoutineTask] User ${performerId} assigned routine task to CongViec ${congviecId}: ` +
      `${oldNhiemVuID || "(none)"} (khác: ${oldFlagKhac}) -> ` +
      `${cv.NhiemVuThuongQuyID || "(none)"} (khác: ${cv.FlagNVTQKhac})`
  );

  return dto;
};

// Tính NgayCanhBao dựa theo mode
function computeNgayCanhBao({
  mode,
  ngayBatDau,
  ngayHetHan,
  fixedNgayCanhBao,
  percent,
}) {
  const DEFAULT_PERCENT = 0.8;
  const start = ngayBatDau ? new Date(ngayBatDau) : null;
  const end = ngayHetHan ? new Date(ngayHetHan) : null;
  if (!end) return null;
  if (mode === "FIXED") {
    if (!fixedNgayCanhBao) return null;
    const fixed = new Date(fixedNgayCanhBao);
    if (start && !(fixed >= start && fixed < end)) return null;
    return fixed;
  }
  const p = typeof percent === "number" ? percent : DEFAULT_PERCENT;
  if (!start) return null; // cần NgayBatDau để tính
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return null;
  const t = start.getTime() + Math.floor(ms * p);
  return new Date(t);
}

// Recompute warning date based on changed fields (Step 3)
function recomputeWarningIfNeeded(cv, changed = {}) {
  try {
    const mode = cv.CanhBaoMode;
    const start = cv.NgayBatDau;
    const end = cv.NgayHetHan;
    if (!end) return; // cannot compute
    if (mode === "PERCENT") {
      if (!start) return;
      const p =
        typeof cv.CanhBaoSapHetHanPercent === "number"
          ? cv.CanhBaoSapHetHanPercent
          : 0.8;
      cv.NgayCanhBao = computeNgayCanhBao({
        mode: "PERCENT",
        ngayBatDau: start,
        ngayHetHan: end,
        percent: p,
      });
    } else if (mode === "FIXED") {
      // Only validate fixed still inside interval; if out-of-range => null
      if (!cv.NgayCanhBao) return;
      const fixed = new Date(cv.NgayCanhBao);
      if (start && !(fixed >= start && fixed < end)) {
        cv.NgayCanhBao = null;
      } else if (!start && fixed >= end) {
        cv.NgayCanhBao = null;
      }
    }
  } catch (_) {
    // swallow
  }
}

/**
 * Lấy thông tin nhân viên theo ID
 */
service.getNhanVienById = async (nhanvienid) => {
  if (!mongoose.Types.ObjectId.isValid(nhanvienid)) {
    throw new AppError(400, "ID nhân viên không hợp lệ");
  }

  const nhanvien = await NhanVien.findById(nhanvienid)
    .select("Ten Email ChucDanhHienTai KhoaLamViecHienTai")
    .lean();

  if (!nhanvien) {
    throw new AppError(404, "Không tìm thấy nhân viên");
  }

  return nhanvien;
};

// ========================================
// Lấy danh sách Nhiệm Vụ Thường Quy theo CHU KỲ
// ========================================
try {
  const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");

  /**
   * Lấy danh sách nhiệm vụ thường quy của nhân viên theo chu kỳ
   * @param {ObjectId} nhanVienId - ID nhân viên
   * @param {Object} options - { chuKyId?: ObjectId }
   * @returns {Promise<Array>} Danh sách nhiệm vụ
   */
  service.getMyRoutineTasks = async (nhanVienId, options = {}) => {
    if (!nhanVienId) throw new AppError(400, "Thiếu nhanVienId");

    const ChuKyDanhGia = require("../models/ChuKyDanhGia");
    const { chuKyId } = options;

    // BƯỚC 1: Xác định chu kỳ
    let chuKy;

    if (chuKyId) {
      // User chọn chu kỳ cụ thể
      chuKy = await ChuKyDanhGia.findById(chuKyId);
      if (!chuKy) {
        throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
      }
    } else {
      // Mặc định: Lấy chu kỳ hiện tại (isDong=false, mới nhất)
      chuKy = await ChuKyDanhGia.layChuKyHienTai();

      if (!chuKy) {
        console.warn(
          `[getMyRoutineTasks] Không có chu kỳ đang mở cho nhanVienId=${nhanVienId}`
        );
        return [];
      }
    }

    console.log(
      `[getMyRoutineTasks] Chu kỳ: ${chuKy.TenChuKy} (${chuKy._id}), nhanVienId=${nhanVienId}`
    );

    // BƯỚC 2: Query assignments trong chu kỳ
    const list = await NhanVienNhiemVu.find({
      NhanVienID: nhanVienId,
      ChuKyDanhGiaID: chuKy._id,
      TrangThaiHoatDong: true,
    })
      .populate({
        path: "NhiemVuThuongQuyID",
        select: "TenNhiemVu MoTa MucDoKho TrangThaiHoatDong isDeleted",
      })
      .lean();

    // BƯỚC 3: Filter & Transform
    return list
      .filter(
        (x) =>
          x.NhiemVuThuongQuyID &&
          x.NhiemVuThuongQuyID.isDeleted !== true &&
          x.NhiemVuThuongQuyID.TrangThaiHoatDong === true
      )
      .map((x) => {
        const duty = x.NhiemVuThuongQuyID;
        return {
          _id: String(duty._id),
          Ten: duty.TenNhiemVu || "",
          TenNhiemVu: duty.TenNhiemVu || "",
          MoTa: duty.MoTa || "",
          MaNhiemVu: "",
          TrangThai: duty.TrangThaiHoatDong ? "ACTIVE" : "INACTIVE",
          MucDoKho: duty.MucDoKho ?? null,
        };
      })
      .sort((a, b) =>
        (a.Ten || "").localeCompare(b.Ten || "", "vi", {
          numeric: true,
          sensitivity: "base",
        })
      );
  };

  /**
   * Lấy danh sách chu kỳ (cho dropdown selection)
   * @returns {Promise<Array>} Danh sách chu kỳ
   */
  service.getDanhSachChuKy = async () => {
    const ChuKyDanhGia = require("../models/ChuKyDanhGia");
    return await ChuKyDanhGia.layDanhSachChuKy();
  };
} catch (_) {
  // Fallback nếu model chưa tồn tại
  service.getMyRoutineTasks = async () => {
    console.warn("[getMyRoutineTasks] NhanVienNhiemVu model not found");
    return [];
  };
  service.getDanhSachChuKy = async () => {
    console.warn("[getDanhSachChuKy] ChuKyDanhGia model not found");
    return [];
  };
}

/**
 * Xây dựng query filter cho công việc
 */
service.buildCongViecFilter = (filters = {}) => {
  const query = { isDeleted: { $ne: true } };

  // Search trong TieuDe và MoTa
  if (filters.search) {
    const searchRegex = new RegExp(filters.search, "i");
    query.$or = [{ TieuDe: searchRegex }, { MoTa: searchRegex }];
  }

  // Filter theo TrangThai
  if (filters.TrangThai) {
    query.TrangThai = filters.TrangThai;
  }

  // Filter theo MucDoUuTien
  if (filters.MucDoUuTien) {
    query.MucDoUuTien = filters.MucDoUuTien;
  }

  // Filter theo NgayBatDau
  if (filters.NgayBatDau) {
    query.NgayBatDau = { $gte: new Date(filters.NgayBatDau) };
  }
  if (filters.NgayHetHan) {
    query.NgayHetHan = { $lte: new Date(filters.NgayHetHan) };
  }

  // Filter theo MaCongViec (ưu tiên khớp tiền tố, không phân biệt hoa thường)
  if (filters.MaCongViec) {
    const code = String(filters.MaCongViec).trim();
    query.MaCongViec = { $regex: `^${code}`, $options: "i" };
  }

  // Filter theo Người xử lý chính (NguoiChinhID)
  if (
    filters.NguoiChinhID &&
    mongoose.Types.ObjectId.isValid(filters.NguoiChinhID)
  ) {
    query.NguoiChinhID = new mongoose.Types.ObjectId(filters.NguoiChinhID);
  }

  return query;
};

/**
 * Lấy công việc mà nhân viên là người xử lý chính
 */
service.getReceivedCongViecs = async (
  nhanvienid,
  filters = {},
  page = 1,
  limit = 10
) => {
  if (!mongoose.Types.ObjectId.isValid(nhanvienid)) {
    throw new AppError(400, "ID nhân viên không hợp lệ");
  }

  // Ensure page and limit are valid numbers
  const safePage = Math.max(1, isNaN(page) ? 1 : parseInt(page));
  const safeLimit = Math.max(
    1,
    Math.min(100, isNaN(limit) ? 10 : parseInt(limit))
  );

  console.log("Service pagination values:", {
    originalPage: page,
    originalLimit: limit,
    safePage,
    safeLimit,
  });

  const query = service.buildCongViecFilter(filters);

  // ✅ FIX: Loại trừ công việc TAO_MOI cho người nhận việc
  // Chỉ người giao việc (owner) mới thấy TAO_MOI trong tab "Đã giao"
  // Người nhận việc chỉ thấy từ DA_GIAO trở đi
  query.TrangThai = { $ne: "TAO_MOI" };

  // Auto-detect: nhanvienid có thể là User._id hoặc NhanVien._id
  let targetNhanVienId = toObjectId(nhanvienid);

  try {
    // Kiểm tra có phải NhanVien._id hợp lệ không
    const isNhanVien = await NhanVien.exists({ _id: targetNhanVienId });

    if (!isNhanVien) {
      // Có thể là User._id, thử tìm User và lấy NhanVienID
      const user = await User.findById(targetNhanVienId);
      if (user?.NhanVienID) {
        targetNhanVienId = user.NhanVienID;
        console.log(
          `[getReceivedCongViecs] Converted User._id ${nhanvienid} to NhanVien._id ${targetNhanVienId}`
        );
      } else {
        console.warn(
          "[getReceivedCongViecs] Không tìm thấy NhanVien cho ID:",
          nhanvienid
        );
      }
    }
  } catch (e) {
    console.warn("[getReceivedCongViecs] Lỗi kiểm tra ID:", e);
  }

  // We need all tasks where user is main OR participant.
  const userObjectId = targetNhanVienId;
  let searchOrClause = null;
  if (query.$or) {
    // This is the search (TieuDe/MoTa). We'll move it into an AND group.
    searchOrClause = query.$or;
    delete query.$or;
  }
  const userParticipationOr = {
    $or: [
      { NguoiChinhID: userObjectId },
      { "NguoiThamGia.NhanVienID": userObjectId },
    ],
  };
  // Build finalQuery with $and to combine search (if any) and user participation
  const finalQuery = { ...query };
  const andArr = [];
  if (searchOrClause) andArr.push({ $or: searchOrClause });
  andArr.push(userParticipationOr);
  if (andArr.length === 1) {
    // Only user participation condition; just merge it
    Object.assign(finalQuery, userParticipationOr);
  } else {
    finalQuery.$and = andArr;
  }

  // DEBUG: Log constructed query & filters
  console.log("[getReceivedCongViecs] Built filters:", filters);
  console.log(
    "[getReceivedCongViecs] Final Mongo query:",
    JSON.stringify(finalQuery)
  );
  // Extra validation: ensure employee exists
  try {
    const exists = await NhanVien.exists({ _id: targetNhanVienId });
    if (!exists) {
      console.warn(
        "[getReceivedCongViecs] NhanVien không tồn tại với ID:",
        targetNhanVienId
      );
    }
  } catch (e) {
    console.warn("[getReceivedCongViecs] Lỗi kiểm tra tồn tại NhanVien:", e);
  }

  // Pagination
  const skip = (safePage - 1) * safeLimit;
  const totalItems = await CongViec.countDocuments(finalQuery);
  console.log(
    "[getReceivedCongViecs] countDocuments result:",
    totalItems,
    "with query",
    finalQuery
  );
  const totalPages = Math.ceil(totalItems / safeLimit);

  console.log(
    "Calculated skip value:",
    skip,
    "for page:",
    safePage,
    "limit:",
    safeLimit
  );

  // Aggregation pipeline để lấy thêm thông tin liên quan
  const pipeline = [
    { $match: finalQuery },
    // Populate NguoiGiaoViecID
    {
      $lookup: {
        from: "nhanviens",
        localField: "NguoiGiaoViecID",
        foreignField: "_id",
        as: "NguoiGiaoViecInfo",
      },
    },
    // Populate NguoiChinhID
    {
      $lookup: {
        from: "nhanviens",
        localField: "NguoiChinhID",
        foreignField: "_id",
        as: "NguoiChinhInfo",
      },
    },
    // Populate KhoaID cho NguoiGiaoViecInfo
    {
      $lookup: {
        from: "khoas",
        localField: "NguoiGiaoViecInfo.KhoaID",
        foreignField: "_id",
        as: "NguoiGiaoKhoaInfo",
      },
    },
    // Populate KhoaID cho NguoiChinhInfo
    {
      $lookup: {
        from: "khoas",
        localField: "NguoiChinhInfo.KhoaID",
        foreignField: "_id",
        as: "NguoiChinhKhoaInfo",
      },
    },
    // Thêm các trường tính toán gọn nhẹ, KHÔNG ghi đè ID
    {
      $addFields: {
        SoLuongNguoiThamGia: { $size: "$NguoiThamGia" },
        PhanTramTienDoTong: { $ifNull: ["$PhanTramTienDoTong", 0] },
      },
    },
    // Ẩn bớt các mảng lớn, giữ lại *Info để mapper tạo Profile
    { $project: { NguoiThamGia: 0, LichSuTrangThai: 0 } },
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: safeLimit },
  ];

  const congViecsRaw = await CongViec.aggregate(pipeline);
  const congViecs = congViecsRaw.map(mapCongViecDTO);
  console.log(
    "[getReceivedCongViecs] Aggregation returned",
    congViecs.length,
    "items"
  );

  // Lấy số lượng bình luận cho mỗi công việc
  const congViecIds = congViecs.map((cv) => cv._id);
  const binhLuanCounts = await BinhLuan.aggregate([
    {
      $match: {
        CongViecID: { $in: congViecIds },
        TrangThai: { $ne: "DELETED" },
      },
    },
    {
      $group: {
        _id: "$CongViecID",
        count: { $sum: 1 },
      },
    },
  ]);

  // Map số lượng bình luận vào từng công việc
  const binhLuanMap = {};
  binhLuanCounts.forEach((item) => {
    binhLuanMap[item._id] = item.count;
  });

  congViecs.forEach((cv) => {
    cv.SoLuongBinhLuan = binhLuanMap[cv._id] || 0;
  });

  return {
    CongViecs: congViecs,
    totalItems,
    totalPages,
    currentPage: safePage,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
};

/**
 * Lấy công việc mà nhân viên là người giao việc
 */
service.getAssignedCongViecs = async (
  nhanvienid,
  filters = {},
  page = 1,
  limit = 10
) => {
  if (!mongoose.Types.ObjectId.isValid(nhanvienid)) {
    throw new AppError(400, "ID nhân viên không hợp lệ");
  }
  console.log("nhanvienid:", nhanvienid);
  // Ensure page and limit are valid numbers
  const safePage = Math.max(1, isNaN(page) ? 1 : parseInt(page));
  const safeLimit = Math.max(
    1,
    Math.min(100, isNaN(limit) ? 10 : parseInt(limit))
  );

  // console.log("Assigned Service pagination values:", {
  //   originalPage: page,
  //   originalLimit: limit,
  //   safePage,
  //   safeLimit,
  // });

  const query = service.buildCongViecFilter(filters);

  // Auto-detect: nhanvienid có thể là User._id hoặc NhanVien._id
  // Kiểm tra xem có phải User._id không, nếu có thì lấy NhanVienID
  let targetNhanVienId = toObjectId(nhanvienid);

  try {
    // Kiểm tra có phải NhanVien._id hợp lệ không
    const isNhanVien = await NhanVien.exists({ _id: targetNhanVienId });

    if (!isNhanVien) {
      // Có thể là User._id, thử tìm User và lấy NhanVienID
      const user = await User.findById(targetNhanVienId);
      if (user?.NhanVienID) {
        targetNhanVienId = user.NhanVienID;
        console.log(
          `[getAssignedCongViecs] Converted User._id ${nhanvienid} to NhanVien._id ${targetNhanVienId}`
        );
      } else {
        console.warn(
          "[getAssignedCongViecs] Không tìm thấy NhanVien cho ID:",
          nhanvienid
        );
      }
    }
  } catch (e) {
    console.warn("[getAssignedCongViecs] Lỗi kiểm tra ID:", e);
  }

  query.NguoiGiaoViecID = targetNhanVienId;

  // Pagination
  const skip = (safePage - 1) * safeLimit;
  const totalItems = await CongViec.countDocuments(query);
  // console.log(
  //   "[getAssignedCongViecs] countDocuments result:",
  //   totalItems,
  //   "with query",
  //   query
  // );
  const totalPages = Math.ceil(totalItems / safeLimit);

  // console.log(
  //   "Assigned calculated skip value:",
  //   skip,
  //   "for page:",
  //   safePage,
  //   "limit:",
  //   safeLimit
  // );

  // Aggregation pipeline tương tự như getReceivedCongViecs nhưng không ghi đè ID
  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: "nhanviens",
        localField: "NguoiGiaoViecID",
        foreignField: "_id",
        as: "NguoiGiaoViecInfo",
      },
    },
    {
      $lookup: {
        from: "nhanviens",
        localField: "NguoiChinhID",
        foreignField: "_id",
        as: "NguoiChinhInfo",
      },
    },
    {
      $lookup: {
        from: "khoas",
        localField: "NguoiGiaoViecInfo.KhoaID",
        foreignField: "_id",
        as: "NguoiGiaoKhoaInfo",
      },
    },
    {
      $lookup: {
        from: "khoas",
        localField: "NguoiChinhInfo.KhoaID",
        foreignField: "_id",
        as: "NguoiChinhKhoaInfo",
      },
    },
    {
      $addFields: {
        SoLuongNguoiThamGia: { $size: "$NguoiThamGia" },
        PhanTramTienDoTong: { $ifNull: ["$PhanTramTienDoTong", 0] },
      },
    },
    { $project: { NguoiThamGia: 0, LichSuTrangThai: 0 } },
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: safeLimit },
  ];

  const congViecsRaw = await CongViec.aggregate(pipeline);
  const congViecs = congViecsRaw.map(mapCongViecDTO);

  // Lấy số lượng bình luận cho mỗi công việc
  const congViecIds = congViecs.map((cv) => cv._id);
  const binhLuanCounts = await BinhLuan.aggregate([
    {
      $match: {
        CongViecID: { $in: congViecIds },
        TrangThai: { $ne: "DELETED" },
      },
    },
    { $group: { _id: "$CongViecID", count: { $sum: 1 } } },
  ]);

  // Map số lượng bình luận vào từng công việc
  const binhLuanMap = {};
  binhLuanCounts.forEach((item) => {
    binhLuanMap[item._id] = item.count;
  });
  congViecs.forEach((cv) => {
    cv.SoLuongBinhLuan = binhLuanMap[cv._id] || 0;
  });

  return {
    CongViecs: congViecs,
    totalItems,
    totalPages,
    currentPage: safePage,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
};

/**
 * Xóa công việc (soft delete) với đầy đủ validation và cascade
 *
 * @improvements Applied fixes (2024-11):
 * - P0: Added view permission check before revealing task info (security - prevents information leakage)
 * - P1: NhanVienID validation (prevents authorization bypass)
 * - P1: Role normalization - case-insensitive + superadmin support
 * - P1: Cascade comment replies (data integrity - no orphaned replies)
 * - P2: Improved error messages with counts (better UX)
 * - P2: Audit trail with deletedAt and deletedBy (traceability)
 */
service.deleteCongViec = async (congviecid, req) => {
  // ✅ 1. ID validation
  if (!mongoose.Types.ObjectId.isValid(congviecid)) {
    throw new AppError(400, "ID công việc không hợp lệ");
  }

  // ✅ 2. Exists check
  const congviec = await CongViec.findById(congviecid);
  if (!congviec) {
    throw new AppError(404, "Không tìm thấy công việc");
  }

  // 🔥 P0 FIX: Permission check BEFORE revealing any information
  // Prevents information leakage - user cannot probe for task existence by attempting delete
  await checkTaskViewPermission(congviec, req);

  // ✅ 3. Optimistic lock check (version conflict detection)
  const clientVersion = req.headers["if-unmodified-since"];
  if (clientVersion) {
    const serverVersion = congviec.updatedAt
      ? congviec.updatedAt.toISOString()
      : null;
    if (serverVersion && serverVersion !== clientVersion) {
      throw new AppError(409, "VERSION_CONFLICT", "Version mismatch");
    }
  }

  // ✅ 4. Already deleted check
  if (congviec.isDeleted) {
    throw new AppError(400, "Công việc đã bị xóa");
  }

  // ✅ 5. User authentication
  const currentUser = await User.findById(req.userId).select(
    "PhanQuyen NhanVienID"
  );
  if (!currentUser) {
    throw new AppError(401, "Không xác thực được người dùng");
  }

  // 🔥 P1 FIX: NhanVienID validation (prevents authorization bypass)
  if (!currentUser.NhanVienID) {
    throw new AppError(
      403,
      "Tài khoản chưa được liên kết với nhân viên. Vui lòng liên hệ quản trị viên."
    );
  }

  // 🔥 P1 FIX: Role authorization with normalization (case-insensitive + superadmin support)
  const role = (currentUser.PhanQuyen || "").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";
  const isOwner =
    String(currentUser.NhanVienID) === String(congviec.NguoiGiaoViecID);

  // ✅ 6. Completed status restriction (only admin can delete completed tasks)
  if (congviec.TrangThai === "HOAN_THANH" && !isAdmin) {
    throw new AppError(
      403,
      "Chỉ quản trị viên (admin) mới được xóa công việc đã hoàn thành"
    );
  }

  // ✅ 7. Authorization check
  if (!(isAdmin || isOwner)) {
    throw new AppError(
      403,
      "Bạn không có quyền xóa công việc này (chỉ người giao việc hoặc admin)"
    );
  }

  // 🔥 P2 FIX: Children check with improved error message
  const childCount = await CongViec.countDocuments({
    CongViecChaID: congviecid,
    isDeleted: { $ne: true },
  });
  if (childCount > 0) {
    throw new AppError(
      400,
      `Không thể xóa vì còn ${childCount} công việc con. Vui lòng xóa các công việc con trước.`
    );
  }

  // 🔥 P2 FIX: Soft delete with audit trail
  congviec.isDeleted = true;
  congviec.deletedAt = new Date();
  congviec.deletedBy = currentUser.NhanVienID;
  await congviec.save();

  // ✅ 8. Decrement parent's ChildrenCount if this is a subtask
  if (congviec.CongViecChaID) {
    await CongViec.updateOne(
      { _id: congviec.CongViecChaID },
      { $inc: { ChildrenCount: -1 } }
    );
  }

  // 🔥 P1 FIX: Cascade comments + replies (comprehensive deletion)
  // Step 1: Get root comments
  const comments = await BinhLuan.find({
    CongViecID: congviecid,
    TrangThai: { $ne: "DELETED" },
  })
    .select("_id")
    .lean();

  const commentIds = comments.map((c) => c._id);

  // Step 2: Get all replies to those comments (nested replies handled by BinhLuanChaID)
  const replies = await BinhLuan.find({
    BinhLuanChaID: { $in: commentIds },
    TrangThai: { $ne: "DELETED" },
  })
    .select("_id")
    .lean();

  const replyIds = replies.map((r) => r._id);

  // Step 3: Combine all comment IDs (root + replies)
  const allCommentIds = [...commentIds, ...replyIds];

  // Step 4: Cascade soft delete all comments and replies
  const commentUpdate = await BinhLuan.updateMany(
    { _id: { $in: allCommentIds } },
    { $set: { TrangThai: "DELETED", NgayCapNhat: new Date() } }
  );
  const commentCount = commentUpdate?.modifiedCount || 0;

  // ✅ 9. Cascade task files (files attached directly to task)
  const taskFileUpdate = await TepTin.updateMany(
    { CongViecID: congviecid, TrangThai: { $ne: "DELETED" } },
    { $set: { TrangThai: "DELETED" } }
  );

  // ✅ 10. Cascade comment files (files attached to comments and replies)
  const commentFileUpdate = await TepTin.updateMany(
    { BinhLuanID: { $in: allCommentIds }, TrangThai: { $ne: "DELETED" } },
    { $set: { TrangThai: "DELETED" } }
  );

  const fileCount =
    (taskFileUpdate?.modifiedCount || 0) +
    (commentFileUpdate?.modifiedCount || 0);

  return {
    message: "Xóa công việc thành công",
    meta: {
      childCount: 0,
      commentCount, // includes both root comments and replies
      repliesDeleted: replyIds.length, // specific count of replies
      fileCount,
    },
  };
};

/**
 * Lấy chi tiết công việc theo ID với đầy đủ thông tin
 */
service.getCongViecDetail = async (congviecid, req) => {
  if (!mongoose.Types.ObjectId.isValid(congviecid)) {
    throw new AppError(400, "ID công việc không hợp lệ");
  }

  const congviec = await CongViec.findOne({
    _id: congviecid,
    isDeleted: { $ne: true },
  })
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate("NhomViecUserID", "TenNhom MoTa")
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "LichSuTrangThai.NguoiThucHienID",
      select: "Ten Email HoTen UserName",
    })
    .populate({
      path: "LichSuTienDo.NguoiThucHienID",
      select: "Ten Email HoTen UserName",
    })
    .select(
      // Bổ sung subtask fields: CongViecChaID Path Depth ChildrenCount
      "MaCongViec SoThuTu TieuDe MoTa NgayBatDau NgayHetHan NgayGiaoViec NgayCanhBao NgayHoanThanh CanhBaoMode CanhBaoSapHetHanPercent MucDoUuTien TrangThai PhanTramTienDoTong NguoiGiaoViecID NguoiChinhID NguoiThamGia NhomViecUserID LichSuTrangThai LichSuTienDo createdAt NhiemVuThuongQuyID FlagNVTQKhac CongViecChaID Path Depth ChildrenCount"
    )
    .lean();

  if (!congviec) {
    throw new AppError(404, "Không tìm thấy công việc");
  }

  // Kiểm tra quyền xem
  await checkTaskViewPermission(congviec, req);

  // Map to unified DTO
  const dto = mapCongViecDTO(congviec);
  // Subtask enrich
  dto.CongViecChaID = congviec.CongViecChaID
    ? String(congviec.CongViecChaID)
    : null;
  dto.Path = Array.isArray(congviec.Path)
    ? congviec.Path.map((x) => String(x))
    : [];
  dto.Depth = typeof congviec.Depth === "number" ? congviec.Depth : 0;
  dto.ChildrenCount =
    typeof congviec.ChildrenCount === "number" ? congviec.ChildrenCount : 0;
  if (dto.Path && dto.Path.length) {
    const ancestors = await CongViec.find({ _id: { $in: dto.Path } })
      .select("_id TieuDe")
      .lean();
    const mapAnc = new Map(ancestors.map((a) => [String(a._id), a]));
    dto.Ancestors = dto.Path.map((id) => {
      const a = mapAnc.get(String(id));
      return a
        ? { _id: String(a._id), TieuDe: a.TieuDe }
        : { _id: String(id), TieuDe: null };
    });
  } else {
    dto.Ancestors = [];
  }
  // ChildrenSummary (trực tiếp)
  const childrenAgg = await CongViec.aggregate([
    {
      $match: {
        CongViecChaID: new mongoose.Types.ObjectId(congviecid),
        isDeleted: { $ne: true },
      },
    },
    { $group: { _id: "$TrangThai", c: { $sum: 1 } } },
  ]);
  let total = 0,
    done = 0;
  childrenAgg.forEach((g) => {
    total += g.c;
    if (g._id === "HOAN_THANH") done += g.c;
  });
  dto.ChildrenSummary = {
    total,
    done,
    active: total - done,
    incomplete: total - done,
  };
  dto.AllChildrenDone = total > 0 && done === total;
  // Preserve createdAt for UI as NgayTao
  if (congviec.createdAt) dto.NgayTao = congviec.createdAt;

  // Enrich with comments: display NhanVien name and timestamp
  // NguoiBinhLuanID ref trực tiếp đến NhanVien (không phải User)
  const comments = await BinhLuan.aggregate([
    {
      $match: {
        CongViecID: new mongoose.Types.ObjectId(congviecid),
        BinhLuanChaID: null,
      },
    },
    { $sort: { NgayBinhLuan: -1, createdAt: -1 } },
    {
      $lookup: {
        from: "nhanviens",
        localField: "NguoiBinhLuanID",
        foreignField: "_id",
        as: "NhanVien",
      },
    },
    { $unwind: { path: "$NhanVien", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        CongViecID: 1,
        NguoiBinhLuanID: 1,
        NoiDung: 1,
        NgayBinhLuan: 1,
        createdAt: 1,
        NguoiBinhLuan: {
          Ten: { $ifNull: ["$NhanVien.Ten", "$NhanVien.HoTen"] },
        },
      },
    },
  ]);

  // Lưu ý: không gán BinhLuans tại đây; sẽ gán sau khi lookup Files để đảm bảo lần tải đầu có kèm tệp đính kèm

  // Lookup attached files for each comment
  // NguoiBinhLuanID ref trực tiếp đến NhanVien (không phải User)
  const commentsWithFiles = await BinhLuan.aggregate([
    {
      $match: {
        CongViecID: new mongoose.Types.ObjectId(congviecid),
        TrangThai: "ACTIVE",
        BinhLuanChaID: null,
      },
    },
    { $sort: { NgayBinhLuan: -1, createdAt: -1 } },
    {
      $lookup: {
        from: "nhanviens",
        localField: "NguoiBinhLuanID",
        foreignField: "_id",
        as: "NhanVien",
      },
    },
    { $unwind: { path: "$NhanVien", preserveNullAndEmptyArrays: true } },
    // Count replies for each comment
    {
      $lookup: {
        from: "binhluan",
        let: { parentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$BinhLuanChaID", "$$parentId"] },
              TrangThai: "ACTIVE",
            },
          },
          { $count: "total" },
        ],
        as: "repliesCount",
      },
    },
    {
      $lookup: {
        from: "teptin",
        let: { binhLuanId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$BinhLuanID", "$$binhLuanId"] },
            },
          },
          // lấy cả ACTIVE và DELETED để hiển thị "file đã thu hồi"
          { $sort: { NgayTaiLen: -1 } },
          {
            $project: {
              _id: 1,
              TenGoc: 1,
              TenFile: 1,
              LoaiFile: 1,
              KichThuoc: 1,
              CongViecID: 1,
              BinhLuanID: 1,
              NguoiTaiLenID: 1,
              NgayTaiLen: 1,
              TrangThai: 1,
            },
          },
        ],
        as: "Files",
      },
    },
    {
      $project: {
        _id: 1,
        CongViecID: 1,
        NguoiBinhLuanID: 1,
        NoiDung: 1,
        NgayBinhLuan: 1,
        createdAt: 1,
        TrangThai: 1,
        NguoiBinhLuan: {
          Ten: { $ifNull: ["$NhanVien.Ten", "$NhanVien.HoTen"] },
        },
        Files: 1,
        repliesCount: 1,
      },
    },
  ]);
  // Ánh xạ bình luận kèm danh sách tệp đính kèm (đảm bảo lần tải đầu đã có đủ dữ liệu)
  dto.BinhLuans = commentsWithFiles.map((c) => ({
    _id: String(c._id),
    CongViecID: String(c.CongViecID),
    NguoiBinhLuanID: c.NguoiBinhLuanID ? String(c.NguoiBinhLuanID) : null,
    NoiDung: c.NoiDung,
    NguoiBinhLuan: { Ten: c.NguoiBinhLuan?.Ten || "Người dùng" },
    NgayBinhLuan: c.NgayBinhLuan || c.createdAt,
    TrangThai: c.TrangThai || "ACTIVE",
    RepliesCount: c.repliesCount?.[0]?.total || 0,
    Files: Array.isArray(c.Files)
      ? c.Files.map((f) => ({
          _id: String(f._id),
          TenGoc: f.TenGoc,
          TenFile: f.TenFile,
          LoaiFile: f.LoaiFile,
          KichThuoc: f.KichThuoc,
          CongViecID: f.CongViecID ? String(f.CongViecID) : null,
          BinhLuanID: f.BinhLuanID ? String(f.BinhLuanID) : null,
          NguoiTaiLenID: f.NguoiTaiLenID ? String(f.NguoiTaiLenID) : null,
          NgayTaiLen: f.NgayTaiLen,
          TrangThai: f.TrangThai || "ACTIVE",
          thumbUrl: `/api/workmanagement/files/${String(f._id)}/thumb`,
          inlineUrl: `/api/workmanagement/files/${String(f._id)}/inline`,
          downloadUrl: `/api/workmanagement/files/${String(f._id)}/download`,
        }))
      : [],
  }));
  return dto;
};

// Các tác vụ theo flow
service.giaoViec = async (id, payload = {}, req) => {
  const congviec = await CongViec.findOne({
    _id: id,
    isDeleted: { $ne: true },
  });
  if (!congviec) throw new AppError(404, "Không tìm thấy công việc");
  // Step 5: Concurrency guard
  const clientVersion =
    payload.expectedVersion || req.headers["if-unmodified-since"];
  if (clientVersion) {
    const serverVersion = congviec.updatedAt
      ? congviec.updatedAt.toISOString()
      : null;
    if (serverVersion && serverVersion !== clientVersion) {
      throw new AppError(409, "VERSION_CONFLICT", "Version mismatch");
    }
  }
  if (!congviec.NgayHetHan)
    throw new AppError(400, "Thiếu NgayHetHan để giao việc");
  congviec.TrangThai = "DA_GIAO";
  if (!congviec.NgayGiaoViec) congviec.NgayGiaoViec = new Date();
  const mode =
    payload?.mode === "FIXED"
      ? "FIXED"
      : payload?.mode === "PERCENT"
      ? "PERCENT"
      : null;
  if (mode) congviec.CanhBaoMode = mode;
  if (mode === "PERCENT") {
    const percent =
      typeof payload?.percent === "number"
        ? payload.percent
        : congviec.CanhBaoSapHetHanPercent || null;
    if (percent != null) congviec.CanhBaoSapHetHanPercent = percent;
    const ngay = computeNgayCanhBao({
      mode: "PERCENT",
      ngayBatDau: congviec.NgayBatDau,
      ngayHetHan: congviec.NgayHetHan,
      percent: congviec.CanhBaoSapHetHanPercent,
    });
    congviec.NgayCanhBao = ngay;
  } else if (mode === "FIXED") {
    const ngay = computeNgayCanhBao({
      mode: "FIXED",
      ngayBatDau: congviec.NgayBatDau,
      ngayHetHan: congviec.NgayHetHan,
      fixedNgayCanhBao: payload?.ngayCanhBao,
    });
    if (!ngay) throw new AppError(400, "NgayCanhBao (FIXED) không hợp lệ");
    congviec.NgayCanhBao = ngay;
  }
  await congviec.save();

  // 🔔 Notification trigger - Giao việc
  try {
    const nguoiGiao = await NhanVien.findById(req.user?.NhanVienID)
      .select("Ten")
      .lean();

    const {
      buildCongViecNotificationData,
    } = require("../helpers/notificationDataBuilders");
    const notificationData = await buildCongViecNotificationData(congviec, {
      nguoiGiaoViecId: req.user?.NhanVienID?.toString(),
      tenNguoiGiao: nguoiGiao?.Ten || "",
    });
    await notificationService.send({
      type: "congviec-giao-viec",
      data: notificationData,
    });
    console.log("[CongViecService] ✅ Sent notification: congviec-giao-viec");
  } catch (notifyErr) {
    console.error(
      "[CongViecService] ❌ giaoViec notification failed:",
      notifyErr.message
    );
  }

  const populated = await CongViec.findById(congviec._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate("NhomViecUserID", "TenNhom MoTa")
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .lean();
  return mapCongViecDTO(populated);
};

service.tiepNhan = async (id, req) => {
  const congviec = await CongViec.findOne({
    _id: id,
    isDeleted: { $ne: true },
  });
  if (!congviec) throw new AppError(404, "Không tìm thấy công việc");
  congviec.TrangThai = "DANG_THUC_HIEN";
  const now = new Date();
  if (!congviec.NgayBatDau) congviec.NgayBatDau = now; // planned start nếu chưa có
  if (!congviec.NgayTiepNhanThucTe) congviec.NgayTiepNhanThucTe = now; // actual accept
  await congviec.save();
  const populated = await CongViec.findById(congviec._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate("NhomViecUserID", "TenNhom MoTa")
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .lean();
  return mapCongViecDTO(populated);
};

service.hoanThanh = async (id, req) => {
  const congviec = await CongViec.findOne({
    _id: id,
    isDeleted: { $ne: true },
  });
  if (!congviec) throw new AppError(404, "Không tìm thấy công việc");
  const now = new Date();
  if (congviec.CoDuyetHoanThanh) {
    // Nhánh cần duyệt
    congviec.TrangThai = "CHO_DUYET";
    if (!congviec.NgayHoanThanhTam) congviec.NgayHoanThanhTam = now;
  } else {
    // Hoàn thành trực tiếp
    congviec.TrangThai = "HOAN_THANH";
    congviec.NgayHoanThanh = now;
    if (congviec.NgayHetHan) {
      const lateMs = now - new Date(congviec.NgayHetHan);
      const isLate = lateMs > 0;
      congviec.HoanThanhTreHan = isLate;
      congviec.SoGioTre = isLate
        ? Math.round((lateMs / 3600000) * 100) / 100
        : 0;
    }
  }
  await congviec.save();
  const populated = await CongViec.findById(congviec._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate("NhomViecUserID", "TenNhom MoTa")
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .lean();
  return mapCongViecDTO(populated);
};

// LEGACY flow function – kept temporarily (@deprecated) use transition with DUYET_HOAN_THANH
service.duyetHoanThanh = async (id, req) => {
  const congviec = await CongViec.findOne({
    _id: id,
    isDeleted: { $ne: true },
  });
  if (!congviec) throw new AppError(404, "Không tìm thấy công việc");
  const now = new Date();
  congviec.TrangThai = "HOAN_THANH";
  congviec.NgayHoanThanh = now;
  if (congviec.NgayHetHan) {
    const lateMs = now - new Date(congviec.NgayHetHan);
    const isLate = lateMs > 0;
    congviec.HoanThanhTreHan = isLate;
    congviec.SoGioTre = isLate ? Math.round((lateMs / 3600000) * 100) / 100 : 0;
  }
  await congviec.save();
  const populated = await CongViec.findById(congviec._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate("NhomViecUserID", "TenNhom MoTa")
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .lean();
  return mapCongViecDTO(populated);
};

// Unified transition service (new flow)
// Import centralized constants
const {
  WORK_ACTIONS,
  ROLE_REQUIREMENTS,
} = require("../constants/workActions.constants");
const TRANSITION_ACTIONS = WORK_ACTIONS; // backwards name for internal references

function computeLate(congviec) {
  if (!congviec.NgayHetHan || !congviec.NgayHoanThanh) {
    congviec.SoGioTre = 0;
    congviec.HoanThanhTreHan = false;
    return;
  }
  try {
    const diffMs =
      new Date(congviec.NgayHoanThanh) - new Date(congviec.NgayHetHan);
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes > 0) {
      congviec.SoGioTre = Number((diffMinutes / 60).toFixed(2));
      congviec.HoanThanhTreHan = true;
    } else {
      congviec.SoGioTre = 0;
      congviec.HoanThanhTreHan = false;
    }
  } catch (_) {
    congviec.SoGioTre = 0;
    congviec.HoanThanhTreHan = false;
  }
}

function buildActionMap(cv) {
  const coDuyet = !!cv.CoDuyetHoanThanh;
  return {
    GIAO_VIEC: {
      allow: cv.TrangThai === "TAO_MOI" && !!cv.NgayHetHan,
      next: "DA_GIAO",
      mutate: (c, payload) => {
        if (!c.NgayGiaoViec) c.NgayGiaoViec = new Date();
        // optional update cảnh báo
        const mode = payload?.mode;
        if (mode === "PERCENT" || mode === "FIXED") c.CanhBaoMode = mode;
        if (mode === "PERCENT") {
          if (typeof payload?.percent === "number")
            c.CanhBaoSapHetHanPercent = payload.percent;
          c.NgayCanhBao = computeNgayCanhBao({
            mode: "PERCENT",
            ngayBatDau: c.NgayBatDau,
            ngayHetHan: c.NgayHetHan,
            percent: c.CanhBaoSapHetHanPercent,
          });
        } else if (mode === "FIXED") {
          c.NgayCanhBao = computeNgayCanhBao({
            mode: "FIXED",
            ngayBatDau: c.NgayBatDau,
            ngayHetHan: c.NgayHetHan,
            fixedNgayCanhBao: payload?.ngayCanhBao,
          });
        }
      },
    },
    HUY_GIAO: {
      allow: cv.TrangThai === "DA_GIAO",
      next: "TAO_MOI",
      revert: true,
      reset: ["NgayGiaoViec", "NgayHoanThanhTam", "NgayHoanThanh"],
    },
    TIEP_NHAN: {
      allow: cv.TrangThai === "DA_GIAO",
      next: "DANG_THUC_HIEN",
      mutate: (c) => {
        const now = new Date();
        if (!c.NgayBatDau) c.NgayBatDau = now;
        if (!c.NgayTiepNhanThucTe) c.NgayTiepNhanThucTe = now;
      },
    },
    HOAN_THANH_TAM: {
      allow: cv.TrangThai === "DANG_THUC_HIEN" && coDuyet,
      next: "CHO_DUYET",
      mutate: (c) => {
        if (!c.NgayHoanThanhTam) c.NgayHoanThanhTam = new Date();
      },
    },
    HUY_HOAN_THANH_TAM: {
      allow: cv.TrangThai === "CHO_DUYET",
      next: "DANG_THUC_HIEN",
      revert: true,
      reset: ["NgayHoanThanhTam"],
    },
    DUYET_HOAN_THANH: {
      allow: cv.TrangThai === "CHO_DUYET",
      next: "HOAN_THANH",
      mutate: (c) => {
        c.NgayHoanThanh = new Date();
        computeLate(c);
        if (typeof c.SoGioTre !== "number") {
          c.SoGioTre = 0;
          c.HoanThanhTreHan = false;
        }
      },
    },
    HOAN_THANH: {
      allow: cv.TrangThai === "DANG_THUC_HIEN" && !coDuyet,
      next: "HOAN_THANH",
      mutate: (c) => {
        c.NgayHoanThanh = new Date();
        computeLate(c);
        if (typeof c.SoGioTre !== "number") {
          c.SoGioTre = 0;
          c.HoanThanhTreHan = false;
        }
      },
    },
    MO_LAI_HOAN_THANH: {
      allow: cv.TrangThai === "HOAN_THANH",
      next: "DANG_THUC_HIEN",
      revert: true,
      reset: ["NgayHoanThanh", "HoanThanhTreHan", "SoGioTre"],
    },
  };
}

service.transition = async (id, payload = {}, req) => {
  let { action, lyDo = "", ghiChu = "" } = payload;
  if (!action) throw new AppError(400, "Thiếu action");
  const congviec = await CongViec.findOne({
    _id: id,
    isDeleted: { $ne: true },
  });
  if (!congviec) throw new AppError(404, "Không tìm thấy công việc");
  // Chuẩn hóa: nếu cần duyệt mà gửi thẳng HOAN_THANH ở trạng thái DANG_THUC_HIEN thì chuyển thành HOAN_THANH_TAM
  if (
    action === "HOAN_THANH" &&
    congviec.CoDuyetHoanThanh &&
    congviec.TrangThai === "DANG_THUC_HIEN"
  ) {
    action = "HOAN_THANH_TAM";
  }
  // Quyền (Step1): strictly by req.user.NhanVienID
  const performerIdCtx = req.user?.NhanVienID || null;
  const isAssigner =
    performerIdCtx &&
    String(congviec.NguoiGiaoViecID) === String(performerIdCtx);
  const isMain =
    performerIdCtx && String(congviec.NguoiChinhID) === String(performerIdCtx);
  const ctx = { isAssigner, isMain };
  const actorCheck = ROLE_REQUIREMENTS[action];
  if (!actorCheck || !actorCheck(ctx, congviec)) {
    console.warn(
      "[transition] Permission denied",
      JSON.stringify({
        action,
        performerIdCtx,
        isAssigner,
        isMain,
        NguoiGiaoViecID: congviec.NguoiGiaoViecID,
        NguoiChinhID: congviec.NguoiChinhID,
      })
    );
    // Granular error codes
    let code = "FORBIDDEN";
    if (action === WORK_ACTIONS.HOAN_THANH && !isMain) code = "NOT_MAIN";
    else if (
      [WORK_ACTIONS.TIEP_NHAN, WORK_ACTIONS.HOAN_THANH_TAM].includes(action) &&
      !isMain
    )
      code = "NOT_MAIN";
    throw new AppError(403, code, "Permission Error");
  }
  const map = buildActionMap(congviec);
  const conf = map[action];
  if (!conf || !conf.allow)
    throw new AppError(400, "Hành động không hợp lệ cho trạng thái hiện tại");
  // Subtasks: không cho hoàn thành nếu còn con chưa HOAN_THANH
  if (
    [WORK_ACTIONS.DUYET_HOAN_THANH, WORK_ACTIONS.HOAN_THANH].includes(action) &&
    congviec.ChildrenCount > 0
  ) {
    const incomplete = await CongViec.countDocuments({
      CongViecChaID: congviec._id,
      TrangThai: { $ne: "HOAN_THANH" },
      isDeleted: { $ne: true },
    });
    if (incomplete > 0) {
      throw new AppError(
        409,
        "CHILDREN_INCOMPLETE",
        "Còn công việc con chưa hoàn thành"
      );
    }
  }
  const prevState = congviec.TrangThai;
  const resetFieldsApplied = [];
  if (Array.isArray(conf.reset)) {
    conf.reset.forEach((f) => {
      if (congviec[f] != null) resetFieldsApplied.push(f);
      congviec[f] = null;
    });
  }
  if (conf.mutate) conf.mutate(congviec, payload);
  // Recompute warning date when necessary: after GIAO_VIEC (already inside mutate) OR when reverting & then re-giao OR if dates changed passed via payload on transition (rare future use)
  if (
    action === WORK_ACTIONS.GIAO_VIEC ||
    resetFieldsApplied.includes("NgayGiaoViec")
  ) {
    recomputeWarningIfNeeded(congviec);
  }
  congviec.TrangThai = conf.next;
  const performerId = performerIdCtx || congviec.NguoiChinhID;
  if (performerId) {
    const isCompletion =
      action === WORK_ACTIONS.DUYET_HOAN_THANH ||
      action === WORK_ACTIONS.HOAN_THANH;
    const snapshot = isCompletion
      ? {
          SoGioTre:
            typeof congviec.SoGioTre === "number" ? congviec.SoGioTre : 0,
          HoanThanhTreHan: !!congviec.HoanThanhTreHan,
          TrangThaiBefore: prevState,
          TrangThaiAfter: conf.next,
        }
      : undefined;
    congviec.LichSuTrangThai = congviec.LichSuTrangThai || [];
    congviec.LichSuTrangThai.push({
      HanhDong: action,
      NguoiThucHienID: toObjectId(performerId),
      TuTrangThai: prevState,
      DenTrangThai: conf.next,
      GhiChu: ghiChu || lyDo || "",
      IsRevert: !!conf.revert,
      ResetFields: resetFieldsApplied.length ? resetFieldsApplied : undefined,
      Snapshot: snapshot,
    });
  }
  await congviec.save();
  console.log(
    "🔥 DEBUG transition: Saved, action=",
    action,
    "congviec._id=",
    congviec._id
  );

  // 🔔 Notification trigger - Transition actions
  try {
    const performer = await NhanVien.findById(performerId).select("Ten").lean();

    // Danh sách người liên quan (NguoiGiaoViec, NguoiChinh, NguoiThamGia) trừ người thực hiện
    const arrNguoiLienQuanID = [
      congviec.NguoiGiaoViecID?.toString(),
      congviec.NguoiChinhID?.toString(),
      ...(congviec.NguoiThamGia || []).map((p) => p.NhanVienID?.toString()),
    ].filter((id) => id && id !== performerId?.toString());

    // Chuyển action thành type code (ví dụ: TIEP_NHAN -> tiep-nhan)
    const actionTypeCode = action.toLowerCase().replace(/_/g, "-");

    const {
      buildCongViecNotificationData,
    } = require("../helpers/notificationDataBuilders");
    const notificationData = await buildCongViecNotificationData(congviec, {
      arrNguoiLienQuanID: [...new Set(arrNguoiLienQuanID)],
      nguoiThucHien: performer,
      HanhDong: action,
      TuTrangThai: prevState,
      DenTrangThai: conf.next,
      GhiChu: ghiChu || lyDo || "",
    });
    await notificationService.send({
      type: `congviec-${actionTypeCode}`,
      data: notificationData,
    });
    console.log(
      `[CongViecService] ✅ Sent notification: congviec-${actionTypeCode}`
    );
  } catch (triggerErr) {
    console.error(
      "[CongViecService] ❌ Transition notification failed:",
      triggerErr.message
    );
  }

  // 📅 Handle deadline jobs on status change (non-blocking)
  try {
    await deadlineScheduler.handleStatusChange(congviec);
  } catch (scheduleErr) {
    console.error(
      "[transition] Deadline scheduling error:",
      scheduleErr.message
    );
  }

  // Lightweight fetch for patch building already done in controller; still return full for backward compatibility
  const populated = await CongViec.findById(congviec._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .lean();
  return { action, congViec: mapCongViecDTO(populated) };
};

/**
 * Tạo công việc mới
 */
service.createCongViec = async (congViecData, req) => {
  // Frontend field mapping adjustments
  const requiredFields = ["TieuDe", "NgayBatDau", "NgayHetHan", "NguoiChinh"];
  for (const f of requiredFields)
    if (!congViecData[f]) throw new AppError(400, `Trường ${f} là bắt buộc`);

  const ngayBatDau = new Date(congViecData.NgayBatDau);
  const ngayHetHan = new Date(congViecData.NgayHetHan);
  if (ngayHetHan <= ngayBatDau)
    throw new AppError(400, "Ngày hết hạn phải sau ngày bắt đầu");

  const nguoiChinhId = congViecData.NguoiChinh;
  const nguoiChinh = await NhanVien.findById(nguoiChinhId);
  if (!nguoiChinh)
    throw new AppError(404, "Không tìm thấy người thực hiện chính");

  // Build participant list ensuring exactly one CHINH
  let thamGia = Array.isArray(congViecData.NguoiThamGia)
    ? congViecData.NguoiThamGia.map((p) => ({
        NhanVienID: p.NhanVienID || p.NhanVienId || p._id,
        VaiTro: p.VaiTro === "CHINH" ? "CHINH" : "PHOI_HOP",
        TienDo: p.TienDo || 0,
      }))
    : [];

  // Ensure main participant present (add or adjust)
  const hasMain = thamGia.some(
    (p) => String(p.NhanVienID) === String(nguoiChinhId) && p.VaiTro === "CHINH"
  );
  if (!hasMain) {
    // Remove any existing entry of that person then push as CHINH
    thamGia = thamGia.filter(
      (p) => String(p.NhanVienID) !== String(nguoiChinhId)
    );
    thamGia.unshift({ NhanVienID: nguoiChinhId, VaiTro: "CHINH", TienDo: 0 });
  } else {
    // Demote any other CHINH duplicates
    let mainFound = false;
    thamGia = thamGia.map((p) => {
      if (p.VaiTro === "CHINH") {
        if (mainFound || String(p.NhanVienID) !== String(nguoiChinhId)) {
          return { ...p, VaiTro: "PHOI_HOP" };
        }
        mainFound = true;
      }
      return p;
    });
  }

  // Enum translation (frontend labels -> backend enums)
  const priorityMap = {
    Thấp: "THAP",
    "Bình thường": "BINH_THUONG",
    Cao: "CAO",
    "Rất cao": "KHAN_CAP",
  };
  const statusMap = {
    Mới: "TAO_MOI",
    "Đang thực hiện": "DANG_THUC_HIEN",
    "Tạm dừng": "CHO_DUYET",
    "Hoàn thành": "HOAN_THANH",
    Hủy: "HUY",
  };

  const newCongViecData = {
    TieuDe: congViecData.TieuDe,
    MoTa: congViecData.MoTa,
    NgayBatDau: ngayBatDau,
    NgayHetHan: ngayHetHan,
    MucDoUuTien: priorityMap[congViecData.MucDoUuTien] || "BINH_THUONG",
    TrangThai: statusMap[congViecData.TrangThai] || "TAO_MOI",
    NguoiChinhID: nguoiChinhId,
    NguoiThamGia: thamGia,
    NhomViecUserID: congViecData.NhomViecUserID || null,
    PhanTramTienDoTong: 0,
    CoDuyetHoanThanh: !!congViecData.CoDuyetHoanThanh,
  };

  // Preserve parent relation if provided (subtask creation). Validation of parent
  // existence & status occurs in pre-save hook (and in createSubtask wrapper).
  if (congViecData.CongViecChaID) {
    newCongViecData.CongViecChaID = congViecData.CongViecChaID;
  }

  // Cấu hình cảnh báo & mốc giao việc tạm thời khi tạo mới
  // Cho phép null, nhưng nếu chọn PERCENT (hoặc không gửi) thì set mặc định và tính NgayCanhBao dựa trên now
  const mode =
    congViecData?.CanhBaoMode === "FIXED"
      ? "FIXED"
      : congViecData?.CanhBaoMode === "PERCENT"
      ? "PERCENT"
      : "PERCENT"; // mặc định PERCENT để tránh null gây lỗi ở nơi khác

  newCongViecData.CanhBaoMode = mode;

  if (mode === "PERCENT") {
    const percent =
      typeof congViecData?.CanhBaoSapHetHanPercent === "number"
        ? Math.max(0.5, Math.min(0.99, congViecData.CanhBaoSapHetHanPercent))
        : 0.8;
    newCongViecData.CanhBaoSapHetHanPercent = percent;
    const ngay = computeNgayCanhBao({
      mode: "PERCENT",
      ngayBatDau: ngayBatDau,
      ngayHetHan: ngayHetHan,
      percent,
    });
    if (ngay) newCongViecData.NgayCanhBao = ngay; // nếu không tính được thì để null
  } else if (mode === "FIXED") {
    // Giữ nguyên percent=null, chỉ set NgayCanhBao nếu client gửi và hợp lệ; nếu không, cho phép null
    const ngay = computeNgayCanhBao({
      mode: "FIXED",
      ngayBatDau: ngayBatDau,
      ngayHetHan: ngayHetHan,
      fixedNgayCanhBao: congViecData?.NgayCanhBao,
    });
    if (ngay) newCongViecData.NgayCanhBao = ngay;
  }

  if (req?.userId) {
    // Lấy thông tin User để get NhanVienID
    const user = await User.findById(req.userId);
    if (user?.NhanVienID) {
      newCongViecData.NguoiGiaoViecID = user.NhanVienID;
    } else {
      throw new AppError(400, "User chưa được liên kết với nhân viên nào");
    }
  }

  // Generate MaCongViec and SoThuTu using atomic counter
  const counter = await Counter.findOneAndUpdate(
    { _id: "congviec" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqNum = counter.seq || 1;
  const pad = (n) => (n < 100000 ? String(n).padStart(5, "0") : String(n));
  newCongViecData.SoThuTu = seqNum;
  newCongViecData.MaCongViec = `CV${pad(seqNum)}`;

  const congviec = new CongViec(newCongViecData);
  await congviec.save();

  // 📅 Schedule deadline notification jobs (non-blocking)
  try {
    await deadlineScheduler.scheduleDeadlineJobs(congviec, {
      cancelExisting: false,
    });
  } catch (scheduleErr) {
    console.error(
      "[createCongViec] Deadline scheduling error:",
      scheduleErr.message
    );
  }

  // Return populated data
  const populatedCongViec = await CongViec.findById(congviec._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate("NhomViecUserID", "TenNhom MoTa")
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    // Bổ sung select để đảm bảo FE nhận được thay đổi NhiemVuThuongQuyID/FlagNVTQKhac ngay sau update
    .select(
      "MaCongViec SoThuTu TieuDe MoTa NgayBatDau NgayHetHan NgayGiaoViec NgayCanhBao NgayHoanThanh CanhBaoMode CanhBaoSapHetHanPercent MucDoUuTien TrangThai PhanTramTienDoTong NguoiGiaoViecID NguoiChinhID NguoiThamGia NhomViecUserID LichSuTrangThai createdAt NhiemVuThuongQuyID FlagNVTQKhac CongViecChaID Path Depth ChildrenCount"
    )
    .lean();

  return mapCongViecDTO(populatedCongViec);
};

// Tạo công việc con (wrap createCongViec) – Slim Plan
service.createSubtask = async (parentId, data, req) => {
  if (!mongoose.Types.ObjectId.isValid(parentId))
    throw new AppError(400, "PARENT_ID_INVALID");
  const parent = await CongViec.findOne({
    _id: parentId,
    isDeleted: { $ne: true },
  }).select("_id TrangThai");
  if (!parent) throw new AppError(404, "PARENT_NOT_FOUND");
  if (parent.TrangThai === "HOAN_THANH")
    throw new AppError(400, "PARENT_ALREADY_COMPLETED");
  const payload = { ...data, CongViecChaID: parentId };
  return await service.createCongViec(payload, req);
};

// Danh sách con trực tiếp
service.listChildren = async (parentId, page = 1, limit = 50, req) => {
  if (!mongoose.Types.ObjectId.isValid(parentId))
    throw new AppError(400, "PARENT_ID_INVALID");

  // Kiểm tra quyền xem parent task
  const parent = await CongViec.findOne({
    _id: parentId,
    isDeleted: { $ne: true },
  }).lean();
  if (!parent) throw new AppError(404, "Không tìm thấy công việc cha");
  await checkTaskViewPermission(parent, req);

  const skip = (page - 1) * limit;
  const rows = await CongViec.find({
    CongViecChaID: parentId,
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      "MaCongViec SoThuTu TieuDe TrangThai PhanTramTienDoTong NgayHetHan NguoiChinhID NguoiGiaoViecID MucDoUuTien CongViecChaID Depth ChildrenCount SoLuongBinhLuan SoLuongNguoiThamGia"
    )
    .populate({ path: "NguoiChinh", select: "Ten Email" })
    .populate({ path: "NguoiGiaoViecID", select: "Ten Email" })
    .lean();
  return rows.map((r) => mapCongViecDTO(r));
};

// Tree view lightweight DTO mapper
function mapTreeNode(doc) {
  if (!doc) return null;
  const priorityOrder = { THAP: 1, BINH_THUONG: 2, CAO: 3, KHAN_CAP: 4 };
  // Extract participant IDs (NguoiThamGia.NhanVienID)
  const nguoiThamGiaIds = Array.isArray(doc.NguoiThamGia)
    ? doc.NguoiThamGia.map((p) => {
        const raw = p && p.NhanVienID;
        if (!raw) return null;
        if (typeof raw === "object" && raw._id) return String(raw._id);
        return String(raw);
      }).filter(Boolean)
    : [];
  return {
    _id: String(doc._id),
    TenCongViec: doc.TieuDe,
    MaCongViec: doc.MaCongViec || null,
    TrangThai: doc.TrangThai,
    TrangThaiLabel: doc.TrangThai, // FE có thể map màu
    DoUuTien: priorityOrder[doc.MucDoUuTien] || 2,
    DoUuTienLabel: doc.MucDoUuTien,
    PhanTramTienDoTong: doc.PhanTramTienDoTong ?? 0,
    HanHoanThanh: doc.NgayHetHan || doc.NgayHoanThanh || null,
    // Thêm các mốc thời gian riêng để FE hiển thị chi tiết
    NgayBatDau: doc.NgayBatDau || null,
    NgayHetHan: doc.NgayHetHan || null,
    NgayHoanThanh: doc.NgayHoanThanh || null,
    // Người giao việc – canonical single field cho FE (title, hiển thị)
    NguoiGiaoViecID: doc.NguoiGiaoViecID ? String(doc.NguoiGiaoViecID) : null,
    NguoiGiaoViec: doc.NguoiGiaoViec
      ? doc.NguoiGiaoViec.Ten ||
        doc.NguoiGiaoViec.HoTen ||
        doc.NguoiGiaoViec.TenNhanVien ||
        ""
      : null,
    NguoiThamGiaIds: nguoiThamGiaIds,
    ChildrenCount:
      typeof doc.ChildrenCount === "number" ? doc.ChildrenCount : 0,
    PhuTrach: doc.NguoiChinh
      ? [
          {
            _id: doc.NguoiChinh._id ? String(doc.NguoiChinh._id) : null,
            TenNhanVien:
              doc.NguoiChinh.Ten ||
              doc.NguoiChinh.HoTen ||
              doc.NguoiChinh.TenNhanVien ||
              "",
          },
        ]
      : [],
    ParentID: doc.CongViecChaID ? String(doc.CongViecChaID) : null,
    Depth: doc.Depth || 0,
  };
}

service.getTreeRoot = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(400, "ID_INVALID");
  const doc = await CongViec.findOne({ _id: id, isDeleted: { $ne: true } })
    .select(
      "MaCongViec TieuDe TrangThai MucDoUuTien PhanTramTienDoTong NgayBatDau NgayHetHan NgayHoanThanh ChildrenCount CongViecChaID Depth NguoiChinhID NguoiGiaoViecID NguoiThamGia"
    )
    .populate({ path: "NguoiChinh", select: "Ten HoTen TenNhanVien" })
    .populate({ path: "NguoiGiaoViec", select: "Ten HoTen TenNhanVien" })
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten HoTen TenNhanVien",
    })
    .lean();
  if (!doc) throw new AppError(404, "NOT_FOUND");
  return mapTreeNode(doc);
};

service.getTreeChildren = async (parentId, req) => {
  if (!mongoose.Types.ObjectId.isValid(parentId))
    throw new AppError(400, "PARENT_ID_INVALID");

  // Kiểm tra quyền xem parent
  const parent = await CongViec.findOne({
    _id: parentId,
    isDeleted: { $ne: true },
  }).lean();
  if (!parent) throw new AppError(404, "Không tìm thấy công việc cha");
  await checkTaskViewPermission(parent, req);

  const children = await CongViec.find({
    CongViecChaID: parentId,
    isDeleted: { $ne: true },
  })
    .select(
      "MaCongViec TieuDe TrangThai MucDoUuTien PhanTramTienDoTong NgayBatDau NgayHetHan NgayHoanThanh ChildrenCount CongViecChaID Depth NguoiChinhID NguoiGiaoViecID NguoiThamGia"
    )
    .populate({ path: "NguoiChinh", select: "Ten HoTen TenNhanVien" })
    .populate({ path: "NguoiGiaoViec", select: "Ten HoTen TenNhanVien" })
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten HoTen TenNhanVien",
    })
    .lean();
  return children.map(mapTreeNode);
};

// Find top-most ancestor and return its mapped node (lightweight like getTreeRoot)
service.findRootNode = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(400, "ID_INVALID");
  let current = await CongViec.findOne({ _id: id, isDeleted: { $ne: true } })
    .select("CongViecChaID")
    .lean();
  if (!current) throw new AppError(404, "NOT_FOUND");
  let guard = 0;
  let rootId = id;
  while (current.CongViecChaID && guard < 50) {
    const parentId = current.CongViecChaID;
    const parent = await CongViec.findOne({
      _id: parentId,
      isDeleted: { $ne: true },
    })
      .select("CongViecChaID")
      .lean();
    if (!parent) break;
    rootId = parentId;
    current = parent;
    guard++;
  }
  const rootDoc = await CongViec.findOne({
    _id: rootId,
    isDeleted: { $ne: true },
  })
    .select(
      "MaCongViec TieuDe TrangThai MucDoUuTien PhanTramTienDoTong NgayBatDau NgayHetHan NgayHoanThanh ChildrenCount CongViecChaID Depth NguoiChinhID NguoiGiaoViecID"
    )
    .populate({ path: "NguoiChinh", select: "Ten HoTen TenNhanVien" })
    .populate({ path: "NguoiGiaoViec", select: "Ten HoTen TenNhanVien" })
    .lean();
  if (!rootDoc) throw new AppError(404, "ROOT_NOT_FOUND");
  return mapTreeNode(rootDoc);
};

// Get ancestor chain (from root ancestor down to the specified node)
service.getAncestorsChain = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError(400, "ID_INVALID");
  const chain = [];
  let current = await CongViec.findOne({ _id: id, isDeleted: { $ne: true } })
    .select("CongViecChaID")
    .lean();
  if (!current) throw new AppError(404, "NOT_FOUND");
  chain.push(String(id));
  let guard = 0;
  while (current.CongViecChaID && guard < 50) {
    const parentId = current.CongViecChaID;
    const parent = await CongViec.findOne({
      _id: parentId,
      isDeleted: { $ne: true },
    })
      .select("CongViecChaID")
      .lean();
    if (!parent) {
      chain.push(String(parentId));
      break;
    }
    chain.push(String(parentId));
    current = parent;
    guard++;
  }
  // chain currently from node up to root, reverse
  return chain.reverse();
};

/**
 * Thu hồi (xóa mềm) bình luận và file đính kèm của bình luận
 */
service.deleteComment = async (binhLuanId, req) => {
  if (!mongoose.Types.ObjectId.isValid(binhLuanId))
    throw new AppError(400, "ID bình luận không hợp lệ");
  const comment = await BinhLuan.findById(binhLuanId);
  if (!comment || comment.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy bình luận");

  // Kiểm quyền: chủ comment hoặc admin/manager
  const user = await User.findById(req.userId).lean();
  if (!user?.NhanVienID) {
    throw new AppError(400, "Tài khoản chưa liên kết với nhân viên");
  }

  const vaiTro = user.PhanQuyen?.toLowerCase();
  const isAdmin = ["admin", "superadmin"].includes(vaiTro);
  const isOwner = String(comment.NguoiBinhLuanID) === String(user.NhanVienID);

  if (!isAdmin && !isOwner)
    throw new AppError(403, "Không có quyền xóa bình luận");

  // Xóa mềm bình luận và file đính kèm
  await BinhLuan.softDeleteWithFiles(binhLuanId);

  // Trả về DTO tối giản để FE cập nhật UI
  return { _id: String(comment._id), TrangThai: "DELETED" };
};

/**
 * Thu hồi nội dung (text) của bình luận, không xóa file đính kèm
 */
service.recallCommentText = async (binhLuanId, req) => {
  if (!mongoose.Types.ObjectId.isValid(binhLuanId))
    throw new AppError(400, "ID bình luận không hợp lệ");
  const comment = await BinhLuan.findById(binhLuanId);
  if (!comment || comment.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy bình luận");

  const user = await User.findById(req.userId).lean();
  if (!user?.NhanVienID) {
    throw new AppError(400, "Tài khoản chưa liên kết với nhân viên");
  }

  const vaiTro = user.PhanQuyen?.toLowerCase();
  const isAdmin = ["admin", "superadmin"].includes(vaiTro);
  const isOwner = String(comment.NguoiBinhLuanID) === String(user.NhanVienID);

  if (!isAdmin && !isOwner)
    throw new AppError(403, "Không có quyền thu hồi nội dung");

  // Gỡ nội dung, giữ trạng thái ACTIVE để file vẫn hiển thị
  comment.NoiDung = "";
  await comment.save();
  return { _id: String(comment._id), NoiDung: "" };
};

/**
 * Lấy danh sách trả lời của một bình luận
 */
service.listReplies = async (parentId, req) => {
  if (!mongoose.Types.ObjectId.isValid(parentId))
    throw new AppError(400, "ID bình luận cha không hợp lệ");

  const parent = await BinhLuan.findById(parentId).lean();
  if (!parent || parent.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy bình luận cha");

  // Lấy các trả lời (ACTIVE)
  const replies = await BinhLuan.find({
    BinhLuanChaID: parent._id,
    TrangThai: "ACTIVE",
  })
    .populate({
      path: "NguoiBinhLuanID",
      select: "Ten HoTen", // NguoiBinhLuanID ref đến NhanVien model
    })
    .sort({ NgayBinhLuan: 1, createdAt: 1 })
    .lean();

  const replyIds = replies.map((r) => r._id);
  const TepTin = require("../models/TepTin");
  const files = await TepTin.find({
    BinhLuanID: { $in: replyIds },
    TrangThai: "ACTIVE",
  })
    .select(
      "TenGoc TenFile LoaiFile KichThuoc CongViecID BinhLuanID NguoiTaiLenID NgayTaiLen TrangThai"
    )
    .lean();

  const filesByComment = files.reduce((acc, f) => {
    const key = String(f.BinhLuanID);
    (acc[key] = acc[key] || []).push({
      _id: String(f._id),
      TenGoc: f.TenGoc,
      TenFile: f.TenFile,
      LoaiFile: f.LoaiFile,
      KichThuoc: f.KichThuoc,
      CongViecID: f.CongViecID ? String(f.CongViecID) : null,
      BinhLuanID: f.BinhLuanID ? String(f.BinhLuanID) : null,
      NguoiTaiLenID: f.NguoiTaiLenID ? String(f.NguoiTaiLenID) : null,
      NgayTaiLen: f.NgayTaiLen,
      TrangThai: f.TrangThai || "ACTIVE",
      thumbUrl: `/api/workmanagement/files/${String(f._id)}/thumb`,
      inlineUrl: `/api/workmanagement/files/${String(f._id)}/inline`,
      downloadUrl: `/api/workmanagement/files/${String(f._id)}/download`,
    });
    return acc;
  }, {});

  const dtos = replies.map((r) => {
    const nhanVien = r.NguoiBinhLuanID || {};
    const tenNguoiBinhLuan = nhanVien.Ten || nhanVien.HoTen || "Người dùng";
    return {
      _id: String(r._id),
      CongViecID: r.CongViecID ? String(r.CongViecID) : null,
      BinhLuanChaID: r.BinhLuanChaID ? String(r.BinhLuanChaID) : null,
      NguoiBinhLuanID: r.NguoiBinhLuanID
        ? String(r.NguoiBinhLuanID._id || r.NguoiBinhLuanID)
        : null,
      NoiDung: r.NoiDung,
      NguoiBinhLuan: { Ten: tenNguoiBinhLuan },
      NgayBinhLuan: r.NgayBinhLuan || r.createdAt,
      TrangThai: r.TrangThai || "ACTIVE",
      Files: filesByComment[String(r._id)] || [],
    };
  });

  return dtos;
};

/**
 * Cập nhật công việc
 */
service.updateCongViec = async (congviecid, updateData, req) => {
  if (!mongoose.Types.ObjectId.isValid(congviecid)) {
    throw new AppError(400, "ID công việc không hợp lệ");
  }

  const congviec = await CongViec.findOne({
    _id: congviecid,
    isDeleted: { $ne: true },
  });

  if (!congviec) {
    throw new AppError(404, "Không tìm thấy công việc");
  }

  // 📅 Capture old values for deadline scheduling check
  const oldDeadlineSnapshot = {
    NgayHetHan: congviec.NgayHetHan,
    NgayCanhBao: congviec.NgayCanhBao,
    TrangThai: congviec.TrangThai,
  };

  // =============================
  // PERMISSION CHECK - Kiểm tra quyền cập nhật
  // =============================
  const currentUser = await User.findById(req.userId).lean();
  if (!currentUser?.NhanVienID) {
    throw new AppError(400, "Tài khoản chưa liên kết với nhân viên");
  }

  // CHẶN cập nhật tiến độ - bắt buộc qua API updateProgress
  if (Object.prototype.hasOwnProperty.call(updateData, "PhanTramTienDoTong")) {
    throw new AppError(
      400,
      "Không thể cập nhật tiến độ qua API này. Vui lòng sử dụng API POST /congviec/:id/progress để cập nhật tiến độ với lịch sử đầy đủ"
    );
  }

  // Lấy danh sách fields muốn cập nhật (loại bỏ fields không được phép)
  const updateFields = Object.keys(updateData).filter(
    (key) =>
      ![
        "_id",
        "MaCongViec",
        "SoThuTu",
        "createdAt",
        "updatedAt",
        "LichSuTrangThai",
        "LichSuTienDo",
        "PhanTramTienDoTong",
        "NgayGiaoViec",
        "NgayHoanThanh",
        "NgayTiepNhanThucTe",
        "NgayHoanThanhTam",
        "SoGioTre",
        "HoanThanhTreHan",
        "FirstSapQuaHanAt",
        "FirstQuaHanAt",
        "isDeleted",
        "deletedAt",
        "deletedBy",
        "Path",
        "Depth",
        "ChildrenCount",
      ].includes(key)
  );

  // Kiểm tra quyền với whitelist fields
  const permissionCheck = checkUpdatePermission(
    congviec,
    currentUser.NhanVienID,
    currentUser.PhanQuyen,
    updateFields
  );

  if (!permissionCheck.allowed) {
    throw new AppError(403, permissionCheck.message);
  }

  // Validate dates if provided
  if (updateData.NgayBatDau && updateData.NgayHetHan) {
    const ngayBatDau = new Date(updateData.NgayBatDau);
    const ngayHetHan = new Date(updateData.NgayHetHan);

    if (ngayHetHan <= ngayBatDau) {
      throw new AppError(400, "Ngày hết hạn phải sau ngày bắt đầu");
    }
  }

  // Validate NguoiChinh if provided
  if (updateData.NguoiChinh) {
    const nguoiChinh = await NhanVien.findById(updateData.NguoiChinh);
    if (!nguoiChinh) {
      throw new AppError(404, "Không tìm thấy người thực hiện chính");
    }
  }

  // =============================
  // Business validation for Nhiệm vụ thường quy (single-select)
  // =============================
  // If Khác flag set true -> clear ID
  if (updateData.FlagNVTQKhac) {
    updateData.NhiemVuThuongQuyID = null;
  }
  // If an ID provided -> ensure valid ObjectId and unset FlagKhac
  if (updateData.NhiemVuThuongQuyID) {
    if (!mongoose.Types.ObjectId.isValid(updateData.NhiemVuThuongQuyID)) {
      throw new AppError(400, "NhiemVuThuongQuyID không hợp lệ");
    }
    updateData.FlagNVTQKhac = false;
  }
  // Prevent simultaneous both (redundant safeguard)
  if (updateData.NhiemVuThuongQuyID && updateData.FlagNVTQKhac) {
    throw new AppError(
      400,
      "Không thể vừa có NhiemVuThuongQuyID vừa đặt FlagNVTQKhac=true"
    );
  }

  // =============================
  // Chuẩn hoá dữ liệu cập nhật (nhãn TV -> mã code)
  // =============================
  const normalizeLabel = (val) =>
    String(val || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
      .toUpperCase()
      .trim();

  const allowedStatusCodes = new Set([
    "TAO_MOI",
    "DA_GIAO",
    "DANG_THUC_HIEN",
    "CHO_DUYET",
    "HOAN_THANH",
  ]);
  const allowedPriorityCodes = new Set([
    "THAP",
    "BINH_THUONG",
    "CAO",
    "KHAN_CAP",
  ]);

  const statusLabelToCode = {
    "TAO MOI": "TAO_MOI",
    "DA GIAO": "DA_GIAO",
    "DANG THUC HIEN": "DANG_THUC_HIEN",
    "CHO DUYET": "CHO_DUYET",
    "HOAN THANH": "HOAN_THANH",
  };
  const priorityLabelToCode = {
    THAP: "THAP",
    "BINH THUONG": "BINH_THUONG",
    CAO: "CAO",
    "KHAN CAP": "KHAN_CAP",
    "RAT CAO": "KHAN_CAP", // chấp nhận cả "Rất cao" như khẩn cấp
  };

  if (updateData.MucDoUuTien) {
    const raw = updateData.MucDoUuTien;
    const norm = normalizeLabel(raw);
    updateData.MucDoUuTien = allowedPriorityCodes.has(String(raw))
      ? String(raw)
      : priorityLabelToCode[norm] || String(raw);
  }
  if (updateData.TrangThai) {
    const raw = updateData.TrangThai;
    const norm = normalizeLabel(raw);
    updateData.TrangThai = allowedStatusCodes.has(String(raw))
      ? String(raw)
      : statusLabelToCode[norm] || String(raw);
  }

  // Nếu đổi NgayBatDau hoặc NgayHetHan và mode PERCENT -> recalc NgayCanhBao
  const willChangeBatDau = updateData.NgayBatDau != null;
  const willChangeHetHan = updateData.NgayHetHan != null;
  const willChangeMode = updateData.CanhBaoMode != null;
  const willChangePercent = updateData.CanhBaoSapHetHanPercent != null;
  // Apply incoming date/mode/percent to a temp clone to recompute preview
  if (willChangeBatDau) congviec.NgayBatDau = new Date(updateData.NgayBatDau);
  if (willChangeHetHan) congviec.NgayHetHan = new Date(updateData.NgayHetHan);
  if (willChangeMode) congviec.CanhBaoMode = updateData.CanhBaoMode;
  if (willChangePercent)
    congviec.CanhBaoSapHetHanPercent = updateData.CanhBaoSapHetHanPercent;
  if (
    willChangeBatDau ||
    willChangeHetHan ||
    willChangeMode ||
    willChangePercent
  ) {
    recomputeWarningIfNeeded(congviec);
    updateData.NgayCanhBao = congviec.NgayCanhBao || null;
  }

  // Nếu FE gửi NguoiChinh thì map sang NguoiChinhID
  if (updateData.NguoiChinh) {
    updateData.NguoiChinhID = updateData.NguoiChinh;
  }

  // Xử lý danh sách người tham gia nếu gửi lên
  if (Array.isArray(updateData.NguoiThamGia)) {
    let thamGia = updateData.NguoiThamGia.map((p) => ({
      NhanVienID: p.NhanVienID || p.NhanVienId || p._id,
      VaiTro: p.VaiTro === "CHINH" ? "CHINH" : "PHOI_HOP",
    }));

    // Đảm bảo có đúng 1 người CHINH và khớp với NguoiChinhID (nếu có)
    if (updateData.NguoiChinhID) {
      const mainId = String(updateData.NguoiChinhID);
      const hasMain = thamGia.some(
        (p) => String(p.NhanVienID) === mainId && p.VaiTro === "CHINH"
      );
      if (!hasMain) {
        // Loại bỏ bản ghi cũ của người đó rồi thêm mới CHINH vào đầu
        thamGia = thamGia.filter((p) => String(p.NhanVienID) !== mainId);
        thamGia.unshift({
          NhanVienID: updateData.NguoiChinhID,
          VaiTro: "CHINH",
        });
      } else {
        // Nếu có nhiều hơn 1 CHINH thì hạ cấp các bản ghi thừa
        let found = false;
        thamGia = thamGia.map((p) => {
          if (p.VaiTro === "CHINH") {
            if (found || String(p.NhanVienID) !== mainId) {
              return { ...p, VaiTro: "PHOI_HOP" };
            }
            found = true;
          }
          return p;
        });
      }
    }
    updateData.NguoiThamGia = thamGia;
  }

  // =============================
  // Track field changes for notifications
  // =============================
  const changes = {};
  const oldValues = {};

  // Track deadline change
  if (updateData.NgayHetHan && congviec.NgayHetHan) {
    const oldDeadline = new Date(congviec.NgayHetHan).getTime();
    const newDeadline = new Date(updateData.NgayHetHan).getTime();
    if (oldDeadline !== newDeadline) {
      changes.deadline = true;
      oldValues.oldDeadline = congviec.NgayHetHan;
      oldValues.newDeadline = updateData.NgayHetHan;
    }
  }

  // Track priority change
  if (
    updateData.MucDoUuTien &&
    updateData.MucDoUuTien !== congviec.MucDoUuTien
  ) {
    changes.priority = true;
    oldValues.oldPriority = congviec.MucDoUuTien;
    oldValues.newPriority = updateData.MucDoUuTien;
  }

  // Track main assignee change
  if (
    updateData.NguoiChinhID &&
    String(updateData.NguoiChinhID) !== String(congviec.NguoiChinhID)
  ) {
    changes.mainAssignee = true;
    oldValues.oldMainAssigneeId = congviec.NguoiChinhID;
    oldValues.newMainAssigneeId = updateData.NguoiChinhID;
  }

  // Track participants changes (add/remove)
  if (Array.isArray(updateData.NguoiThamGia)) {
    const oldParticipantIds = (congviec.NguoiThamGia || []).map((p) =>
      String(p.NhanVienID)
    );
    const newParticipantIds = updateData.NguoiThamGia.map((p) =>
      String(p.NhanVienID)
    );

    const addedIds = newParticipantIds.filter(
      (id) => !oldParticipantIds.includes(id)
    );
    const removedIds = oldParticipantIds.filter(
      (id) => !newParticipantIds.includes(id)
    );

    if (addedIds.length > 0) {
      changes.participantsAdded = true;
      oldValues.addedParticipantIds = addedIds;
    }
    if (removedIds.length > 0) {
      changes.participantsRemoved = true;
      oldValues.removedParticipantIds = removedIds;
    }
  }

  // Áp dụng cập nhật (bỏ qua field không có trong schema trừ khi ta xử lý đặc biệt ở trên)
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      // Ghi chú: FE có thể vẫn gửi NguoiChinh => đã map sang NguoiChinhID ở trên
      if (key === "NguoiChinh") return; // bỏ qua field alias
      congviec[key] = updateData[key];
    }
  });

  await congviec.save();

  // =============================
  // Fire notification triggers for field changes
  // =============================
  try {
    const populated = await CongViec.findById(congviec._id)
      .populate("NguoiGiaoViec", "Ten")
      .populate("NguoiChinh", "Ten")
      .populate("NguoiThamGia.NhanVienID", "Ten")
      .lean();

    const performer = await NhanVien.findById(currentUser.NhanVienID)
      .select("Ten")
      .lean();

    // Danh sách người liên quan (trừ người cập nhật)
    const arrNguoiLienQuanID = [
      congviec.NguoiGiaoViecID?.toString(),
      congviec.NguoiChinhID?.toString(),
      ...(congviec.NguoiThamGia || []).map((p) => p.NhanVienID?.toString()),
    ].filter((id) => id && id !== currentUser.NhanVienID?.toString());
    const uniqueNguoiLienQuan = [...new Set(arrNguoiLienQuanID)];

    // Deadline change notification
    if (changes.deadline) {
      const {
        buildCongViecNotificationData,
      } = require("../helpers/notificationDataBuilders");
      const notificationData = await buildCongViecNotificationData(congviec, {
        tenNguoiCapNhat: performer?.Ten || "",
        ngayHetHanCu: oldValues.oldDeadline,
        ngayHetHanMoi: oldValues.newDeadline,
      });
      await notificationService.send({
        type: "congviec-cap-nhat-deadline",
        data: notificationData,
      });
      console.log(
        "[CongViecService] ✅ Sent notification: congviec-cap-nhat-deadline"
      );
    }

    // Priority change notification
    if (changes.priority) {
      const priorityLabels = {
        THAP: "Thấp",
        BINH_THUONG: "Bình thường",
        CAO: "Cao",
        KHAN_CAP: "Khẩn cấp",
      };
      const {
        buildCongViecNotificationData,
      } = require("../helpers/notificationDataBuilders");
      const notificationData = await buildCongViecNotificationData(congviec, {
        arrNguoiLienQuanID: uniqueNguoiLienQuan,
        nguoiCapNhat: performer,
        UuTienCu:
          priorityLabels[oldValues.oldPriority] || oldValues.oldPriority,
        UuTienMoi:
          priorityLabels[oldValues.newPriority] || oldValues.newPriority,
      });
      await notificationService.send({
        type: "congviec-thay-doi-uu-tien",
        data: notificationData,
      });
      console.log(
        "[CongViecService] ✅ Sent notification: congviec-thay-doi-uu-tien"
      );
    }

    // Main assignee change notification
    if (changes.mainAssignee) {
      const oldAssignee = await NhanVien.findById(oldValues.oldMainAssigneeId)
        .select("Ten")
        .lean();
      const newAssignee = await NhanVien.findById(oldValues.newMainAssigneeId)
        .select("Ten")
        .lean();

      // Gửi cho cả người cũ và người mới
      const arrNguoiNhan = [
        oldValues.oldMainAssigneeId,
        oldValues.newMainAssigneeId,
        congviec.NguoiGiaoViecID?.toString(),
      ].filter((id) => id && id !== currentUser.NhanVienID?.toString());

      const {
        buildCongViecNotificationData,
      } = require("../helpers/notificationDataBuilders");
      const notificationData = await buildCongViecNotificationData(congviec, {
        arrNguoiLienQuanID: [...new Set(arrNguoiNhan)],
        nguoiCapNhat: performer,
        nguoiChinhCu: oldAssignee,
        nguoiChinhMoi: newAssignee,
        NguoiChinhMoiID: oldValues.newMainAssigneeId,
      });
      await notificationService.send({
        type: "congviec-thay-doi-nguoi-chinh",
        data: notificationData,
      });
      console.log(
        "[CongViecService] ✅ Sent notification: congviec-thay-doi-nguoi-chinh"
      );
    }

    // Participants added notification
    if (changes.participantsAdded) {
      for (const addedId of oldValues.addedParticipantIds) {
        const addedNV = await NhanVien.findById(addedId).select("Ten").lean();
        const {
          buildCongViecNotificationData,
        } = require("../helpers/notificationDataBuilders");
        const notificationData = await buildCongViecNotificationData(congviec, {
          arrNguoiNhanID: [addedId],
          nguoiCapNhat: performer,
          nguoiDuocThem: addedNV,
        });
        await notificationService.send({
          type: "congviec-gan-nguoi-tham-gia",
          data: notificationData,
        });
      }
      console.log(
        `[CongViecService] ✅ Sent notification: congviec-gan-nguoi-tham-gia (${oldValues.addedParticipantIds.length} người)`
      );
    }

    // Participants removed notification
    if (changes.participantsRemoved) {
      for (const removedId of oldValues.removedParticipantIds) {
        const removedNV = await NhanVien.findById(removedId)
          .select("Ten")
          .lean();
        const {
          buildCongViecNotificationData,
        } = require("../helpers/notificationDataBuilders");
        const notificationData = await buildCongViecNotificationData(congviec, {
          arrNguoiNhanID: [removedId],
          nguoiCapNhat: performer,
          nguoiBiXoa: removedNV,
        });
        await notificationService.send({
          type: "congviec-xoa-nguoi-tham-gia",
          data: notificationData,
        });
      }
      console.log(
        `[CongViecService] ✅ Sent notification: congviec-xoa-nguoi-tham-gia (${oldValues.removedParticipantIds.length} người)`
      );
    }
  } catch (error) {
    console.error(
      "[CongViecService] ❌ Notification trigger failed:",
      error.message
    );
  }

  // 📅 Reschedule deadline jobs if dates changed (non-blocking)
  try {
    if (deadlineScheduler.needsRescheduling(oldDeadlineSnapshot, congviec)) {
      await deadlineScheduler.scheduleDeadlineJobs(congviec, {
        cancelExisting: true,
      });
    }
  } catch (scheduleErr) {
    console.error(
      "[updateCongViec] Deadline scheduling error:",
      scheduleErr.message
    );
  }

  // Return populated data
  const populatedCongViec = await CongViec.findById(congviec._id)
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate("NhomViecUserID", "TenNhom MoTa")
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .lean();

  return mapCongViecDTO(populatedCongViec);
};

/**
 * Thêm bình luận vào công việc
 */
service.addComment = async (congviecid, noiDung, req, parentId = null) => {
  if (!mongoose.Types.ObjectId.isValid(congviecid)) {
    throw new AppError(400, "ID công việc không hợp lệ");
  }

  if (!noiDung || !noiDung.trim()) {
    throw new AppError(400, "Nội dung bình luận không được để trống");
  }

  const congviec = await CongViec.findOne({
    _id: congviecid,
    isDeleted: { $ne: true },
  });

  if (!congviec) {
    throw new AppError(404, "Không tìm thấy công việc");
  }

  // Lấy NhanVienID từ User
  const currentUser = await User.findById(req.userId).lean();
  if (!currentUser?.NhanVienID) {
    throw new AppError(
      400,
      "Tài khoản chưa liên kết với nhân viên. Vui lòng liên hệ quản trị viên."
    );
  }

  // Validate parent if replying
  let parent = null;
  if (parentId) {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      throw new AppError(400, "ID bình luận cha không hợp lệ");
    }
    parent = await BinhLuan.findById(parentId);
    if (!parent) throw new AppError(404, "Không tìm thấy bình luận cha");
    if (String(parent.CongViecID) !== String(congviecid))
      throw new AppError(400, "Bình luận cha không thuộc công việc này");
    if (parent.TrangThai === "DELETED")
      throw new AppError(400, "Bình luận cha đã bị thu hồi");
  }

  // Create comment (text-only)
  const binhLuan = await BinhLuan.create({
    CongViecID: new mongoose.Types.ObjectId(congviecid),
    NoiDung: noiDung.trim(),
    NguoiBinhLuanID: new mongoose.Types.ObjectId(currentUser.NhanVienID),
    BinhLuanChaID: parent ? new mongoose.Types.ObjectId(parentId) : undefined,
  });

  // Add comment to CongViec
  congviec.BinhLuans.push(binhLuan._id);
  await congviec.save();
  console.log("🔥 DEBUG addComment: Comment saved, about to call trigger");
  console.log(
    "🔥 DEBUG addComment: congviec._id=",
    congviec._id,
    "NguoiChinhID=",
    congviec.NguoiChinhID,
    "NguoiGiaoViecID=",
    congviec.NguoiGiaoViecID
  );
  console.log(
    "🔥 DEBUG addComment: binhLuan._id=",
    binhLuan._id,
    "NguoiBinhLuanID=",
    binhLuan.NguoiBinhLuanID
  );

  // 🔔 Notification trigger - Comment
  try {
    const nguoiBinhLuan = await NhanVien.findById(currentUser.NhanVienID)
      .select("Ten")
      .lean();

    // Danh sách người liên quan (NguoiGiaoViec, NguoiChinh, NguoiThamGia) trừ người bình luận
    const arrNguoiLienQuanID = [
      congviec.NguoiGiaoViecID?.toString(),
      congviec.NguoiChinhID?.toString(),
      ...(congviec.NguoiThamGia || []).map((p) => p.NhanVienID?.toString()),
    ].filter((id) => id && id !== currentUser.NhanVienID?.toString());

    const {
      buildCongViecNotificationData,
    } = require("../helpers/notificationDataBuilders");
    const notificationData = await buildCongViecNotificationData(congviec, {
      tenNguoiComment: nguoiBinhLuan?.Ten || "",
      noiDungComment: noiDung.trim().substring(0, 200),
    });
    await notificationService.send({
      type: "congviec-binh-luan",
      data: notificationData,
    });
    console.log("[CongViecService] ✅ Sent notification: congviec-binh-luan");
  } catch (triggerErr) {
    console.error(
      "[CongViecService] ❌ Comment notification failed:",
      triggerErr.message
    );
  }

  // Build DTO consistent with FE expectations
  const nhanvien = await NhanVien.findById(currentUser.NhanVienID)
    .select("Ten Email")
    .lean();
  const tenNguoiBinhLuan =
    nhanvien?.Ten || currentUser.HoTen || currentUser.UserName || "Người dùng";
  return {
    _id: String(binhLuan._id),
    CongViecID: String(binhLuan.CongViecID),
    BinhLuanChaID: binhLuan.BinhLuanChaID
      ? String(binhLuan.BinhLuanChaID)
      : null,
    NguoiBinhLuanID: String(currentUser.NhanVienID),
    NoiDung: binhLuan.NoiDung,
    NguoiBinhLuan: { Ten: tenNguoiBinhLuan },
    NgayBinhLuan: binhLuan.NgayBinhLuan || binhLuan.createdAt,
    TrangThai: binhLuan.TrangThai || "ACTIVE",
    Files: [],
  };
};

// ========================================
// Dashboard by NhiemVu Thuong Quy for KPI Evaluation
// ========================================
/**
 * Get dashboard metrics for a NhiemVuThuongQuy during KPI evaluation
 * @param {Object} params - { nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID }
 * @returns {Promise<Object>} Dashboard data with summary, metrics, and tasks
 */
service.getDashboardByNhiemVu = async ({
  nhiemVuThuongQuyID,
  nhanVienID,
  chuKyDanhGiaID,
}) => {
  const ChuKyDanhGia = require("../models/ChuKyDanhGia");

  // Validate inputs
  if (!nhiemVuThuongQuyID || !nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Missing required parameters: nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID"
    );
  }

  // Get cycle date range
  const chuKy = await ChuKyDanhGia.findById(chuKyDanhGiaID);
  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  // ✅ FIX: Use NgayBatDau/NgayKetThuc (correct field names from schema)
  const tuNgay = chuKy.NgayBatDau ? new Date(chuKy.NgayBatDau) : null;
  const denNgay = chuKy.NgayKetThuc ? new Date(chuKy.NgayKetThuc) : null;

  // Validate dates are valid
  if (
    !tuNgay ||
    isNaN(tuNgay.getTime()) ||
    !denNgay ||
    isNaN(denNgay.getTime())
  ) {
    throw new AppError(400, "Chu kỳ đánh giá có ngày không hợp lệ");
  }

  // Base filter: tasks in cycle date range
  // ✅ OVERLAP LOGIC: Filter by work period (NgayBatDau/NgayHetHan) with fallback to createdAt
  const baseFilter = {
    NhiemVuThuongQuyID: toObjectId(nhiemVuThuongQuyID),
    NguoiChinhID: toObjectId(nhanVienID),
    isDeleted: { $ne: true },
    $or: [
      // Case 1: Both dates exist - use overlap logic
      {
        NgayBatDau: { $ne: null, $lte: denNgay },
        NgayHetHan: { $ne: null, $gte: tuNgay },
      },
      // Case 2: Only NgayHetHan exists
      {
        NgayBatDau: null,
        NgayHetHan: { $ne: null, $gte: tuNgay, $lte: denNgay },
      },
      // Case 3: Fallback to createdAt when no work dates
      {
        NgayBatDau: null,
        NgayHetHan: null,
        createdAt: { $gte: tuNgay, $lte: denNgay },
      },
    ],
  };

  const now = new Date();

  // ========== PARALLEL AGGREGATIONS ==========
  const [
    statusDistribution,
    timeMetrics,
    collaborationMetrics,
    priorityBreakdown,
    taskList,
  ] = await Promise.all([
    // 1. Status distribution
    CongViec.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: "$TrangThai",
          count: { $sum: 1 },
        },
      },
    ]),

    // 2. Time-based metrics (completed tasks only)
    CongViec.aggregate([
      { $match: { ...baseFilter, TrangThai: "HOAN_THANH" } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          onTime: {
            $sum: { $cond: [{ $eq: ["$HoanThanhTreHan", false] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$HoanThanhTreHan", true] }, 1, 0] },
          },
          totalLateHours: {
            $sum: { $cond: ["$HoanThanhTreHan", "$SoGioTre", 0] },
          },
          maxLateHours: { $max: "$SoGioTre" },
          // Average completion time (NgayHoanThanh - NgayTiepNhanThucTe)
          avgCompletionDays: {
            $avg: {
              $cond: [
                { $and: ["$NgayHoanThanh", "$NgayTiepNhanThucTe"] },
                {
                  $divide: [
                    {
                      $subtract: ["$NgayHoanThanh", "$NgayTiepNhanThucTe"],
                    },
                    1000 * 60 * 60 * 24, // Convert ms to days
                  ],
                },
                null,
              ],
            },
          },
        },
      },
    ]),

    // 3. Collaboration metrics
    CongViec.aggregate([
      { $match: baseFilter },
      {
        $lookup: {
          from: "binhluans",
          localField: "_id",
          foreignField: "CongViecID",
          as: "comments",
        },
      },
      {
        $group: {
          _id: null,
          avgTeamSize: { $avg: { $size: "$NguoiThamGia" } },
          totalComments: { $sum: { $size: "$comments" } },
          totalTasks: { $sum: 1 },
          multiPersonTasks: {
            $sum: { $cond: [{ $gt: [{ $size: "$NguoiThamGia" }, 1] }, 1, 0] },
          },
          totalProgress: { $sum: "$PhanTramTienDoTong" },
        },
      },
    ]),

    // 4. Priority breakdown with status
    CongViec.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: "$MucDoUuTien",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$TrangThai", "HOAN_THANH"] }, 1, 0] },
          },
          late: {
            $sum: { $cond: ["$HoanThanhTreHan", 1, 0] },
          },
          active: {
            $sum: {
              $cond: [{ $eq: ["$TrangThai", "DANG_THUC_HIEN"] }, 1, 0],
            },
          },
        },
      },
    ]),

    // 5. Full task list with populated data
    CongViec.find(baseFilter)
      .populate({
        path: "NguoiGiaoViec",
        select: "Ten Email KhoaID",
        populate: { path: "KhoaID", select: "TenKhoa" },
      })
      .populate({
        path: "NguoiChinh",
        select: "Ten Email KhoaID",
        populate: { path: "KhoaID", select: "TenKhoa" },
      })
      .select(
        "MaCongViec TieuDe TrangThai MucDoUuTien PhanTramTienDoTong NgayHetHan NgayHoanThanh SoGioTre HoanThanhTreHan NguoiThamGia createdAt"
      )
      .sort({ SoGioTre: -1, NgayHetHan: 1 })
      .lean(),
  ]);

  // ========== PROCESS RESULTS ==========

  // Status distribution map
  const statusMap = {
    TAO_MOI: 0,
    DA_GIAO: 0,
    DANG_THUC_HIEN: 0,
    CHO_DUYET: 0,
    HOAN_THANH: 0,
  };
  statusDistribution.forEach((item) => {
    statusMap[item._id] = item.count;
  });

  const total = Object.values(statusMap).reduce((sum, count) => sum + count, 0);
  const completed = statusMap.HOAN_THANH;
  const active = statusMap.DANG_THUC_HIEN;

  // Time metrics
  const timeData = timeMetrics[0] || {
    total: 0,
    onTime: 0,
    late: 0,
    totalLateHours: 0,
    maxLateHours: 0,
    avgCompletionDays: 0,
  };

  const onTimeRate = timeData.total > 0 ? timeData.onTime / timeData.total : 0;
  const lateRate = timeData.total > 0 ? timeData.late / timeData.total : 0;
  const avgLateHours =
    timeData.late > 0 ? timeData.totalLateHours / timeData.late : 0;

  // Collaboration metrics
  const collabData = collaborationMetrics[0] || {
    avgTeamSize: 0,
    totalComments: 0,
    totalTasks: 0,
    multiPersonTasks: 0,
    totalProgress: 0,
  };

  const avgComments =
    collabData.totalTasks > 0
      ? collabData.totalComments / collabData.totalTasks
      : 0;
  const avgProgress =
    collabData.totalTasks > 0
      ? collabData.totalProgress / collabData.totalTasks
      : 0;

  // Priority distribution map
  const priorityMap = {};
  priorityBreakdown.forEach((item) => {
    priorityMap[item._id] = {
      total: item.total,
      completed: item.completed,
      late: item.late,
      active: item.active,
    };
  });

  // Calculate currently overdue tasks
  const overdueCount = taskList.filter(
    (task) =>
      task.TrangThai !== "HOAN_THANH" &&
      task.NgayHetHan &&
      new Date(task.NgayHetHan) < now
  ).length;

  // Map task list for frontend
  const mappedTasks = taskList.map((task) => ({
    ...task,
    NguoiGiaoProfile: task.NguoiGiaoViec,
    NguoiChinhProfile: task.NguoiChinh,
    SoLuongNguoiThamGia: task.NguoiThamGia?.length || 0,
  }));

  // ========== RETURN DASHBOARD DATA ==========
  return {
    summary: {
      total,
      completed,
      completionRate: total > 0 ? completed / total : 0,
      late: timeData.late,
      lateRate,
      active,
      overdue: overdueCount,
      avgProgress: Math.round(avgProgress * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 1000) / 10, // Convert to percentage with 1 decimal
    },
    timeMetrics: {
      avgLateHours: Math.round(avgLateHours * 10) / 10,
      maxLateHours: timeData.maxLateHours || 0,
      avgCompletionDays:
        Math.round((timeData.avgCompletionDays || 0) * 10) / 10,
      onTimeCount: timeData.onTime,
      lateCount: timeData.late,
    },
    statusDistribution: Object.keys(statusMap).map((status) => ({
      status,
      count: statusMap[status],
      percentage: total > 0 ? Math.round((statusMap[status] / total) * 100) : 0,
    })),
    priorityDistribution: Object.keys(priorityMap).map((priority) => ({
      priority,
      ...priorityMap[priority],
    })),
    collaboration: {
      avgTeamSize: Math.round((collabData.avgTeamSize || 0) * 10) / 10,
      avgComments: Math.round(avgComments * 10) / 10,
      multiPersonTasks: collabData.multiPersonTasks,
      multiPersonRate:
        total > 0 ? Math.round((collabData.multiPersonTasks / total) * 100) : 0,
    },
    tasks: mappedTasks,
  };
};

/**
 * Get summary of "other" tasks (ALL tasks without NVTQ assignment)
 * Used by: Compact card in KPI evaluation page
 * Includes: FlagNVTQKhac=true AND unassigned tasks (FlagNVTQKhac=false)
 * @param {String} nhanVienID - Employee ID
 * @param {String} chuKyDanhGiaID - Evaluation cycle ID
 * @returns {Object} {total, completed, late, active, tasks[]}
 */
service.getOtherTasksSummary = async (nhanVienID, chuKyDanhGiaID) => {
  // Validate inputs
  if (!nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Thiếu nhanVienID hoặc chuKyDanhGiaID",
      "MISSING_PARAMS"
    );
  }

  // Get cycle dates
  const chuKy = await ChuKyDanhGia.findById(chuKyDanhGiaID);
  if (!chuKy) {
    throw new AppError(
      404,
      "Không tìm thấy chu kỳ đánh giá",
      "CYCLE_NOT_FOUND"
    );
  }

  const tuNgay = new Date(chuKy.NgayBatDau);
  tuNgay.setHours(0, 0, 0, 0); // Start of day
  const denNgay = new Date(chuKy.NgayKetThuc);
  denNgay.setHours(23, 59, 59, 999); // End of day - FIX: include tasks created on last day

  if (
    !tuNgay ||
    isNaN(tuNgay.getTime()) ||
    !denNgay ||
    isNaN(denNgay.getTime())
  ) {
    throw new AppError(
      400,
      "Chu kỳ đánh giá có ngày không hợp lệ",
      "INVALID_DATES"
    );
  }

  // Build filter - VAI TRÒ CHÍNH + KHÔNG THUỘC NVTQ
  // ✅ Includes ALL tasks without NVTQ (both FlagNVTQKhac=true and false)
  // ✅ OVERLAP LOGIC: Filter by work period with fallback to createdAt
  const baseFilter = {
    NguoiChinhID: toObjectId(nhanVienID),
    NhiemVuThuongQuyID: null,
    isDeleted: { $ne: true },
    $or: [
      // Case 1: Both dates exist - use overlap logic
      {
        NgayBatDau: { $ne: null, $lte: denNgay },
        NgayHetHan: { $ne: null, $gte: tuNgay },
      },
      // Case 2: Only NgayHetHan exists
      {
        NgayBatDau: null,
        NgayHetHan: { $ne: null, $gte: tuNgay, $lte: denNgay },
      },
      // Case 3: Fallback to createdAt when no work dates
      {
        NgayBatDau: null,
        NgayHetHan: null,
        createdAt: { $gte: tuNgay, $lte: denNgay },
      },
    ],
  };

  // Aggregation for counts (lightweight)
  const [summary] = await CongViec.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$TrangThai", "HOAN_THANH"] }, 1, 0] },
        },
        late: {
          $sum: { $cond: ["$HoanThanhTreHan", 1, 0] },
        },
        active: {
          $sum: { $cond: [{ $eq: ["$TrangThai", "DANG_THUC_HIEN"] }, 1, 0] },
        },
      },
    },
  ]);

  // Get task list (limit 50 for performance)
  const tasks = await CongViec.find(baseFilter)
    .select(
      "MaCongViec TieuDe MoTa TrangThai NgayHetHan SoGioTre HoanThanhTreHan PhanTramTienDoTong FlagNVTQKhac createdAt"
    )
    .sort({ SoGioTre: -1, NgayHetHan: 1 })
    .limit(50)
    .lean();

  // Return summary + task list
  return {
    total: summary?.total || 0,
    completed: summary?.completed || 0,
    late: summary?.late || 0,
    active: summary?.active || 0,
    tasks: tasks || [],
  };
};

/**
 * Get summary of collaboration tasks (VaiTro = PHOI_HOP)
 * Used by: Compact card in KPI evaluation page
 * @param {String} nhanVienID - Employee ID
 * @param {String} chuKyDanhGiaID - Evaluation cycle ID
 * @returns {Object} {total, completed, late, active, tasks[]}
 */
service.getCollabTasksSummary = async (nhanVienID, chuKyDanhGiaID) => {
  // Validate inputs
  if (!nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Thiếu nhanVienID hoặc chuKyDanhGiaID",
      "MISSING_PARAMS"
    );
  }

  // Get cycle dates
  const chuKy = await ChuKyDanhGia.findById(chuKyDanhGiaID);
  if (!chuKy) {
    throw new AppError(
      404,
      "Không tìm thấy chu kỳ đánh giá",
      "CYCLE_NOT_FOUND"
    );
  }

  const tuNgay = new Date(chuKy.NgayBatDau);
  tuNgay.setHours(0, 0, 0, 0); // Start of day
  const denNgay = new Date(chuKy.NgayKetThuc);
  denNgay.setHours(23, 59, 59, 999); // End of day - FIX: include tasks created on last day

  if (
    !tuNgay ||
    isNaN(tuNgay.getTime()) ||
    !denNgay ||
    isNaN(denNgay.getTime())
  ) {
    throw new AppError(
      400,
      "Chu kỳ đánh giá có ngày không hợp lệ",
      "INVALID_DATES"
    );
  }

  // Build filter - VAI TRÒ PHỐI HỢP
  // ✅ OVERLAP LOGIC: Filter by work period with fallback to createdAt
  const baseFilter = {
    NguoiThamGia: {
      $elemMatch: {
        NhanVienID: toObjectId(nhanVienID),
        VaiTro: "PHOI_HOP",
      },
    },
    isDeleted: { $ne: true },
    $or: [
      // Case 1: Both dates exist - use overlap logic
      {
        NgayBatDau: { $ne: null, $lte: denNgay },
        NgayHetHan: { $ne: null, $gte: tuNgay },
      },
      // Case 2: Only NgayHetHan exists
      {
        NgayBatDau: null,
        NgayHetHan: { $ne: null, $gte: tuNgay, $lte: denNgay },
      },
      // Case 3: Fallback to createdAt when no work dates
      {
        NgayBatDau: null,
        NgayHetHan: null,
        createdAt: { $gte: tuNgay, $lte: denNgay },
      },
    ],
  };

  // Aggregation for counts
  const [summary] = await CongViec.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$TrangThai", "HOAN_THANH"] }, 1, 0] },
        },
        late: {
          $sum: { $cond: ["$HoanThanhTreHan", 1, 0] },
        },
        active: {
          $sum: { $cond: [{ $eq: ["$TrangThai", "DANG_THUC_HIEN"] }, 1, 0] },
        },
      },
    },
  ]);

  // Get task list with NguoiChinh info
  const tasks = await CongViec.find(baseFilter)
    .select(
      "MaCongViec TieuDe MoTa TrangThai NgayHetHan SoGioTre HoanThanhTreHan PhanTramTienDoTong NguoiChinhID createdAt"
    )
    .populate({
      path: "NguoiChinhID",
      select: "Ten Email",
    })
    .sort({ SoGioTre: -1, NgayHetHan: 1 })
    .limit(50)
    .lean();

  // Map NguoiChinhProfile for frontend
  const tasksWithProfile = tasks.map((task) => ({
    ...task,
    NguoiChinhProfile: task.NguoiChinhID
      ? {
          Ten: task.NguoiChinhID.Ten,
          Email: task.NguoiChinhID.Email,
        }
      : null,
  }));

  return {
    total: summary?.total || 0,
    completed: summary?.completed || 0,
    late: summary?.late || 0,
    active: summary?.active || 0,
    tasks: tasksWithProfile,
  };
};

// ========================================
// Cross-Cycle Tasks Summary for KPI Evaluation
// ========================================
/**
 * Get summary of tasks assigned to NVTQ from previous cycles
 * @param {Object} params - { nhanVienID, chuKyDanhGiaID }
 * @returns {Promise<Object>} Summary with total, completed, late, active, tasks
 */
service.getCrossCycleTasksSummary = async ({ nhanVienID, chuKyDanhGiaID }) => {
  const ChuKyDanhGia = require("../models/ChuKyDanhGia");
  const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");

  // Validate inputs
  if (!nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Missing required parameters: nhanVienID, chuKyDanhGiaID"
    );
  }

  // Get cycle date range
  const chuKy = await ChuKyDanhGia.findById(chuKyDanhGiaID);
  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  const tuNgay = chuKy.NgayBatDau ? new Date(chuKy.NgayBatDau) : null;
  const denNgay = chuKy.NgayKetThuc ? new Date(chuKy.NgayKetThuc) : null;

  if (
    !tuNgay ||
    isNaN(tuNgay.getTime()) ||
    !denNgay ||
    isNaN(denNgay.getTime())
  ) {
    throw new AppError(400, "Chu kỳ đánh giá có ngày không hợp lệ");
  }

  // FIX: Set time boundaries for accurate date comparison
  tuNgay.setHours(0, 0, 0, 0); // Start of day
  denNgay.setHours(23, 59, 59, 999); // End of day - include tasks created on last day

  // Step 1: Find all NVTQ assignments from OTHER cycles for this employee
  const otherCycleAssignments = await NhanVienNhiemVu.find({
    NhanVienID: toObjectId(nhanVienID),
    ChuKyDanhGiaID: { $ne: toObjectId(chuKyDanhGiaID), $exists: true },
    isDeleted: false,
  }).select("NhiemVuThuongQuyID ChuKyDanhGiaID");

  // If no cross-cycle assignments, return empty
  if (otherCycleAssignments.length === 0) {
    return {
      total: 0,
      completed: 0,
      late: 0,
      active: 0,
      tasks: [],
    };
  }

  // FIX: Also get NVTQ assignments from CURRENT cycle to exclude them
  const currentCycleAssignments = await NhanVienNhiemVu.find({
    NhanVienID: toObjectId(nhanVienID),
    ChuKyDanhGiaID: toObjectId(chuKyDanhGiaID),
    isDeleted: false,
  }).select("NhiemVuThuongQuyID");

  const currentCycleNVTQIds = currentCycleAssignments.map((a) =>
    a.NhiemVuThuongQuyID?.toString()
  );

  // FIX: Filter out NVTQs that are ALSO assigned in current cycle
  // Only keep truly "cross-cycle" NVTQs (assigned in other cycle but NOT in current)
  const crossCycleNVTQIds = otherCycleAssignments
    .map((a) => a.NhiemVuThuongQuyID)
    .filter((nvtqId) => !currentCycleNVTQIds.includes(nvtqId?.toString()));

  // If all NVTQs are also in current cycle, return empty
  if (crossCycleNVTQIds.length === 0) {
    return {
      total: 0,
      completed: 0,
      late: 0,
      active: 0,
      tasks: [],
    };
  }

  // Step 2: Find tasks that:
  // - Have NhiemVuThuongQuyID in crossCycleNVTQIds
  // - NguoiChinhID = nhanVienID
  // - Date overlap with current cycle
  const baseFilter = {
    NhiemVuThuongQuyID: { $in: crossCycleNVTQIds },
    NguoiChinhID: toObjectId(nhanVienID),
    isDeleted: { $ne: true },
    $or: [
      // Case 1: Both dates exist - overlap logic
      {
        NgayBatDau: { $ne: null, $lte: denNgay },
        NgayHetHan: { $ne: null, $gte: tuNgay },
      },
      // Case 2: Only NgayHetHan exists
      {
        NgayBatDau: null,
        NgayHetHan: { $ne: null, $gte: tuNgay, $lte: denNgay },
      },
      // Case 3: Fallback to createdAt
      {
        NgayBatDau: null,
        NgayHetHan: null,
        createdAt: { $gte: tuNgay, $lte: denNgay },
      },
    ],
  };

  // Aggregate for summary
  const summary = await CongViec.aggregate([
    { $match: baseFilter },
    {
      $facet: {
        total: [{ $count: "count" }],
        completed: [
          { $match: { TrangThai: "HOAN_THANH" } },
          { $count: "count" },
        ],
        late: [
          {
            $match: {
              $or: [
                { HoanThanhTreHan: true },
                {
                  TrangThai: { $ne: "HOAN_THANH" },
                  NgayHetHan: { $lt: new Date() },
                },
              ],
            },
          },
          { $count: "count" },
        ],
        active: [
          {
            $match: {
              TrangThai: { $in: ["MOI_TAO", "DANG_THUC_HIEN"] },
            },
          },
          { $count: "count" },
        ],
      },
    },
    {
      $project: {
        total: { $arrayElemAt: ["$total.count", 0] },
        completed: { $arrayElemAt: ["$completed.count", 0] },
        late: { $arrayElemAt: ["$late.count", 0] },
        active: { $arrayElemAt: ["$active.count", 0] },
      },
    },
  ]);

  // Get task list (limit 50 for performance)
  const tasks = await CongViec.find(baseFilter)
    .populate({
      path: "NguoiChinh",
      select: "Ten Email KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate({
      path: "NguoiGiaoViec",
      select: "Ten Email",
    })
    .populate({
      path: "NhiemVuThuongQuyID",
      select: "TenNhiemVu MoTa",
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Map to DTO
  const tasksWithProfile = tasks.map((t) => mapCongViecDTO(t));

  const summaryData = summary[0] || {};

  return {
    total: summaryData.total || 0,
    completed: summaryData.completed || 0,
    late: summaryData.late || 0,
    active: summaryData.active || 0,
    tasks: tasksWithProfile,
  };
};

module.exports = service;
