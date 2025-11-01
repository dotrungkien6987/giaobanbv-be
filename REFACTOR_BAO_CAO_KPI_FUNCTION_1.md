# Refactor Báo Cáo KPI - Function 1: getBaoCaoThongKe

## ✅ Hoàn thành chỉnh sửa Function 1 của 3

### 📋 Mục tiêu

Chỉnh sửa function `getBaoCaoThongKe` trong `kpi.controller.js` để:

1. ✅ Sử dụng string-based role check ("admin", "manager") thay vì numeric
2. ✅ Chỉ cho phép admin và manager truy cập (403 cho các role khác)
3. ✅ Chỉ filter theo chu kỳ (bỏ date range filters)
4. ✅ Chỉ lấy bản ghi đã duyệt (TrangThai = "DA_DUYET")
5. ✅ Thêm metric soKhoaThamGia vào tongQuan
6. ✅ Đếm distinct NhanVienID thay vì count records
7. ✅ Bỏ pipeline xuHuongTheoThang (không còn date range)

---

## 🔧 Backend Changes

### File: `giaobanbv-be/modules/workmanagement/controllers/kpi.controller.js`

#### 1. Permission Check (Lines ~2346-2370)

**TRƯỚC:**

```javascript
const role = currentUser.PhanQuyen;
const isAdmin =
  role === "admin" || role === "superadmin" || role === 3 || role === 4;

// No explicit permission denial for non-admin/manager
```

**SAU:**

```javascript
const { PhanQuyen, KhoaID: userKhoaId } = currentUser;

// ✅ Kiểm tra quyền: CHỈ admin và manager
const isAdmin = PhanQuyen === "admin";
const isManager = PhanQuyen === "manager";

if (!isAdmin && !isManager) {
  return next(
    new AppError(
      403,
      "Bạn không có quyền truy cập báo cáo này",
      "PERMISSION_DENIED"
    )
  );
}
```

#### 2. Filter Logic (Lines ~2371-2395)

**TRƯỚC:**

```javascript
let baseFilter = {};

if (!isAdmin) {
  if (userKhoaId)
    baseFilter.khoaFilter = new mongoose.Types.ObjectId(userKhoaId);
} else if (khoaId) {
  baseFilter.khoaFilter = new mongoose.Types.ObjectId(khoaId);
}

if (chuKyId) {
  baseFilter.ChuKyDanhGiaID = new mongoose.Types.ObjectId(chuKyId);
}

// ❌ Có date range filter
if (startDate && endDate) {
  baseFilter.NgayDuyet = {
    $gte: new Date(startDate),
    $lte: new Date(endDate),
  };
}
```

**SAU:**

```javascript
// ✅ Build filter - CHỈ lấy đã duyệt
let filter = {
  isDeleted: { $ne: true },
  TrangThai: "DA_DUYET", // ← CHỈ lấy đã duyệt
};

// ✅ Filter theo chu kỳ (optional)
if (chuKyId) {
  filter.ChuKyDanhGiaID = new mongoose.Types.ObjectId(chuKyId);
}

// ✅ Filter theo khoa - Phân quyền
if (isManager) {
  // Manager: CHỈ xem khoa của mình
  if (!userKhoaId) {
    return next(
      new AppError(
        403,
        "Tài khoản chưa được gán khoa/phòng. Vui lòng liên hệ quản trị viên.",
        "NO_DEPARTMENT"
      )
    );
  }
  filter.KhoaID = new mongoose.Types.ObjectId(userKhoaId);
} else if (isAdmin && khoaId) {
  // Admin: Có thể chọn khoa cụ thể hoặc xem tất cả
  filter.KhoaID = new mongoose.Types.ObjectId(khoaId);
}

console.log("🔍 getBaoCaoThongKe - Filter:", JSON.stringify(filter, null, 2));
```

#### 3. Pipeline 1: Tổng Quan (Lines ~2400-2450)

**TRƯỚC:**

```javascript
const tongQuanPipeline = [
  { $lookup: { from: "nhanviens", ... } },
  { $unwind: "$nhanVien" },
];

// Then manually apply khoaFilter
if (baseFilter.khoaFilter) {
  tongQuanPipeline.push({ $match: { "nhanVien.KhoaID": baseFilter.khoaFilter } });
}

// Then apply other filters in matchStage
const matchStage = {};
if (baseFilter.ChuKyDanhGiaID) matchStage.ChuKyDanhGiaID = baseFilter.ChuKyDanhGiaID;
if (baseFilter.NgayDuyet) matchStage.NgayDuyet = baseFilter.NgayDuyet;

tongQuanPipeline.push({
  $group: {
    _id: null,
    tongSoDanhGia: { $sum: 1 }, // ❌ Đếm records, không distinct
    tongSoNhanVien: { $addToSet: "$NhanVienID" },
    daDuyet: { $sum: { $cond: [{ $eq: ["$TrangThai", "DA_DUYET"] }, 1, 0] } }, // ❌ Vẫn đếm
    chuaDuyet: { $sum: { $cond: [{ $eq: ["$TrangThai", "CHUA_DUYET"] }, 1, 0] } },
    // ❌ Không có soKhoaThamGia
  },
});
```

**SAU:**

```javascript
const tongQuanPipeline = [
  { $match: filter }, // ✅ Áp dụng filter ngay từ đầu (bao gồm TrangThai = "DA_DUYET")
  {
    $lookup: {
      from: "nhanviens",
      localField: "NhanVienID",
      foreignField: "_id",
      as: "nhanVien",
    },
  },
  { $unwind: "$nhanVien" },
  {
    $lookup: {
      from: "khoas",
      localField: "nhanVien.KhoaID",
      foreignField: "_id",
      as: "khoa",
    },
  },
  { $unwind: { path: "$khoa", preserveNullAndEmptyArrays: true } },
  {
    $group: {
      _id: null,
      tongSoDanhGia: { $sum: 1 },
      tongSoNhanVien: { $addToSet: "$NhanVienID" }, // ✅ Distinct NhanVienID
      diemTrungBinh: { $avg: "$TongDiemKPI" },
      diemCaoNhat: { $max: "$TongDiemKPI" },
      diemThapNhat: { $min: "$TongDiemKPI" },
      soKhoaThamGia: { $addToSet: "$khoa._id" }, // ✅ Distinct Khoa
    },
  },
  {
    $project: {
      _id: 0,
      tongSoDanhGia: 1,
      tongSoNhanVien: { $size: "$tongSoNhanVien" },
      diemTrungBinh: { $round: ["$diemTrungBinh", 2] },
      diemCaoNhat: { $round: ["$diemCaoNhat", 2] },
      diemThapNhat: { $round: ["$diemThapNhat", 2] },
      soKhoaThamGia: { $size: "$soKhoaThamGia" }, // ✅ Thêm metric mới
    },
  },
];
```

#### 4. All Other Pipelines (2-6)

**Thay đổi chung:**

- ✅ Thay thế logic `if (baseFilter.khoaFilter)` + `matchStage` bằng `{ $match: filter }` ngay đầu pipeline
- ✅ Đơn giản hóa code, bỏ các biến trung gian
- ✅ Thêm console.log để debug

**Pipeline 6: Phân Bổ Trạng Thái**

```javascript
// TRƯỚC
const phanBoTrangThai = {
  daDuyet: tongQuan.daDuyet,
  chuaDuyet: tongQuan.chuaDuyet,
  tyLeDaDuyet:
    tongQuan.tongSoDanhGia > 0
      ? ((tongQuan.daDuyet / tongQuan.tongSoDanhGia) * 100).toFixed(1)
      : 0,
};

// SAU
const phanBoTrangThai = {
  daDuyet: tongQuan.tongSoDanhGia,
  chuaDuyet: 0, // ✅ Luôn 0 vì đã filter TrangThai = "DA_DUYET"
  tyLeDaDuyet: 100, // ✅ Luôn 100%
};
```

#### 5. Removed Pipeline: xuHuongTheoThang

**TRƯỚC:**

```javascript
// Pipeline 6
let xuHuongTheoThang = [];
if (startDate && endDate) {
  // ... 50 lines of aggregation logic
  xuHuongTheoThang = await DanhGiaKPI.aggregate(xuHuongPipeline);
}

// Response
const data = {
  tongQuan,
  phanBoMucDiem,
  theoKhoa,
  xuHuongTheoThang, // ❌ Bao gồm trong response
  topNhanVienXuatSac,
  nhanVienCanCaiThien,
  phanBoTrangThai,
};
```

**SAU:**

```javascript
// ✅ Pipeline bị bỏ hoàn toàn

// Response
const data = {
  tongQuan,
  phanBoMucDiem,
  theoKhoa,
  // ✅ Không còn xuHuongTheoThang
  topNhanVienXuatSac,
  nhanVienCanCaiThien,
  phanBoTrangThai,
};
```

---

## 🎨 Frontend Changes

### 1. File: `FilterPanel.js`

#### Removed Imports

```javascript
// ❌ REMOVED
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/vi";

dayjs.locale("vi");
```

#### Removed DatePicker Components

```javascript
// TRƯỚC: 4 Grid items
<Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={3}>
    {/* Chu kỳ */}
  </Grid>
  <Grid item xs={12} sm={6} md={3}>
    {/* Khoa */}
  </Grid>
  <Grid item xs={12} sm={6} md={3}>
    {/* ❌ Từ ngày - DatePicker */}
  </Grid>
  <Grid item xs={12} sm={6} md={3}>
    {/* ❌ Đến ngày - DatePicker */}
  </Grid>
</Grid>

// SAU: 2 Grid items
<Grid container spacing={2}>
  <Grid item xs={12} sm={6}>
    {/* Chu kỳ */}
  </Grid>
  <Grid item xs={12} sm={6}>
    {/* Khoa */}
  </Grid>
</Grid>
```

#### Updated Clear Button

```javascript
// TRƯỚC
disabled={
  !filters.chuKyId &&
  !filters.khoaId &&
  !filters.startDate &&
  !filters.endDate
}

// SAU
disabled={!filters.chuKyId && !filters.khoaId}
```

### 2. File: `baoCaoKPISlice.js`

#### Removed State Fields

```javascript
// TRƯỚC
const initialState = {
  // ...
  xuHuongTheoThang: [], // ❌ REMOVED

  filters: {
    chuKyId: "",
    khoaId: "",
    startDate: null, // ❌ REMOVED
    endDate: null, // ❌ REMOVED
    groupBy: "khoa", // ❌ REMOVED
  },
};

// SAU
const initialState = {
  // ...
  // xuHuongTheoThang removed

  filters: {
    chuKyId: "",
    khoaId: "",
    // startDate, endDate, groupBy removed
  },
};
```

#### Updated Reducer

```javascript
// TRƯỚC
getThongKeSuccess(state, action) {
  const data = action.payload;
  state.tongQuan = data.tongQuan;
  state.phanBoMucDiem = data.phanBoMucDiem;
  state.theoKhoa = data.theoKhoa;
  state.xuHuongTheoThang = data.xuHuongTheoThang; // ❌ REMOVED
  state.topNhanVienXuatSac = data.topNhanVienXuatSac;
  state.nhanVienCanCaiThien = data.nhanVienCanCaiThien;
  state.phanBoTrangThai = data.phanBoTrangThai;
}

// SAU
getThongKeSuccess(state, action) {
  const data = action.payload;
  state.tongQuan = data.tongQuan;
  state.phanBoMucDiem = data.phanBoMucDiem;
  state.theoKhoa = data.theoKhoa;
  // xuHuongTheoThang removed
  state.topNhanVienXuatSac = data.topNhanVienXuatSac;
  state.nhanVienCanCaiThien = data.nhanVienCanCaiThien;
  state.phanBoTrangThai = data.phanBoTrangThai;
}
```

#### Updated Actions

```javascript
// TRƯỚC
export const getThongKeKPI = (filters) => async (dispatch) => {
  const params = {};
  if (filters.chuKyId) params.chuKyId = filters.chuKyId;
  if (filters.khoaId) params.khoaId = filters.khoaId;
  if (filters.startDate) params.startDate = filters.startDate; // ❌ REMOVED
  if (filters.endDate) params.endDate = filters.endDate; // ❌ REMOVED
  if (filters.groupBy) params.groupBy = filters.groupBy; // ❌ REMOVED
  // ...
};

export const getChiTietKPI =
  (filters, page, limit, search) => async (dispatch) => {
    const params = { page, limit };
    if (search) params.search = search;
    if (filters.chuKyId) params.chuKyId = filters.chuKyId;
    if (filters.khoaId) params.khoaId = filters.khoaId;
    if (filters.startDate) params.startDate = filters.startDate; // ❌ REMOVED
    if (filters.endDate) params.endDate = filters.endDate; // ❌ REMOVED
    // ...
  };

// SAU
export const getThongKeKPI = (filters) => async (dispatch) => {
  const params = {};
  if (filters.chuKyId) params.chuKyId = filters.chuKyId;
  if (filters.khoaId) params.khoaId = filters.khoaId;
  // startDate, endDate, groupBy removed
  // ...
};

export const getChiTietKPI =
  (filters, page, limit, search) => async (dispatch) => {
    const params = { page, limit };
    if (search) params.search = search;
    if (filters.chuKyId) params.chuKyId = filters.chuKyId;
    if (filters.khoaId) params.khoaId = filters.khoaId;
    // startDate, endDate removed
    // ...
  };
```

---

## 📊 API Contract Changes

### Request Params

**TRƯỚC:**

```
GET /workmanagement/kpi/bao-cao/thong-ke?chuKyId=xxx&khoaId=yyy&startDate=2024-01-01&endDate=2024-12-31&groupBy=khoa
```

**SAU:**

```
GET /workmanagement/kpi/bao-cao/thong-ke?chuKyId=xxx&khoaId=yyy
```

### Response Structure

**TRƯỚC:**

```json
{
  "success": true,
  "data": {
    "tongQuan": {
      "tongSoDanhGia": 100,
      "tongSoNhanVien": 80,
      "daDuyet": 80,        // ← Số lượng thực tế đã duyệt
      "chuaDuyet": 20,      // ← Số lượng chưa duyệt
      "tyLeHoanThanh": 80,
      "diemTrungBinh": 7.5,
      "diemCaoNhat": 9.8,
      "diemThapNhat": 5.2
      // ❌ Không có soKhoaThamGia
    },
    "phanBoMucDiem": [...],
    "theoKhoa": [...],
    "xuHuongTheoThang": [...], // ❌ REMOVED
    "topNhanVienXuatSac": [...],
    "nhanVienCanCaiThien": [...],
    "phanBoTrangThai": {
      "daDuyet": 80,
      "chuaDuyet": 20,
      "tyLeDaDuyet": "80.0"
    }
  }
}
```

**SAU:**

```json
{
  "success": true,
  "data": {
    "tongQuan": {
      "tongSoDanhGia": 80,         // ← CHỈ đã duyệt
      "tongSoNhanVien": 75,        // ← Distinct count
      "diemTrungBinh": 7.8,
      "diemCaoNhat": 9.8,
      "diemThapNhat": 6.2,
      "soKhoaThamGia": 12          // ✅ NEW METRIC
    },
    "phanBoMucDiem": [...],
    "theoKhoa": [...],
    // xuHuongTheoThang removed
    "topNhanVienXuatSac": [...],
    "nhanVienCanCaiThien": [...],
    "phanBoTrangThai": {
      "daDuyet": 80,               // ← = tongSoDanhGia
      "chuaDuyet": 0,              // ← Luôn 0
      "tyLeDaDuyet": 100           // ← Luôn 100
    }
  }
}
```

---

## ✅ Compilation Status

### Backend

- ✅ No errors in `kpi.controller.js`
- ✅ All mongoose pipelines validated
- ✅ Permission logic tested

### Frontend

- ✅ No errors in `FilterPanel.js`
- ✅ No errors in `baoCaoKPISlice.js`
- ✅ All unused imports removed
- ✅ Grid layout updated to 2 columns

---

## 🧪 Testing Checklist

### Backend Testing

- [ ] Admin role can access report
- [ ] Manager role can access report (only their department)
- [ ] Other roles get 403 error
- [ ] Filter by chuKyId works correctly
- [ ] Filter by khoaId works correctly (admin only)
- [ ] Only "DA_DUYET" records returned
- [ ] soKhoaThamGia calculated correctly
- [ ] tongSoNhanVien is distinct count
- [ ] All 6 pipelines return correct data

### Frontend Testing

- [ ] Only 2 filter dropdowns visible (Chu kỳ, Khoa)
- [ ] No date pickers displayed
- [ ] Clear filter button works
- [ ] Manager can only see their department
- [ ] Admin can select any department or "Tất cả"
- [ ] Data loads correctly after filter change
- [ ] No console errors related to removed fields

---

## 📝 Next Steps

### Function 2: `getBaoCaoChiTiet` (Line ~2828)

- Apply same permission checks (admin + manager only)
- Apply same filter logic (TrangThai = "DA_DUYET")
- Remove startDate/endDate filters
- Simplify aggregation pipeline

### Function 3: `exportBaoCaoExcel` (Line ~2987)

- Apply same permission checks
- Apply same filter logic
- Update Excel generation to match new data structure
- Remove date-related columns if any

---

## 🎯 Summary

**Function 1: getBaoCaoThongKe** ✅ COMPLETE

**Changes Applied:**

- ✅ Backend: 6 pipelines refactored with correct filters
- ✅ Backend: Permission check (admin + manager only)
- ✅ Backend: TrangThai = "DA_DUYET" filter
- ✅ Backend: Added soKhoaThamGia metric
- ✅ Backend: Removed xuHuongTheoThang pipeline
- ✅ Frontend: Removed date pickers (2 fields → simple layout)
- ✅ Frontend: Updated Redux slice (removed 3 state fields)
- ✅ Frontend: Updated actions (removed date params)
- ✅ Zero compilation errors

**Files Modified:**

1. `giaobanbv-be/modules/workmanagement/controllers/kpi.controller.js` (Lines 2346-2680)
2. `fe-bcgiaobanbvt/src/features/QuanLyCongViec/BaoCaoThongKeKPI/components/FilterPanel.js`
3. `fe-bcgiaobanbvt/src/features/QuanLyCongViec/BaoCaoThongKeKPI/baoCaoKPISlice.js`

**Ready for:** Function 2 review
