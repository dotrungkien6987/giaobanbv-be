# Fix ChiTietDiem Structure - KPI System

**Date:** October 14, 2025  
**Issue:** ChiTietDiem thiếu GiaTriMin/Max/DonVi, còn field TrongSo không dùng

---

## 🐛 Problem Report

### **User phát hiện cấu trúc SAI:**

```javascript
// ❌ OLD Structure (Thiếu fields)
ChiTietDiem: [
  {
    TieuChiID: "68ee0e4f0c4672d6b6b4817f",
    TenTieuChi: "Điểm sáng tạo",
    LoaiTieuChi: "TANG_DIEM",
    DiemDat: 0, // ✅ Cần giữ - User input
    TrongSo: 1, // ❌ Xóa - Không dùng
    // ❌ THIẾU: GiaTriMin, GiaTriMax, DonVi
  },
];
```

### **Expected Structure:**

```javascript
// ✅ NEW Structure (Đầy đủ)
ChiTietDiem: [
  {
    TieuChiID: "...",
    TenTieuChi: "Điểm sáng tạo",
    LoaiTieuChi: "TANG_DIEM",
    DiemDat: 0, // ✅ User nhập (0-5)
    GiaTriMin: 0, // ✅ Từ TieuChiDanhGia master
    GiaTriMax: 5, // ✅ Từ TieuChiDanhGia master
    DonVi: "điểm", // ✅ Từ TieuChiDanhGia master
    GhiChu: "",
  },
];
```

---

## ✅ Files Changed

### **1. Controller: kpi.controller.js**

**Location:** `modules/workmanagement/controllers/kpi.controller.js`

**Function:** `getChamDiemDetail` (Line 798-817)

**Changes:**

```javascript
// ✅ AFTER Fix
ChiTietDiem: tieuChiList.map((tc) => ({
  TieuChiID: tc._id,
  TenTieuChi: tc.TenTieuChi,
  LoaiTieuChi: tc.LoaiTieuChi,
  DiemDat: 0, // ✅ Keep - User input default
  GiaTriMin: tc.GiaTriMin, // ✅ Add - From master
  GiaTriMax: tc.GiaTriMax, // ✅ Add - From master
  DonVi: tc.DonVi, // ✅ Add - From master
  GhiChu: "",
}));
```

---

### **2. Model: DanhGiaNhiemVuThuongQuy.js**

**Location:** `modules/workmanagement/models/DanhGiaNhiemVuThuongQuy.js`

#### **A. Schema Definition (Line 32-77)**

**Changes:**

```javascript
ChiTietDiem: [
  {
    TieuChiID: {
      type: Schema.Types.ObjectId,
      ref: "TieuChiDanhGia",
      required: true,
    },
    TenTieuChi: { type: String, required: true },
    LoaiTieuChi: {
      type: String,
      enum: ["TANG_DIEM", "GIAM_DIEM"],
      required: true,
    },

    // ✅ Keep - User input
    DiemDat: { type: Number, required: true, default: 0 },

    // ✅ Add - Validation bounds from master
    GiaTriMin: { type: Number, required: true, default: 0 },
    GiaTriMax: { type: Number, required: true, default: 100 },
    DonVi: { type: String, default: "%" },

    GhiChu: { type: String, default: "" },

    // ❌ Remove - TrongSo (không dùng)

    _id: false,
  },
];
```

#### **B. Pre-save Hook (Line 122-140)**

**OLD Formula (WITH TrongSo):**

```javascript
const diemTang = this.ChiTietDiem.filter(
  (item) => item.LoaiTieuChi === "TANG_DIEM"
).reduce((sum, item) => sum + item.DiemDat * item.TrongSo, 0);

this.DiemNhiemVu = (this.MucDoKho * this.TongDiemTieuChi) / 100;
```

**NEW Formula (NO TrongSo):**

```javascript
const diemTang = this.ChiTietDiem.filter(
  (item) => item.LoaiTieuChi === "TANG_DIEM"
).reduce((sum, item) => sum + (item.DiemDat || 0) / 100, 0);

const diemGiam = this.ChiTietDiem.filter(
  (item) => item.LoaiTieuChi === "GIAM_DIEM"
).reduce((sum, item) => sum + (item.DiemDat || 0) / 100, 0);

this.TongDiemTieuChi = diemTang - diemGiam;
this.DiemNhiemVu = this.MucDoKho * this.TongDiemTieuChi;
```

#### **C. Method chamDiem (Line 172-202)**

**Changes:**

```javascript
// ❌ OLD - Thêm TrongSo
item.TrongSo = item.TrongSo || tieuChi.TrongSoMacDinh;

// ✅ NEW - Thêm GiaTriMin/Max/DonVi
item.GiaTriMin = tieuChi.GiaTriMin;
item.GiaTriMax = tieuChi.GiaTriMax;
item.DonVi = tieuChi.DonVi;
```

---

## 📐 Scoring Formula Change

### **OLD Formula (v2.1.1 - With TrongSo)**

```
DiemTieuChi = DiemDat × TrongSo
TongDiemTieuChi = Σ(TANG_DIEM) - Σ(GIAM_DIEM)
DiemNhiemVu = (MucDoKho × TongDiemTieuChi) / 100
```

**Example:**

```
DiemDat = 80, TrongSo = 1.5
DiemTieuChi = 80 × 1.5 = 120
DiemNhiemVu = (7.5 × 120) / 100 = 9
```

### **NEW Formula (v3.0 - No TrongSo)**

```
DiemTieuChi = (DiemDat / 100) × (LoaiTieuChi === "GIAM_DIEM" ? -1 : 1)
TongDiemTieuChi = Σ(DiemTieuChi)
DiemNhiemVu = MucDoKho × TongDiemTieuChi
```

**Example:**

```
DiemDat = 80, GiaTriMax = 100
DiemTieuChi = 80 / 100 = 0.8
DiemNhiemVu = 7.5 × 0.8 = 6
```

**Note:** Formula đã đồng bộ với frontend (kpiSlice.js line 328)

---

## 🧪 Testing Checklist

### **Backend Testing**

- [ ] **API Response Structure**

  ```bash
  curl GET /workmanagement/kpi/cham-diem-detail?chuKyId=xxx&nhanVienId=yyy

  # Verify response includes:
  {
    "nhiemVuList": [
      {
        "ChiTietDiem": [
          {
            "GiaTriMin": 0,    // ✅ Must exist
            "GiaTriMax": 100,  // ✅ Must exist
            "DonVi": "%",      // ✅ Must exist
            "DiemDat": 0       // ✅ Must exist
            // ❌ No TrongSo
          }
        ]
      }
    ]
  }
  ```

- [ ] **Database Schema**

  ```javascript
  // MongoDB shell
  db.danhgianhiemvuthuongquy.findOne({}, { ChiTietDiem: 1 });

  // Verify ChiTietDiem[0] has all 7 fields:
  // TieuChiID, TenTieuChi, LoaiTieuChi, DiemDat, GiaTriMin, GiaTriMax, DonVi
  ```

- [ ] **Calculation Formula**

  ```javascript
  // Create test data:
  // DiemDat = 80, GiaTriMax = 100, MucDoKho = 7.5

  // Expected:
  // TongDiemTieuChi = 0.8
  // DiemNhiemVu = 6.0 (NOT 9.0 with TrongSo)
  ```

### **Frontend Testing**

- [ ] **Header Display**

  ```
  Expected: "Điểm sáng tạo (0-5điểm)"
  NOT: "Điểm sáng tạo (undefined-undefinedđiểm)"
  ```

- [ ] **TextField Validation**

  ```javascript
  <TextField inputProps={{ min: 0, max: 5 }} />
  // User nhập 10 → clamp to 5
  ```

- [ ] **Redux State**
  ```javascript
  state.kpi.currentNhiemVuList[0].ChiTietDiem[0];
  // Must have: GiaTriMin, GiaTriMax, DonVi
  ```

---

## 🚀 Deployment Steps

### **Step 1: Backup Database**

```bash
mongodump --db hospitaldb --collection danhgianhiemvuthuongquy --out ./backup
```

### **Step 2: Deploy Code**

```bash
# Backend
cd giaobanbv-be
git pull
npm install  # If dependencies changed
pm2 restart backend

# Frontend (no changes needed)
```

### **Step 3: Clear Old Data (Optional)**

```javascript
// MongoDB shell - Xóa records cũ thiếu fields
db.danhgianhiemvuthuongquy.deleteMany({
  "ChiTietDiem.GiaTriMin": { $exists: false },
});

// Hoặc update thủ công nếu cần giữ data
db.danhgianhiemvuthuongquy.updateMany(
  { "ChiTietDiem.GiaTriMin": { $exists: false } },
  {
    $set: {
      "ChiTietDiem.$[].GiaTriMin": 0,
      "ChiTietDiem.$[].GiaTriMax": 100,
      "ChiTietDiem.$[].DonVi": "%",
    },
  }
);
```

### **Step 4: Verify**

```bash
# Test API
curl -X GET "http://localhost:5000/workmanagement/kpi/cham-diem-detail?chuKyId=xxx&nhanVienId=yyy"

# Check logs
pm2 logs backend --lines 50
```

---

## 📊 Impact Summary

### **Breaking Changes**

❌ **Scoring formula changed** - Old scores will differ:

- OLD: `DiemNhiemVu = 9.0` (with TrongSo = 1.5)
- NEW: `DiemNhiemVu = 6.0` (no TrongSo)

⚠️ **Action:** Notify users về formula change, re-evaluate existing KPIs if needed

### **Non-Breaking Changes**

✅ **Frontend compatible** - Codebase đã dùng `DiemDat` từ trước  
✅ **Validation improved** - GiaTriMin/Max giúp validate chính xác hơn  
✅ **UI display fixed** - Header sẽ hiển thị đúng range

---

## 🎯 Success Criteria

- [x] Backend controller tạo ChiTietDiem với 7 fields (không có TrongSo)
- [x] Model schema match với controller data structure
- [x] Pre-save hook tính điểm đúng công thức mới
- [x] Method chamDiem không reference TrongSo
- [ ] API response có đủ GiaTriMin/Max/DonVi
- [ ] Frontend header hiển thị đúng "TenTieuChi (min-maxđơn vị)"
- [ ] TextField validation hoạt động với min/max đúng
- [ ] Calculation frontend = backend (consistency)

---

## 📝 Notes

- `DiemDat` là **user input** - KHÔNG xóa!
- `TrongSo` đã xóa hoàn toàn (schema + logic)
- `GiaTriMin/Max/DonVi` copy từ TieuChiDanhGia master mỗi lần tạo DanhGiaNhiemVu
- Formula v3.0 đơn giản hơn, dễ hiểu hơn v2.1.1

**Next:** Test với real data và verify UI! 🚀
