# Backend Implementation - Delete Validation Fix

## 📋 Overview

Updated `chuKyDanhGia.controller.js` to implement cascade validation for delete operation.

---

## 🔧 Changes Made

### File: `controllers/chuKyDanhGia.controller.js`

#### Method: `xoa()` - DELETE /api/workmanagement/chu-ky-danh-gia/:id

**Before:**

```javascript
// Only check isDong status
if (!chuKy.isDong) {
  throw new AppError(400, "Không thể xóa chu kỳ đánh giá đang mở");
}
```

**After:**

```javascript
// Rule 1: Protect completed cycles (audit trail)
if (chuKy.isDong === true) {
  throw new AppError(
    400,
    "Không thể xóa chu kỳ đã hoàn thành. Chu kỳ này cần được lưu giữ để báo cáo và kiểm toán"
  );
}

// Rule 2: Check cascade - count related DanhGiaKPI
const { DanhGiaKPI } = require("../models");
const soDanhGia = await DanhGiaKPI.countDocuments({
  ChuKyID: id,
  isDeleted: { $ne: true },
});

if (soDanhGia > 0) {
  throw new AppError(
    400,
    `Không thể xóa chu kỳ đánh giá vì đã có ${soDanhGia} bản đánh giá liên quan. Vui lòng xóa các đánh giá trước hoặc liên hệ quản trị viên`
  );
}

// Rule 3: Auto-close if open but safe to delete
if (chuKy.isDong === false) {
  chuKy.isDong = true;
  await chuKy.save();
}

// Soft delete
chuKy.isDeleted = true;
await chuKy.save();
```

---

## 🎯 Business Rules

### Rule 1: Protect Audit Trail

- **Condition:** `isDong === true` (chu kỳ đã hoàn thành)
- **Action:** Reject with error
- **Reason:** Cần giữ lại lịch sử để kiểm toán và báo cáo

### Rule 2: Check Cascade

- **Condition:** Has related `DanhGiaKPI` records
- **Action:** Reject with error (include count in message)
- **Reason:** Có dữ liệu liên quan, không thể xóa

### Rule 3: Auto-Close

- **Condition:** `isDong === false` AND no related data
- **Action:** Set `isDong = true` before delete
- **Reason:** Đảm bảo consistency trước khi xóa

---

## 📊 Error Messages

### Old (Generic):

```
"Không thể xóa chu kỳ đánh giá đang mở"
```

### New (Specific):

```
1. "Không thể xóa chu kỳ đã hoàn thành. Chu kỳ này cần được lưu giữ để báo cáo và kiểm toán"

2. "Không thể xóa chu kỳ đánh giá vì đã có 5 bản đánh giá liên quan. Vui lòng xóa các đánh giá trước hoặc liên hệ quản trị viên"
```

**Benefits:**

- ✅ Clear reason for rejection
- ✅ Specific count of related records
- ✅ Actionable guidance for users

---

## 🧪 Testing

### Test Case 1: Delete Empty Cycle

```bash
# Setup
POST /chu-ky-danh-gia
{ Thang: 12, Nam: 2024, ... }

# Test
DELETE /chu-ky-danh-gia/:id

# Expected
Status: 200
Response: { success: true, message: "Xóa chu kỳ đánh giá thành công" }
Database: isDeleted = true, isDong = true
```

### Test Case 2: Delete Cycle with Evaluations

```bash
# Setup
POST /chu-ky-danh-gia (create cycle)
POST /kpi/danh-gia (create 3 evaluations)

# Test
DELETE /chu-ky-danh-gia/:id

# Expected
Status: 400
Response: {
  success: false,
  message: "Không thể xóa chu kỳ đánh giá vì đã có 3 bản đánh giá liên quan..."
}
Database: No changes
```

### Test Case 3: Delete Completed Cycle

```bash
# Setup
POST /chu-ky-danh-gia (create cycle)
PUT /chu-ky-danh-gia/:id/dong (complete cycle)

# Test
DELETE /chu-ky-danh-gia/:id

# Expected
Status: 400
Response: {
  success: false,
  message: "Không thể xóa chu kỳ đã hoàn thành..."
}
Database: No changes
```

---

## 🔍 Code Review Checklist

- [x] Logic follows 3-rule pattern
- [x] Error messages are clear and actionable
- [x] Uses soft delete (isDeleted = true)
- [x] Auto-close before delete if safe
- [x] Count query excludes deleted records
- [x] No breaking changes to API
- [x] Properly documented with comments

---

## 🚀 Deployment

### Prerequisites

- MongoDB with DanhGiaKPI model
- Existing ChuKyDanhGia records work as before

### Steps

```bash
cd giaobanbv-be
git pull
npm install  # if needed
npm start    # or your deployment command
```

### Verification

```bash
# Test API endpoint
curl -X DELETE http://localhost:5000/api/workmanagement/chu-ky-danh-gia/:id

# Check logs for new error messages
tail -f logs/app.log
```

---

## 📝 API Documentation

### DELETE /api/workmanagement/chu-ky-danh-gia/:id

**Description:** Xóa chu kỳ đánh giá (soft delete với cascade validation)

**Auth:** Required (Admin)

**Parameters:**

- `id` (path) - ID của chu kỳ cần xóa

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "chuKy": {
      "_id": "...",
      "isDeleted": true,
      "isDong": true,
      ...
    }
  },
  "message": "Xóa chu kỳ đánh giá thành công"
}
```

**Response Error (400) - Completed Cycle:**

```json
{
  "success": false,
  "message": "Không thể xóa chu kỳ đã hoàn thành. Chu kỳ này cần được lưu giữ để báo cáo và kiểm toán"
}
```

**Response Error (400) - Has Evaluations:**

```json
{
  "success": false,
  "message": "Không thể xóa chu kỳ đánh giá vì đã có 5 bản đánh giá liên quan. Vui lòng xóa các đánh giá trước hoặc liên hệ quản trị viên"
}
```

**Response Error (404):**

```json
{
  "success": false,
  "message": "Không tìm thấy chu kỳ đánh giá"
}
```

---

## 🔗 Related Files

- `models/ChuKyDanhGia.js` - Schema definition
- `models/DanhGiaKPI.js` - Related model for cascade check
- `routes/chuKyDanhGia.api.js` - Route definition
- Frontend: `fe-bcgiaobanbvt/src/features/QuanLyCongViec/ChuKyDanhGia/`

---

## 📚 Documentation

For frontend implementation and full documentation, see:

- [Frontend DELETE_VALIDATION.md](../../../fe-bcgiaobanbvt/src/features/QuanLyCongViec/ChuKyDanhGia/DELETE_VALIDATION.md)
- [Frontend CHANGELOG](../../../fe-bcgiaobanbvt/src/features/QuanLyCongViec/ChuKyDanhGia/CHANGELOG_DELETE_VALIDATION.md)

---

**Last Updated:** October 10, 2025  
**Status:** ✅ Implemented and Documented
