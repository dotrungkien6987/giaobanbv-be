const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const thongBaoSchema = Schema(
  {
    TieuDe: {
      type: String,
      required: true,
      maxlength: 255,
    },
    NoiDung: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    LoaiThongBao: {
      type: String,
      enum: [
        "TASK_ASSIGNED", // Được giao công việc
        "TASK_COMPLETED", // Công việc hoàn thành
        "TASK_OVERDUE", // Công việc quá hạn
        "TICKET_CREATED", // Tạo ticket mới
        "TICKET_ASSIGNED", // Được assign ticket
        "TICKET_RESOLVED", // Ticket được giải quyết
        "TICKET_CLOSED", // Ticket đóng
        "COMMENT", // Có bình luận mới
        "EVALUATION", // Đánh giá KPI
        "SYSTEM", // Thông báo hệ thống
        "REMINDER", // Nhắc nhở
      ],
      required: true,
    },
    NguoiNhanID: {
      type: Schema.ObjectId,
      required: true,
      ref: "User",
    },
    NguoiGuiID: {
      type: Schema.ObjectId,
      ref: "User",
    },
    LienKetDen: {
      type: String,
      maxlength: 500,
    },
    TrangThai: {
      type: String,
      enum: ["UNREAD", "READ", "DELETED"],
      default: "UNREAD",
    },
    MucDoUuTien: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
    },
    NgayTao: {
      type: Date,
      default: Date.now,
    },
    NgayDoc: {
      type: Date,
    },
    NgayHetHan: {
      type: Date,
    },
    DuLieuLienQuan: {
      type: Schema.Types.Mixed, // Lưu thông tin bổ sung
    },
  },
  {
    timestamps: true,
    collection: "thongbao",
  }
);

// Indexes
thongBaoSchema.index({ NguoiNhanID: 1, NgayTao: -1 });
thongBaoSchema.index({ NguoiNhanID: 1, TrangThai: 1 });
thongBaoSchema.index({ LoaiThongBao: 1 });
thongBaoSchema.index({ NgayTao: -1 });
thongBaoSchema.index({ NgayHetHan: 1 });
thongBaoSchema.index({ MucDoUuTien: 1 });

// Virtual for time ago
thongBaoSchema.virtual("ThoiGianTruoc").get(function () {
  const now = new Date();
  const diffMs = now - this.NgayTao;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${diffDays} ngày trước`;
});

// Virtual for is expired
thongBaoSchema.virtual("DaHetHan").get(function () {
  return this.NgayHetHan && new Date() > this.NgayHetHan;
});

// Methods
thongBaoSchema.methods.daDoc = function () {
  this.TrangThai = "READ";
  this.NgayDoc = new Date();
  return this.save();
};

thongBaoSchema.methods.xoa = function () {
  this.TrangThai = "DELETED";
  return this.save();
};

thongBaoSchema.methods.coTheXem = function (nguoiDungId) {
  return this.NguoiNhanID.toString() === nguoiDungId.toString();
};

thongBaoSchema.methods.layIconTheoLoai = function () {
  const iconMap = {
    TASK_ASSIGNED: "assignment",
    TASK_COMPLETED: "task_alt",
    TASK_OVERDUE: "schedule",
    TICKET_CREATED: "confirmation_number",
    TICKET_ASSIGNED: "support_agent",
    TICKET_RESOLVED: "check_circle",
    TICKET_CLOSED: "cancel",
    COMMENT: "comment",
    EVALUATION: "assessment",
    SYSTEM: "info",
    REMINDER: "notifications",
  };
  return iconMap[this.LoaiThongBao] || "notifications";
};

thongBaoSchema.methods.layMauSacTheoMucDo = function () {
  const colorMap = {
    LOW: "#4CAF50", // Xanh lá
    NORMAL: "#2196F3", // Xanh dương
    HIGH: "#FF9800", // Cam
    URGENT: "#F44336", // Đỏ
  };
  return colorMap[this.MucDoUuTien] || "#2196F3";
};

// Static methods
thongBaoSchema.statics.timTheoNguoiNhan = function (
  nguoiNhanId,
  trangThai,
  limit = 50
) {
  const query = { NguoiNhanID: nguoiNhanId };
  if (trangThai) {
    query.TrangThai = trangThai;
  } else {
    query.TrangThai = { $ne: "DELETED" };
  }

  return this.find(query)
    .populate("NguoiGuiID", "HoTen MaNhanVien Avatar")
    .sort({ NgayTao: -1 })
    .limit(limit);
};

thongBaoSchema.statics.demChuaDoc = function (nguoiNhanId) {
  return this.countDocuments({
    NguoiNhanID: nguoiNhanId,
    TrangThai: "UNREAD",
  });
};

thongBaoSchema.statics.demTheoLoai = function (nguoiNhanId, tuNgay, denNgay) {
  const match = {
    NguoiNhanID: nguoiNhanId,
    TrangThai: { $ne: "DELETED" },
  };

  if (tuNgay || denNgay) {
    match.NgayTao = {};
    if (tuNgay) match.NgayTao.$gte = tuNgay;
    if (denNgay) match.NgayTao.$lte = denNgay;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$LoaiThongBao",
        soLuong: { $sum: 1 },
        chuaDoc: {
          $sum: { $cond: [{ $eq: ["$TrangThai", "UNREAD"] }, 1, 0] },
        },
      },
    },
    { $sort: { soLuong: -1 } },
  ]);
};

thongBaoSchema.statics.timSapHetHan = function (soGio = 24) {
  const gioiHan = new Date();
  gioiHan.setHours(gioiHan.getHours() + soGio);

  return this.find({
    NgayHetHan: { $lte: gioiHan, $gte: new Date() },
    TrangThai: "UNREAD",
  })
    .populate("NguoiNhanID", "HoTen MaNhanVien Email")
    .sort({ NgayHetHan: 1 });
};

thongBaoSchema.statics.taoThongBaoHangLoat = async function (
  danhSachNguoiNhan,
  thongTinThongBao
) {
  const danhSachThongBao = danhSachNguoiNhan.map((nguoiNhanId) => ({
    ...thongTinThongBao,
    NguoiNhanID: nguoiNhanId,
  }));

  return this.insertMany(danhSachThongBao);
};

thongBaoSchema.statics.xoaThongBaoCu = function (soNgay = 30) {
  const ngayCu = new Date();
  ngayCu.setDate(ngayCu.getDate() - soNgay);

  return this.deleteMany({
    NgayTao: { $lt: ngayCu },
    TrangThai: { $in: ["READ", "DELETED"] },
  });
};

thongBaoSchema.statics.thongKeTheoNgay = function (nguoiNhanId, soNgay = 7) {
  const tuNgay = new Date();
  tuNgay.setDate(tuNgay.getDate() - soNgay + 1);
  tuNgay.setHours(0, 0, 0, 0);

  return this.aggregate([
    {
      $match: {
        NguoiNhanID: mongoose.Types.ObjectId(nguoiNhanId),
        NgayTao: { $gte: tuNgay },
        TrangThai: { $ne: "DELETED" },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$NgayTao" },
        },
        soLuong: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Pre-save middleware
thongBaoSchema.pre("save", function (next) {
  // Tự động set ngày hết hạn cho một số loại thông báo
  if (this.isNew && !this.NgayHetHan) {
    const hetHanMap = {
      TASK_OVERDUE: 1, // 1 ngày
      REMINDER: 3, // 3 ngày
      EVALUATION: 7, // 7 ngày
    };

    const soNgay = hetHanMap[this.LoaiThongBao];
    if (soNgay) {
      const ngayHetHan = new Date();
      ngayHetHan.setDate(ngayHetHan.getDate() + soNgay);
      this.NgayHetHan = ngayHetHan;
    }
  }

  next();
});

const ThongBao = mongoose.model("ThongBao", thongBaoSchema);
module.exports = ThongBao;
