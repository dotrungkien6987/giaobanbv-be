/**
 * YeuCau Service
 *
 * Business logic cho:
 * - CRUD yêu cầu
 * - Lấy danh sách theo các filter
 * - Dashboard metrics
 */

const mongoose = require("mongoose");
const { AppError } = require("../../../helpers/utils");

const YeuCau = require("../models/YeuCau");
const YeuCauCounter = require("../models/YeuCauCounter");
const DanhMucYeuCau = require("../models/DanhMucYeuCau");
const CauHinhThongBaoKhoa = require("../models/CauHinhThongBaoKhoa");
const LichSuYeuCau = require("../models/LichSuYeuCau");
const BinhLuan = require("../models/BinhLuan");
const TepTin = require("../models/TepTin");
const NhanVien = require("../../../models/NhanVien");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const User = require("../../../models/User");

const yeuCauStateMachine = require("./yeuCauStateMachine");
const notificationService = require("./notificationService");
const triggerService = require("../../../services/triggerService");
const dayjs = require("dayjs");

const { TRANG_THAI, LOAI_NGUOI_NHAN } = YeuCau;
const { HANH_DONG } = LichSuYeuCau;

/**
 * Populate chuẩn cho YeuCau - đảm bảo dữ liệu đầy đủ cho frontend
 */
async function populateYeuCau(yeuCauDoc) {
  return YeuCau.findById(yeuCauDoc._id)
    .populate("NguoiYeuCauID", "Ten MaNhanVien Email Images")
    .populate("KhoaNguonID", "TenKhoa MaKhoa")
    .populate("KhoaDichID", "TenKhoa MaKhoa")
    .populate("NguoiNhanID", "Ten MaNhanVien")
    .populate("NguoiDieuPhoiID", "Ten MaNhanVien")
    .populate("NguoiDuocDieuPhoiID", "Ten MaNhanVien")
    .populate("NguoiXuLyID", "Ten MaNhanVien Email")
    .populate("DanhMucYeuCauID", "TenLoaiYeuCau");
}

/**
 * Tạo yêu cầu mới
 * @param {Object} data - Dữ liệu yêu cầu
 * @param {ObjectId} nguoiYeuCauId - ID người tạo (NhanVienID)
 * @returns {Promise<YeuCau>}
 */
async function taoYeuCau(data, nguoiYeuCauId) {
  // 1. Lấy thông tin người yêu cầu
  const nguoiYeuCau = await NhanVien.findById(nguoiYeuCauId);
  if (!nguoiYeuCau) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin nhân viên",
      "NHANVIEN_NOT_FOUND"
    );
  }

  const khoaNguonId = nguoiYeuCau.KhoaID;
  if (!khoaNguonId) {
    throw new AppError(400, "Nhân viên chưa được gán khoa", "NHANVIEN_NO_KHOA");
  }

  // 2. Validate khoa đích đã được cấu hình
  const khoaDichId = data.KhoaDichID;
  const cauHinh = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaDichId });

  if (!cauHinh) {
    throw new AppError(
      400,
      "Khoa đích chưa được cấu hình để nhận yêu cầu. Vui lòng liên hệ quản trị viên.",
      "KHOA_CHUA_CAU_HINH"
    );
  }

  // 3. Nếu gửi đến KHOA, kiểm tra có người điều phối không
  if (data.LoaiNguoiNhan === LOAI_NGUOI_NHAN.KHOA) {
    if (cauHinh.DanhSachNguoiDieuPhoi.length === 0) {
      throw new AppError(
        400,
        "Khoa đích chưa có người điều phối để nhận yêu cầu. Vui lòng liên hệ quản trị viên.",
        "KHOA_KHONG_CO_DIEU_PHOI"
      );
    }
  }

  // 4. Validate danh mục yêu cầu
  const danhMuc = await DanhMucYeuCau.findById(data.DanhMucYeuCauID);
  if (!danhMuc) {
    throw new AppError(
      404,
      "Không tìm thấy danh mục yêu cầu",
      "DANHMUC_NOT_FOUND"
    );
  }

  if (danhMuc.KhoaID.toString() !== khoaDichId.toString()) {
    throw new AppError(
      400,
      "Danh mục yêu cầu không thuộc khoa đích",
      "DANHMUC_INVALID_KHOA"
    );
  }

  if (danhMuc.TrangThai !== "HOAT_DONG") {
    throw new AppError(
      400,
      "Danh mục yêu cầu đã ngừng hoạt động",
      "DANHMUC_INACTIVE"
    );
  }

  // 5. Generate mã yêu cầu
  const maYeuCau = await YeuCauCounter.generateMaYeuCau();

  // 6. Tạo snapshot danh mục
  const snapshotDanhMuc = {
    TenLoaiYeuCau: danhMuc.TenLoaiYeuCau,
    ThoiGianDuKien: danhMuc.ThoiGianDuKien,
    DonViThoiGian: danhMuc.DonViThoiGian,
  };

  // 7. Tạo yêu cầu
  const yeuCau = new YeuCau({
    MaYeuCau: maYeuCau,
    NguoiYeuCauID: nguoiYeuCauId,
    KhoaNguonID: khoaNguonId,
    KhoaDichID: khoaDichId,
    LoaiNguoiNhan: data.LoaiNguoiNhan,
    NguoiNhanID:
      data.LoaiNguoiNhan === LOAI_NGUOI_NHAN.CA_NHAN ? data.NguoiNhanID : null,
    DanhMucYeuCauID: data.DanhMucYeuCauID,
    SnapshotDanhMuc: snapshotDanhMuc,
    TieuDe: data.TieuDe,
    MoTa: data.MoTa,
    TrangThai: TRANG_THAI.MOI,
  });

  await yeuCau.save();

  // 8. Ghi lịch sử
  await LichSuYeuCau.ghiLog({
    yeuCauId: yeuCau._id,
    hanhDong: HANH_DONG.TAO_MOI,
    nguoiThucHienId: nguoiYeuCauId,
    denGiaTri: {
      TrangThai: TRANG_THAI.MOI,
      LoaiNguoiNhan: data.LoaiNguoiNhan,
    },
  });

  // 9. Gửi thông báo
  try {
    // Populate yêu cầu để lấy thông tin đầy đủ
    const populated = await YeuCau.findById(yeuCau._id)
      .populate("NguoiYeuCauID", "Ten")
      .populate("KhoaNguonID", "TenKhoa")
      .populate("KhoaDichID", "TenKhoa")
      .populate("DanhMucYeuCauID", "TenLoaiYeuCau")
      .lean();

    // Fire trigger YeuCau.TAO_MOI
    await triggerService.fire("YeuCau.TAO_MOI", {
      yeuCau: populated,
      performerId: nguoiYeuCauId,
      requestCode: yeuCau.MaYeuCau,
      requestTitle: yeuCau.TieuDe || "Yêu cầu mới",
      requestId: yeuCau._id.toString(),
      requesterName: nguoiYeuCau.Ten || nguoiYeuCau.HoTen || "Người yêu cầu",
      sourceDept: populated.KhoaNguonID?.TenKhoa || "Khoa",
      targetDept: populated.KhoaDichID?.TenKhoa || "Khoa",
      requestType: snapshotDanhMuc.TenLoaiYeuCau || "Yêu cầu",
      deadline: yeuCau.ThoiGianHen
        ? dayjs(yeuCau.ThoiGianHen).format("DD/MM/YYYY HH:mm")
        : "Chưa có",
      content: yeuCau.MoTa || "Không có mô tả",
    });

    console.log("[YeuCauService] ✅ Fired trigger: YeuCau.TAO_MOI");
  } catch (error) {
    console.error(
      "[YeuCauService] ❌ Notification trigger failed:",
      error.message
    );
  }

  // Populate đầy đủ trước khi trả về để frontend hiển thị đúng
  return populateYeuCau(yeuCau);
}

/**
 * Sửa yêu cầu (chỉ khi MOI và là NguoiGui)
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @param {Object} data - Dữ liệu cập nhật
 * @param {ObjectId} nguoiSuaId - ID người sửa (NhanVienID)
 * @returns {Promise<YeuCau>}
 */
async function suaYeuCau(yeuCauId, data, nguoiSuaId) {
  const yeuCau = await YeuCau.findById(yeuCauId);

  if (!yeuCau) {
    throw new AppError(404, "Không tìm thấy yêu cầu", "YEUCAU_NOT_FOUND");
  }

  if (yeuCau.isDeleted) {
    throw new AppError(400, "Yêu cầu đã bị xóa", "YEUCAU_DELETED");
  }

  // Chỉ cho phép sửa khi MOI
  if (yeuCau.TrangThai !== TRANG_THAI.MOI) {
    throw new AppError(
      400,
      "Chỉ có thể sửa yêu cầu ở trạng thái Mới",
      "YEUCAU_NOT_MOI"
    );
  }

  // Chỉ người gửi mới được sửa
  if (!yeuCau.laNguoiGui(nguoiSuaId)) {
    throw new AppError(
      403,
      "Bạn không có quyền sửa yêu cầu này",
      "PERMISSION_DENIED"
    );
  }

  // Lưu giá trị cũ
  const tuGiaTri = {
    TieuDe: yeuCau.TieuDe,
    MoTa: yeuCau.MoTa,
    DanhMucYeuCauID: yeuCau.DanhMucYeuCauID,
  };

  // Cập nhật các trường được phép
  const allowedFields = ["TieuDe", "MoTa", "DanhMucYeuCauID"];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      yeuCau[field] = data[field];
    }
  }

  // Nếu đổi danh mục, cập nhật snapshot
  if (
    data.DanhMucYeuCauID &&
    data.DanhMucYeuCauID !== tuGiaTri.DanhMucYeuCauID?.toString()
  ) {
    const danhMuc = await DanhMucYeuCau.findById(data.DanhMucYeuCauID);
    if (
      !danhMuc ||
      danhMuc.KhoaID.toString() !== yeuCau.KhoaDichID.toString()
    ) {
      throw new AppError(
        400,
        "Danh mục yêu cầu không hợp lệ",
        "DANHMUC_INVALID"
      );
    }
    yeuCau.SnapshotDanhMuc = {
      TenLoaiYeuCau: danhMuc.TenLoaiYeuCau,
      ThoiGianDuKien: danhMuc.ThoiGianDuKien,
      DonViThoiGian: danhMuc.DonViThoiGian,
    };
  }

  await yeuCau.save();

  // Ghi lịch sử
  await LichSuYeuCau.ghiLog({
    yeuCauId: yeuCau._id,
    hanhDong: HANH_DONG.SUA_YEU_CAU,
    nguoiThucHienId: nguoiSuaId,
    tuGiaTri,
    denGiaTri: {
      TieuDe: yeuCau.TieuDe,
      MoTa: yeuCau.MoTa,
      DanhMucYeuCauID: yeuCau.DanhMucYeuCauID,
    },
  });

  // Fire trigger YeuCau.SUA (only if there are actual changes)
  const hasChanges = Object.keys(data).some(
    (key) => allowedFields.includes(key) && data[key] !== undefined
  );

  if (hasChanges) {
    try {
      const populated = await YeuCau.findById(yeuCau._id)
        .populate("NguoiYeuCauID", "Ten")
        .populate("KhoaNguonID", "TenKhoa")
        .populate("KhoaDichID", "TenKhoa")
        .populate("DanhMucYeuCauID", "TenLoaiYeuCau")
        .lean();

      const nguoiSua = await NhanVien.findById(nguoiSuaId).select("Ten").lean();

      await triggerService.fire("YeuCau.SUA", {
        yeuCau: populated,
        performerId: nguoiSuaId,
        requestCode: yeuCau.MaYeuCau,
        requestTitle: yeuCau.TieuDe,
        requestId: yeuCau._id.toString(),
        editorName: nguoiSua?.Ten || "Người chỉnh sửa",
        oldTitle: tuGiaTri.TieuDe,
        newTitle: yeuCau.TieuDe,
        changes: Object.keys(data)
          .filter(
            (key) => allowedFields.includes(key) && data[key] !== undefined
          )
          .join(", "),
      });

      console.log("[YeuCauService] ✅ Fired trigger: YeuCau.SUA");
    } catch (error) {
      console.error(
        "[YeuCauService] ❌ Notification trigger failed:",
        error.message
      );
    }
  }

  // Populate đầy đủ trước khi trả về
  return populateYeuCau(yeuCau);
}

/**
 * Lấy chi tiết yêu cầu
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @param {ObjectId} nguoiXemId - ID người xem (NhanVienID)
 * @param {string} userRole - Vai trò người xem
 * @returns {Promise<Object>} Yêu cầu với thông tin bổ sung
 */
async function layChiTiet(yeuCauId, nguoiXemId, userRole) {
  const yeuCau = await YeuCau.findById(yeuCauId)
    .populate("NguoiYeuCauID", "Ten MaNhanVien Email Images")
    .populate("KhoaNguonID", "TenKhoa MaKhoa")
    .populate("KhoaDichID", "TenKhoa MaKhoa")
    .populate("NguoiNhanID", "Ten MaNhanVien")
    .populate("NguoiDuocDieuPhoiID", "Ten MaNhanVien")
    .populate("NguoiXuLyID", "Ten MaNhanVien Email")
    .populate("DanhMucYeuCauID", "TenLoaiYeuCau")
    .populate("LyDoTuChoiID", "TenLyDo");

  if (!yeuCau || yeuCau.isDeleted) {
    throw new AppError(404, "Không tìm thấy yêu cầu", "YEUCAU_NOT_FOUND");
  }

  // Kiểm tra quyền xem (cùng khoa hoặc liên quan)
  const isAdmin = ["admin", "superadmin"].includes(
    (userRole || "").toLowerCase()
  );
  const isRelated = yeuCau.nguoiDungLienQuan(nguoiXemId);

  // Kiểm tra có phải điều phối viên không
  let isDieuPhoi = false;
  if (yeuCau.LoaiNguoiNhan === "KHOA") {
    const config = await CauHinhThongBaoKhoa.findOne({
      KhoaID: yeuCau.KhoaDichID,
    });
    isDieuPhoi = config?.laNguoiDieuPhoi(nguoiXemId) || false;
  }

  // Kiểm tra cùng khoa đích hoặc khoa nguồn
  const nguoiXem = await NhanVien.findById(nguoiXemId);
  // Handle both populated and non-populated cases
  const khoaDichId = yeuCau.KhoaDichID?._id || yeuCau.KhoaDichID;
  const khoaNguonId = yeuCau.KhoaNguonID?._id || yeuCau.KhoaNguonID;
  const isSameKhoa =
    nguoiXem?.KhoaID?.toString() === khoaDichId?.toString() ||
    nguoiXem?.KhoaID?.toString() === khoaNguonId?.toString();

  if (!isAdmin && !isRelated && !isDieuPhoi && !isSameKhoa) {
    throw new AppError(
      403,
      "Bạn không có quyền xem yêu cầu này",
      "PERMISSION_DENIED"
    );
  }

  // Lấy available actions
  const availableActions = await yeuCauStateMachine.getAvailableActions(
    yeuCau,
    nguoiXemId,
    userRole
  );

  return {
    yeuCau: yeuCau.toObject({ virtuals: true }),
    availableActions,
  };
}

/**
 * Lấy danh sách yêu cầu với filter
 * @param {Object} query - Query params
 * @param {ObjectId} nguoiXemId - ID người xem (NhanVienID)
 * @param {string} userRole - Vai trò người xem
 * @returns {Promise<{ data: YeuCau[], pagination: Object }>}
 */
async function layDanhSach(query, nguoiXemId, userRole) {
  const {
    page = 1,
    limit = 20,
    tab,
    trangThai,
    khoaDichId,
    khoaNguonId,
    chuaDieuPhoi,
    daDieuPhoi,
    quaHan,
    filterType,
    tuNgay,
    denNgay,
    search,
  } = query;

  const filter = { isDeleted: false };
  const isAdmin = ["admin", "superadmin"].includes(
    (userRole || "").toLowerCase()
  );

  // Lấy thông tin người xem
  const nguoiXem = await NhanVien.findById(nguoiXemId);

  // Filter theo tab
  switch (tab) {
    case "toi-gui":
      // Yêu cầu TÔI gửi đi (tôi là người tạo)
      filter.NguoiYeuCauID = nguoiXemId;
      break;

    case "toi-xu-ly":
      // Yêu cầu TÔI xử lý - bao gồm:
      // 1. Được điều phối (NguoiDuocDieuPhoiID)
      // 2. Được gửi trực tiếp (NguoiNhanID)
      // 3. Đang/đã xử lý (NguoiXuLyID)
      filter.$or = [
        { NguoiDuocDieuPhoiID: nguoiXemId },
        { NguoiNhanID: nguoiXemId },
        { NguoiXuLyID: nguoiXemId },
      ];
      break;

    case "can-xu-ly":
      // Yêu cầu gửi đến KHOA TÔI (tất cả nhân viên trong khoa đều thấy)
      if (nguoiXem?.KhoaID) {
        filter.KhoaDichID = nguoiXem.KhoaID;
      }
      break;

    case "da-xu-ly":
      // Yêu cầu tôi đã xử lý
      filter.NguoiXuLyID = nguoiXemId;
      filter.TrangThai = {
        $in: [TRANG_THAI.DA_HOAN_THANH, TRANG_THAI.DA_DONG],
      };
      break;

    default:
      // Tab "tat-ca" - yêu cầu liên quan đến tôi hoặc khoa của tôi
      if (!isAdmin) {
        filter.$or = [
          { NguoiYeuCauID: nguoiXemId },
          { KhoaDichID: nguoiXem?.KhoaID },
          { KhoaNguonID: nguoiXem?.KhoaID },
        ];
      }
      break;
  }

  // Filter theo trạng thái
  if (trangThai && !filter.TrangThai) {
    filter.TrangThai = trangThai;
  }

  // Filter theo khoa đích
  if (khoaDichId) {
    filter.KhoaDichID = khoaDichId;
  }

  // Filter theo khoa nguồn (tab "khoa-gui-di" trong quản lý khoa)
  if (khoaNguonId) {
    filter.KhoaNguonID = khoaNguonId;
  } else if (filterType === "khoa-gui-di" && nguoiXem?.KhoaID) {
    filter.KhoaNguonID = nguoiXem.KhoaID;
  }

  // Filter cho điều phối viên: Chưa điều phối (chỉ YC gửi đến KHOA)
  if (chuaDieuPhoi === true || chuaDieuPhoi === "true") {
    filter.LoaiNguoiNhan = LOAI_NGUOI_NHAN.KHOA;
    filter.NguoiDuocDieuPhoiID = null;
  }

  // Filter cho điều phối viên: Đã điều phối (đã giao nhưng chưa tiếp nhận)
  if (daDieuPhoi === true || daDieuPhoi === "true") {
    filter.LoaiNguoiNhan = LOAI_NGUOI_NHAN.KHOA;
    filter.NguoiDuocDieuPhoiID = { $ne: null };
  }

  // Filter quá hạn (chưa hoàn thành và đã quá ThoiGianHen)
  if (quaHan === true || quaHan === "true") {
    filter.ThoiGianHen = { $lt: new Date() };
    filter.TrangThai = {
      $nin: [TRANG_THAI.DA_DONG, TRANG_THAI.TU_CHOI],
    };
  }

  // Filter theo ngày tạo
  if (tuNgay || denNgay) {
    filter.createdAt = {};
    if (tuNgay) filter.createdAt.$gte = new Date(tuNgay);
    if (denNgay) {
      const endDate = new Date(denNgay);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  // Tìm kiếm theo mã hoặc tiêu đề
  if (search) {
    const searchConditions = [
      { MaYeuCau: { $regex: search, $options: "i" } },
      { TieuDe: { $regex: search, $options: "i" } },
    ];

    // Nếu đã có $or từ tab logic, kết hợp với AND
    if (filter.$or) {
      const existingOr = filter.$or;
      delete filter.$or;
      filter.$and = [{ $or: existingOr }, { $or: searchConditions }];
    } else {
      filter.$or = searchConditions;
    }
  }

  // Đếm tổng số
  const total = await YeuCau.countDocuments(filter);

  // Lấy dữ liệu
  const data = await YeuCau.find(filter)
    .populate("NguoiYeuCauID", "Ten MaNhanVien Email Images")
    .populate("KhoaDichID", "TenKhoa MaKhoa")
    .populate("KhoaNguonID", "TenKhoa MaKhoa")
    .populate("NguoiNhanID", "Ten MaNhanVien")
    .populate("NguoiDieuPhoiID", "Ten MaNhanVien")
    .populate("NguoiDuocDieuPhoiID", "Ten MaNhanVien")
    .populate("NguoiXuLyID", "Ten MaNhanVien Email")
    .populate("DanhMucYeuCauID", "TenLoaiYeuCau")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Lấy lịch sử yêu cầu
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @returns {Promise<LichSuYeuCau[]>}
 */
async function layLichSu(yeuCauId) {
  const lichSu = await LichSuYeuCau.layTheoYeuCau(yeuCauId);

  // Manual populate references in TuGiaTri/DenGiaTri (Mixed type fields)
  // Mongoose cannot auto-populate these, so we do it manually
  const NhanVien = mongoose.model("NhanVien");
  const Khoa = mongoose.model("Khoa");

  // Collect all unique IDs to populate
  const nhanVienIds = new Set();
  const khoaIds = new Set();

  for (const entry of lichSu) {
    // Collect from DenGiaTri
    if (entry.DenGiaTri?.NguoiXuLyID)
      nhanVienIds.add(entry.DenGiaTri.NguoiXuLyID.toString());
    if (entry.DenGiaTri?.NguoiDuocDieuPhoiID)
      nhanVienIds.add(entry.DenGiaTri.NguoiDuocDieuPhoiID.toString());
    if (entry.DenGiaTri?.NguoiNhanID)
      nhanVienIds.add(entry.DenGiaTri.NguoiNhanID.toString());
    if (entry.DenGiaTri?.KhoaDichID)
      khoaIds.add(entry.DenGiaTri.KhoaDichID.toString());
    if (entry.DenGiaTri?.KhoaNguonID)
      khoaIds.add(entry.DenGiaTri.KhoaNguonID.toString());

    // Collect from TuGiaTri
    if (entry.TuGiaTri?.NguoiXuLyID)
      nhanVienIds.add(entry.TuGiaTri.NguoiXuLyID.toString());
    if (entry.TuGiaTri?.NguoiDuocDieuPhoiID)
      nhanVienIds.add(entry.TuGiaTri.NguoiDuocDieuPhoiID.toString());
    if (entry.TuGiaTri?.NguoiNhanID)
      nhanVienIds.add(entry.TuGiaTri.NguoiNhanID.toString());
    if (entry.TuGiaTri?.KhoaDichID)
      khoaIds.add(entry.TuGiaTri.KhoaDichID.toString());
    if (entry.TuGiaTri?.KhoaNguonID)
      khoaIds.add(entry.TuGiaTri.KhoaNguonID.toString());
  }

  // Batch fetch all needed data
  const [nhanVienMap, khoaMap] = await Promise.all([
    NhanVien.find({ _id: { $in: Array.from(nhanVienIds) } })
      .select("Ten HoTen MaNhanVien")
      .lean()
      .then((docs) => {
        const map = {};
        docs.forEach((doc) => (map[doc._id.toString()] = doc));
        return map;
      }),
    Khoa.find({ _id: { $in: Array.from(khoaIds) } })
      .select("TenKhoa")
      .lean()
      .then((docs) => {
        const map = {};
        docs.forEach((doc) => (map[doc._id.toString()] = doc));
        return map;
      }),
  ]);

  // Replace ObjectIds with populated objects
  for (const entry of lichSu) {
    if (entry.DenGiaTri) {
      if (entry.DenGiaTri.NguoiXuLyID) {
        entry.DenGiaTri.NguoiXuLyID =
          nhanVienMap[entry.DenGiaTri.NguoiXuLyID.toString()] ||
          entry.DenGiaTri.NguoiXuLyID;
      }
      if (entry.DenGiaTri.NguoiDuocDieuPhoiID) {
        entry.DenGiaTri.NguoiDuocDieuPhoiID =
          nhanVienMap[entry.DenGiaTri.NguoiDuocDieuPhoiID.toString()] ||
          entry.DenGiaTri.NguoiDuocDieuPhoiID;
      }
      if (entry.DenGiaTri.NguoiNhanID) {
        entry.DenGiaTri.NguoiNhanID =
          nhanVienMap[entry.DenGiaTri.NguoiNhanID.toString()] ||
          entry.DenGiaTri.NguoiNhanID;
      }
      if (entry.DenGiaTri.KhoaDichID) {
        entry.DenGiaTri.KhoaDichID =
          khoaMap[entry.DenGiaTri.KhoaDichID.toString()] ||
          entry.DenGiaTri.KhoaDichID;
      }
      if (entry.DenGiaTri.KhoaNguonID) {
        entry.DenGiaTri.KhoaNguonID =
          khoaMap[entry.DenGiaTri.KhoaNguonID.toString()] ||
          entry.DenGiaTri.KhoaNguonID;
      }
    }

    if (entry.TuGiaTri) {
      if (entry.TuGiaTri.NguoiXuLyID) {
        entry.TuGiaTri.NguoiXuLyID =
          nhanVienMap[entry.TuGiaTri.NguoiXuLyID.toString()] ||
          entry.TuGiaTri.NguoiXuLyID;
      }
      if (entry.TuGiaTri.NguoiDuocDieuPhoiID) {
        entry.TuGiaTri.NguoiDuocDieuPhoiID =
          nhanVienMap[entry.TuGiaTri.NguoiDuocDieuPhoiID.toString()] ||
          entry.TuGiaTri.NguoiDuocDieuPhoiID;
      }
      if (entry.TuGiaTri.NguoiNhanID) {
        entry.TuGiaTri.NguoiNhanID =
          nhanVienMap[entry.TuGiaTri.NguoiNhanID.toString()] ||
          entry.TuGiaTri.NguoiNhanID;
      }
      if (entry.TuGiaTri.KhoaDichID) {
        entry.TuGiaTri.KhoaDichID =
          khoaMap[entry.TuGiaTri.KhoaDichID.toString()] ||
          entry.TuGiaTri.KhoaDichID;
      }
      if (entry.TuGiaTri.KhoaNguonID) {
        entry.TuGiaTri.KhoaNguonID =
          khoaMap[entry.TuGiaTri.KhoaNguonID.toString()] ||
          entry.TuGiaTri.KhoaNguonID;
      }
    }
  }

  return lichSu;
}

/**
 * Helper để thêm URLs cho file (inlineUrl, downloadUrl)
 */
function mapFileWithUrls(file) {
  const f = file.toObject ? file.toObject() : file;
  return {
    _id: String(f._id),
    TenFile: f.TenFile,
    TenGoc: f.TenGoc,
    LoaiFile: f.LoaiFile,
    KichThuoc: f.KichThuoc,
    DuongDan: f.DuongDan,
    YeuCauID: f.YeuCauID ? String(f.YeuCauID) : null,
    BinhLuanID: f.BinhLuanID ? String(f.BinhLuanID) : null,
    NguoiTaiLenID: f.NguoiTaiLenID ? String(f.NguoiTaiLenID) : null,
    NgayTaiLen: f.NgayTaiLen || f.createdAt,
    TrangThai: f.TrangThai || "ACTIVE",
    MoTa: f.MoTa || "",
    // URLs cho xem và tải file
    thumbUrl: `/api/workmanagement/files/${String(f._id)}/thumb`,
    inlineUrl: `/api/workmanagement/files/${String(f._id)}/inline`,
    downloadUrl: `/api/workmanagement/files/${String(f._id)}/download`,
  };
}

/**
 * Lấy bình luận của yêu cầu
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @returns {Promise<BinhLuan[]>}
 */
async function layBinhLuan(yeuCauId) {
  const comments = await BinhLuan.timTheoYeuCau(yeuCauId);

  // Map TepTin virtual sang Files với đầy đủ URLs
  return comments.map((comment) => {
    const obj = comment.toObject({ virtuals: true });

    // Map TepTin -> Files với URLs cho root comment
    const mappedComment = {
      ...obj,
      Files: Array.isArray(obj.TepTin) ? obj.TepTin.map(mapFileWithUrls) : [],
    };

    // Map TepTin -> Files với URLs cho replies
    if (mappedComment.TraLoi && Array.isArray(mappedComment.TraLoi)) {
      mappedComment.TraLoi = mappedComment.TraLoi.map((reply) => ({
        ...reply,
        Files: Array.isArray(reply.TepTin)
          ? reply.TepTin.map(mapFileWithUrls)
          : [],
      }));
    }

    return mappedComment;
  });
}

/**
 * Thêm bình luận
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @param {Object} data - Nội dung bình luận
 * @param {ObjectId} nguoiBinhLuanId - ID người bình luận (NhanVienID)
 * @returns {Promise<BinhLuan>}
 */
async function themBinhLuan(yeuCauId, data, nguoiBinhLuanId) {
  const yeuCau = await YeuCau.findById(yeuCauId);

  if (!yeuCau || yeuCau.isDeleted) {
    throw new AppError(404, "Không tìm thấy yêu cầu", "YEUCAU_NOT_FOUND");
  }

  // Kiểm tra quyền bình luận
  const isRelated = yeuCau.nguoiDungLienQuan(nguoiBinhLuanId);

  // Kiểm tra có phải điều phối viên không
  let isDieuPhoi = false;
  if (yeuCau.LoaiNguoiNhan === "KHOA") {
    const config = await CauHinhThongBaoKhoa.findOne({
      KhoaID: yeuCau.KhoaDichID,
    });
    isDieuPhoi = config?.laNguoiDieuPhoi(nguoiBinhLuanId) || false;
  }

  if (!isRelated && !isDieuPhoi) {
    throw new AppError(
      403,
      "Bạn không có quyền bình luận yêu cầu này",
      "PERMISSION_DENIED"
    );
  }

  // Tạo bình luận
  const binhLuan = new BinhLuan({
    NoiDung: data.NoiDung,
    YeuCauID: yeuCauId,
    NguoiBinhLuanID: nguoiBinhLuanId,
    BinhLuanChaID: data.BinhLuanChaID || null,
    LoaiBinhLuan: data.LoaiBinhLuan || "COMMENT",
  });

  await binhLuan.save();

  // Ghi lịch sử
  await LichSuYeuCau.ghiLog({
    yeuCauId,
    hanhDong: HANH_DONG.THEM_BINH_LUAN,
    nguoiThucHienId: nguoiBinhLuanId,
    ghiChu: data.NoiDung?.substring(0, 100),
  });

  // Gửi thông báo bình luận mới
  try {
    const populated = await YeuCau.findById(yeuCauId)
      .populate("NguoiYeuCauID", "Ten")
      .populate("KhoaNguonID", "TenKhoa")
      .populate("KhoaDichID", "TenKhoa")
      .lean();

    const nguoiBinhLuan = await NhanVien.findById(nguoiBinhLuanId)
      .select("Ten")
      .lean();

    await triggerService.fire("YeuCau.BINH_LUAN", {
      yeuCau: populated,
      performerId: nguoiBinhLuanId,
      requestCode: yeuCau.MaYeuCau,
      requestTitle: yeuCau.TieuDe,
      requestId: yeuCau._id.toString(),
      commenterName: nguoiBinhLuan?.Ten || "Người bình luận",
      commentContent: data.NoiDung?.substring(0, 100) || "Bình luận mới",
    });

    console.log("[YeuCauService] ✅ Fired trigger: YeuCau.BINH_LUAN");
  } catch (error) {
    console.error(
      "[YeuCauService] ❌ Comment notification trigger failed:",
      error.message
    );
  }

  return binhLuan;
}

/**
 * Lấy file đính kèm của yêu cầu
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @returns {Promise<TepTin[]>}
 */
async function layTepTin(yeuCauId) {
  return TepTin.timTheoYeuCau(yeuCauId);
}

/**
 * Dashboard Metrics
 * @param {Object} query - Filter params (khoaId, tuNgay, denNgay)
 * @returns {Promise<Object>} 10 metrics
 */
async function layDashboardMetrics(query) {
  const { khoaId, tuNgay, denNgay } = query;

  const matchBase = { isDeleted: false };
  if (khoaId) matchBase.KhoaDichID = new mongoose.Types.ObjectId(khoaId);
  if (tuNgay || denNgay) {
    matchBase.createdAt = {};
    if (tuNgay) matchBase.createdAt.$gte = new Date(tuNgay);
    if (denNgay) matchBase.createdAt.$lte = new Date(denNgay);
  }

  // 1. Thống kê theo trạng thái
  const thongKeTheoTrangThai = await YeuCau.aggregate([
    { $match: matchBase },
    { $group: { _id: "$TrangThai", count: { $sum: 1 } } },
  ]);

  const countByStatus = {};
  let tongYeuCau = 0;
  for (const item of thongKeTheoTrangThai) {
    countByStatus[item._id] = item.count;
    tongYeuCau += item.count;
  }

  // 2. Thống kê đánh giá trung bình
  const thongKeDanhGia = await YeuCau.aggregate([
    { $match: { ...matchBase, "DanhGia.SoSao": { $exists: true, $ne: null } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$DanhGia.SoSao" },
        count: { $sum: 1 },
      },
    },
  ]);

  // 3. Thống kê thời gian xử lý trung bình (từ tạo đến hoàn thành)
  const thongKeThoiGian = await YeuCau.aggregate([
    {
      $match: {
        ...matchBase,
        NgayHoanThanh: { $exists: true, $ne: null },
      },
    },
    {
      $project: {
        thoiGianXuLy: {
          $divide: [
            { $subtract: ["$NgayHoanThanh", "$createdAt"] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgDays: { $avg: "$thoiGianXuLy" },
      },
    },
  ]);

  // 4. Thống kê đúng hạn / trễ hạn
  const thongKeHan = await YeuCau.aggregate([
    {
      $match: {
        ...matchBase,
        NgayHoanThanh: { $exists: true, $ne: null },
        ThoiGianHen: { $exists: true, $ne: null },
      },
    },
    {
      $project: {
        dungHan: { $lte: ["$NgayHoanThanh", "$ThoiGianHen"] },
      },
    },
    {
      $group: {
        _id: "$dungHan",
        count: { $sum: 1 },
      },
    },
  ]);

  let dungHan = 0;
  let treHan = 0;
  for (const item of thongKeHan) {
    if (item._id === true) dungHan = item.count;
    else treHan = item.count;
  }

  // 5. Số yêu cầu escalate (NHAC_LAI + BAO_QUAN_LY)
  const thongKeEscalate = await LichSuYeuCau.aggregate([
    {
      $match: {
        HanhDong: { $in: [HANH_DONG.NHAC_LAI, HANH_DONG.BAO_QUAN_LY] },
        ThoiGian:
          tuNgay || denNgay
            ? {
                ...(tuNgay && { $gte: new Date(tuNgay) }),
                ...(denNgay && { $lte: new Date(denNgay) }),
              }
            : { $exists: true },
      },
    },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);

  return {
    tongYeuCau,
    yeuCauMoi: countByStatus[TRANG_THAI.MOI] || 0,
    dangXuLy: countByStatus[TRANG_THAI.DANG_XU_LY] || 0,
    daHoanThanh: countByStatus[TRANG_THAI.DA_HOAN_THANH] || 0,
    daDong: countByStatus[TRANG_THAI.DA_DONG] || 0,
    tuChoi: countByStatus[TRANG_THAI.TU_CHOI] || 0,
    thoiGianXuLyTrungBinh: thongKeThoiGian[0]?.avgDays?.toFixed(1) || "N/A",
    tiLeDungHan:
      dungHan + treHan > 0
        ? ((dungHan / (dungHan + treHan)) * 100).toFixed(0)
        : "N/A",
    danhGiaTrungBinh: thongKeDanhGia[0]?.avgRating?.toFixed(1) || "N/A",
    soLuotEscalate: thongKeEscalate[0]?.count || 0,
    treHan,
  };
}

// ============== ROLE-BASED FEATURES ==============

/**
 * Lấy quyền của nhân viên trong hệ thống yêu cầu
 * @param {ObjectId} nhanVienId - ID nhân viên
 * @returns {Promise<Object>} - { isNguoiDieuPhoi, isQuanLyKhoa, khoaID, tenKhoa, danhSachKhoaDieuPhoi }
 */
async function layQuyenCuaToi(nhanVienId) {
  // Lấy thông tin nhân viên
  const nhanVien = await NhanVien.findById(nhanVienId).populate(
    "KhoaID",
    "TenKhoa MaKhoa"
  );
  if (!nhanVien) {
    throw new AppError(404, "Không tìm thấy nhân viên", "NHANVIEN_NOT_FOUND");
  }

  const khoaID = nhanVien.KhoaID?._id;
  const tenKhoa = nhanVien.KhoaID?.TenKhoa;

  // Lấy cấu hình của khoa này
  const cauHinh = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaID });

  let isNguoiDieuPhoi = false;
  let isQuanLyKhoa = false;

  if (cauHinh) {
    isNguoiDieuPhoi = cauHinh.laNguoiDieuPhoi(nhanVienId);
    isQuanLyKhoa = cauHinh.laQuanLyKhoa(nhanVienId);
  }

  // Lấy danh sách khoa mà user là người điều phối
  const danhSachKhoaDieuPhoi = await CauHinhThongBaoKhoa.find({
    "DanhSachNguoiDieuPhoi.NhanVienID": nhanVienId,
  }).populate("KhoaID", "TenKhoa MaKhoa");

  return {
    nhanVienId,
    khoaID,
    tenKhoa,
    isNguoiDieuPhoi,
    isQuanLyKhoa,
    danhSachKhoaDieuPhoi: danhSachKhoaDieuPhoi.map((ch) => ({
      khoaID: ch.KhoaID._id,
      tenKhoa: ch.KhoaID.TenKhoa,
      maKhoa: ch.KhoaID.MaKhoa,
    })),
  };
}

/**
 * Lấy số lượng badge cho menu
 * @param {ObjectId} nhanVienId - ID nhân viên
 * @returns {Promise<Object>} - Badge counts cho từng tab
 */
async function layBadgeCounts(nhanVienId) {
  // Lấy thông tin nhân viên và quyền
  const nhanVien = await NhanVien.findById(nhanVienId);
  if (!nhanVien) {
    throw new AppError(404, "Không tìm thấy nhân viên", "NHANVIEN_NOT_FOUND");
  }

  const khoaID = nhanVien.KhoaID;
  const cauHinh = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaID });
  const isNguoiDieuPhoi = cauHinh ? cauHinh.laNguoiDieuPhoi(nhanVienId) : false;

  // Badge cho "Tôi gửi" - Yêu cầu chờ phản hồi (trạng thái MOI)
  const toiGuiCount = await YeuCau.countDocuments({
    NguoiYeuCauID: nhanVienId,
    TrangThai: TRANG_THAI.MOI,
    isDeleted: false,
  });

  // Badge cho "Xử lý" - Yêu cầu được điều phối cho tôi hoặc tôi đang xử lý
  const xuLyCount = await YeuCau.countDocuments({
    $or: [
      { NguoiDuocDieuPhoiID: nhanVienId, TrangThai: TRANG_THAI.MOI },
      { NguoiXuLyID: nhanVienId, TrangThai: TRANG_THAI.DANG_XU_LY },
    ],
    isDeleted: false,
  });

  // Badge cho "Điều phối" - Yêu cầu mới đến khoa chưa điều phối
  let dieuPhoiCount = 0;
  if (isNguoiDieuPhoi && khoaID) {
    dieuPhoiCount = await YeuCau.countDocuments({
      KhoaDichID: khoaID,
      TrangThai: TRANG_THAI.MOI,
      NguoiDuocDieuPhoiID: { $exists: false }, // Chưa điều phối
      isDeleted: false,
    });
  }

  // Badge cho "Quản lý khoa" - tổng yêu cầu đến khoa
  let quanLyKhoaCount = 0;
  if (khoaID) {
    quanLyKhoaCount = await YeuCau.countDocuments({
      KhoaDichID: khoaID,
      TrangThai: { $in: [TRANG_THAI.MOI, TRANG_THAI.DANG_XU_LY] },
      isDeleted: false,
    });
  }

  return {
    toiGui: toiGuiCount,
    xuLy: xuLyCount,
    dieuPhoi: dieuPhoiCount,
    quanLyKhoa: quanLyKhoaCount,
  };
}

/**
 * Lấy badge counts cho tabs trong một page cụ thể
 * @param {ObjectId} nhanVienId - ID nhân viên
 * @param {string} pageKey - Key của page (YEU_CAU_TOI_GUI, YEU_CAU_TOI_XU_LY, YEU_CAU_DIEU_PHOI, YEU_CAU_QUAN_LY_KHOA)
 * @param {Object} nguoiXem - Thông tin nhân viên (nếu đã có)
 * @returns {Promise<Object>} - Badge counts cho từng tab { "tab-key": count }
 */
async function layBadgeCountsTheoPage(nhanVienId, pageKey, nguoiXem = null) {
  // Validate pageKey
  const validPages = [
    "YEU_CAU_TOI_GUI",
    "YEU_CAU_TOI_XU_LY",
    "YEU_CAU_DIEU_PHOI",
    "YEU_CAU_QUAN_LY_KHOA",
  ];

  if (!validPages.includes(pageKey)) {
    throw new AppError(400, "Invalid pageKey", "INVALID_PAGE_KEY");
  }

  // Lấy thông tin nhân viên nếu chưa có
  if (!nguoiXem) {
    nguoiXem = await NhanVien.findById(nhanVienId);
    if (!nguoiXem) {
      throw new AppError(404, "Không tìm thấy nhân viên", "NHANVIEN_NOT_FOUND");
    }
  }

  // Badge counts chỉ dành cho các tab còn "action".
  // Theo yêu cầu UI/UX: không hiển thị badge cho DA_DONG và TU_CHOI.
  const activeTrangThaiFilter = {
    $nin: [TRANG_THAI.DA_DONG, TRANG_THAI.TU_CHOI],
  };

  // Page 1: Yêu cầu tôi gửi (trạng thái thuần)
  if (pageKey === "YEU_CAU_TOI_GUI") {
    const baseFilter = {
      isDeleted: false,
      NguoiYeuCauID: nhanVienId,
      TrangThai: activeTrangThaiFilter,
    };

    const counts = await YeuCau.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: "$TrangThai",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    return {
      "cho-phan-hoi": countMap.MOI || 0,
      "dang-xu-ly": countMap.DANG_XU_LY || 0,
      "cho-danh-gia": countMap.DA_HOAN_THANH || 0,
    };
  }

  // Page 2: Yêu cầu tôi xử lý (trạng thái thuần) - cần khớp tab keys FE
  if (pageKey === "YEU_CAU_TOI_XU_LY") {
    const baseFilter = {
      isDeleted: false,
      TrangThai: activeTrangThaiFilter,
      $or: [
        { NguoiDuocDieuPhoiID: nhanVienId },
        { NguoiNhanID: nhanVienId },
        { NguoiXuLyID: nhanVienId },
      ],
    };

    const counts = await YeuCau.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: "$TrangThai",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    return {
      "cho-tiep-nhan": countMap.MOI || 0,
      "dang-xu-ly": countMap.DANG_XU_LY || 0,
      "cho-xac-nhan": countMap.DA_HOAN_THANH || 0,
    };
  }

  // Page 3: Điều phối (tách MOI thành 2 bucket dựa vào NguoiDuocDieuPhoiID)
  if (pageKey === "YEU_CAU_DIEU_PHOI") {
    if (!nguoiXem.KhoaID) return {};

    const baseFilter = {
      isDeleted: false,
      KhoaDichID: nguoiXem.KhoaID,
      TrangThai: activeTrangThaiFilter,
    };

    const [moiDen, daDieuPhoi, dangXuLy] = await Promise.all([
      YeuCau.countDocuments({
        ...baseFilter,
        TrangThai: TRANG_THAI.MOI,
        $or: [
          { NguoiDuocDieuPhoiID: { $exists: false } },
          { NguoiDuocDieuPhoiID: null },
        ],
      }),
      YeuCau.countDocuments({
        ...baseFilter,
        TrangThai: TRANG_THAI.MOI,
        NguoiDuocDieuPhoiID: { $exists: true, $ne: null },
      }),
      YeuCau.countDocuments({
        ...baseFilter,
        TrangThai: TRANG_THAI.DANG_XU_LY,
      }),
    ]);

    return {
      "moi-den": moiDen,
      "da-dieu-phoi": daDieuPhoi,
      "dang-xu-ly": dangXuLy,
    };
  }

  // Page 4: Quản lý yêu cầu khoa (theo hướng gửi + quá hạn)
  if (pageKey === "YEU_CAU_QUAN_LY_KHOA") {
    if (!nguoiXem.KhoaID) return {};

    const now = new Date();
    const khoaId = nguoiXem.KhoaID;

    const [guiDenKhoa, khoaGuiDi, quaHan] = await Promise.all([
      YeuCau.countDocuments({
        isDeleted: false,
        KhoaDichID: khoaId,
        TrangThai: activeTrangThaiFilter,
      }),
      YeuCau.countDocuments({
        isDeleted: false,
        KhoaNguonID: khoaId,
        TrangThai: activeTrangThaiFilter,
      }),
      YeuCau.countDocuments({
        isDeleted: false,
        KhoaDichID: khoaId,
        TrangThai: activeTrangThaiFilter,
        HanXuLy: { $lt: now },
      }),
    ]);

    return {
      "gui-den-khoa": guiDenKhoa,
      "khoa-gui-di": khoaGuiDi,
      "qua-han": quaHan,
    };
  }

  return {};
}

/**
 * Lấy dashboard metrics cho người xử lý
 * @param {ObjectId} nhanVienId - ID nhân viên
 * @returns {Promise<Object>}
 */
async function layDashboardXuLy(nhanVienId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Tổng số yêu cầu đã xử lý (trạng thái DA_HOAN_THANH hoặc DA_DONG)
  const tongXuLy = await YeuCau.countDocuments({
    NguoiXuLyID: nhanVienId,
    TrangThai: { $in: [TRANG_THAI.DA_HOAN_THANH, TRANG_THAI.DA_DONG] },
    isDeleted: false,
  });

  // Tổng số yêu cầu đã xử lý trong tháng này
  const xuLyThangNay = await YeuCau.countDocuments({
    NguoiXuLyID: nhanVienId,
    TrangThai: { $in: [TRANG_THAI.DA_HOAN_THANH, TRANG_THAI.DA_DONG] },
    NgayHoanThanh: { $gte: startOfMonth },
    isDeleted: false,
  });

  // Tính trung bình số sao đánh giá
  const danhGiaResult = await YeuCau.aggregate([
    {
      $match: {
        NguoiXuLyID: new mongoose.Types.ObjectId(nhanVienId),
        TrangThai: { $in: [TRANG_THAI.DA_HOAN_THANH, TRANG_THAI.DA_DONG] },
        SoSaoDanhGia: { $exists: true, $ne: null },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        trungBinhSao: { $avg: "$SoSaoDanhGia" },
        tongDanhGia: { $sum: 1 },
      },
    },
  ]);

  const trungBinhSao = danhGiaResult[0]?.trungBinhSao || 0;
  const tongDanhGia = danhGiaResult[0]?.tongDanhGia || 0;

  // Tính tỷ lệ hoàn thành đúng hạn
  const yeuCauHoanThanh = await YeuCau.find({
    NguoiXuLyID: nhanVienId,
    TrangThai: { $in: [TRANG_THAI.DA_HOAN_THANH, TRANG_THAI.DA_DONG] },
    NgayHoanThanh: { $exists: true },
    isDeleted: false,
  }).select("NgayHoanThanh NgayDuKien");

  let dungHan = 0;
  yeuCauHoanThanh.forEach((yc) => {
    if (yc.NgayDuKien && yc.NgayHoanThanh <= yc.NgayDuKien) {
      dungHan++;
    }
  });

  const tyLeDungHan =
    yeuCauHoanThanh.length > 0
      ? ((dungHan / yeuCauHoanThanh.length) * 100).toFixed(1)
      : 0;

  return {
    tongXuLy,
    xuLyThangNay,
    trungBinhSao: parseFloat(trungBinhSao.toFixed(2)),
    tongDanhGia,
    tyLeDungHan: parseFloat(tyLeDungHan),
  };
}

/**
 * Lấy dashboard metrics cho người điều phối
 * @param {ObjectId} nhanVienId - ID nhân viên
 * @returns {Promise<Object>}
 */
async function layDashboardDieuPhoi(nhanVienId) {
  // Lấy thông tin nhân viên
  const nhanVien = await NhanVien.findById(nhanVienId);
  if (!nhanVien?.KhoaID) {
    throw new AppError(400, "Nhân viên chưa được gán khoa", "NHANVIEN_NO_KHOA");
  }

  const khoaID = nhanVien.KhoaID;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Yêu cầu mới hôm nay
  const moiHomNay = await YeuCau.countDocuments({
    KhoaDichID: khoaID,
    TrangThai: TRANG_THAI.MOI,
    createdAt: { $gte: startOfDay },
    isDeleted: false,
  });

  // Yêu cầu đang chờ điều phối
  const dangCho = await YeuCau.countDocuments({
    KhoaDichID: khoaID,
    TrangThai: TRANG_THAI.MOI,
    NguoiDuocDieuPhoiID: { $exists: false },
    isDeleted: false,
  });

  // Yêu cầu quá hạn (chưa hoàn thành mà đã quá NgayDuKien)
  const quaHan = await YeuCau.countDocuments({
    KhoaDichID: khoaID,
    TrangThai: { $in: [TRANG_THAI.MOI, TRANG_THAI.DANG_XU_LY] },
    NgayDuKien: { $lt: now },
    isDeleted: false,
  });

  // Tổng yêu cầu đang xử lý
  const dangXuLy = await YeuCau.countDocuments({
    KhoaDichID: khoaID,
    TrangThai: TRANG_THAI.DANG_XU_LY,
    isDeleted: false,
  });

  // Tổng yêu cầu đã hoàn thành trong tháng
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const hoanThanhThangNay = await YeuCau.countDocuments({
    KhoaDichID: khoaID,
    TrangThai: { $in: [TRANG_THAI.DA_HOAN_THANH, TRANG_THAI.DA_DONG] },
    NgayHoanThanh: { $gte: startOfMonth },
    isDeleted: false,
  });

  return {
    moiHomNay,
    dangCho,
    quaHan,
    dangXuLy,
    hoanThanhThangNay,
  };
}

/**
 * Gán nhiệm vụ thường quy cho yêu cầu
 * Chỉ người xử lý (NguoiXuLyID) hoặc admin được phép
 */
async function ganNhiemVuThuongQuy(yeuCauId, payload, req) {
  if (!mongoose.Types.ObjectId.isValid(yeuCauId)) {
    throw new AppError(400, "ID yêu cầu không hợp lệ");
  }

  const { nhiemVuThuongQuyID, isKhac } = payload || {};

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

  // Lấy yêu cầu
  const yeuCau = await YeuCau.findOne({
    _id: yeuCauId,
    isDeleted: { $ne: true },
  });

  if (!yeuCau) {
    throw new AppError(404, "Không tìm thấy yêu cầu");
  }

  // Check permission
  const currentUser = await User.findById(req.userId).lean();
  if (!currentUser?.NhanVienID) {
    throw new AppError(400, "Tài khoản chưa liên kết với nhân viên");
  }

  const performerId = String(currentUser.NhanVienID);
  const isHandler = yeuCau.laNguoiXuLy(performerId);
  const normalizedRole = (currentUser.PhanQuyen || "").toLowerCase();
  const isAdmin = ["admin", "superadmin"].includes(normalizedRole);

  if (!isHandler && !isAdmin) {
    throw new AppError(
      403,
      "Chỉ người xử lý hoặc admin được gán nhiệm vụ thường quy"
    );
  }

  // Validate nhiemVuThuongQuyID nếu có: phải tồn tại trong hệ thống
  if (nhiemVuThuongQuyID) {
    const nvtqExists = await NhiemVuThuongQuy.exists({
      _id: nhiemVuThuongQuyID,
    });
    if (!nvtqExists) {
      throw new AppError(404, "Nhiệm vụ thường quy không tồn tại");
    }
  }

  // Update yêu cầu
  const oldNhiemVuID = yeuCau.NhiemVuThuongQuyID;
  const oldFlagKhac = yeuCau.LaNhiemVuKhac;

  if (isKhac) {
    // Đánh dấu "Khác" - xóa liên kết nhiệm vụ
    yeuCau.NhiemVuThuongQuyID = null;
    yeuCau.LaNhiemVuKhac = true;
  } else if (nhiemVuThuongQuyID) {
    // Gán nhiệm vụ cụ thể
    yeuCau.NhiemVuThuongQuyID = nhiemVuThuongQuyID;
    yeuCau.LaNhiemVuKhac = false;
  } else {
    // Clear cả hai (unassign)
    yeuCau.NhiemVuThuongQuyID = null;
    yeuCau.LaNhiemVuKhac = false;
  }

  await yeuCau.save();

  // Populate để trả về đầy đủ
  const populated = await populateYeuCau(yeuCau);

  // Log audit trail
  console.log(
    `[assignRoutineTask] User ${performerId} assigned routine task to YeuCau ${yeuCauId}: ` +
      `${oldNhiemVuID || "(none)"} (khác: ${oldFlagKhac}) -> ` +
      `${yeuCau.NhiemVuThuongQuyID || "(none)"} (khác: ${yeuCau.LaNhiemVuKhac})`
  );

  return populated;
}

// ============================================================
// FILES & COMMENTS SUPPORT
// ============================================================

const path = require("path");
const fs = require("fs-extra");
const mime = require("mime-types");

/**
 * Helper để check quyền truy cập YeuCau
 */
async function assertAccessYeuCau(yeuCauId, req) {
  const user = await User.findById(req.userId).lean();
  if (!user) throw new AppError(401, "Không xác thực người dùng");

  const isAdmin = user.PhanQuyen === "admin" || user.PhanQuyen === "manager";
  const nhanVienId = user.NhanVienID;
  if (!nhanVienId) {
    throw new AppError(400, "Tài khoản chưa liên kết với nhân viên");
  }

  const yeuCau = await YeuCau.findById(yeuCauId).lean();
  if (!yeuCau) throw new AppError(404, "Không tìm thấy yêu cầu");

  // Kiểm tra quyền: Admin, người tạo, người xử lý, hoặc điều phối khoa đích
  const hasAccess =
    isAdmin ||
    String(yeuCau.NguoiYeuCauID) === String(nhanVienId) ||
    String(yeuCau.NguoiXuLyID) === String(nhanVienId) ||
    String(yeuCau.NguoiDieuPhoiID) === String(nhanVienId) ||
    String(yeuCau.NguoiDuocDieuPhoiID) === String(nhanVienId);

  if (!hasAccess) {
    throw new AppError(403, "Không có quyền truy cập yêu cầu này");
  }

  return { user, isAdmin, nhanVienId, yeuCau };
}

/**
 * Helper để chuyển đổi sang ObjectId
 */
function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

/**
 * Helper để decode tên file UTF-8
 */
function decodeOriginalNameToUtf8(name) {
  try {
    if (!name) return "file";
    const round = Buffer.from(name, "utf8").toString("utf8");
    if (round === name) return name;
    const converted = Buffer.from(name, "latin1").toString("utf8");
    return converted || name;
  } catch (e) {
    return name;
  }
}

/**
 * Helper để chuyển TepTin sang DTO
 */
function filesToDTO(doc) {
  const base = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(base._id),
    TenFile: base.TenFile,
    TenGoc: base.TenGoc,
    LoaiFile: base.LoaiFile,
    KichThuoc: base.KichThuoc,
    DuongDan: base.DuongDan,
    MoTa: base.MoTa || "",
    TrangThai: base.TrangThai || "ACTIVE",
    NgayTaiLen: base.NgayTaiLen || base.createdAt,
    NguoiTaiLenID: base.NguoiTaiLenID
      ? typeof base.NguoiTaiLenID === "object"
        ? {
            _id: String(base.NguoiTaiLenID._id || base.NguoiTaiLenID),
            Ten: base.NguoiTaiLenID.Ten || base.NguoiTaiLenID.HoTen || "",
            MaNhanVien: base.NguoiTaiLenID.MaNhanVien || "",
            AnhDaiDien: base.NguoiTaiLenID.AnhDaiDien || null,
          }
        : String(base.NguoiTaiLenID)
      : null,
    // URL cho xem và tải file
    thumbUrl: `/api/workmanagement/files/${String(base._id)}/thumb`,
    inlineUrl: `/api/workmanagement/files/${String(base._id)}/inline`,
    downloadUrl: `/api/workmanagement/files/${String(base._id)}/download`,
  };
}

/**
 * Upload files cho yêu cầu
 */
async function uploadFilesForYeuCau(
  yeuCauId,
  files,
  { moTa },
  req,
  binhLuanId = null
) {
  if (!mongoose.Types.ObjectId.isValid(yeuCauId)) {
    throw new AppError(400, "YeuCauID không hợp lệ");
  }

  const { nhanVienId } = await assertAccessYeuCau(yeuCauId, req);
  const config = require("../helpers/uploadConfig");

  const items = [];
  for (const f of files || []) {
    const tenGocUtf8 = decodeOriginalNameToUtf8(
      f.originalnameUtf8 || f.originalname
    );

    let relPath;
    try {
      const root = path.resolve(config.UPLOAD_DIR);
      const abs = path.resolve(f.path);
      const candidate = path.relative(root, abs);
      relPath =
        candidate && !candidate.startsWith("..")
          ? candidate
          : f.filename || path.basename(abs);
    } catch {
      relPath = f.filename || path.basename(f.path);
    }

    let doc = await TepTin.create({
      TenFile: path.basename(f.filename || f.path),
      TenGoc: (tenGocUtf8 || "file").trim(),
      LoaiFile: f.mimetype,
      KichThuoc: f.size,
      DuongDan: relPath,
      YeuCauID: toObjectId(yeuCauId),
      BinhLuanID: binhLuanId ? toObjectId(binhLuanId) : undefined,
      NguoiTaiLenID: toObjectId(nhanVienId),
      MoTa: moTa || "",
    });

    doc = await doc.populate(
      "NguoiTaiLenID",
      "Ten HoTen MaNhanVien AnhDaiDien"
    );
    items.push(doc);
  }

  return items.map(filesToDTO);
}

/**
 * Tạo bình luận kèm tệp đính kèm (atomic)
 */
async function createCommentWithFiles(
  yeuCauId,
  noiDung,
  files,
  req,
  parentId = null
) {
  const { nhanVienId, yeuCau } = await assertAccessYeuCau(yeuCauId, req);

  const comment = await BinhLuan.create({
    NoiDung: typeof noiDung === "string" ? noiDung.trim() : "",
    YeuCauID: toObjectId(yeuCauId),
    NguoiBinhLuanID: toObjectId(nhanVienId),
    BinhLuanChaID: parentId ? toObjectId(parentId) : undefined,
  });

  const filesDTO = await uploadFilesForYeuCau(
    yeuCauId,
    files,
    { moTa: "" },
    req,
    comment._id
  );

  // Lấy tên người bình luận
  const user = await User.findById(req.userId)
    .populate({ path: "NhanVienID", select: "Ten" })
    .lean();
  const tenNguoiBinhLuan =
    (user && user.NhanVienID && user.NhanVienID.Ten) ||
    (user && user.HoTen) ||
    (user && user.UserName) ||
    "Người dùng";

  const base = comment.toObject();

  // Fire notification trigger for comment
  try {
    const triggerService = require("../../../services/triggerService");
    await triggerService.fire("YeuCau.comment", {
      yeuCau: yeuCau,
      comment: base,
      nguoiBinhLuan: { _id: nhanVienId, Ten: tenNguoiBinhLuan },
      performerId: nhanVienId,
    });
  } catch (triggerErr) {
    console.error("[yeuCau.service] Trigger error:", triggerErr.message);
  }

  return {
    _id: String(base._id),
    YeuCauID: String(base.YeuCauID),
    BinhLuanChaID: base.BinhLuanChaID ? String(base.BinhLuanChaID) : null,
    NguoiBinhLuanID: String(nhanVienId),
    NoiDung: base.NoiDung,
    NguoiBinhLuan: { Ten: tenNguoiBinhLuan },
    NgayBinhLuan: base.NgayBinhLuan || base.createdAt || new Date(),
    TrangThai: base.TrangThai || "ACTIVE",
    Files: filesDTO,
  };
}

/**
 * Lấy danh sách files theo yêu cầu
 */
async function listFilesByYeuCau(yeuCauId, { page = 1, size = 50 } = {}, req) {
  await assertAccessYeuCau(yeuCauId, req);
  const skip = (Math.max(1, +page) - 1) * Math.max(1, +size);
  const [items, total] = await Promise.all([
    TepTin.find({ YeuCauID: yeuCauId, TrangThai: "ACTIVE" })
      .populate("NguoiTaiLenID", "Ten HoTen MaNhanVien AnhDaiDien")
      .sort({ NgayTaiLen: -1 })
      .skip(skip)
      .limit(Math.max(1, +size)),
    TepTin.countDocuments({ YeuCauID: yeuCauId, TrangThai: "ACTIVE" }),
  ]);
  return { items: items.map(filesToDTO), total };
}

/**
 * Đếm số files theo yêu cầu
 */
async function countFilesByYeuCau(yeuCauId, req) {
  await assertAccessYeuCau(yeuCauId, req);
  return TepTin.countDocuments({ YeuCauID: yeuCauId, TrangThai: "ACTIVE" });
}

/**
 * Xóa file (soft delete)
 */
async function deleteFile(fileId, req) {
  const file = await TepTin.findById(fileId).populate("YeuCauID");
  if (!file) throw new AppError(404, "Không tìm thấy tệp");

  // Check quyền
  const user = await User.findById(req.userId).lean();
  if (!user) throw new AppError(401, "Không xác thực người dùng");

  const isAdmin = user.PhanQuyen === "admin" || user.PhanQuyen === "manager";
  const nhanVienId = user.NhanVienID;

  // Chỉ admin hoặc người upload mới được xóa
  if (!isAdmin && String(file.NguoiTaiLenID) !== String(nhanVienId)) {
    throw new AppError(403, "Không có quyền xóa tệp này");
  }

  file.TrangThai = "DELETED";
  await file.save();

  return filesToDTO(file);
}

/**
 * Thu hồi bình luận (xóa cả nội dung và tệp)
 */
async function recallComment(yeuCauId, commentId, req) {
  await assertAccessYeuCau(yeuCauId, req);

  const comment = await BinhLuan.findById(commentId);
  if (!comment) throw new AppError(404, "Không tìm thấy bình luận");
  if (String(comment.YeuCauID) !== String(yeuCauId)) {
    throw new AppError(400, "Bình luận không thuộc yêu cầu này");
  }

  const user = await User.findById(req.userId).lean();
  const isAdmin = user.PhanQuyen === "admin" || user.PhanQuyen === "manager";
  const nhanVienId = user.NhanVienID;

  // Chỉ admin hoặc người viết mới được thu hồi
  if (!isAdmin && String(comment.NguoiBinhLuanID) !== String(nhanVienId)) {
    throw new AppError(403, "Không có quyền thu hồi bình luận này");
  }

  // Xóa mềm comment
  comment.TrangThai = "DELETED";
  comment.NoiDung = "";
  comment.NgayCapNhat = new Date();
  await comment.save();

  // Xóa mềm các files liên quan
  await TepTin.updateMany({ BinhLuanID: commentId }, { TrangThai: "DELETED" });

  return {
    _id: String(comment._id),
    TrangThai: comment.TrangThai,
  };
}

/**
 * Thu hồi nội dung bình luận (giữ tệp)
 */
async function recallCommentText(yeuCauId, commentId, req) {
  await assertAccessYeuCau(yeuCauId, req);

  const comment = await BinhLuan.findById(commentId);
  if (!comment) throw new AppError(404, "Không tìm thấy bình luận");
  if (String(comment.YeuCauID) !== String(yeuCauId)) {
    throw new AppError(400, "Bình luận không thuộc yêu cầu này");
  }

  const user = await User.findById(req.userId).lean();
  const isAdmin = user.PhanQuyen === "admin" || user.PhanQuyen === "manager";
  const nhanVienId = user.NhanVienID;

  if (!isAdmin && String(comment.NguoiBinhLuanID) !== String(nhanVienId)) {
    throw new AppError(403, "Không có quyền thu hồi nội dung bình luận này");
  }

  comment.NoiDung = "";
  comment.NgayCapNhat = new Date();
  await comment.save();

  return {
    _id: String(comment._id),
    NoiDung: comment.NoiDung,
  };
}

module.exports = {
  taoYeuCau,
  suaYeuCau,
  layChiTiet,
  layDanhSach,
  layLichSu,
  layBinhLuan,
  themBinhLuan,
  layTepTin,
  layDashboardMetrics,
  layQuyenCuaToi,
  layBadgeCounts,
  layBadgeCountsTheoPage,
  layDashboardXuLy,
  layDashboardDieuPhoi,
  ganNhiemVuThuongQuy,
  uploadFilesForYeuCau,
  createCommentWithFiles,
  listFilesByYeuCau,
  countFilesByYeuCau,
  deleteFile,
  recallComment,
  recallCommentText,
};
