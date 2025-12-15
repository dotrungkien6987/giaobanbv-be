const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * CauHinhThongBaoKhoa - Cấu hình phân quyền và người nhận thông báo của từng khoa
 * Mỗi khoa chỉ có 1 bản ghi cấu hình (unique KhoaID)
 */
const cauHinhThongBaoKhoaSchema = new Schema(
  {
    // Khoa
    KhoaID: {
      type: Schema.ObjectId,
      ref: "Khoa",
      required: [true, "Khoa là bắt buộc"],
      unique: true,
    },

    /**
     * 👑 QUẢN LÝ KHOA
     * Người có quyền:
     * - Cấu hình danh mục yêu cầu (DanhMucYeuCau)
     * - Thay đổi danh sách người điều phối
     * - Thay đổi danh sách quản lý khoa
     * LƯU Ý: Quản lý khoa KHÔNG tự động là người điều phối
     */
    DanhSachQuanLyKhoa: [
      {
        NhanVienID: {
          type: Schema.ObjectId,
          ref: "NhanVien",
          required: true,
        },
        _id: false,
      },
    ],

    /**
     * 📬 NGƯỜI ĐIỀU PHỐI
     * - Nhận thông báo khi có yêu cầu mới gửi đến KHOA
     * - Quyền tiếp nhận / từ chối / điều phối yêu cầu
     */
    DanhSachNguoiDieuPhoi: [
      {
        NhanVienID: {
          type: Schema.ObjectId,
          ref: "NhanVien",
          required: true,
        },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
    collection: "cauhinhthongbaokhoa",
  }
);

// Index đã có unique trên KhoaID

// Methods

/**
 * Kiểm tra NhanVien có phải là quản lý khoa không
 */
cauHinhThongBaoKhoaSchema.methods.laQuanLyKhoa = function (nhanVienId) {
  const nhanVienIdStr = nhanVienId.toString();
  return this.DanhSachQuanLyKhoa.some(
    (ql) => ql.NhanVienID.toString() === nhanVienIdStr
  );
};

/**
 * Kiểm tra NhanVien có phải là người điều phối không
 */
cauHinhThongBaoKhoaSchema.methods.laNguoiDieuPhoi = function (nhanVienId) {
  const nhanVienIdStr = nhanVienId.toString();
  return this.DanhSachNguoiDieuPhoi.some(
    (dp) => dp.NhanVienID.toString() === nhanVienIdStr
  );
};

/**
 * Lấy danh sách NhanVienID của người điều phối
 * Dùng để gửi notification
 */
cauHinhThongBaoKhoaSchema.methods.layDanhSachNguoiDieuPhoiIDs = function () {
  return this.DanhSachNguoiDieuPhoi.map((dp) => dp.NhanVienID);
};

/**
 * Lấy danh sách NhanVienID của quản lý khoa
 * Dùng để gửi notification khi escalate
 */
cauHinhThongBaoKhoaSchema.methods.layDanhSachQuanLyKhoaIDs = function () {
  return this.DanhSachQuanLyKhoa.map((ql) => ql.NhanVienID);
};

/**
 * Thêm quản lý khoa
 */
cauHinhThongBaoKhoaSchema.methods.themQuanLyKhoa = function (nhanVienId) {
  if (!this.laQuanLyKhoa(nhanVienId)) {
    this.DanhSachQuanLyKhoa.push({ NhanVienID: nhanVienId });
  }
  return this.save();
};

/**
 * Xóa quản lý khoa
 */
cauHinhThongBaoKhoaSchema.methods.xoaQuanLyKhoa = function (nhanVienId) {
  const nhanVienIdStr = nhanVienId.toString();
  this.DanhSachQuanLyKhoa = this.DanhSachQuanLyKhoa.filter(
    (ql) => ql.NhanVienID.toString() !== nhanVienIdStr
  );
  return this.save();
};

/**
 * Thêm người điều phối
 */
cauHinhThongBaoKhoaSchema.methods.themNguoiDieuPhoi = function (nhanVienId) {
  if (!this.laNguoiDieuPhoi(nhanVienId)) {
    this.DanhSachNguoiDieuPhoi.push({ NhanVienID: nhanVienId });
  }
  return this.save();
};

/**
 * Xóa người điều phối
 */
cauHinhThongBaoKhoaSchema.methods.xoaNguoiDieuPhoi = function (nhanVienId) {
  const nhanVienIdStr = nhanVienId.toString();
  this.DanhSachNguoiDieuPhoi = this.DanhSachNguoiDieuPhoi.filter(
    (dp) => dp.NhanVienID.toString() !== nhanVienIdStr
  );
  return this.save();
};

// Statics

/**
 * Lấy cấu hình theo khoa
 * Nếu không có, trả về null (khoa chưa được cấu hình)
 */
cauHinhThongBaoKhoaSchema.statics.layTheoKhoa = async function (khoaId) {
  const config = await this.findOne({ KhoaID: khoaId })
    .populate(
      "DanhSachQuanLyKhoa.NhanVienID",
      "Ten MaNhanVien Email ChucDanh ChucVu"
    )
    .populate(
      "DanhSachNguoiDieuPhoi.NhanVienID",
      "Ten MaNhanVien Email ChucDanh ChucVu"
    );

  if (!config) return null;

  // Map Ten -> HoTen for frontend compatibility
  const mapNhanVien = (list) =>
    list.map((item) => ({
      NhanVienID: item.NhanVienID
        ? {
            _id: item.NhanVienID._id,
            HoTen: item.NhanVienID.Ten, // Map Ten -> HoTen
            MaNhanVien: item.NhanVienID.MaNhanVien,
            Email: item.NhanVienID.Email,
            ChucDanh: item.NhanVienID.ChucDanh,
            ChucVu: item.NhanVienID.ChucVu,
          }
        : null,
    }));

  return {
    ...config.toObject(),
    DanhSachQuanLyKhoa: mapNhanVien(config.DanhSachQuanLyKhoa),
    DanhSachNguoiDieuPhoi: mapNhanVien(config.DanhSachNguoiDieuPhoi),
  };
};

/**
 * Kiểm tra khoa đã được cấu hình chưa
 */
cauHinhThongBaoKhoaSchema.statics.khoaDaCauHinh = async function (khoaId) {
  const config = await this.findOne({ KhoaID: khoaId });
  return !!config;
};

/**
 * Kiểm tra khoa có người điều phối không
 * Dùng để validate trước khi gửi yêu cầu đến khoa
 */
cauHinhThongBaoKhoaSchema.statics.khoaCoNguoiDieuPhoi = async function (
  khoaId
) {
  const config = await this.findOne({ KhoaID: khoaId });
  return config && config.DanhSachNguoiDieuPhoi.length > 0;
};

/**
 * Tạo cấu hình mới cho khoa
 * @param {ObjectId} khoaId - ID của khoa
 * @param {ObjectId[]} quanLyKhoaIds - Danh sách NhanVienID của quản lý khoa
 * @param {ObjectId[]} nguoiDieuPhoiIds - Danh sách NhanVienID của người điều phối
 */
cauHinhThongBaoKhoaSchema.statics.taoCauHinh = async function (
  khoaId,
  quanLyKhoaIds = [],
  nguoiDieuPhoiIds = []
) {
  const config = new this({
    KhoaID: khoaId,
    DanhSachQuanLyKhoa: quanLyKhoaIds.map((id) => ({ NhanVienID: id })),
    DanhSachNguoiDieuPhoi: nguoiDieuPhoiIds.map((id) => ({ NhanVienID: id })),
  });
  return config.save();
};

const CauHinhThongBaoKhoa = mongoose.model(
  "CauHinhThongBaoKhoa",
  cauHinhThongBaoKhoaSchema
);
module.exports = CauHinhThongBaoKhoa;
