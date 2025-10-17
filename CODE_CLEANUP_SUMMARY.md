# Code Cleanup Summary - TieuChiCauHinh Schema Migration

**Date:** October 15, 2025  
**Purpose:** Remove deprecated TieuChiDanhGia master data pattern, use ChuKy.TieuChiCauHinh snapshot pattern only

---

## 🗑️ Files Removed/Archived

### 1. Migration Script (Archived)

- **File:** `scripts/migrateTieuChiToChuKy.js`
- **New Location:** `_backups/scripts/migrateTieuChiToChuKy.js.bak`
- **Reason:** Database will be cleaned, no migration needed for fresh start

### 2. Model (Deprecated but kept for reference)

- **File:** `modules/workmanagement/models/TieuChiDanhGia.js`
- **Status:** File exists but **NOT EXPORTED** from `models/index.js`
- **Reason:** May be needed for historical reference, but not used in code

---

## ✏️ Files Modified

### Backend (3 files)

#### 1. `modules/workmanagement/controllers/kpi.controller.js`

**Line 1-9: Removed TieuChiDanhGia import**

```javascript
// BEFORE
const {
  DanhGiaKPI,
  DanhGiaNhiemVuThuongQuy,
  TieuChiDanhGia, // ← REMOVED
  ChuKyDanhGia,
  ...
} = require("../models");

// AFTER
const {
  DanhGiaKPI,
  DanhGiaNhiemVuThuongQuy,
  ChuKyDanhGia,
  ...
} = require("../models");
```

**Line ~353: Changed ChiTietDiem matching logic**

```javascript
// BEFORE - Match by TieuChiID (ObjectId reference)
const chiTietMap = new Map(ChiTietDiem.map((c) => [c.TieuChiID.toString(), c]));
const updated = chiTietMap.get(tc.TieuChiID.toString());

// AFTER - Match by TenTieuChi (self-contained)
const chiTietMap = new Map(ChiTietDiem.map((c) => [c.TenTieuChi, c]));
const updated = chiTietMap.get(tc.TenTieuChi);
```

**Impact:**

- ✅ No more ObjectId references
- ✅ Simpler matching logic
- ✅ Works with snapshot data from ChuKy

---

#### 2. `modules/workmanagement/models/DanhGiaNhiemVuThuongQuy.js`

**Line ~175: Simplified chamDiem method**

```javascript
// BEFORE - Query TieuChiDanhGia to validate
danhGiaNhiemVuThuongQuySchema.methods.chamDiem = async function (
  chiTietDiem, mucDoKho, ghiChu
) {
  const TieuChiDanhGia = mongoose.model("TieuChiDanhGia");

  for (const item of chiTietDiem) {
    const tieuChi = await TieuChiDanhGia.findById(item.TieuChiID);

    if (!tieuChi) {
      throw new Error(`Tiêu chí ${item.TieuChiID} không tồn tại`);
    }

    if (item.DiemDat < tieuChi.GiaTriMin || item.DiemDat > tieuChi.GiaTriMax) {
      throw new Error(...);
    }

    // Copy data from TieuChiDanhGia
    item.LoaiTieuChi = tieuChi.LoaiTieuChi;
    item.TenTieuChi = tieuChi.TenTieuChi;
    // ...
  }
  // ...
};

// AFTER - Self-contained validation
danhGiaNhiemVuThuongQuySchema.methods.chamDiem = async function (
  chiTietDiem, mucDoKho, ghiChu
) {
  // No need to query TieuChiDanhGia - data already in chiTietDiem
  for (const item of chiTietDiem) {
    if (item.DiemDat < item.GiaTriMin || item.DiemDat > item.GiaTriMax) {
      throw new Error(
        `Điểm "${item.TenTieuChi}" phải từ ${item.GiaTriMin} đến ${item.GiaTriMax}`
      );
    }
  }
  // ...
};
```

**Impact:**

- ✅ No database queries needed for validation
- ✅ Faster performance
- ✅ Works offline with snapshot data

**Line ~220: Removed populate TieuChiID**

```javascript
// BEFORE
danhGiaNhiemVuThuongQuySchema.statics.layDanhSachTheoDanhGiaKPI = function (
  danhGiaKPIId
) {
  return this.find({ DanhGiaKPIID: danhGiaKPIId, isDeleted: false })
    .populate("NhiemVuThuongQuyID", "TenNhiemVu MoTa MucDoKho")
    .populate({
      path: "ChiTietDiem.TieuChiID", // ← REMOVED
      select: "TenTieuChi LoaiTieuChi GiaTriMin GiaTriMax",
    })
    .sort({ createdAt: 1 });
};

// AFTER
danhGiaNhiemVuThuongQuySchema.statics.layDanhSachTheoDanhGiaKPI = function (
  danhGiaKPIId
) {
  return (
    this.find({ DanhGiaKPIID: danhGiaKPIId, isDeleted: false })
      .populate("NhiemVuThuongQuyID", "TenNhiemVu MoTa MucDoKho")
      // No longer populate TieuChiID - ChiTietDiem is self-contained
      .sort({ createdAt: 1 })
  );
};
```

**Impact:**

- ✅ Fewer JOIN operations
- ✅ Faster queries
- ✅ ChiTietDiem has all needed data

---

#### 3. `modules/workmanagement/models/index.js`

**Line ~40: Commented out TieuChiDanhGia import**

```javascript
// BEFORE
const TieuChiDanhGia = require("./TieuChiDanhGia");
const ChuKyDanhGia = require("./ChuKyDanhGia");

// AFTER
// TieuChiDanhGia deprecated - now using ChuKy.TieuChiCauHinh
const ChuKyDanhGia = require("./ChuKyDanhGia");
```

**Line ~90: Removed from exports**

```javascript
// BEFORE
module.exports = {
  // ...
  TieuChiDanhGia,
  ChuKyDanhGia,
  // ...
};

// AFTER
module.exports = {
  // ...
  // TieuChiDanhGia removed - now using ChuKy.TieuChiCauHinh
  ChuKyDanhGia,
  // ...
};
```

**Impact:**

- ✅ TieuChiDanhGia not accessible from `require("../models")`
- ✅ Forces using ChuKy.TieuChiCauHinh pattern
- ✅ Prevents accidental use of deprecated model

---

## 🆕 Files Added

### 1. Cleanup Script

**File:** `scripts/cleanDatabaseForNewSchema.js`

**Purpose:** Drop old collections before testing new schema

**Usage:**

```bash
cd giaobanbv-be
node scripts/cleanDatabaseForNewSchema.js
```

**What it does:**

- ✅ Drops `danhgiakpis` collection
- ✅ Drops `danhgianhiemvuthuongquys` collection
- ✅ Drops `tieuchidanhgias` collection (old master data)
- ✅ Drops `chukydanhgias` collection (reset cycles)
- ✅ Preserves `nhanviens`, `nhiemvuthuongquys`, `khoas`, etc.
- ✅ Shows summary of what was deleted/preserved

**Safety Features:**

- 3-second countdown before execution
- Can press Ctrl+C to cancel
- Shows masked connection string (hides password)

---

## 📊 Impact Summary

### Code Removed

- ❌ 1 import statement (TieuChiDanhGia)
- ❌ 1 model export (TieuChiDanhGia)
- ❌ 2 populate statements (ChiTietDiem.TieuChiID)
- ❌ 1 async TieuChiDanhGia query in chamDiem method
- ❌ 1 migration script (archived)

### Code Simplified

- ✅ ChiTietDiem matching: `TieuChiID.toString()` → `TenTieuChi`
- ✅ Validation: Remove async query, use embedded data
- ✅ Static methods: Remove populate logic

### Performance Improvements

- ⚡ No more JOIN operations for TieuChiID
- ⚡ No more async queries in validation
- ⚡ Self-contained ChiTietDiem data

### Database Changes

- 🗄️ Removed collections: `tieuchidanhgias`, `danhgiakpis`, `danhgianhiemvuthuongquys`, `chukydanhgias`
- 🗄️ Preserved: All master data (nhanviens, nhiemvuthuongquys, khoas, users, datafixes)

---

## ✅ Testing Checklist

After cleanup, test these scenarios:

- [ ] Run cleanup script successfully
- [ ] Backend starts without errors
- [ ] Tạo chu kỳ mới với TieuChiCauHinh
- [ ] Edit chu kỳ và cập nhật tiêu chí
- [ ] Tạo KPI cho nhân viên (ChiTietDiem từ ChuKy)
- [ ] Chấm điểm nhiệm vụ
- [ ] Lưu và verify MongoDB
- [ ] Duyệt KPI (freeze)
- [ ] Try edit chu kỳ đã duyệt (should still allow)
- [ ] No errors in console
- [ ] No TieuChiID references in database

---

## 🚀 Next Development

### Immediate

1. Test all CRUD operations with new schema
2. Verify no errors in production-like environment
3. Update frontend if needed (should work as-is)

### Future Enhancements

1. Add migration tool for existing production data (if needed)
2. Consider archiving TieuChiDanhGia.js file entirely
3. Add automated tests for new flow

---

## 📝 Notes

### Why Keep TieuChiDanhGia.js File?

File still exists but not exported because:

- Historical reference for schema structure
- May need for data recovery/migration in production
- Can be deleted after confirming production is fully migrated

### Rollback Plan

If issues found:

1. Restore from `_backups/scripts/migrateTieuChiToChuKy.js.bak`
2. Re-export TieuChiDanhGia in `models/index.js`
3. Restore database from backup
4. Git revert commits

---

**Status:** ✅ Code cleanup complete, ready for testing  
**Breaking Changes:** ⚠️ Yes - requires database cleanup  
**Backward Compatible:** ❌ No - old data must be migrated or dropped
