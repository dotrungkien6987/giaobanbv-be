const mongoose = require("mongoose");
const { AppError } = require("../../../helpers/utils");

const User = require("../../../models/User");
const NhanVien = require("../../../models/NhanVien");
const CongViec = require("../models/CongViec");
const Counter = require("../models/Counter");
const BinhLuan = require("../models/BinhLuan");
const TepTin = require("../models/TepTin");

function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
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
  return dto;
}

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

// Lấy danh sách Nhiệm Vụ Thường Quy của nhân viên hiện tại
// Assumption: Có model NhanVienNhiemVu với quan hệ NhanVienID - NhiemVuThuongQuyID
try {
  const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");
  service.getMyRoutineTasks = async (nhanVienId) => {
    if (!nhanVienId) throw new AppError(400, "Thiếu nhanVienId");
    const list = await NhanVienNhiemVu.find({ NhanVienID: nhanVienId })
      .populate("NhiemVuThuongQuyID")
      .lean();
    return list
      .filter((x) => x.NhiemVuThuongQuyID)
      .map((x) => ({
        _id: String(x.NhiemVuThuongQuyID._id),
        Ten: x.NhiemVuThuongQuyID.Ten || x.NhiemVuThuongQuyID.TieuDe || "",
        MoTa: x.NhiemVuThuongQuyID.MoTa || "",
      }));
  };
} catch (_) {
  // bỏ qua nếu model chưa tồn tại
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
 * Xóa công việc (soft delete)
 */
service.deleteCongViec = async (congviecid, req) => {
  if (!mongoose.Types.ObjectId.isValid(congviecid)) {
    throw new AppError(400, "ID công việc không hợp lệ");
  }

  const congviec = await CongViec.findById(congviecid);
  if (!congviec) {
    throw new AppError(404, "Không tìm thấy công việc");
  }

  // Step 5: Concurrency guard using If-Unmodified-Since header or expectedVersion field
  const clientVersion =
    updateData?.expectedVersion || req.headers["if-unmodified-since"];
  if (clientVersion) {
    const serverVersion = congviec.updatedAt
      ? congviec.updatedAt.toISOString()
      : null;
    if (serverVersion && serverVersion !== clientVersion) {
      throw new AppError(409, "VERSION_CONFLICT", "Version mismatch");
    }
  }

  if (congviec.isDeleted) {
    throw new AppError(400, "Công việc đã bị xóa");
  }

  // Authorization: chỉ người giao việc hoặc admin/manager được xóa
  // Lưu ý: Công việc HOAN_THANH chỉ admin được xóa
  let currentUser = null;
  if (req?.userId) {
    currentUser = await User.findById(req.userId).select(
      "PhanQuyen NhanVienID"
    );
  }
  if (!currentUser) {
    throw new AppError(401, "Không xác thực được người dùng");
  }

  const isAdmin = currentUser.PhanQuyen === "admin";
  const isManager = currentUser.PhanQuyen === "manager";
  const isOwner =
    currentUser.NhanVienID &&
    String(currentUser.NhanVienID) === String(congviec.NguoiGiaoViecID);

  // Completed tasks: only admin can delete
  if (congviec.TrangThai === "HOAN_THANH" && !isAdmin) {
    throw new AppError(
      403,
      "Chỉ quản trị viên (admin) mới được xóa công việc đã hoàn thành"
    );
  }

  if (!(isAdmin || isManager || isOwner)) {
    throw new AppError(
      403,
      "Bạn không có quyền xóa công việc này (chỉ người giao việc hoặc admin/manager)"
    );
  }

  // Không cho xóa nếu còn công việc con (chưa bị xóa)
  const childCount = await CongViec.countDocuments({
    CongViecChaID: congviecid,
    isDeleted: { $ne: true },
  });
  if (childCount > 0) {
    throw new AppError(400, "Vui lòng xóa công việc con trước");
  }

  // Soft delete
  congviec.isDeleted = true;
  await congviec.save();

  // Cascade mềm bình luận (đánh dấu DELETED)
  const commentUpdate = await BinhLuan.updateMany(
    { CongViecID: congviecid, TrangThai: { $ne: "DELETED" } },
    { $set: { TrangThai: "DELETED", NgayCapNhat: new Date() } }
  );
  const commentCount = commentUpdate?.modifiedCount || 0;

  // Cascade mềm tệp đính kèm
  const fileUpdate = await TepTin.updateMany(
    { CongViecID: congviecid, TrangThai: { $ne: "DELETED" } },
    { $set: { TrangThai: "DELETED" } }
  );
  const fileCount = fileUpdate?.modifiedCount || 0;

  return {
    message: "Xóa công việc thành công",
    meta: {
      childCount,
      commentCount,
      fileCount,
    },
  };
};

/**
 * Lấy chi tiết công việc theo ID với đầy đủ thông tin
 */
service.getCongViecDetail = async (congviecid) => {
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
    .select(
      "MaCongViec SoThuTu TieuDe MoTa NgayBatDau NgayHetHan NgayGiaoViec NgayCanhBao NgayHoanThanh CanhBaoMode CanhBaoSapHetHanPercent MucDoUuTien TrangThai PhanTramTienDoTong NguoiGiaoViecID NguoiChinhID NguoiThamGia NhomViecUserID createdAt"
    )
    .lean();

  if (!congviec) {
    throw new AppError(404, "Không tìm thấy công việc");
  }

  // Map to unified DTO
  const dto = mapCongViecDTO(congviec);
  // Preserve createdAt for UI as NgayTao
  if (congviec.createdAt) dto.NgayTao = congviec.createdAt;

  // Enrich with comments: display NhanVien name and timestamp
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
        from: "users",
        localField: "NguoiBinhLuanID",
        foreignField: "_id",
        as: "User",
      },
    },
    { $unwind: { path: "$User", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "nhanviens",
        localField: "User.NhanVienID",
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
          Ten: {
            $ifNull: [
              "$NhanVien.Ten",
              { $ifNull: ["$User.HoTen", "$User.UserName"] },
            ],
          },
        },
      },
    },
  ]);

  // Lưu ý: không gán BinhLuans tại đây; sẽ gán sau khi lookup Files để đảm bảo lần tải đầu có kèm tệp đính kèm

  // Lookup attached files for each comment
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
        from: "users",
        localField: "NguoiBinhLuanID",
        foreignField: "_id",
        as: "User",
      },
    },
    { $unwind: { path: "$User", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "nhanviens",
        localField: "User.NhanVienID",
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
          Ten: {
            $ifNull: [
              "$NhanVien.Ten",
              { $ifNull: ["$User.HoTen", "$User.UserName"] },
            ],
          },
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
  // Quyền (Step1): strictly by req.nhanVienId
  const performerIdCtx = req?.nhanVienId || null;
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
    if (action === WORK_ACTIONS.HOAN_THANH && !isAssigner)
      code = "NOT_ASSIGNER";
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
  const isAdmin =
    user && (user.PhanQuyen === "admin" || user.PhanQuyen === "manager");
  const isOwner =
    user && String(comment.NguoiBinhLuanID) === String(req.userId);
  if (!isAdmin && !isOwner) throw new AppError(403, "Không có quyền thu hồi");

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
  const isAdmin =
    user && (user.PhanQuyen === "admin" || user.PhanQuyen === "manager");
  const isOwner =
    user && String(comment.NguoiBinhLuanID) === String(req.userId);
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
      select: "NhanVienID HoTen UserName",
      populate: { path: "NhanVienID", select: "Ten" },
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
      inlineUrl: `/api/workmanagement/files/${String(f._id)}/inline`,
      downloadUrl: `/api/workmanagement/files/${String(f._id)}/download`,
    });
    return acc;
  }, {});

  const dtos = replies.map((r) => {
    const user = r.NguoiBinhLuanID || {};
    const tenNguoiBinhLuan =
      (user.NhanVienID && user.NhanVienID.Ten) ||
      user.HoTen ||
      user.UserName ||
      "Người dùng";
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
  // Nhiệm vụ thường quy (single-select) update rules
  // Fields: NhiemVuThuongQuyID, FlagNVTQKhac
  // Only main performer can modify
  if (
    Object.prototype.hasOwnProperty.call(updateData, "NhiemVuThuongQuyID") ||
    Object.prototype.hasOwnProperty.call(updateData, "FlagNVTQKhac")
  ) {
    const performerNhanVienId = req.nhanVienId; // mapped in auth middleware
    if (!performerNhanVienId) {
      throw new AppError(403, "Không xác định nhân viên thực hiện");
    }
    if (String(congviec.NguoiChinhID) !== String(performerNhanVienId)) {
      throw new AppError(
        403,
        "Chỉ Người Chính được phép cập nhật Nhiệm Vụ Thường Quy"
      );
    }
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
      TienDo: p.TienDo || 0,
      GhiChu: p.GhiChu,
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
          TienDo: 0,
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

  // Áp dụng cập nhật (bỏ qua field không có trong schema trừ khi ta xử lý đặc biệt ở trên)
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      // Ghi chú: FE có thể vẫn gửi NguoiChinh => đã map sang NguoiChinhID ở trên
      if (key === "NguoiChinh") return; // bỏ qua field alias
      congviec[key] = updateData[key];
    }
  });

  // Cập nhật tiến độ tổng theo người chính nếu có thay đổi danh sách tham gia
  if (updateData.NguoiThamGia) {
    congviec.capNhatTienDoTongTheoNguoiChinh();
  }

  await congviec.save();

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
    NguoiBinhLuanID: new mongoose.Types.ObjectId(req.userId),
    BinhLuanChaID: parent ? new mongoose.Types.ObjectId(parentId) : undefined,
  });

  // Add comment to CongViec
  congviec.BinhLuans.push(binhLuan._id);
  await congviec.save();

  // Build DTO consistent with FE expectations
  const user = await require("../../../models/User")
    .findById(req.userId)
    .populate({ path: "NhanVienID", select: "Ten" })
    .lean();
  const tenNguoiBinhLuan =
    (user && user.NhanVienID && user.NhanVienID.Ten) ||
    (user && user.HoTen) ||
    (user && user.UserName) ||
    "Người dùng";
  return {
    _id: String(binhLuan._id),
    CongViecID: String(binhLuan.CongViecID),
    BinhLuanChaID: binhLuan.BinhLuanChaID
      ? String(binhLuan.BinhLuanChaID)
      : null,
    NguoiBinhLuanID: String(req.userId),
    NoiDung: binhLuan.NoiDung,
    NguoiBinhLuan: { Ten: tenNguoiBinhLuan },
    NgayBinhLuan: binhLuan.NgayBinhLuan || binhLuan.createdAt,
    TrangThai: binhLuan.TrangThai || "ACTIVE",
    Files: [],
  };
};

module.exports = service;
