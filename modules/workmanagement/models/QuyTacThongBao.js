const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Schema cho điều kiện thông báo
const dieuKienThongBaoSchema = new Schema(
  {
    TenTruong: {
      type: String,
      required: true,
      description:
        "Tên trường cần kiểm tra (priority, departmentId, assigneeRole, etc.)",
    },
    ToanTu: {
      type: String,
      enum: [
        "equals",
        "in",
        "greater_than",
        "less_than",
        "contains",
        "not_equals",
      ],
      required: true,
      description: "Toán tử so sánh",
    },
    GiaTri: {
      type: Schema.Types.Mixed,
      required: true,
      description: "Giá trị để so sánh",
    },
    GhiChu: {
      type: String,
      maxlength: 500,
      description: "Mô tả điều kiện",
    },
  },
  { _id: false }
);

// Schema cho người nhận thông báo
const nguoiNhanThongBaoSchema = new Schema(
  {
    LoaiNguoiNhan: {
      type: String,
      enum: [
        "NGUOI_THUC_HIEN",
        "NGUOI_GIAO_VIEC",
        "TRUONG_PHONG",
        "NGUOI_DUNG_CU_THE",
        "THEO_VAI_TRO",
      ],
      required: true,
      description: "Loại người nhận thông báo",
    },
    GiaTri: {
      type: String,
      description: "Giá trị cụ thể (userId, role, etc.) nếu cần",
    },
    GhiChu: {
      type: String,
      maxlength: 300,
      description: "Ghi chú về người nhận",
    },
  },
  { _id: false }
);

// Schema chính cho quy tắc thông báo
const quyTacThongBaoSchema = new Schema(
  {
    TenQuyTac: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      description: "Tên mô tả quy tắc thông báo",
    },
    LoaiSuKien: {
      type: String,
      enum: [
        "CONG_VIEC_DUOC_GIAO",
        "CONG_VIEC_QUA_HAN",
        "CONG_VIEC_HOAN_THANH",
        "BINH_LUAN_MOI",
        "THAY_DOI_TRANG_THAI",
        "CONG_VIEC_SUA_DOI",
        "CONG_VIEC_XOA",
        "GAN_NHIEM_VU_MOI",
        "HUY_GAN_NHIEM_VU",
      ],
      required: true,
      description: "Loại sự kiện kích hoạt thông báo",
    },
    MoTa: {
      type: String,
      maxlength: 1000,
      description: "Mô tả chi tiết về quy tắc",
    },
    DieuKien: [dieuKienThongBaoSchema],
    NguoiNhan: [nguoiNhanThongBaoSchema],
    KenhThongBao: [
      {
        type: String,
        enum: ["IN_APP", "EMAIL", "SMS", "PUSH_NOTIFICATION"],
        default: "IN_APP",
        description: "Kênh gửi thông báo",
      },
    ],
    MauThongBao: {
      TieuDe: {
        type: String,
        required: true,
        maxlength: 255,
        description: "Template tiêu đề thông báo (có thể chứa placeholder)",
      },
      NoiDung: {
        type: String,
        required: true,
        maxlength: 2000,
        description: "Template nội dung thông báo (có thể chứa placeholder)",
      },
      Placeholder: [
        {
          type: String,
          description:
            "Danh sách các placeholder có thể sử dụng: {{tenCongViec}}, {{nguoiGiao}}, etc.",
        },
      ],
    },
    MucDoUuTien: {
      type: String,
      enum: ["THAP", "TRUNG_BINH", "CAO", "KHAN_CAP"],
      default: "TRUNG_BINH",
      description: "Mức độ ưu tiên của thông báo",
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
      description: "Quy tắc có đang hoạt động không",
    },
    NguoiTaoID: {
      type: Schema.ObjectId,
      ref: "NhanVienQuanLy",
      required: true,
      description: "Người tạo quy tắc",
    },
    KhoaID: {
      type: Schema.ObjectId,
      ref: "Khoa",
      description: "Khoa áp dụng quy tắc (null = áp dụng toàn hệ thống)",
    },
    ThoiGianTreLich: {
      type: Number,
      default: 0,
      min: 0,
      description: "Số phút trì hoãn trước khi gửi thông báo (0 = gửi ngay)",
    },
    SoLanThucHien: {
      type: Number,
      default: 0,
      description: "Số lần quy tắc đã được thực hiện",
    },
    LanThucHienCuoi: {
      type: Date,
      description: "Lần cuối quy tắc được thực hiện",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      description: "Đánh dấu đã xóa mềm",
    },
  },
  {
    timestamps: true,
    collection: "quytacthongbao", // Tên bảng tiếng Việt không dấu gạch dưới
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
quyTacThongBaoSchema.index({ LoaiSuKien: 1, TrangThaiHoatDong: 1 });
quyTacThongBaoSchema.index({ KhoaID: 1, TrangThaiHoatDong: 1 });
quyTacThongBaoSchema.index({ NguoiTaoID: 1 });
quyTacThongBaoSchema.index({ MucDoUuTien: 1 });
quyTacThongBaoSchema.index({ isDeleted: 1 });
quyTacThongBaoSchema.index({ TrangThaiHoatDong: 1, isDeleted: 1 });

// Query middleware
quyTacThongBaoSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

// Methods
quyTacThongBaoSchema.methods.kiemTraDieuKien = function (duLieu) {
  return this.DieuKien.every((dk) => {
    const giaTri = duLieu[dk.TenTruong];

    switch (dk.ToanTu) {
      case "equals":
        return giaTri === dk.GiaTri;
      case "not_equals":
        return giaTri !== dk.GiaTri;
      case "in":
        return Array.isArray(dk.GiaTri) && dk.GiaTri.includes(giaTri);
      case "greater_than":
        return giaTri > dk.GiaTri;
      case "less_than":
        return giaTri < dk.GiaTri;
      case "contains":
        return typeof giaTri === "string" && giaTri.includes(dk.GiaTri);
      default:
        return false;
    }
  });
};

quyTacThongBaoSchema.methods.taoNoiDungThongBao = function (duLieu) {
  let tieuDe = this.MauThongBao.TieuDe;
  let noiDung = this.MauThongBao.NoiDung;

  // Thay thế các placeholder
  if (this.MauThongBao.Placeholder) {
    this.MauThongBao.Placeholder.forEach((placeholder) => {
      const key = placeholder.replace(/[{}]/g, "");
      if (duLieu[key]) {
        const regex = new RegExp(`{{${key}}}`, "g");
        tieuDe = tieuDe.replace(regex, duLieu[key]);
        noiDung = noiDung.replace(regex, duLieu[key]);
      }
    });
  }

  return { tieuDe, noiDung };
};

quyTacThongBaoSchema.methods.capNhatThongKe = function () {
  this.SoLanThucHien += 1;
  this.LanThucHienCuoi = new Date();
  return this.save();
};

quyTacThongBaoSchema.methods.xoaMem = function () {
  this.isDeleted = true;
  this.TrangThaiHoatDong = false;
  return this.save();
};

// Static methods
quyTacThongBaoSchema.statics.timTheoSuKien = function (
  loaiSuKien,
  khoaId = null
) {
  const query = {
    LoaiSuKien: loaiSuKien,
    TrangThaiHoatDong: true,
  };

  if (khoaId) {
    query.$or = [
      { KhoaID: khoaId },
      { KhoaID: null }, // Quy tắc áp dụng toàn hệ thống
    ];
  }

  return this.find(query)
    .populate("NguoiTaoID", "HoTen MaNhanVien")
    .populate("KhoaID", "TenKhoa MaKhoa")
    .sort({ MucDoUuTien: -1, createdAt: -1 });
};

quyTacThongBaoSchema.statics.layQuyTacHoatDong = function (khoaId = null) {
  const query = { TrangThaiHoatDong: true };

  if (khoaId) {
    query.$or = [{ KhoaID: khoaId }, { KhoaID: null }];
  }

  return this.find(query)
    .populate("NguoiTaoID", "HoTen MaNhanVien")
    .populate("KhoaID", "TenKhoa MaKhoa")
    .sort({ LoaiSuKien: 1, MucDoUuTien: -1 });
};

quyTacThongBaoSchema.statics.thongKeThucHien = function (tuNgay, denNgay) {
  const matchStage = {};

  if (tuNgay && denNgay) {
    matchStage.LanThucHienCuoi = {
      $gte: new Date(tuNgay),
      $lte: new Date(denNgay),
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$LoaiSuKien",
        tongSoLan: { $sum: "$SoLanThucHien" },
        soQuyTac: { $sum: 1 },
        trungBinhMoiQuyTac: { $avg: "$SoLanThucHien" },
      },
    },
    { $sort: { tongSoLan: -1 } },
  ]);
};

// Virtual fields
quyTacThongBaoSchema.virtual("MoTaLoaiSuKien").get(function () {
  const moTa = {
    CONG_VIEC_DUOC_GIAO: "Công việc được giao",
    CONG_VIEC_QUA_HAN: "Công việc quá hạn",
    CONG_VIEC_HOAN_THANH: "Công việc hoàn thành",
    BINH_LUAN_MOI: "Bình luận mới",
    THAY_DOI_TRANG_THAI: "Thay đổi trạng thái",
    CONG_VIEC_SUA_DOI: "Công việc sửa đổi",
    CONG_VIEC_XOA: "Công việc xóa",
    GAN_NHIEM_VU_MOI: "Gán nhiệm vụ mới",
    HUY_GAN_NHIEM_VU: "Hủy gán nhiệm vụ",
  };
  return moTa[this.LoaiSuKien] || "Không xác định";
});

module.exports = mongoose.model("QuyTacThongBao", quyTacThongBaoSchema);
