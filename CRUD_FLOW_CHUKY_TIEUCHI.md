# CRUD Flow - ChuKyDanhGia với TieuChiCauHinh

## 📋 Tổng Quan

Đã fix toàn bộ flow CRUD để TieuChiCauHinh được lưu và cập nhật đúng cách.

### ✅ Các File Đã Chỉnh Sửa

#### Backend (2 files)

1. **`modules/workmanagement/controllers/chuKyDanhGia.controller.js`**

   - ✅ `taoChuKy()` - Thêm TieuChiCauHinh vào create
   - ✅ `capNhat()` - Thêm TieuChiCauHinh vào update + markModified()
   - ✅ `getPreviousCriteria()` - Đã có sẵn

2. **`modules/workmanagement/routes/chuKyDanhGia.api.js`**
   - ✅ Route `/previous-criteria` - Đã có sẵn
   - ✅ POST `/` - Create route
   - ✅ PUT `/:id` - Update route

#### Frontend (2 files)

1. **`features/QuanLyCongViec/KPI/kpiSlice.js`**

   - ✅ `createChuKyDanhGia()` - Thêm console.log debug
   - ✅ `updateChuKyDanhGia()` - Thêm console.log debug
   - ✅ `getPreviousCriteria()` - Đã có sẵn

2. **`features/QuanLyCongViec/ChuKyDanhGia/ThongTinChuKyDanhGia.js`**
   - ✅ Form submit include `TieuChiCauHinh: tieuChiList` - Đã có sẵn
   - ✅ State management cho tiêu chí - Đã có sẵn

---

## 🔄 Complete CRUD Flow

### 1️⃣ CREATE Flow

```
User clicks "Thêm chu kỳ"
  ↓
AddChuKyDanhGiaButton opens ThongTinChuKyDanhGia
  ↓
User fills: TenChuKy, Thang, Nam, NgayBatDau, NgayKetThuc, MoTa
  ↓
User clicks "Copy từ chu kỳ trước" (optional)
  ↓
  → dispatch(getPreviousCriteria())
  → GET /workmanagement/chu-ky-danh-gia/previous-criteria
  → Backend: chuKyDanhGiaController.getPreviousCriteria()
  → Returns: { tieuChi: [...], chuKyName: "..." }
  → setTieuChiList(tieuChi)
  ↓
User adds/edits criteria in TieuChiConfigSection
  ↓
User clicks "Thêm mới"
  ↓
ThongTinChuKyDanhGia.handleFormSubmit()
  → Payload: { ...data, TieuChiCauHinh: tieuChiList }
  → console.log("🚀 Submitting ChuKy payload:", payload)
  ↓
dispatch(createChuKyDanhGia(payload))
  → console.log("🚀 Creating ChuKy with payload:", data)
  → POST /workmanagement/chu-ky-danh-gia
  ↓
Backend: chuKyDanhGiaController.taoChuKy()
  → Extract: TieuChiCauHinh from req.body
  → ChuKyDanhGia.create({ ..., TieuChiCauHinh: TieuChiCauHinh || [] })
  → Save to MongoDB
  ↓
Response: { chuKy: {..., TieuChiCauHinh: [...]} }
  ↓
Redux: createChuKyDanhGiaSuccess()
  ↓
Toast: "Tạo chu kỳ đánh giá thành công"
  ↓
dispatch(getChuKyDanhGias()) - Refresh list
```

### 2️⃣ UPDATE Flow

```
User clicks Edit icon on chu kỳ
  ↓
UpdateChuKyDanhGiaButton opens ThongTinChuKyDanhGia
  → item prop contains existing data (including TieuChiCauHinh)
  ↓
Form loads with:
  → defaultValues: { TenChuKy, Thang, Nam, NgayBatDau, NgayKetThuc, MoTa }
  → tieuChiList state: item.TieuChiCauHinh
  ↓
User edits criteria (add/update/delete)
  → TieuChiConfigSection updates tieuChiList state
  ↓
User clicks "Cập nhật"
  ↓
ThongTinChuKyDanhGia.handleFormSubmit()
  → Payload: { ...data, TieuChiCauHinh: tieuChiList }
  ↓
dispatch(updateChuKyDanhGia({ id: item._id, data: payload }))
  → console.log("🔄 Updating ChuKy:", id, "with payload:", data)
  → PUT /workmanagement/chu-ky-danh-gia/:id
  ↓
Backend: chuKyDanhGiaController.capNhat()
  → Extract: TieuChiCauHinh from req.body
  → if (Array.isArray(TieuChiCauHinh)) {
      chuKy.TieuChiCauHinh = TieuChiCauHinh;
      chuKy.markModified('TieuChiCauHinh'); // ← CRITICAL!
    }
  → chuKy.save()
  → MongoDB updates document with new TieuChiCauHinh
  ↓
Response: { chuKy: {..., TieuChiCauHinh: [...]} }
  ↓
Redux: updateChuKyDanhGiaSuccess()
  ↓
Toast: "Cập nhật chu kỳ đánh giá thành công"
  ↓
dispatch(getChuKyDanhGias()) - Refresh list
```

### 3️⃣ READ Flow

```
Component mounts → dispatch(getChuKyDanhGias())
  ↓
GET /workmanagement/chu-ky-danh-gia
  ↓
Backend: chuKyDanhGiaController.layDanhSach()
  → ChuKyDanhGia.find({ isDeleted: false })
  → Returns all chu kỳ including TieuChiCauHinh field
  ↓
Redux: getChuKyDanhGiasSuccess()
  → state.chuKyList = [...all cycles with TieuChiCauHinh...]
  ↓
Table displays cycles
  → Each row has UpdateButton with full item data
```

### 4️⃣ DELETE Flow

```
User clicks Delete icon
  ↓
Confirmation dialog
  ↓
dispatch(deleteChuKyDanhGia(id))
  → DELETE /workmanagement/chu-ky-danh-gia/:id
  ↓
Backend: chuKyDanhGiaController.xoa() (soft delete)
  → chuKy.isDeleted = true
  → chuKy.save()
  ↓
Redux: deleteChuKyDanhGiaSuccess()
  ↓
dispatch(getChuKyDanhGias()) - Refresh list
```

---

## 🔍 Debug Checklist

### Backend Verification

1. **Check console logs when creating:**

   ```bash
   # Terminal running backend
   🚀 Creating ChuKy with payload: { TenChuKy: "...", TieuChiCauHinh: [...] }
   ```

2. **Verify MongoDB:**

   ```javascript
   // MongoDB shell or Compass
   db.chukydanhgias.findOne({ TenChuKy: "Test Tháng 10" });
   // Should see TieuChiCauHinh array populated
   ```

3. **Check response:**
   ```javascript
   // Browser Network tab
   POST /workmanagement/chu-ky-danh-gia
   Response: { success: true, data: { chuKy: { TieuChiCauHinh: [...] } } }
   ```

### Frontend Verification

1. **Check console logs:**

   ```javascript
   // Browser Console
   🚀 Submitting ChuKy payload: { ..., TieuChiCauHinh: [...] }
   🚀 Creating ChuKy with payload: { ..., TieuChiCauHinh: [...] }
   ```

2. **Redux DevTools:**

   ```javascript
   // Action: createChuKyDanhGia
   Payload: { TieuChiCauHinh: [...] }

   // State after: state.kpi.chuKyList
   Should contain new chu kỳ with TieuChiCauHinh
   ```

3. **Form State:**
   ```javascript
   // React DevTools
   ThongTinChuKyDanhGia
     ├─ tieuChiList: [...] // Should update when adding/editing
     └─ onChange={setTieuChiList} // TieuChiConfigSection callback
   ```

---

## 🧪 Test Scenarios

### Scenario 1: Create New Chu Kỳ

1. Click "Thêm chu kỳ"
2. Fill: Tháng 10, Năm 2025, dates, etc.
3. Click "Copy từ chu kỳ trước"
   - ✅ Should populate criteria from previous cycle
4. Add new criterion: "Test criterion"
5. Click "Thêm mới"
6. **Expected:**
   - ✅ Console log: `🚀 Creating ChuKy with payload`
   - ✅ Toast: "Tạo chu kỳ đánh giá thành công"
   - ✅ List refreshes with new chu kỳ
   - ✅ MongoDB has TieuChiCauHinh field

### Scenario 2: Update Existing Chu Kỳ

1. Click Edit icon on existing chu kỳ
2. Form opens with existing criteria
3. Add/Edit/Delete criteria
4. Click "Cập nhật"
5. **Expected:**
   - ✅ Console log: `🔄 Updating ChuKy: <id> with payload`
   - ✅ Toast: "Cập nhật chu kỳ đánh giá thành công"
   - ✅ MongoDB updated with new TieuChiCauHinh
   - ✅ List refreshes showing updated data

### Scenario 3: Edit Opened Chu Kỳ (Should Fail)

1. Create chu kỳ with criteria
2. Đóng chu kỳ (isDong = true)
3. Try to edit
4. **Expected:**
   - ✅ Edit should work (only KPI approval prevents edit, not chu kỳ closure)
   - ❓ Or add validation if needed

---

## 🐛 Common Issues & Fixes

### Issue 1: TieuChiCauHinh Not Saving

**Symptom:** MongoDB has empty TieuChiCauHinh array

**Cause:** Backend not extracting TieuChiCauHinh from req.body

**Fix:** ✅ Added `TieuChiCauHinh` to destructuring in `taoChuKy()` and `capNhat()`

### Issue 2: Update Not Working

**Symptom:** Update returns success but MongoDB unchanged

**Cause:** Mongoose doesn't detect array changes automatically

**Fix:** ✅ Added `chuKy.markModified('TieuChiCauHinh')` in `capNhat()`

### Issue 3: Form Not Including Criteria

**Symptom:** API receives empty TieuChiCauHinh

**Cause:** Form not including tieuChiList in payload

**Fix:** ✅ Already fixed in ThongTinChuKyDanhGia.handleFormSubmit()

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│  Frontend: ThongTinChuKyDanhGia Form               │
│  State: tieuChiList = [...]                        │
└──────────────────┬──────────────────────────────────┘
                   │ onSubmit(payload)
                   │ payload = { ...data, TieuChiCauHinh: tieuChiList }
                   ▼
┌─────────────────────────────────────────────────────┐
│  Redux Action: createChuKyDanhGia(data)            │
│  → POST /chu-ky-danh-gia                           │
└──────────────────┬──────────────────────────────────┘
                   │ req.body includes TieuChiCauHinh
                   ▼
┌─────────────────────────────────────────────────────┐
│  Backend Controller: taoChuKy()                     │
│  const { TieuChiCauHinh, ... } = req.body          │
│  ChuKyDanhGia.create({ ..., TieuChiCauHinh })     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  MongoDB Document:                                  │
│  {                                                  │
│    TenChuKy: "Tháng 10/2025",                      │
│    TieuChiCauHinh: [                               │
│      { TenTieuChi: "...", LoaiTieuChi: "...", ... }│
│    ]                                                │
│  }                                                  │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Summary

### Changes Made

1. **Backend Controller:**

   - Added `TieuChiCauHinh` to `taoChuKy()` create payload
   - Added `TieuChiCauHinh` to `capNhat()` with `markModified()`

2. **Frontend Redux:**

   - Added debug console.log to `createChuKyDanhGia()`
   - Added debug console.log to `updateChuKyDanhGia()`

3. **Already Working:**
   - Form includes TieuChiCauHinh in payload ✅
   - TieuChiConfigSection manages state ✅
   - Routes configured correctly ✅
   - getPreviousCriteria endpoint exists ✅

### Next Steps

1. Test CREATE flow
2. Test UPDATE flow
3. Verify MongoDB has TieuChiCauHinh populated
4. Run migration script if needed
5. Remove console.log after confirming fix works

---

**Date:** October 15, 2025  
**Status:** ✅ Fixed - Ready for Testing
