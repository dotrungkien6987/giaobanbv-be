# Phase 5: Xây dựng Hệ thống Đánh giá KPI

## Mục tiêu Phase 5

Xây dựng hệ thống Backend APIs hoàn chỉnh cho việc đánh giá hiệu suất (KPI) của nhân viên, dựa trên dữ liệu từ Nhiệm vụ Thường quy, Công việc Được giao và Tickets.

## Tiền điều kiện

- ✅ Phase 1, 2, 3, 4 đã hoàn thành
- ✅ APIs cho Nhiệm vụ, Công việc, Tickets đã hoạt động
- ✅ Models ChuKyDanhGia, DanhGiaKPI đã được thiết lập

## Đặc điểm nghiệp vụ của Đánh giá KPI

### Luồng nghiệp vụ chính:

1. **Admin/HR** thiết lập chu kỳ đánh giá (tháng, quý, năm)
2. **Trưởng phòng** mở màn hình đánh giá KPI vào cuối chu kỳ
3. **Hệ thống** tự động tổng hợp dữ liệu:
   - Danh sách Nhiệm vụ Thường quy của nhân viên
   - Số lượng Công việc Được giao hoàn thành
   - Số lượng Tickets đã xử lý
   - Điểm số trung bình từ các công việc
4. **Trưởng phòng** xem lại dữ liệu, chấm điểm cho từng Nhiệm vụ Thường quy
5. **Hệ thống** tự động tính tổng điểm KPI
6. **Nhân viên** xem kết quả và có thể phản hồi

### Liên kết quan trọng:

- **Chu kỳ đánh giá** là khung thời gian cho việc tổng hợp dữ liệu
- **Nhiệm vụ Thường quy** là cơ sở để chấm điểm
- **Công việc và Tickets** là dữ liệu định lượng để tham khảo

## Nhiệm vụ chính

### 1. Hoàn thiện Models cho Đánh giá KPI

#### 1.1 Cập nhật ChuKyDanhGia Model

**File**: `modules/workmanagement/models/ChuKyDanhGia.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chuKyDanhGiaSchema = Schema(
  {
    TenChuKy: { type: String, required: true, trim: true },
    LoaiChuKy: { type: String, enum: ["THANG", "QUY", "NAM"], required: true },
    ThoiGianBatDau: { type: Date, required: true },
    ThoiGianKetThuc: { type: Date, required: true },

    TrangThai: {
      type: String,
      enum: ["CHUA_BAT_DAU", "DANG_DIEN_RA", "CHO_DANH_GIA", "DA_HOAN_THANH"],
      default: "CHUA_BAT_DAU",
    },

    KhoaApDung: [
      {
        type: Schema.ObjectId,
        ref: "Khoa",
        description:
          "Các khoa/phòng ban áp dụng chu kỳ này (để trống nếu áp dụng toàn viện)",
      },
    ],

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chuKyDanhGiaSchema.index({ ThoiGianBatDau: 1, ThoiGianKetThuc: 1 });
chuKyDanhGiaSchema.index({ TrangThai: 1 });

const ChuKyDanhGia = mongoose.model("ChuKyDanhGia", chuKyDanhGiaSchema);
module.exports = ChuKyDanhGia;
```

#### 1.2 Cập nhật DanhGiaKPI Model

**File**: `modules/workmanagement/models/DanhGiaKPI.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const danhGiaKPISchema = Schema(
  {
    // Thông tin cơ bản
    NhanVienID: { type: Schema.ObjectId, required: true, ref: "NhanVien" },
    ChuKyDanhGiaID: {
      type: Schema.ObjectId,
      required: true,
      ref: "ChuKyDanhGia",
    },
    NguoiDanhGiaID: { type: Schema.ObjectId, required: true, ref: "User" }, // Trưởng phòng

    // Danh sách đánh giá chi tiết
    DanhSachDanhGiaNhiemVu: [
      {
        NhiemVuThuongQuyID: {
          type: Schema.ObjectId,
          ref: "NhiemVuThuongQuy",
          required: true,
        },
        TenNhiemVu: { type: String, required: true },
        MucDoKho: { type: Number, required: true },

        // Dữ liệu tổng hợp tự động
        SoCongViecHoanThanh: { type: Number, default: 0 },
        SoTicketXuLy: { type: Number, default: 0 },
        DiemTrungBinhCongViec: { type: Number, default: 0 },

        // Đánh giá của trưởng phòng
        DiemSo: { type: Number, min: 0, max: 10, required: true },
        NhanXet: { type: String, maxlength: 1000 },
      },
    ],

    // Kết quả tổng hợp
    TongDiemKPI: { type: Number, min: 0, max: 10 },
    XepLoai: {
      type: String,
      enum: ["XUAT_SAC", "TOT", "KHA", "TRUNG_BINH", "YEU"],
    },

    // Nhận xét và phản hồi
    NhanXetChung: { type: String, maxlength: 2000 },
    PhanHoiNhanVien: { type: String, maxlength: 2000 },

    // Trạng thái
    TrangThai: {
      type: String,
      enum: [
        "CHUA_DANH_GIA",
        "DANG_DANH_GIA",
        "CHO_NHAN_VIEN_XAC_NHAN",
        "DA_HOAN_THANH",
      ],
      default: "CHUA_DANH_GIA",
    },

    // Thời gian
    NgayDanhGia: { type: Date },
    NgayNhanVienXacNhan: { type: Date },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

danhGiaKPISchema.index({ NhanVienID: 1, ChuKyDanhGiaID: 1 }, { unique: true });
danhGiaKPISchema.index({ NguoiDanhGiaID: 1 });
danhGiaKPISchema.index({ TrangThai: 1 });

// Pre-save middleware để tính tổng điểm KPI
danhGiaKPISchema.pre("save", function (next) {
  if (this.isModified("DanhSachDanhGiaNhiemVu")) {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    this.DanhSachDanhGiaNhiemVu.forEach((item) => {
      totalWeightedScore += item.DiemSo * item.MucDoKho;
      totalWeight += item.MucDoKho;
    });

    if (totalWeight > 0) {
      this.TongDiemKPI = (totalWeightedScore / totalWeight).toFixed(2);
    } else {
      this.TongDiemKPI = 0;
    }

    // Xếp loại
    if (this.TongDiemKPI >= 9) this.XepLoai = "XUAT_SAC";
    else if (this.TongDiemKPI >= 8) this.XepLoai = "TOT";
    else if (this.TongDiemKPI >= 6.5) this.XepLoai = "KHA";
    else if (this.TongDiemKPI >= 5) this.XepLoai = "TRUNG_BINH";
    else this.XepLoai = "YEU";
  }

  next();
});

const DanhGiaKPI = mongoose.model("DanhGiaKPI", danhGiaKPISchema);
module.exports = DanhGiaKPI;
```

### 2. Tạo Controller cho Đánh giá KPI

#### 2.1 ChuKyDanhGia Controller

**File mới**: `modules/workmanagement/controllers/chuKyDanhGia.controller.js`

```javascript
const ChuKyDanhGia = require("../models/ChuKyDanhGia");
const responseFormatter = require("../utils/responseFormatter");

// 1. Tạo chu kỳ đánh giá (Admin/HR)
exports.taoChuKyDanhGia = async (req, res) => {
  try {
    const newChuKy = new ChuKyDanhGia(req.body);
    await newChuKy.save();
    res
      .status(201)
      .json(
        responseFormatter.successResponse(newChuKy, "Tạo chu kỳ thành công")
      );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 2. Lấy danh sách chu kỳ
exports.getDanhSachChuKy = async (req, res) => {
  try {
    const chuKyList = await ChuKyDanhGia.find({ isDeleted: false }).sort({
      ThoiGianBatDau: -1,
    });
    res.json(
      responseFormatter.successResponse(
        chuKyList,
        "Lấy danh sách chu kỳ thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 3. Cập nhật chu kỳ
exports.capNhatChuKy = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedChuKy = await ChuKyDanhGia.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(
      responseFormatter.successResponse(
        updatedChuKy,
        "Cập nhật chu kỳ thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 4. Xóa chu kỳ
exports.xoaChuKy = async (req, res) => {
  try {
    const { id } = req.params;
    await ChuKyDanhGia.findByIdAndUpdate(id, { isDeleted: true });
    res.json(responseFormatter.successResponse(null, "Xóa chu kỳ thành công"));
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};
```

#### 2.2 DanhGiaKPI Controller

**File mới**: `modules/workmanagement/controllers/danhGiaKPI.controller.js`

```javascript
const DanhGiaKPI = require("../models/DanhGiaKPI");
const KpiService = require("../services/kpi.service");
const responseFormatter = require("../utils/responseFormatter");

// 1. Lấy danh sách nhân viên cần đánh giá (cho Trưởng phòng)
exports.getNhanVienCanDanhGia = async (req, res) => {
  try {
    const { chuKyId } = req.params;
    const truongPhongId = req.user._id;

    const danhSach = await KpiService.getDanhSachNhanVienCanDanhGia(
      truongPhongId,
      chuKyId
    );
    res.json(
      responseFormatter.successResponse(danhSach, "Lấy danh sách thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 2. Lấy dữ liệu tổng hợp cho một nhân viên
exports.getDuLieuTongHop = async (req, res) => {
  try {
    const { chuKyId, nhanVienId } = req.params;

    const duLieu = await KpiService.getDuLieuTongHopChoNhanVien(
      nhanVienId,
      chuKyId
    );
    res.json(
      responseFormatter.successResponse(
        duLieu,
        "Lấy dữ liệu tổng hợp thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 3. Lưu/Cập nhật bản đánh giá KPI
exports.luuDanhGiaKPI = async (req, res) => {
  try {
    const { chuKyId, nhanVienId } = req.params;
    const { DanhSachDanhGiaNhiemVu, NhanXetChung, TrangThai } = req.body;
    const nguoiDanhGiaId = req.user._id;

    const danhGia = await KpiService.luuHoacCapNhatDanhGia({
      chuKyId,
      nhanVienId,
      nguoiDanhGiaId,
      DanhSachDanhGiaNhiemVu,
      NhanXetChung,
      TrangThai,
    });

    res.json(
      responseFormatter.successResponse(danhGia, "Lưu đánh giá thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 4. Lấy kết quả đánh giá KPI (cho nhân viên)
exports.getKetQuaKPI = async (req, res) => {
  try {
    const { chuKyId } = req.params;
    const nhanVienId = req.user.NhanVienID;

    const ketQua = await DanhGiaKPI.findOne({
      ChuKyDanhGiaID: chuKyId,
      NhanVienID: nhanVienId,
      isDeleted: false,
    }).populate("NguoiDanhGiaID", "HoTen");

    if (!ketQua) {
      return res
        .status(404)
        .json(
          responseFormatter.errorResponse("Không tìm thấy kết quả đánh giá")
        );
    }

    res.json(
      responseFormatter.successResponse(ketQua, "Lấy kết quả thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 5. Nhân viên xác nhận/phản hồi kết quả
exports.xacNhanKPI = async (req, res) => {
  try {
    const { danhGiaId } = req.params;
    const { phanHoi } = req.body;
    const nhanVienId = req.user.NhanVienID;

    const danhGia = await DanhGiaKPI.findById(danhGiaId);

    if (!danhGia || danhGia.NhanVienID.toString() !== nhanVienId.toString()) {
      return res
        .status(403)
        .json(responseFormatter.errorResponse("Không có quyền thao tác"));
    }

    danhGia.TrangThai = "DA_HOAN_THANH";
    danhGia.PhanHoiNhanVien = phanHoi;
    danhGia.NgayNhanVienXacNhan = new Date();

    await danhGia.save();

    res.json(
      responseFormatter.successResponse(danhGia, "Xác nhận kết quả thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// 6. Thống kê KPI
exports.thongKeKPI = async (req, res) => {
  try {
    const { chuKyId, khoaId } = req.query;

    const thongKe = await KpiService.thongKeKPI(chuKyId, khoaId);
    res.json(
      responseFormatter.successResponse(thongKe, "Lấy thống kê KPI thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};
```

### 3. Service Layer cho KPI Business Logic

#### 3.1 KPI Service

**File mới**: `modules/workmanagement/services/kpi.service.js`

```javascript
const ChuKyDanhGia = require("../models/ChuKyDanhGia");
const DanhGiaKPI = require("../models/DanhGiaKPI");
const User = require("../../../models/User");
const NhanVien = require("../../../models/NhanVien");
const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const AssignedTask = require("../models/AssignedTask");
const Ticket = require("../models/Ticket");

class KpiService {
  // Lấy danh sách nhân viên cần đánh giá
  async getDanhSachNhanVienCanDanhGia(truongPhongId, chuKyId) {
    const truongPhong = await User.findById(truongPhongId);
    const chuKy = await ChuKyDanhGia.findById(chuKyId);

    if (!truongPhong || !chuKy) throw new Error("Dữ liệu không hợp lệ");

    // Tìm tất cả nhân viên thuộc khoa của trưởng phòng
    const nhanVienTrongKhoa = await NhanVien.find({
      KhoaID: truongPhong.KhoaID,
      isDeleted: false,
    });

    // Lấy danh sách đánh giá đã có
    const danhGiaDaCo = await DanhGiaKPI.find({
      ChuKyDanhGiaID: chuKyId,
      NhanVienID: { $in: nhanVienTrongKhoa.map((nv) => nv._id) },
    });

    const danhSach = nhanVienTrongKhoa.map((nv) => {
      const danhGia = danhGiaDaCo.find(
        (dg) => dg.NhanVienID.toString() === nv._id.toString()
      );
      return {
        nhanVien: nv,
        trangThaiDanhGia: danhGia ? danhGia.TrangThai : "CHUA_DANH_GIA",
      };
    });

    return danhSach;
  }

  // Lấy dữ liệu tổng hợp cho một nhân viên
  async getDuLieuTongHopChoNhanVien(nhanVienId, chuKyId) {
    const chuKy = await ChuKyDanhGia.findById(chuKyId);
    const nhanVien = await NhanVien.findById(nhanVienId);

    if (!chuKy || !nhanVien) throw new Error("Dữ liệu không hợp lệ");

    // Lấy danh sách nhiệm vụ thường quy của nhân viên
    // (Cần có model NhanVien_NhiemVuThuongQuy hoặc logic gán nhiệm vụ cho nhân viên)
    const nhiemVuCuaNhanVien = await NhiemVuThuongQuy.find({
      // Logic gán nhiệm vụ cho nhân viên
    });

    const duLieuTongHop = await Promise.all(
      nhiemVuCuaNhanVien.map(async (nhiemVu) => {
        const filter = {
          NhiemVuThuongQuyID: nhiemVu._id,
          "DanhSachNguoiThucHien.NhanVienID": nhanVienId,
          ThoiGianHoanThanh: {
            $gte: chuKy.ThoiGianBatDau,
            $lte: chuKy.ThoiGianKetThuc,
          },
        };

        // Tổng hợp công việc
        const congViecHoanThanh = await AssignedTask.find({
          ...filter,
          TrangThai: "HOAN_THANH",
        });

        const soCongViec = congViecHoanThanh.length;
        const diemTrungBinh =
          soCongViec > 0
            ? congViecHoanThanh.reduce(
                (sum, cv) => sum + (cv.DanhGiaCuaNguoiGiao.DiemSo || 0),
                0
              ) / soCongViec
            : 0;

        // Tổng hợp tickets
        const soTicket = await Ticket.countDocuments({
          routineDutyId: nhiemVu._id,
          handlerId: nhanVien.UserID, // Giả sử UserID được lưu trong NhanVien
          status: "DA_DONG",
          closedAt: {
            $gte: chuKy.ThoiGianBatDau,
            $lte: chuKy.ThoiGianKetThuc,
          },
        });

        return {
          NhiemVuThuongQuyID: nhiemVu._id,
          TenNhiemVu: nhiemVu.TenNhiemVu,
          MucDoKho: nhiemVu.MucDoKho,
          SoCongViecHoanThanh: soCongViec,
          SoTicketXuLy: soTicket,
          DiemTrungBinhCongViec: diemTrungBinh.toFixed(2),
        };
      })
    );

    return duLieuTongHop;
  }

  // Lưu hoặc cập nhật đánh giá
  async luuHoacCapNhatDanhGia(data) {
    const {
      chuKyId,
      nhanVienId,
      nguoiDanhGiaId,
      DanhSachDanhGiaNhiemVu,
      NhanXetChung,
      TrangThai,
    } = data;

    let danhGia = await DanhGiaKPI.findOne({
      ChuKyDanhGiaID: chuKyId,
      NhanVienID: nhanVienId,
    });

    if (danhGia) {
      // Cập nhật
      danhGia.DanhSachDanhGiaNhiemVu = DanhSachDanhGiaNhiemVu;
      danhGia.NhanXetChung = NhanXetChung;
      danhGia.TrangThai = TrangThai;
      danhGia.NgayDanhGia = new Date();
    } else {
      // Tạo mới
      danhGia = new DanhGiaKPI({
        ChuKyDanhGiaID: chuKyId,
        NhanVienID: nhanVienId,
        NguoiDanhGiaID: nguoiDanhGiaId,
        DanhSachDanhGiaNhiemVu,
        NhanXetChung,
        TrangThai,
        NgayDanhGia: new Date(),
      });
    }

    await danhGia.save();
    return danhGia;
  }

  // Thống kê KPI
  async thongKeKPI(chuKyId, khoaId) {
    const matchStage = {
      ChuKyDanhGiaID: mongoose.Types.ObjectId(chuKyId),
      isDeleted: false,
    };

    if (khoaId) {
      // Cần join với NhanVien để filter theo khoa
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$XepLoai",
          soLuong: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          tongSo: { $sum: "$soLuong" },
          chiTiet: { $push: { xepLoai: "$_id", soLuong: "$soLuong" } },
        },
      },
      {
        $project: {
          _id: 0,
          tongSo: 1,
          chiTiet: {
            $map: {
              input: "$chiTiet",
              as: "item",
              in: {
                xepLoai: "$$item.xepLoai",
                soLuong: "$$item.soLuong",
                tyLe: {
                  $multiply: [{ $divide: ["$$item.soLuong", "$tongSo"] }, 100],
                },
              },
            },
          },
        },
      },
    ];

    const result = await DanhGiaKPI.aggregate(pipeline);
    return result[0] || { tongSo: 0, chiTiet: [] };
  }

  // Tự động chuyển trạng thái chu kỳ
  async autoUpdateChuKyStatus() {
    const now = new Date();

    // Chuyển sang "DANG_DIEN_RA"
    await ChuKyDanhGia.updateMany(
      { TrangThai: "CHUA_BAT_DAU", ThoiGianBatDau: { $lte: now } },
      { $set: { TrangThai: "DANG_DIEN_RA" } }
    );

    // Chuyển sang "CHO_DANH_GIA"
    await ChuKyDanhGia.updateMany(
      { TrangThai: "DANG_DIEN_RA", ThoiGianKetThuc: { $lte: now } },
      { $set: { TrangThai: "CHO_DANH_GIA" } }
    );
  }
}

module.exports = new KpiService();
```

## Kết quả mong đợi Phase 5

Sau khi hoàn thành Phase 5:

1. ✅ Hệ thống đánh giá KPI hoàn chỉnh
2. ✅ Tự động tổng hợp dữ liệu từ Công việc và Tickets
3. ✅ Workflow đánh giá từ Trưởng phòng đến Nhân viên
4. ✅ Báo cáo và thống kê KPI chi tiết
5. ✅ Chuẩn bị cho Phase 6: Frontend Implementation

## Files cần tạo trong Phase 5

1. `modules/workmanagement/controllers/chuKyDanhGia.controller.js`
2. `modules/workmanagement/controllers/danhGiaKPI.controller.js`
3. `modules/workmanagement/routes/kpi.routes.js`
4. `modules/workmanagement/services/kpi.service.js`
5. `modules/workmanagement/middlewares/kpi.validation.js`
6. `modules/workmanagement/tests/kpi.test.js`
7. `modules/workmanagement/docs/kpi.api.md`
8. Cập nhật `models/ChuKyDanhGia.js` và `models/DanhGiaKPI.js`
9. Cập nhật `routes/index.js`

## Lưu ý quan trọng Phase 5

- **Performance**: Query tổng hợp dữ liệu có thể nặng, cần tối ưu
- **Data Consistency**: Đảm bảo dữ liệu từ các module khác là chính xác
- **Security**: Phân quyền chặt chẽ cho Trưởng phòng và Nhân viên
- **Automation**: Cron job để tự động cập nhật trạng thái chu kỳ
- **Flexibility**: Hệ thống cần linh hoạt để thay đổi trọng số, cách tính điểm trong tương lai
