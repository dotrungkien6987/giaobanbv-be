# Phase 1: Thiết lập Models và Cơ sở dữ liệu cho Hệ thống Quản lý Hiệu suất Công việc

## Mục tiêu Phase 1

Thiết lập và hoàn thiện các models cơ sở dữ liệu cho hệ thống quản lý hiệu suất công việc, tập trung vào 3 thực thể chính: Nhiệm vụ Thường quy, Công việc Được giao, và Yêu cầu Hỗ trợ (Ticket).

## Bối cảnh dự án

Dự án đang sử dụng:

- **Backend**: Node.js + Express.js + MongoDB (Mongoose)
- **Frontend**: React.js/Next.js (sẽ phát triển trong các phase tiếp theo)
- **Cấu trúc hiện tại**: Đã có sẵn models cơ bản như User, NhanVien, Khoa và một số models trong module workmanagement

## Phân tích Models hiện tại

Trong thư mục `models/` và `modules/workmanagement/models/` đã có:

- **User.js**: Quản lý người dùng (admin, manager, normal, etc.)
- **NhanVien.js**: Thông tin nhân viên
- **Khoa.js**: Thông tin các khoa/phòng ban
- **NhiemVuThuongQuy.js**: Nhiệm vụ thường quy (đã có sẵn)
- **AssignedTask.js**: Công việc được giao (đã có sẵn)
- **Ticket.js**: Yêu cầu hỗ trợ (đã có sẵn)

## Nhiệm vụ cần thực hiện

### 1. Kiểm tra và cập nhật Models hiện tại

#### 1.1 Cập nhật User Model

**File**: `models/User.js`
**Thêm fields**:

```javascript
// Thêm vào userSchema
ViTriCongViec: { type: String, require: false, default: "" }, // Vị trí công việc
LaQuanLy: { type: Boolean, default: false }, // Có phải quản lý không
QuanLyTrucTiep: { type: Schema.ObjectId, ref: "User", required: false }, // Người quản lý trực tiếp
```

#### 1.2 Kiểm tra NhiemVuThuongQuy Model

**File**: `modules/workmanagement/models/NhiemVuThuongQuy.js`
**Cần có các fields chính**:

- TenNhiemVu, MoTa, KhoaID, MucDoKho
- TrangThaiHoatDong, isDeleted
- NguoiTaoID, NhomViecUserID
- DanhSachViTriCongViec (array ObjectId ref ViTriCongViec)

#### 1.3 Kiểm tra AssignedTask Model

**File**: `modules/workmanagement/models/AssignedTask.js`
**Cần có các fields chính**:

- TieuDe, MoTa, NhiemVuThuongQuyID
- NguoiGiaoViecID, LoaiCongViec (CANHAN/NHOM)
- TrangThai, MucDoUuTien
- ThoiGianBatDau, ThoiGianKetThuc
- DanhSachNguoiThucHien (array)

#### 1.4 Kiểm tra Ticket Model

**File**: `modules/workmanagement/models/Ticket.js`
**Cần có các fields chính**:

- ticketNumber, title, description
- categoryId, routineDutyId (liên kết với Nhiệm vụ Thường quy)
- requesterId, handlerId
- priority, status
- ThoiGianTao, ThoiGianXuLy, ThoiGianHoanThanh

### 2. Tạo Models mới cần thiết

#### 2.1 QuanLyNhanVien Model (Mới)

**File mới**: `modules/workmanagement/models/QuanLyNhanVien.js`

```javascript
const quanLyNhanVienSchema = Schema(
  {
    NhanVienQuanLy: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    NhanVienDuocQuanLy: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    LoaiQuanLy: {
      type: String,
      enum: ["KPI"], // Nhân viên chấm KPI cũng là người giao việc
      required: true,
      default: "KPI",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
```

#### 2.2 ViTriCongViec Model

**File mới**: `modules/workmanagement/models/ViTriCongViec.js`

```javascript
const viTriCongViecSchema = Schema(
  {
    TenViTri: { type: String, required: true, unique: true },
    MoTa: { type: String, maxlength: 1000 },
    KhoaID: { type: Schema.ObjectId, required: true, ref: "Khoa" },
    CapDo: { type: Number, min: 1, max: 5, default: 1 }, // 1=Nhân viên, 2=Trưởng nhóm, 3=Phó khoa, 4=Trưởng khoa, 5=Giám đốc
    TrangThaiHoatDong: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
```

#### 2.2 ChuKyDanhGia Model

**File mới**: `modules/workmanagement/models/ChuKyDanhGia.js`

```javascript
const chuKyDanhGiaSchema = Schema(
  {
    TenChuKy: { type: String, required: true },
    LoaiChuKy: { type: String, enum: ["THANG", "QUY", "NAM"], required: true },
    ThoiGianBatDau: { type: Date, required: true },
    ThoiGianKetThuc: { type: Date, required: true },
    TrangThai: {
      type: String,
      enum: ["CHUA_BAT_DAU", "DANG_DIEN_RA", "DA_KET_THUC"],
      default: "CHUA_BAT_DAU",
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
```

#### 2.3 DanhGiaKPI Model

**File mới**: `modules/workmanagement/models/DanhGiaKPI.js`

```javascript
const danhGiaKPISchema = Schema(
  {
    NhanVienID: { type: Schema.ObjectId, required: true, ref: "NhanVien" },
    ChuKyDanhGiaID: {
      type: Schema.ObjectId,
      required: true,
      ref: "ChuKyDanhGia",
    },
    NguoiDanhGiaID: { type: Schema.ObjectId, required: true, ref: "User" }, // Trưởng phòng
    DanhSachDanhGiaNhiemVu: [
      {
        NhiemVuThuongQuyID: { type: Schema.ObjectId, ref: "NhiemVuThuongQuy" },
        DiemSo: { type: Number, min: 0, max: 10 },
        NhanXet: { type: String, maxlength: 1000 },
        SoCongViecHoanThanh: { type: Number, default: 0 },
        SoTicketXuLy: { type: Number, default: 0 },
      },
    ],
    TongDiemKPI: { type: Number, min: 0, max: 10 },
    NhanXetChung: { type: String, maxlength: 2000 },
    TrangThai: {
      type: String,
      enum: ["DANG_DANH_GIA", "DA_HOAN_THANH", "CHO_PHAN_HOI"],
      default: "DANG_DANH_GIA",
    },
    NgayDanhGia: { type: Date, default: Date.now },
    PhanHoiNhanVien: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);
```

### 3. Cập nhật quan hệ giữa các Models

#### 3.1 Thêm indexes cho hiệu suất

Thêm indexes cho các trường thường được query:

```javascript
// Trong mỗi model
schema.index({ KhoaID: 1 });
schema.index({ TrangThai: 1 });
schema.index({ ThoiGianTao: -1 });
schema.index({ isDeleted: 1 });
```

#### 3.2 Đảm bảo tính nhất quán của references

- Tất cả AssignedTask và Ticket phải có NhiemVuThuongQuyID
- User phải có KhoaID và ViTriCongViec
- DanhGiaKPI phải liên kết với ChuKyDanhGia

### 4. Validation và Business Rules

#### 4.1 Pre-save middlewares

```javascript
// Ví dụ trong AssignedTask
congViecDuocGiaoSchema.pre("save", function (next) {
  // Validate NhiemVuThuongQuyID bắt buộc
  if (!this.NhiemVuThuongQuyID) {
    return next(
      new Error("Công việc phải được gán vào một Nhiệm vụ Thường quy")
    );
  }
  next();
});
```

#### 4.2 Virtual fields

```javascript
// Tính toán số lượng công việc đã hoàn thành
nhiemVuThuongQuySchema.virtual("SoCongViecHoanThanh", {
  ref: "AssignedTask",
  localField: "_id",
  foreignField: "NhiemVuThuongQuyID",
  count: true,
  match: { TrangThai: "HOAN_THANH" },
});
```

### 5. Kiểm tra và Test Models

#### 5.1 Tạo test data

Tạo script để insert dữ liệu mẫu cho testing:

- Các Khoa/Phòng ban
- Vị trí công việc
- Nhiệm vụ thường quy
- Chu kỳ đánh giá

#### 5.2 Validation testing

Test các ràng buộc và validation rules đã định nghĩa.

## Kết quả mong đợi Phase 1

Sau khi hoàn thành Phase 1:

1. ✅ Tất cả models đã được thiết lập và hoàn thiện
2. ✅ Có dữ liệu mẫu để test
3. ✅ Các quan hệ giữa models hoạt động chính xác
4. ✅ Validation rules đảm bảo tính toàn vẹn dữ liệu
5. ✅ Sẵn sàng cho Phase 2: Xây dựng APIs Backend

## Files cần tạo/sửa trong Phase 1

1. `models/User.js` (cập nhật)
2. `modules/workmanagement/models/ViTriCongViec.js` (tạo mới)
3. `modules/workmanagement/models/ChuKyDanhGia.js` (tạo mới)
4. `modules/workmanagement/models/DanhGiaKPI.js` (tạo mới)
5. `modules/workmanagement/models/index.js` (cập nhật exports)
6. `insertTestData.js` (tạo script test data)

## Lưu ý kỹ thuật

- Sử dụng MongoDB transactions khi cần thiết
- Implement soft delete cho tất cả models (isDeleted field)
- Đảm bảo backward compatibility với code hiện tại
- Follow naming convention: PascalCase cho fields, camelCase cho methods
