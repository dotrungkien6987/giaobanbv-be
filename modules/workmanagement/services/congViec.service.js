const mongoose = require("mongoose");
const { AppError } = require("../../../helpers/utils");

const User = require("../../../models/User");
const NhanVien = require("../../../models/NhanVien");
const CongViec = require("../models/CongViec");
const BinhLuan = require("../models/BinhLuan");

function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

const service = {};

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

  // Filter theo NgayHetHan
  if (filters.NgayHetHan) {
    query.NgayHetHan = { $lte: new Date(filters.NgayHetHan) };
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
        from: "nhanvien",
        localField: "NguoiGiaoViecID",
        foreignField: "_id",
        as: "NguoiGiaoViecInfo",
      },
    },
    // Populate NguoiChinhID
    {
      $lookup: {
        from: "nhanvien",
        localField: "NguoiChinhID",
        foreignField: "_id",
        as: "NguoiChinhInfo",
      },
    },
    // Thêm virtual fields
    {
      $addFields: {
        NguoiGiaoViecID: {
          $mergeObjects: [
            { $arrayElemAt: ["$NguoiGiaoViecInfo", 0] },
            {
              _id: "$NguoiGiaoViecID",
              Ten: { $arrayElemAt: ["$NguoiGiaoViecInfo.Ten", 0] },
              Email: { $arrayElemAt: ["$NguoiGiaoViecInfo.Email", 0] },
            },
          ],
        },
        NguoiChinhID: {
          $mergeObjects: [
            { $arrayElemAt: ["$NguoiChinhInfo", 0] },
            {
              _id: "$NguoiChinhID",
              Ten: { $arrayElemAt: ["$NguoiChinhInfo.Ten", 0] },
              Email: { $arrayElemAt: ["$NguoiChinhInfo.Email", 0] },
            },
          ],
        },
        SoLuongNguoiThamGia: { $size: "$NguoiThamGia" },
        PhanTramTienDoTong: { $ifNull: ["$PhanTramTienDoTong", 0] },
      },
    },
    // Project chỉ lấy fields cần thiết
    {
      $project: {
        NguoiGiaoViecInfo: 0,
        NguoiChinhInfo: 0,
        NguoiThamGia: 0,
        LichSuTrangThai: 0,
      },
    },
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const congViecs = await CongViec.aggregate(pipeline);
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

  // Aggregation pipeline tương tự như getReceivedCongViecs
  const pipeline = [
    { $match: query },
    // Populate NguoiGiaoViecID
    {
      $lookup: {
        from: "nhanvien",
        localField: "NguoiGiaoViecID",
        foreignField: "_id",
        as: "NguoiGiaoViecInfo",
      },
    },
    // Populate NguoiChinhID
    {
      $lookup: {
        from: "nhanvien",
        localField: "NguoiChinhID",
        foreignField: "_id",
        as: "NguoiChinhInfo",
      },
    },
    // Thêm virtual fields
    {
      $addFields: {
        NguoiGiaoViecID: {
          $mergeObjects: [
            { $arrayElemAt: ["$NguoiGiaoViecInfo", 0] },
            {
              _id: "$NguoiGiaoViecID",
              Ten: { $arrayElemAt: ["$NguoiGiaoViecInfo.Ten", 0] },
              Email: { $arrayElemAt: ["$NguoiGiaoViecInfo.Email", 0] },
            },
          ],
        },
        NguoiChinhID: {
          $mergeObjects: [
            { $arrayElemAt: ["$NguoiChinhInfo", 0] },
            {
              _id: "$NguoiChinhID",
              Ten: { $arrayElemAt: ["$NguoiChinhInfo.Ten", 0] },
              Email: { $arrayElemAt: ["$NguoiChinhInfo.Email", 0] },
            },
          ],
        },
        SoLuongNguoiThamGia: { $size: "$NguoiThamGia" },
        PhanTramTienDoTong: { $ifNull: ["$PhanTramTienDoTong", 0] },
      },
    },
    // Project chỉ lấy fields cần thiết
    {
      $project: {
        NguoiGiaoViecInfo: 0,
        NguoiChinhInfo: 0,
        NguoiThamGia: 0,
        LichSuTrangThai: 0,
      },
    },
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const congViecs = await CongViec.aggregate(pipeline);
  console.log(
    "[getAssignedCongViecs] Aggregation returned",
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

  if (congviec.isDeleted) {
    throw new AppError(400, "Công việc đã bị xóa");
  }

  // Soft delete
  congviec.isDeleted = true;
  await congviec.save();

  return { message: "Xóa công việc thành công" };
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
      path: "NguoiChinh",
      select: "Ten KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .populate("NhomViecUserID", "TenNhom MoTa")
    .populate({
      path: "NguoiThamGia.NhanVienID",
      select: "Ten KhoaID",
      populate: { path: "KhoaID", select: "TenKhoa MaKhoa" },
    })
    .select(
      "TieuDe MoTa NgayBatDau NgayHetHan MucDoUuTien TrangThai PhanTramTienDoTong NguoiChinhID NguoiThamGia NhomViecUserID"
    )
    .lean();

  if (!congviec) {
    throw new AppError(404, "Không tìm thấy công việc");
  }

  return congviec;
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
  };

  if (req?.userId) {
    // Lấy thông tin User để get NhanVienID
    const user = await User.findById(req.userId);
    if (user?.NhanVienID) {
      newCongViecData.NguoiGiaoViecID = user.NhanVienID;
    } else {
      throw new AppError(400, "User chưa được liên kết với nhân viên nào");
    }
  }

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

  return populatedCongViec;
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
  // Chuẩn hoá dữ liệu cập nhật
  // =============================
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

  if (updateData.MucDoUuTien) {
    updateData.MucDoUuTien =
      priorityMap[updateData.MucDoUuTien] || updateData.MucDoUuTien;
  }
  if (updateData.TrangThai) {
    updateData.TrangThai =
      statusMap[updateData.TrangThai] || updateData.TrangThai;
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

  return populatedCongViec;
};

/**
 * Thêm bình luận vào công việc
 */
service.addComment = async (congviecid, noiDung, req) => {
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

  // Create comment
  const commentData = {
    CongViecID: congviecid,
    NoiDung: noiDung.trim(),
    NgayTao: new Date(),
  };

  // Add user info if available
  if (req?.user?._id) {
    commentData.NguoiBinhLuan = req.user._id;
  }

  const binhLuan = new BinhLuan(commentData);
  await binhLuan.save();

  // Add comment to CongViec
  congviec.BinhLuans.push(binhLuan._id);
  await congviec.save();

  // Return populated comment
  const populatedComment = await BinhLuan.findById(binhLuan._id)
    .populate("NguoiBinhLuan", "Ten Email")
    .lean();

  return populatedComment;
};

module.exports = service;
