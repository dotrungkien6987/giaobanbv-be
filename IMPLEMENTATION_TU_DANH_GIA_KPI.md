# IMPLEMENTATION: TỰ ĐÁNH GIÁ KPI - MỨC ĐỘ HOÀN THÀNH CÔNG VIỆC

> **Ngày tạo:** 26/10/2025  
> **Phiên bản:** 1.0  
> **Trạng thái:** Ready for Implementation

---

## 📋 TÓM TẮT YÊU CẦU

### **Logic Nghiệp Vụ:**

1. **Tiêu chí cố định:** Mọi chu kỳ đánh giá đều có tiêu chí "Mức độ hoàn thành công việc" (0-100%)
2. **Đánh giá 2 chiều:**
   - Nhân viên tự đánh giá điểm của tiêu chí này
   - Quản lý đánh giá điểm của tiêu chí này
3. **Công thức tính điểm cuối cùng:**
   ```
   DiemDat = (DiemQuanLy × 2 + DiemTuDanhGia) / 3
   ```
4. **Quy trình:**
   - Trạng thái CHUA_DUYET: Cả nhân viên và quản lý có thể chấm điểm song song, sửa bao nhiêu lần tùy ý
   - Trạng thái DA_DUYET: Không ai có thể sửa điểm, điểm được tính toán khi duyệt

---

## 🏗️ KIẾN TRÚC THIẾT KẾ

### **1. Model ChuKyDanhGia**

#### Schema TieuChiCauHinh:

```javascript
{
  TenTieuChi: String,              // Tên tiêu chí
  LoaiTieuChi: String,             // "TANG_DIEM" | "GIAM_DIEM"
  GiaTriMin: Number,               // Giá trị tối thiểu (default: 0)
  GiaTriMax: Number,               // Giá trị tối đa (default: 100)
  DonVi: String,                   // Đơn vị (default: "%")
  ThuTu: Number,                   // Thứ tự hiển thị
  GhiChu: String,                  // Ghi chú

  // ✅ KEY FIELD: Đánh dấu tiêu chí "Mức độ hoàn thành"
  IsMucDoHoanThanh: Boolean,       // true = Tiêu chí FIXED, cho phép tự đánh giá
                                   // false = Tiêu chí user-defined, chỉ quản lý chấm
}
```

#### Quy tắc:

- **Auto-create**: Khi tạo chu kỳ mới, backend tự động tạo tiêu chí:
  ```javascript
  {
    TenTieuChi: "Mức độ hoàn thành công việc",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    DonVi: "%",
    ThuTu: 0,
    IsMucDoHoanThanh: true
  }
  ```
- **Validation**: Mỗi chu kỳ phải có đúng 1 tiêu chí `IsMucDoHoanThanh = true`
- **Immutable**: Không cho xóa/đổi tên tiêu chí này
- **Frontend**: Hiển thị read-only, user chỉ cấu hình các tiêu chí khác

---

### **2. Model DanhGiaNhiemVuThuongQuy**

#### Schema ChiTietDiem:

```javascript
{
  TenTieuChi: String,
  LoaiTieuChi: String,             // "TANG_DIEM" | "GIAM_DIEM"

  // ✅ Điểm nhân viên tự đánh giá (chỉ cho IsMucDoHoanThanh = true)
  DiemTuDanhGia: Number | null,    // null = chưa tự đánh giá

  // ✅ Điểm quản lý đánh giá
  DiemQuanLy: Number | null,       // null = quản lý chưa chấm

  // ✅ Điểm cuối cùng (tính khi DUYỆT)
  DiemDat: Number,                 // Auto-calculated hoặc manual input

  // ✅ Snapshot khi duyệt (audit trail)
  DiemTuDanhGiaKhiDuyet: Number | null,
  DiemQuanLyKhiDuyet: Number | null,

  // Copy từ ChuKyDanhGia.TieuChiCauHinh
  IsMucDoHoanThanh: Boolean,       // true = Cho phép tự đánh giá
  GiaTriMin: Number,
  GiaTriMax: Number,
  DonVi: String,
  ThuTu: Number,
  GhiChu: String,
}
```

#### Trạng thái:

```javascript
TrangThai: {
  type: String,
  enum: ["CHUA_DUYET", "DA_DUYET"],
  default: "CHUA_DUYET"
}
```

#### Methods:

- `duyet(nguoiDuyetId)`: Tính điểm cuối cùng, chốt trạng thái DA_DUYET
- `huyDuyet(lyDo)`: Đưa về CHUA_DUYET, cho phép chấm lại
- `coTheChamDiem()`: Return `TrangThai === "CHUA_DUYET"`

---

## 🔄 WORKFLOW CHI TIẾT

### **A. Tạo Chu Kỳ Đánh Giá**

```
User tạo chu kỳ (Tháng/Năm/NgayBatDau/NgayKetThuc)
  ↓
User cấu hình các tiêu chí user-defined (optional)
  ↓
Backend auto-add tiêu chí FIXED:
  {
    TenTieuChi: "Mức độ hoàn thành công việc",
    IsMucDoHoanThanh: true,
    ThuTu: 0  // Luôn hiển thị đầu tiên
  }
  ↓
Merge: TieuChiCauHinh = [FIXED, ...USER_DEFINED]
  ↓
Lưu vào DB
```

### **B. Khởi Tạo Đánh Giá KPI**

```
Admin/Manager khởi tạo DanhGiaKPI cho nhân viên trong chu kỳ
  ↓
Lấy danh sách nhiệm vụ được gán (NhanVienNhiemVu) theo ChuKyDanhGiaID
  ↓
Tạo DanhGiaNhiemVuThuongQuy cho mỗi nhiệm vụ:
  - Copy TieuChiCauHinh từ ChuKyDanhGia vào ChiTietDiem[]
  - Giữ nguyên field IsMucDoHoanThanh
  - DiemTuDanhGia = null
  - DiemQuanLy = null
  - DiemDat = 0
  - TrangThai = CHUA_DUYET
```

### **C. Nhân Viên Tự Đánh Giá**

```
Nhân viên vào trang "Tự Đánh Giá KPI"
  ↓
Hệ thống load DanhGiaNhiemVuThuongQuy của nhân viên (TrangThai = CHUA_DUYET)
  ↓
Với mỗi nhiệm vụ, hiển thị tiêu chí có IsMucDoHoanThanh = true
  ↓
Nhân viên nhập điểm (0-100%)
  ↓
API: PUT /api/kpi/danh-gia-nhiem-vu/:id/nhan-vien-cham-diem
  Body: { diemTuDanhGia: { "Mức độ hoàn thành công việc": 85 } }
  ↓
Backend update:
  ChiTietDiem[0].DiemTuDanhGia = 85  // (tiêu chí có IsMucDoHoanThanh = true)
  ↓
Nhân viên có thể sửa lại bao nhiêu lần tùy ý (nếu TrangThai vẫn là CHUA_DUYET)
```

### **D. Quản Lý Chấm Điểm**

```
Quản lý vào trang "Chấm Điểm KPI"
  ↓
Hệ thống load DanhGiaNhiemVuThuongQuy của nhân viên
  ↓
Với mỗi tiêu chí:
  - IsMucDoHoanThanh = true:
    * Hiển thị DiemTuDanhGia (readonly, nếu có)
    * Input DiemQuanLy
    * Hiển thị preview: DiemDat = (DiemQuanLy × 2 + DiemTuDanhGia) / 3

  - IsMucDoHoanThanh = false:
    * Input DiemDat trực tiếp
  ↓
API: PUT /api/kpi/danh-gia-nhiem-vu/:id/quan-ly-cham-diem
  Body: {
    chiTietDiem: {
      "Mức độ hoàn thành công việc": 90,
      "Tiêu chí khác 1": 80,
      "Tiêu chí khác 2": 70
    }
  }
  ↓
Backend update:
  - IsMucDoHoanThanh = true → ChiTietDiem[0].DiemQuanLy = 90
  - IsMucDoHoanThanh = false → ChiTietDiem[i].DiemDat = giá trị nhập
  ↓
Quản lý có thể sửa lại bao nhiêu lần tùy ý (nếu TrangThai vẫn là CHUA_DUYET)
```

### **E. Duyệt Nhiệm Vụ (Tính Điểm Cuối Cùng)**

```
Quản lý/Admin click "Duyệt"
  ↓
API: PUT /api/kpi/danh-gia-nhiem-vu/:id/duyet
  ↓
Backend method duyet():

  1. Validate TrangThai === "CHUA_DUYET"

  2. Với mỗi tiêu chí trong ChiTietDiem:

     IF IsMucDoHoanThanh = true:
       diemNV = DiemTuDanhGia ?? 0
       diemQL = DiemQuanLy ?? diemNV

       DiemDat = (diemQL × 2 + diemNV) / 3

       DiemTuDanhGiaKhiDuyet = diemNV
       DiemQuanLyKhiDuyet = diemQL

       IF DiemTuDanhGia === null:
         GhiChu += "[Nhân viên không tự đánh giá]"

       IF DiemQuanLy === null:
         GhiChu += "[Quản lý chưa chấm, sử dụng điểm nhân viên]"

     ELSE:
       // Tiêu chí khác - giữ nguyên DiemDat đã nhập

  3. Tính lại TongDiemTieuChi:
     tongTang = Σ(DiemDat / 100) của tiêu chí TANG_DIEM
     tongGiam = Σ(DiemDat / 100) của tiêu chí GIAM_DIEM
     TongDiemTieuChi = tongTang - tongGiam

  4. Tính DiemNhiemVu:
     DiemNhiemVu = MucDoKho × TongDiemTieuChi

  5. Chốt trạng thái:
     TrangThai = "DA_DUYET"
     NgayDuyet = Date.now()
     NguoiDuyetID = nguoiDuyetId

  6. Lưu vào DB
  ↓
Update TongDiemKPI của DanhGiaKPI cha:
  TongDiemKPI = Σ(DiemNhiemVu của tất cả nhiệm vụ)
  ↓
HOÀN TẤT - Không thể sửa điểm nữa
```

### **F. Hủy Duyệt (Optional)**

```
Admin/Manager click "Hủy Duyệt"
  ↓
API: PUT /api/kpi/danh-gia-nhiem-vu/:id/huy-duyet
  Body: { lyDo: "Cần chỉnh sửa điểm" }
  ↓
Backend:
  TrangThai = "CHUA_DUYET"
  NgayDuyet = null
  NguoiDuyetID = null
  GhiChu += "\n[Hủy duyệt: {lyDo}]"
  ↓
Cho phép cả nhân viên và quản lý chấm điểm lại
```

---

## 📊 CÔNG THỨC TÍNH ĐIỂM

### **1. Tiêu chí "Mức độ hoàn thành công việc" (IsMucDoHoanThanh = true)**

```javascript
// Input
DiemTuDanhGia = 85  // Nhân viên tự chấm: 85%
DiemQuanLy = 90     // Quản lý chấm: 90%

// Tính toán (khi duyệt)
DiemDat = (DiemQuanLy × 2 + DiemTuDanhGia) / 3
        = (90 × 2 + 85) / 3
        = (180 + 85) / 3
        = 265 / 3
        = 88.33%

// Round to 2 decimals
DiemDat = 88.33
```

### **2. Xử lý trường hợp thiếu dữ liệu**

```javascript
// Case 1: Nhân viên không tự đánh giá
DiemTuDanhGia = null
DiemQuanLy = 90
→ DiemDat = (90 × 2 + 0) / 3 = 60
→ GhiChu += "[Nhân viên không tự đánh giá]"

// Case 2: Quản lý chưa chấm
DiemTuDanhGia = 85
DiemQuanLy = null
→ DiemDat = (85 × 2 + 85) / 3 = 85
→ GhiChu += "[Quản lý chưa chấm, sử dụng điểm nhân viên]"

// Case 3: Cả 2 chưa chấm
DiemTuDanhGia = null
DiemQuanLy = null
→ DiemDat = (0 × 2 + 0) / 3 = 0
→ GhiChu += "[Chưa có đánh giá]"
```

### **3. Tổng điểm nhiệm vụ**

```javascript
// Giả sử nhiệm vụ có MucDoKho = 7.5, có 3 tiêu chí:

ChiTietDiem = [
  {
    TenTieuChi: "Mức độ hoàn thành công việc",
    LoaiTieuChi: "TANG_DIEM",
    IsMucDoHoanThanh: true,
    DiemDat: 88.33  // Đã tính theo công thức trên
  },
  {
    TenTieuChi: "Độ chính xác",
    LoaiTieuChi: "TANG_DIEM",
    IsMucDoHoanThanh: false,
    DiemDat: 80  // Quản lý chấm trực tiếp
  },
  {
    TenTieuChi: "Vi phạm quy định",
    LoaiTieuChi: "GIAM_DIEM",
    IsMucDoHoanThanh: false,
    DiemDat: 10  // Quản lý chấm trực tiếp
  }
]

// Bước 1: Tính TongDiemTieuChi
tongTang = (88.33 + 80) / 100 = 1.6833
tongGiam = 10 / 100 = 0.1
TongDiemTieuChi = 1.6833 - 0.1 = 1.5833

// Bước 2: Tính DiemNhiemVu
DiemNhiemVu = MucDoKho × TongDiemTieuChi
            = 7.5 × 1.5833
            = 11.87
```

---

## 🗂️ DATABASE CHANGES

### **1. ChuKyDanhGia Collection**

#### Before:

```javascript
TieuChiCauHinh: [
  {
    TenTieuChi: String,
    LoaiTieuChi: String,
    GiaTriMin: Number,
    GiaTriMax: Number,
    DonVi: String,
    ThuTu: Number,
    GhiChu: String,
  },
];
```

#### After:

```javascript
TieuChiCauHinh: [
  {
    TenTieuChi: String,
    LoaiTieuChi: String,
    GiaTriMin: Number,
    GiaTriMax: Number,
    DonVi: String,
    ThuTu: Number,
    GhiChu: String,
    IsMucDoHoanThanh: Boolean, // ✅ NEW
  },
];
```

### **2. DanhGiaNhiemVuThuongQuy Collection**

#### Before:

```javascript
ChiTietDiem: [
  {
    TenTieuChi: String,
    LoaiTieuChi: String,
    DiemDat: Number,
    GiaTriMin: Number,
    GiaTriMax: Number,
    DonVi: String,
    ThuTu: Number,
    GhiChu: String
  }
],
TrangThai: {
  enum: ["Chua_TuDanhGia", "NhanVien_DaDanhGia", "Chua_Duyet", "Da_Duyet"]
}
```

#### After:

```javascript
ChiTietDiem: [
  {
    TenTieuChi: String,
    LoaiTieuChi: String,

    // ✅ NEW FIELDS
    DiemTuDanhGia: Number | null,
    DiemQuanLy: Number | null,
    DiemDat: Number,
    DiemTuDanhGiaKhiDuyet: Number | null,
    DiemQuanLyKhiDuyet: Number | null,
    IsMucDoHoanThanh: Boolean,

    GiaTriMin: Number,
    GiaTriMax: Number,
    DonVi: String,
    ThuTu: Number,
    GhiChu: String
  }
],
TrangThai: {
  enum: ["CHUA_DUYET", "DA_DUYET"]  // ✅ SIMPLIFIED
}
```

---

## 🔧 API ENDPOINTS

### **Backend Routes:**

```javascript
// Chu Kỳ Đánh Giá
POST   /api/workmanagement/chu-ky-danh-gia              // Tạo chu kỳ (auto-add tiêu chí FIXED)
PUT    /api/workmanagement/chu-ky-danh-gia/:id         // Cập nhật (giữ tiêu chí FIXED)
GET    /api/workmanagement/chu-ky-danh-gia             // Lấy danh sách
GET    /api/workmanagement/chu-ky-danh-gia/:id         // Lấy chi tiết
DELETE /api/workmanagement/chu-ky-danh-gia/:id         // Xóa mềm
PUT    /api/workmanagement/chu-ky-danh-gia/:id/dong    // Đóng chu kỳ
PUT    /api/workmanagement/chu-ky-danh-gia/:id/mo      // Mở lại chu kỳ

// Đánh Giá KPI
POST   /api/workmanagement/kpi/khoi-tao                // Khởi tạo DanhGiaKPI cho nhân viên
GET    /api/workmanagement/kpi/cua-toi                 // Lấy KPI của nhân viên đang login
PUT    /api/workmanagement/kpi/:id/duyet               // Duyệt KPI (tổng)
PUT    /api/workmanagement/kpi/:id/huy-duyet           // Hủy duyệt KPI

// ✅ NEW: Chấm điểm nhiệm vụ
PUT    /api/workmanagement/danh-gia-nhiem-vu/:id/nhan-vien-cham-diem  // Nhân viên tự chấm
PUT    /api/workmanagement/danh-gia-nhiem-vu/:id/quan-ly-cham-diem    // Quản lý chấm
PUT    /api/workmanagement/danh-gia-nhiem-vu/:id/duyet                // Duyệt nhiệm vụ
PUT    /api/workmanagement/danh-gia-nhiem-vu/:id/huy-duyet            // Hủy duyệt nhiệm vụ
```

---

## 📱 FRONTEND COMPONENTS

### **Chu Kỳ Đánh Giá:**

- `ChuKyDanhGiaList.js` - Danh sách chu kỳ
- `ChuKyDanhGiaView.js` - Chi tiết chu kỳ
- `ThongTinChuKyDanhGia.js` - Form tạo/sửa chu kỳ
- `TieuChiConfigSection.js` - Cấu hình tiêu chí (hiển thị FIXED read-only)

### **✅ NEW: Tự Đánh Giá KPI:**

- `TuDanhGiaKPIPage.js` - Trang nhân viên tự đánh giá
- `TuDanhGiaKPICard.js` - Card hiển thị 1 nhiệm vụ để tự đánh giá

### **✅ UPDATE: Chấm Điểm KPI:**

- `ChamDiemKPIDialog.js` - Dialog chấm điểm (hiển thị DiemTuDanhGia readonly)
- `TieuChiGrid.js` - Grid nhập điểm từng tiêu chí
- `KPIFormulaPreview.js` - Preview công thức tính điểm real-time

### **Redux:**

- `kpiSlice.js` - Redux slice với thunks mới:
  - `nhanVienChamDiem()`
  - `quanLyChamDiem()`
  - `duyetNhiemVu()`
  - `huyDuyetNhiemVu()`

---

## ✅ VALIDATION RULES

### **Backend:**

1. ✅ Mỗi chu kỳ phải có đúng 1 tiêu chí `IsMucDoHoanThanh = true`
2. ✅ Tiêu chí FIXED không được xóa/đổi tên
3. ✅ Không thể chấm điểm khi `TrangThai = DA_DUYET`
4. ✅ DiemTuDanhGia/DiemQuanLy phải trong khoảng GiaTriMin-GiaTriMax
5. ✅ Chỉ nhân viên của nhiệm vụ mới được tự chấm điểm

### **Frontend:**

1. ✅ Tiêu chí FIXED hiển thị read-only (Lock icon)
2. ✅ Disable input khi TrangThai = DA_DUYET
3. ✅ Validation range cho input điểm
4. ✅ Preview công thức real-time khi nhập điểm
5. ✅ Confirmation dialog trước khi duyệt

---

---

## 🔍 PHÂN TÍCH CODE HIỆN TẠI

### **Backend đã có:**

#### **Models:**

- ✅ `ChuKyDanhGia.js` - Schema với TieuChiCauHinh[] embedded

  - Fields: TenChuKy, Thang, Nam, NgayBatDau, NgayKetThuc, isDong, TieuChiCauHinh[]
  - **CẦN THÊM:** Field `IsMucDoHoanThanh` vào TieuChiCauHinh schema
  - Static method: `layChuKyDangMo()`
  - Pre-save validation: NgayBatDau < NgayKetThuc

- ✅ `DanhGiaKPI.js` - Schema đánh giá KPI tổng quan

  - **ĐÃ CÓ:** TrangThai enum, methods duyet()/huyDuyet()
  - Virtual populate: DanhSachDanhGiaNhiemVu

- ✅ `DanhGiaNhiemVuThuongQuy.js` - Schema đánh giá chi tiết từng nhiệm vụ

  - **ĐÃ CÓ:** ChiTietDiem[] embedded schema
  - **CẦN THÊM:** Fields mới (DiemTuDanhGia, DiemQuanLy, DiemXXKhiDuyet, IsMucDoHoanThanh)
  - **CẦN UPDATE:** Pre-save hooks để xử lý logic mới
  - **CẦN UPDATE:** Methods duyet()/huyDuyet() với logic tính điểm mới

- ✅ `NhanVienNhiemVu.js` - Schema gán nhiệm vụ theo chu kỳ
  - **ĐÃ CÓ:** ChuKyDanhGiaID, MucDoKho
  - **KHÔNG CẦN SỬA**

#### **Controllers:**

- ✅ `chuKyDanhGiaController.js` - CRUD chu kỳ

  - **ĐÃ CÓ:** layDanhSach(), layChuKyDangMo(), layChiTiet(), taoChuKy(), capNhat(), dongChuKy(), moChuKy()
  - **CẦN UPDATE:** taoChuKy() - Auto-add tiêu chí FIXED
  - **CẦN UPDATE:** capNhat() - Preserve tiêu chí FIXED

- ✅ `kpi.controller.js` - Đánh giá KPI
  - **ĐÃ CÓ:** Các API cơ bản cho DanhGiaKPI
  - **CẦN THÊM:**
    - `nhanVienChamDiem()` - API cho nhân viên tự chấm
    - `quanLyChamDiem()` - API cho quản lý chấm
    - `duyetNhiemVu()` - API duyệt nhiệm vụ với logic tính điểm mới
    - `huyDuyetNhiemVu()` - API hủy duyệt nhiệm vụ

#### **Routes:**

- ✅ `chu-ky-danh-gia.routes.js` - **KHÔNG CẦN SỬA**
- ✅ `kpi.routes.js` - **CẦN THÊM** routes mới cho chấm điểm

---

### **Frontend đã có:**

#### **Chu Kỳ Đánh Giá (ChuKyDanhGia folder):**

- ✅ `ChuKyDanhGiaList.js` - Danh sách chu kỳ với filter
- ✅ `ChuKyDanhGiaView.js` - Chi tiết chu kỳ + actions
- ✅ `ThongTinChuKyDanhGia.js` - Form tạo/sửa chu kỳ
  - **CẦN UPDATE:** Xử lý tiêu chí FIXED khi submit
- ✅ `TieuChiConfigSection.js` - Quản lý tiêu chí
  - **CẦN UPDATE:** Hiển thị tiêu chí FIXED read-only
- ✅ CRUD Buttons: Add/Update/Delete - **KHÔNG CẦN SỬA**

#### **Đánh Giá KPI (KPI folder):**

- ✅ `kpiSlice.js` - Redux slice chính

  - **ĐÃ CÓ:** getChuKyDanhGias, dongChuKy, moChuKy, duyetKPI, huyDuyetKPI
  - **CẦN THÊM:** Thunks mới (nhanVienChamDiem, quanLyChamDiem, duyetNhiemVu, huyDuyetNhiemVu)

- ✅ `v2/components/ChamDiemKPIDialog.js` - Dialog chấm điểm

  - **CẦN UPDATE:** Hiển thị DiemTuDanhGia (readonly), input DiemQuanLy cho tiêu chí IsMucDoHoanThanh=true
  - **CẦN UPDATE:** Preview công thức tính điểm real-time

- ✅ `v2/components/TieuChiGrid.js` - Grid nhập điểm

  - **CẦN UPDATE:** Logic input khác nhau cho tiêu chí IsMucDoHoanThanh=true vs false

- ✅ `v2/components/KPIHistoryDialog.js` - Lịch sử duyệt/hủy

  - **CẦN UPDATE:** Hiển thị snapshot DiemXXKhiDuyet

- ✅ `v2/pages/` - Các trang đánh giá KPI
  - **KHÔNG CẦN SỬA** (chỉ consume data từ Redux)

#### **Cần tạo mới:**

- ❌ `TuDanhGiaKPIPage.js` - Trang nhân viên tự đánh giá
- ❌ `TuDanhGiaKPICard.js` - Card hiển thị 1 nhiệm vụ để tự đánh giá
- ❌ `KPIFormulaPreview.js` - Component preview công thức (optional, có thể inline)

---

## 🚀 MIGRATION CHECKLIST

### **Phase 1: Backend Model Updates** ✅ COMPLETED (2024-10-26)

- [x] Update `ChuKyDanhGia` model: Thêm `IsMucDoHoanThanh` vào `tieuChiSchema`
- [x] Update `DanhGiaNhiemVuThuongQuy` model: Thêm fields mới vào `chiTietDiemSchema`
- [x] Implement `duyet()` và `huyDuyet()` methods
- [x] Thêm pre-save validation cho ChuKyDanhGia

### **Phase 2: Backend Controllers & Routes** ✅ COMPLETED (2024-10-26)

- [x] Update `chuKyDanhGiaController.createChuKy()` - Auto-add tiêu chí FIXED
- [x] Update `chuKyDanhGiaController.updateChuKy()` - Preserve tiêu chí FIXED
- [x] Create `kpiController.nhanVienChamDiem()`
- [x] Create `kpiController.quanLyChamDiem()`
- [x] Update `kpiController.duyetDanhGiaKPI()` - Call duyet() on all tasks
- [x] Update `kpiController.huyDuyetDanhGiaKPI()` - Call huyDuyet() on all tasks
- [x] Update routes

### **Phase 3: Database Migration** ⏭️ SKIPPED (per user confirmation)

- [~] No migration needed - new fields default to null
- [~] Existing cycles continue working without FIXED criterion
- [~] New cycles auto-create FIXED criterion from Phase 2

### **Phase 4: Frontend Components** 🔜 NEXT UP

- [ ] Update `TieuChiConfigSection.js` - Hiển thị tiêu chí FIXED read-only
- [ ] Update `ThongTinChuKyDanhGia.js` - Handle tiêu chí FIXED khi submit
- [ ] Create `TuDanhGiaKPIPage.js`
- [ ] Update `ChamDiemKPIDialog.js` - Hiển thị DiemTuDanhGia, input DiemQuanLy
- [ ] Create `KPIFormulaPreview.js` - Preview công thức
- [ ] Update `kpiSlice.js` - Thêm thunks mới

### **Phase 5: Testing**

- [ ] Test tạo chu kỳ mới (tiêu chí FIXED được auto-create)
- [ ] Test sửa chu kỳ (tiêu chí FIXED không bị xóa/sửa)
- [ ] Test nhân viên tự chấm điểm
- [ ] Test quản lý chấm điểm
- [ ] Test công thức tính điểm khi duyệt
- [ ] Test edge cases (null values)
- [ ] Test hủy duyệt
- [ ] Test permissions

### **Phase 6: Documentation & Deployment**

- [ ] Update API documentation
- [ ] Update user guide
- [ ] Code review
- [ ] Deploy to staging
- [ ] UAT testing
- [ ] Deploy to production

---

## 📝 NOTES & BEST PRACTICES

### **1. Tại sao tính điểm khi DUYỆT thay vì real-time?**

**Ưu điểm:**

- ✅ Linh hoạt: Cả 2 bên có thể sửa điểm song song
- ✅ Không blocking: Không cần workflow phức tạp
- ✅ Audit trail tốt: Snapshot rõ ràng tại thời điểm duyệt
- ✅ Edge case handling: Xử lý null values tự nhiên khi duyệt

### **2. Xử lý khi nhân viên không tự đánh giá**

```javascript
// Khi duyệt, nếu DiemTuDanhGia = null:
diemNV = 0
diemQL = DiemQuanLy ?? 0
DiemDat = (diemQL × 2 + 0) / 3

// Điểm sẽ thấp hơn → khuyến khích nhân viên tự đánh giá
// VD: DiemQuanLy = 90
//   → Nếu nhân viên tự đánh giá 90: DiemDat = 90
//   → Nếu nhân viên không đánh giá: DiemDat = 60
```

### **3. Tại sao có snapshot (DiemXXKhiDuyet)?**

- Lưu lại điểm tại thời điểm duyệt để audit
- Nếu có tranh chấp về điểm, có thể tra cứu lại
- Hỗ trợ cho tính năng xem lịch sử đánh giá

---

## 🎯 SUCCESS CRITERIA

✅ **Nghiệp vụ:**

- Mọi chu kỳ đều có tiêu chí "Mức độ hoàn thành công việc"
- Nhân viên có thể tự đánh giá tiêu chí này
- Quản lý có thể chấm điểm tất cả tiêu chí
- Điểm cuối cùng = (DiemQuanLy × 2 + DiemTuDanhGia) / 3
- Không ai có thể sửa điểm sau khi duyệt

✅ **Kỹ thuật:**

- Code tuân thủ pattern hiện có (Redux slice, form components)
- Validation đầy đủ backend + frontend
- API response time < 500ms
- No breaking changes cho data hiện tại

✅ **UX:**

- UI rõ ràng, dễ hiểu
- Preview công thức real-time
- Loading states & error handling tốt
- Mobile responsive

---

---

## ✅ QUYẾT ĐỊNH TRIỂN KHAI

### **1. Quy trình duyệt:**

- ✅ **QUYẾT ĐỊNH:** Duyệt toàn bộ KPI nhân viên cùng lúc (DanhGiaKPI.duyet() → auto duyệt tất cả nhiệm vụ con)
- ✅ **Lý do:** Giữ nguyên workflow hiện tại, không breaking change
- ✅ **Permissions:** Dựa vào role + KhoaID (như code hiện tại)

### **2. UI/UX nhân viên tự đánh giá:**

- ✅ **QUYẾT ĐỊNH:** Trang tự đánh giá CHỈ hiển thị tiêu chí "Mức độ hoàn thành công việc"
- ✅ **Lý do:** Đơn giản, focused, không làm nhân viên bối rối
- ✅ **Điểm quản lý:** KHÔNG hiển thị cho nhân viên (ẩn hoàn toàn)
- ✅ **Hiển thị:** Chỉ sau khi KPI được duyệt, nhân viên mới thấy điểm cuối cùng

### **3. Navigation & menu:**

- ✅ **QUYẾT ĐỊNH:** Thêm menu item "Tự Đánh Giá KPI" vào QuanLyCongViec/KPI
- ✅ **Show/hide:** Theo role (chỉ nhân viên thấy)

### **4. Permissions:**

- ✅ **QUYẾT ĐỊNH:** Nhân viên có thể sửa điểm tự đánh giá MIỄN LÀ chưa duyệt
- ✅ **Lý do:** Tính điểm cuối cùng khi duyệt, không ảnh hưởng

### **5. Migration data cũ:**

- ✅ **QUYẾT ĐỊNH:** KHÔNG cần migration script
- ✅ **Lý do:** Chỉ áp dụng cho chu kỳ mới tạo sau khi deploy
- ✅ **Xử lý:** Backend auto-add tiêu chí FIXED khi tạo chu kỳ mới

### **6. Edge cases:**

- ✅ **QUYẾT ĐỊNH:** Validation chặt backend + auto-heal khi load
- ✅ **Implementation:** Pre-save validation + static method kiểm tra consistency

### **7. UI/UX Strategy:**

- ✅ **QUYẾT ĐỊNH:** GIỮ NGUYÊN UI/UX hiện tại tối đa
- ✅ **Changes minimal:**
  - Thêm 1 trang mới cho nhân viên tự đánh giá
  - Update dialog chấm điểm của quản lý (thêm hiển thị DiemTuDanhGia readonly)
  - Update logic tính điểm khi duyệt
- ✅ **NO breaking changes:** Không sửa các component đang hoạt động ổn định

---

## 📞 CONTACT & SUPPORT

- **Product Owner:** [Tên người yêu cầu]
- **Technical Lead:** [Tên dev lead]
- **Document Version:** 1.0
- **Last Updated:** 26/10/2025

---

**END OF DOCUMENT**
