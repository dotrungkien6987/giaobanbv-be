const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const binhLuanSchema = Schema(
  {
    NoiDung: {
      type: String,
      required: false, // cho phép bình luận chỉ có tệp đính kèm
      maxlength: 5000,
      default: "",
    },
    CongViecID: {
      type: Schema.ObjectId,
      ref: "CongViec",
    },
    NguoiBinhLuanID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    BinhLuanChaID: {
      type: Schema.ObjectId,
      ref: "BinhLuan",
    },
    LoaiBinhLuan: {
      type: String,
      enum: ["COMMENT", "FEEDBACK", "QUESTION", "SOLUTION"],
      default: "COMMENT",
    },
    TrangThai: {
      type: String,
      enum: ["ACTIVE", "DELETED", "HIDDEN"],
      default: "ACTIVE",
    },
    NgayBinhLuan: {
      type: Date,
      default: Date.now,
    },
    NgayCapNhat: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "binhluan",
  }
);

// Indexes
binhLuanSchema.index({ CongViecID: 1, NgayBinhLuan: -1 });
binhLuanSchema.index({ NguoiBinhLuanID: 1 });
binhLuanSchema.index({ BinhLuanChaID: 1 });
binhLuanSchema.index({ TrangThai: 1 });

// Virtual for replies
binhLuanSchema.virtual("TraLoi", {
  ref: "BinhLuan",
  localField: "_id",
  foreignField: "BinhLuanChaID",
});

// Virtual for attachments
binhLuanSchema.virtual("TepTin", {
  ref: "TepTin",
  localField: "_id",
  foreignField: "BinhLuanID",
});

// Methods
binhLuanSchema.methods.xoa = function () {
  this.TrangThai = "DELETED";
  this.NgayCapNhat = new Date();
  return this.save();
};

binhLuanSchema.methods.an = function () {
  this.TrangThai = "HIDDEN";
  this.NgayCapNhat = new Date();
  return this.save();
};

binhLuanSchema.methods.coTheCapNhat = function (nhanVienId) {
  // Chỉ người tạo comment mới có thể cập nhật
  return this.NguoiBinhLuanID.toString() === nhanVienId.toString();
};

binhLuanSchema.methods.coTheXoa = function (nhanVienId, vaiTro) {
  // Người tạo hoặc admin/manager có thể xóa
  const vaiTroNormalized = vaiTro ? vaiTro.toLowerCase() : "";
  return (
    this.NguoiBinhLuanID.toString() === nhanVienId.toString() ||
    ["admin", "manager", "superadmin"].includes(vaiTroNormalized)
  );
};

binhLuanSchema.methods.layTraLoi = function () {
  return mongoose
    .model("BinhLuan")
    .find({
      BinhLuanChaID: this._id,
      TrangThai: "ACTIVE",
    })
    .populate("NguoiBinhLuanID", "Ten Email")
    .sort({ NgayBinhLuan: 1 });
};

// Static methods
// Xóa mềm bình luận kèm file đính kèm (thay thế logic cũ ở BinhLuanCongViec)
binhLuanSchema.statics.softDeleteWithFiles = async function (binhLuanId) {
  const TepTin = mongoose.model("TepTin");
  await this.updateOne(
    { _id: binhLuanId },
    { $set: { TrangThai: "DELETED", NgayCapNhat: new Date() } }
  );
  await TepTin.updateMany(
    { BinhLuanID: binhLuanId },
    { $set: { TrangThai: "DELETED" } }
  );
};

binhLuanSchema.statics.timTheoCongViec = function (congViecId) {
  return this.find({
    CongViecID: congViecId,
    TrangThai: "ACTIVE",
    BinhLuanChaID: null, // Chỉ lấy comment gốc
  })
    .populate("NguoiBinhLuanID", "Ten Email")
    .populate({
      path: "TraLoi",
      match: { TrangThai: "ACTIVE" },
      populate: {
        path: "NguoiBinhLuanID",
        select: "Ten Email",
      },
    })
    .sort({ NgayBinhLuan: -1 });
};

binhLuanSchema.statics.timTheoYeuCauHoTro = function (yeuCauId) {
  return this.find({
    YeuCauHoTroID: yeuCauId,
    TrangThai: "ACTIVE",
    BinhLuanChaID: null,
  })
    .populate("NguoiBinhLuanID", "Ten Email")
    .populate({
      path: "TraLoi",
      match: { TrangThai: "ACTIVE" },
      populate: {
        path: "NguoiBinhLuanID",
        select: "Ten Email",
      },
    })
    .sort({ NgayBinhLuan: -1 });
};

binhLuanSchema.statics.timTheoNguoiDung = function (nhanVienId, limit = 20) {
  return this.find({
    NguoiBinhLuanID: nhanVienId,
    TrangThai: "ACTIVE",
  })
    .populate("CongViecID", "TieuDe")
    .populate("YeuCauHoTroID", "TieuDe")
    .sort({ NgayBinhLuan: -1 })
    .limit(limit);
};

binhLuanSchema.statics.thongKeTheoLoai = function (tuNgay, denNgay) {
  const match = { TrangThai: "ACTIVE" };
  if (tuNgay || denNgay) {
    match.NgayBinhLuan = {};
    if (tuNgay) match.NgayBinhLuan.$gte = tuNgay;
    if (denNgay) match.NgayBinhLuan.$lte = denNgay;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$LoaiBinhLuan",
        soLuong: { $sum: 1 },
      },
    },
    { $sort: { soLuong: -1 } },
  ]);
};

binhLuanSchema.statics.timBinhLuanGanDay = function (soNgay = 7, limit = 50) {
  const tuNgay = new Date();
  tuNgay.setDate(tuNgay.getDate() - soNgay);

  return this.find({
    NgayBinhLuan: { $gte: tuNgay },
    TrangThai: "ACTIVE",
  })
    .populate("NguoiBinhLuanID", "Ten Email")
    .populate("CongViecID", "TieuDe")
    .populate("YeuCauHoTroID", "TieuDe")
    .sort({ NgayBinhLuan: -1 })
    .limit(limit);
};

// Pre-save middleware
binhLuanSchema.pre("save", function (next) {
  if (this.isModified("NoiDung") && !this.isNew) {
    this.NgayCapNhat = new Date();
  }
  next();
});

// TODO: [NOTIFICATION_SYSTEM] - Thay thế bằng notificationService.send() khi implement Phase 2
// Post-save middleware to send notifications (DISABLED - waiting for new notification system)
/*
binhLuanSchema.post("save", async function () {
  if (this.isNew) {
    const ThongBao = mongoose.model("ThongBao");

    // Tạo thông báo cho người liên quan
    let nguoiNhanThongBao = [];

    if (this.CongViecID) {
      const CongViec = mongoose.model("CongViec");
      const congViec = await CongViec.findById(this.CongViecID);
      if (congViec) {
        // Thông báo cho người giao và người chính
        nguoiNhanThongBao = [congViec.NguoiGiaoViecID, congViec.NguoiChinhID];
      }
    }

    if (this.YeuCauHoTroID) {
      const YeuCauHoTro = mongoose.model("YeuCauHoTro");
      const yeuCau = await YeuCauHoTro.findById(this.YeuCauHoTroID);
      if (yeuCau) {
        // Thông báo cho người tạo và người xử lý
        nguoiNhanThongBao = [yeuCau.NguoiTaoID, yeuCau.NguoiXuLyID];
      }
    }

    // Loại bỏ người bình luận khỏi danh sách nhận thông báo
    nguoiNhanThongBao = nguoiNhanThongBao.filter(
      (id) => id && id.toString() !== this.NguoiBinhLuanID.toString()
    );

    // Tạo thông báo
    for (const nguoiNhanId of nguoiNhanThongBao) {
      await ThongBao.create({
        TieuDe: "Có bình luận mới",
        NoiDung: `${this.NguoiBinhLuanID} đã bình luận`,
        LoaiThongBao: "COMMENT",
        NguoiNhanID: nguoiNhanId,
        LienKetDen: this.CongViecID
          ? `congviec/${this.CongViecID}`
          : `ticket/${this.YeuCauHoTroID}`,
      });
    }
  }
});
*/

const BinhLuan = mongoose.model("BinhLuan", binhLuanSchema);
module.exports = BinhLuan;
