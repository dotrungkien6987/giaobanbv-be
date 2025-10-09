# Hệ thống Đánh giá KPI - Backend

## 📋 Tổng quan

Backend API cho hệ thống đánh giá KPI (Key Performance Indicator) của nhân viên dựa trên nhiệm vụ thường quy và tiêu chí đánh giá động.

---

## 🗂️ Cấu trúc Models

### 1. **TieuChiDanhGia** (Evaluation Criteria)

Tiêu chí đánh giá động, có 2 loại:

- **TANG_DIEM**: Tiêu chí tăng điểm (VD: hoàn thành đúng hạn, chất lượng cao)
- **GIAM_DIEM**: Tiêu chí giảm điểm (VD: trễ deadline, sai sót)

```javascript
{
  TenTieuChi: String,
  MoTa: String,
  LoaiTieuChi: "TANG_DIEM" | "GIAM_DIEM",
  GiaTriMin: Number,      // VD: 0
  GiaTriMax: Number,      // VD: 100
  TrongSoMacDinh: Number, // VD: 1.0
  TrangThaiHoatDong: Boolean
}
```

### 2. **ChuKyDanhGia** (Evaluation Cycle)

Chu kỳ đánh giá KPI (tháng, quý, năm)

```javascript
{
  TenChuKy: String,
  LoaiChuKy: "HANG_THANG" | "QUY" | "NAM" | "TUY_CHINH",
  NgayBatDau: Date,
  NgayKetThuc: Date,
  TrangThai: "CHUAN_BI" | "DANG_HOAT_DONG" | "DANH_GIA" | "HOAN_THANH",
  MoTa: String,
  NguoiTaoID: ObjectId
}
```

### 3. **DanhGiaKPI** (KPI Evaluation)

Đánh giá KPI tổng thể của 1 nhân viên trong 1 chu kỳ

```javascript
{
  ChuKyID: ObjectId,
  NhanVienID: ObjectId,
  NguoiDanhGiaID: ObjectId,

  TongDiemKPI: Number,    // Tự động tính từ DanhGiaNhiemVuThuongQuy
  TrangThai: "CHUA_DUYET" | "DA_DUYET",

  NhanXetNguoiDanhGia: String,
  PhanHoiNhanVien: String,
  NgayDuyet: Date,
  isDeleted: Boolean
}
```

**Unique constraint**: `(ChuKyID, NhanVienID)` - 1 nhân viên chỉ có 1 đánh giá/chu kỳ

### 4. **DanhGiaNhiemVuThuongQuy** (Routine Duty Evaluation)

Đánh giá chi tiết từng nhiệm vụ thường quy

```javascript
{
  DanhGiaKPIID: ObjectId,
  NhiemVuThuongQuyID: ObjectId,
  NhanVienID: ObjectId,

  MucDoKho: Number,       // 1-10, có thể điều chỉnh
  ChiTietDiem: [          // Embedded array
    {
      TieuChiID: ObjectId,
      TenTieuChi: String,
      DiemDat: Number,
      TrongSo: Number,
      LoaiTieuChi: "TANG_DIEM" | "GIAM_DIEM"
    }
  ],

  TongDiemTieuChi: Number,  // Auto-calculated
  DiemNhiemVu: Number,      // Auto-calculated
  SoCongViecLienQuan: Number,
  GhiChu: String,
  isDeleted: Boolean
}
```

---

## 🧮 Công thức tính KPI

### Bước 1: Tính tổng điểm tiêu chí

```
TongDiemTieuChi (%) = Σ(DiemDat × TrongSo)[TANG_DIEM] - Σ(DiemDat × TrongSo)[GIAM_DIEM]
```

### Bước 2: Tính điểm nhiệm vụ

```
DiemNhiemVu = MucDoKho × (TongDiemTieuChi / 100)
```

### Bước 3: Tính tổng KPI

```
TongDiemKPI = Σ DiemNhiemVu (tất cả nhiệm vụ)
```

### Bước 4: Hiển thị KPI

```
KPI (%) = (TongDiemKPI / 10) × 100%
```

**Ví dụ:**

```
NV1: MucDoKho=5, TongDiemTieuChi=86% → DiemNhiemVu = 5 × 0.86 = 4.3
NV2: MucDoKho=3, TongDiemTieuChi=95% → DiemNhiemVu = 3 × 0.95 = 2.85
NV3: MucDoKho=2, TongDiemTieuChi=88% → DiemNhiemVu = 2 × 0.88 = 1.76

TongDiemKPI = 4.3 + 2.85 + 1.76 = 8.91
KPI = (8.91 / 10) × 100% = 89.1%
```

---

## 🚀 API Endpoints

### Tiêu chí đánh giá

```
GET    /api/workmanagement/tieu-chi-danh-gia          # Danh sách
GET    /api/workmanagement/tieu-chi-danh-gia/:id      # Chi tiết
POST   /api/workmanagement/tieu-chi-danh-gia          # Tạo mới (Admin)
PUT    /api/workmanagement/tieu-chi-danh-gia/:id      # Cập nhật (Admin)
DELETE /api/workmanagement/tieu-chi-danh-gia/:id      # Xóa (Admin)
```

### Chu kỳ đánh giá

```
GET    /api/workmanagement/chu-ky-danh-gia            # Danh sách
GET    /api/workmanagement/chu-ky-danh-gia/hoat-dong # Chu kỳ đang hoạt động
GET    /api/workmanagement/chu-ky-danh-gia/:id       # Chi tiết
POST   /api/workmanagement/chu-ky-danh-gia           # Tạo mới (Admin)
PUT    /api/workmanagement/chu-ky-danh-gia/:id       # Cập nhật (Admin)
PUT    /api/workmanagement/chu-ky-danh-gia/:id/bat-dau     # Bắt đầu (Admin)
PUT    /api/workmanagement/chu-ky-danh-gia/:id/hoan-thanh  # Hoàn thành (Admin)
DELETE /api/workmanagement/chu-ky-danh-gia/:id       # Xóa (Admin)
```

### Đánh giá KPI

```
POST   /api/workmanagement/kpi                        # Tạo đánh giá (Manager)
GET    /api/workmanagement/kpi/:id                    # Chi tiết
GET    /api/workmanagement/kpi/chu-ky/:chuKyId        # Danh sách theo chu kỳ
GET    /api/workmanagement/kpi/nhan-vien/:nhanVienId  # Lịch sử nhân viên
GET    /api/workmanagement/kpi/thong-ke/chu-ky/:chuKyId  # Thống kê

PUT    /api/workmanagement/kpi/nhiem-vu/:nhiemVuId    # Chấm điểm nhiệm vụ
PUT    /api/workmanagement/kpi/:id/duyet              # Duyệt KPI
PUT    /api/workmanagement/kpi/:id/huy-duyet          # Hủy duyệt (Admin)
PUT    /api/workmanagement/kpi/:id/phan-hoi           # Nhân viên phản hồi
DELETE /api/workmanagement/kpi/:id                    # Xóa (soft delete)
```

---

## 📦 Setup & Installation

### 1. Cài đặt dependencies

```bash
cd giaobanbv-be
npm install
```

### 2. Cấu hình môi trường

File `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/giaobanbv
```

### 3. Seed dữ liệu mẫu

```bash
node modules/workmanagement/migrations/seedKPIData.js
```

Kết quả:

- 8 tiêu chí đánh giá (5 tăng điểm, 3 giảm điểm)
- 3 chu kỳ đánh giá (1 đang hoạt động, 1 chuẩn bị, 1 hoàn thành)

---

## 🔐 Phân quyền

### Admin

- Tạo/sửa/xóa tiêu chí đánh giá
- Tạo/quản lý chu kỳ đánh giá
- Hủy duyệt KPI
- Xóa đánh giá KPI đã duyệt

### Manager (Người quản lý)

- Tạo đánh giá KPI cho nhân viên dưới quyền
- Chấm điểm nhiệm vụ
- Duyệt đánh giá KPI
- Xóa đánh giá KPI chưa duyệt

### Employee (Nhân viên)

- Xem lịch sử KPI của bản thân
- Xem chi tiết đánh giá KPI
- Phản hồi đánh giá KPI (sau khi duyệt)

**Kiểm tra quyền quản lý:**

```javascript
QuanLyNhanVien.findOne({
  NhanVienQuanLy: managerId,
  NhanVien: employeeId,
  LoaiQuanLy: "KPI",
  isDeleted: false,
});
```

---

## 🔄 Workflow

### 1. Chuẩn bị

```
Admin tạo chu kỳ đánh giá → TrangThai = "CHUAN_BI"
```

### 2. Bắt đầu chu kỳ

```
Admin bật chu kỳ → TrangThai = "DANG_HOAT_DONG"
```

### 3. Manager tạo đánh giá

```
POST /api/workmanagement/kpi
{
  "ChuKyID": "...",
  "NhanVienID": "..."
}

→ Tự động tạo DanhGiaNhiemVuThuongQuy cho tất cả NVTQ của nhân viên
```

### 4. Manager chấm điểm

```
PUT /api/workmanagement/kpi/nhiem-vu/:nhiemVuId
{
  "ChiTietDiem": [
    {
      "TieuChiID": "...",
      "DiemDat": 85,
      "TrongSo": 1.0
    },
    ...
  ],
  "MucDoKho": 5,
  "GhiChu": "Hoàn thành tốt"
}

→ Auto-calculate: TongDiemTieuChi, DiemNhiemVu
→ Auto-update: DanhGiaKPI.TongDiemKPI
```

### 5. Manager duyệt

```
PUT /api/workmanagement/kpi/:id/duyet
{
  "NhanXetNguoiDanhGia": "Nhân viên hoàn thành tốt nhiệm vụ..."
}

→ TrangThai = "DA_DUYET"
→ NgayDuyet = now()
```

### 6. Nhân viên xem & phản hồi

```
GET /api/workmanagement/kpi/:id
PUT /api/workmanagement/kpi/:id/phan-hoi
{
  "PhanHoiNhanVien": "Cảm ơn anh/chị đã đánh giá..."
}
```

### 7. Hoàn thành chu kỳ

```
Admin hoàn thành chu kỳ → TrangThai = "HOAN_THANH"
(Yêu cầu: Tất cả đánh giá KPI đã duyệt)
```

---

## 🧪 Testing

### Test tạo đánh giá KPI

```bash
curl -X POST http://localhost:5000/api/workmanagement/kpi \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ChuKyID": "CHU_KY_ID",
    "NhanVienID": "NHAN_VIEN_ID"
  }'
```

### Test chấm điểm nhiệm vụ

```bash
curl -X PUT http://localhost:5000/api/workmanagement/kpi/nhiem-vu/NHIEM_VU_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ChiTietDiem": [
      {
        "TieuChiID": "TIEU_CHI_ID_1",
        "DiemDat": 85,
        "TrongSo": 1.0
      }
    ],
    "MucDoKho": 5,
    "GhiChu": "Hoàn thành tốt"
  }'
```

---

## 📊 Validation Rules

### DanhGiaKPI

- ✅ Unique: `(ChuKyID, NhanVienID)`
- ✅ `TongDiemKPI >= 0` (có thể > 10 hoặc âm)
- ✅ `TrangThai` in `["CHUA_DUYET", "DA_DUYET"]`
- ✅ `NgayDuyet` chỉ có khi `TrangThai = "DA_DUYET"`

### DanhGiaNhiemVuThuongQuy

- ✅ `MucDoKho` từ 1-10
- ✅ `DiemDat` trong `[TieuChiDanhGia.GiaTriMin, GiaTriMax]`
- ✅ `TrongSo >= 0`
- ✅ `LoaiTieuChi` in `["TANG_DIEM", "GIAM_DIEM"]`

### ChuKyDanhGia

- ✅ `NgayBatDau < NgayKetThuc`
- ✅ Không trùng khoảng thời gian với chu kỳ khác
- ✅ Chỉ 1 chu kỳ `DANG_HOAT_DONG` tại 1 thời điểm

---

## 🐛 Troubleshooting

### Lỗi: "Không có quyền đánh giá KPI cho nhân viên này"

→ Kiểm tra `QuanLyNhanVien` với `LoaiQuanLy: "KPI"`

### Lỗi: "Đã tồn tại đánh giá KPI cho nhân viên này trong chu kỳ này"

→ Unique constraint `(ChuKyID, NhanVienID)` đã tồn tại

### Lỗi: "Nhân viên chưa được gán nhiệm vụ thường quy nào"

→ Kiểm tra `NhanVienNhiemVu` collection

### TongDiemKPI không cập nhật tự động

→ Kiểm tra post-save hook trong `DanhGiaNhiemVuThuongQuy`

---

## 📝 Notes

1. **Auto-calculation workflow:**

   ```
   ChiTietDiem thay đổi
   → Pre-save tính TongDiemTieuChi, DiemNhiemVu
   → Post-save trigger DanhGiaKPI.tinhTongDiemKPI()
   → Cập nhật TongDiemKPI
   ```

2. **Soft delete:** Tất cả models dùng `isDeleted: true` thay vì xóa thật

3. **Embedded vs Reference:**

   - `ChiTietDiem`: Embedded (performance, snapshot data)
   - `TieuChiID`: Reference (để populate thông tin mới nhất)

4. **Xếp loại KPI:**
   - Xuất sắc: >= 90%
   - Tốt: 80-89%
   - Khá: 70-79%
   - Trung bình: 60-69%
   - Yếu: < 60%

---

## 🔗 Links

- [Frontend Documentation](../../../../fe-bcgiaobanbvt/src/features/QuanLyCongViec/KPI/README.md)
- [API Spec](../../../../fe-bcgiaobanbvt/src/features/QuanLyCongViec/KPI/KPI_API_SPEC.md)
- [Business Logic](../../../../fe-bcgiaobanbvt/src/features/QuanLyCongViec/KPI/KPI_BUSINESS_LOGIC.md)

---

**Last Updated:** October 6, 2025  
**Version:** 1.0.0
