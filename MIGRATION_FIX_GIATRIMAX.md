# 🔧 Migration: Fix GiaTriMax Issue

## 🚨 Vấn Đề Phát Hiện

**Root Cause:**

- Model `TieuChiDanhGia` có `default: 10` cho `GiaTriMax` (SAI!)
- Controller có fallback `|| 10` (SAI!)
- Data cũ trong DB đã lưu với `GiaTriMax = 10`

**Impact:**

- Tất cả tiêu chí bị limit max = 10 thay vì 100
- Header hiển thị sai: "Tốc độ (0-10%)" thay vì "Tốc độ (0-100%)"
- User không nhập được > 10

---

## ✅ Đã Sửa Code

### 1. Model (`TieuChiDanhGia.js`)

```javascript
// TRƯỚC:
GiaTriMax: {
  type: Number,
  default: 10,  // ❌ SAI
}

// SAU:
GiaTriMax: {
  type: Number,
  default: 100, // ✅ ĐÚNG
}
```

### 2. Controller (`kpi.controller.js`)

```javascript
// TRƯỚC:
GiaTriMax: tc.GiaTriMax || 10, // ❌ SAI

// SAU:
GiaTriMax: tc.GiaTriMax || 100, // ✅ ĐÚNG
```

---

## 🔄 Migration Steps

### Step 1: Backup Database (Recommended)

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/your-db" --out=backup-before-migration
```

### Step 2: Fix TieuChiDanhGia Collection

```bash
cd d:/project/webBV/giaobanbv-be
node scripts/fix-tieuchi-giatrimax.js
```

**Tác dụng:**

- Tìm tất cả records có `GiaTriMax = 10`
- Update thành `GiaTriMax = 100`
- Hiển thị preview trước khi update
- Confirm (y/n) để chạy

**Output mẫu:**

```
✅ Connected to MongoDB

📊 Found 8 records with GiaTriMax = 10

🔍 Records to update:
  1. Tốc độ (TANG_DIEM) - Current: 0-10%
  2. Chất lượng (TANG_DIEM) - Current: 0-10%
  3. Thái độ (TANG_DIEM) - Current: 0-10%
  4. Sai sót (GIAM_DIEM) - Current: 0-10lỗi
  ...

⚠️  Update all to GiaTriMax = 100? (y/n): y

✅ Updated 8 records
✅ Migration complete!

✅ Updated records:
  1. Tốc độ - New: 0-100%
  2. Chất lượng - New: 0-100%
  ...
```

### Step 3: Fix DanhGiaNhiemVuThuongQuy.ChiTietDiem

```bash
node scripts/fix-chitietdiem-giatrimax.js
```

**Tác dụng:**

- Sync `ChiTietDiem` với `TieuChiDanhGia` đúng
- Update `GiaTriMin`, `GiaTriMax`, `DonVi`
- Tự động save

**Output mẫu:**

```
✅ Connected to MongoDB

📊 Loaded 8 TieuChiDanhGia records
📊 Found 156 DanhGiaNhiemVuThuongQuy records

  ⚠️  Tốc độ: 0-10% → 0-100%
  ⚠️  Chất lượng: 0-10% → 0-100%
  ⚠️  Sai sót: 0-10lỗi → 0-10lỗi (no change)
  ...

✅ Updated 156 DanhGiaNhiemVuThuongQuy records
✅ Migration complete!
```

### Step 4: Restart Backend

```bash
# Stop backend
Ctrl+C

# Start backend (loads new model default)
npm start
```

### Step 5: Clear Frontend Cache

```bash
cd d:/project/webBV/fe-bcgiaobanbvt

# Clear build cache
rm -rf node_modules/.cache
rm -rf build

# Rebuild
npm start
```

---

## 🧪 Verification

### 1. Check Database

```javascript
// MongoDB shell
use your-db;

// Check TieuChiDanhGia
db.tieuchidanhgia.find({ isDeleted: false }).pretty();
// Verify: GiaTriMax should be 100 (or custom values like 5, 10)

// Check DanhGiaNhiemVuThuongQuy
db.danhgianh iemvuthuongquy.findOne({ isDeleted: false });
// Verify: ChiTietDiem[].GiaTriMax should match TieuChiDanhGia
```

### 2. Test Frontend

**Test Case 1: Header Display**

```
Expected: "Tốc độ (0-100%)"
Actual: Check table header
```

**Test Case 2: Input Validation**

```
Tiêu chí: Tốc độ (max=100)
- Nhập 150 → Should clamp to 100 ✅
- Nhập 50 → Should accept ✅

Tiêu chí: Điểm sáng tạo (max=5)
- Nhập 10 → Should clamp to 5 ✅
- Nhập 3 → Should accept ✅
```

**Test Case 3: Calculation**

```
Tốc độ: 80 → +80/100 = +0.8 ✅
Sai sót: 5 → -5/100 = -0.05 ✅
Total: 0.8 - 0.05 = 0.75 ✅
```

---

## 📊 Impact Analysis

**Before Migration:**

- ❌ All tiêu chí limited to 0-10
- ❌ Header shows wrong range
- ❌ Calculation wrong (if GiaTriMax used in formula)

**After Migration:**

- ✅ Each tiêu chí has correct range
- ✅ Header shows correct range (0-100%, 0-5điểm, etc.)
- ✅ Validation works per tiêu chí
- ✅ Calculation correct (all divide by 100)

**Data Changed:**

- `TieuChiDanhGia`: ~8 records (estimate)
- `DanhGiaNhiemVuThuongQuy`: All records with ChiTietDiem
- `DanhGiaKPI`: No change (calculated field)

---

## ⚠️ Rollback (If Needed)

```bash
# Restore from backup
mongorestore --uri="mongodb://localhost:27017/your-db" backup-before-migration

# Revert code
git checkout HEAD~1 -- models/TieuChiDanhGia.js
git checkout HEAD~1 -- controllers/kpi.controller.js
```

---

## 📝 Notes

1. **Safe to run multiple times**: Scripts check before update
2. **No data loss**: Only updates `GiaTriMax`, `GiaTriMin`, `DonVi` fields
3. **DiemDat preserved**: User input scores not affected
4. **Custom ranges**: If tiêu chí has custom max (e.g., 5), it's preserved

---

## 🎯 Post-Migration TODO

- [ ] Run both migration scripts
- [ ] Restart backend
- [ ] Clear frontend cache
- [ ] Test on staging
- [ ] Notify users to refresh browser
- [ ] Monitor for errors
- [ ] Update documentation

---

**Created:** Current session  
**Priority:** 🔥 CRITICAL - Run before v2.1.1 deployment
