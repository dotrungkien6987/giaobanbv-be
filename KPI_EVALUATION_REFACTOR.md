# 🔄 KPI EVALUATION SYSTEM REFACTOR

**Date:** October 18, 2025  
**Status:** ✅ COMPLETED - Backend Implementation  
**Strategy:** Clean Slate (Old data dropped, fresh start)

---

## 📊 REFACTOR OVERVIEW

### What Changed

- **Model**: Simplified `DanhGiaNhiemVuThuongQuy` (removed old fields)
- **Controller**: Added 3 new simplified methods
- **Routes**: Added 3 new RESTful endpoints
- **Logic**: MucDoKho now taken from assignment (not template)

### What Stayed Same

- **UI/UX**: Frontend components unchanged (forms, tables, dialogs)
- **Workflow**: Manager selects cycle → evaluates employees → saves scores
- **Permissions**: validateQuanLy middleware still used

---

## 🗄️ DATABASE CHANGES

### Model: DanhGiaNhiemVuThuongQuy (SIMPLIFIED)

**File:** `modules/workmanagement/models/DanhGiaNhiemVuThuongQuy.js`

#### ❌ REMOVED Fields:

```javascript
DanhGiaKPIID              // ❌ No parent KPI record needed
ChiTietDiem[]             // ❌ Detailed criteria removed
TongDiemTieuChi           // ❌ Auto-calculated field removed
DiemNhiemVu               // ❌ Auto-calculated field removed
SoCongViecLienQuan        // ❌ Work count reference removed
```

#### ✅ NEW/UPDATED Fields:

```javascript
{
  // Core references (required)
  NhanVienID: ObjectId,              // Employee being evaluated
  NhiemVuThuongQuyID: ObjectId,      // Task template
  ChuKyDanhGiaID: ObjectId,          // ✅ REQUIRED (was optional)

  // Scores (0-10)
  DiemTuDanhGia: Number,             // Self-evaluation score
  DiemQuanLyDanhGia: Number,         // Manager evaluation score

  // ✅ NEW: Actual difficulty from assignment
  MucDoKho: Number (required, 1-10), // From NhanVienNhiemVu.MucDoKho

  // Metadata
  GhiChu: String,
  NgayDanhGia: Date,
  isDeleted: Boolean
}
```

#### ✅ UNIQUE INDEX:

```javascript
{
  NhanVienID: 1,
  NhiemVuThuongQuyID: 1,
  ChuKyDanhGiaID: 1
}
// Ensures 1 evaluation per task/employee/cycle
```

#### ✅ VIRTUAL FIELDS:

```javascript
DiemTrungBinh = (DiemTuDanhGia + DiemQuanLyDanhGia) / 2
DiemCoTrongSo = DiemTrungBinh × MucDoKho
```

---

## 🔧 BACKEND API

### Endpoint 1: Get Tasks for Evaluation

```http
GET /api/workmanagement/kpi/nhan-vien/:NhanVienID/nhiem-vu?chuKyId=xxx
```

**Purpose:** Fetch tasks assigned to employee in specific cycle

**Query Params:**

- `chuKyId` (required): Evaluation cycle ID

**Response:**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "assignment-id",
        "NhiemVuThuongQuyID": {
          "_id": "task-id",
          "TenNhiemVu": "Task A",
          "MoTa": "Description"
        },
        "MucDoKho": 7.5, // ✅ From assignment
        "DiemTuDanhGia": 8.0, // Existing score (if any)
        "DiemQuanLyDanhGia": 9.0, // Existing score (if any)
        "GhiChu": "Notes",
        "evaluationId": "eval-id" // null if not evaluated yet
      }
    ],
    "chuKy": {
      "_id": "cycle-id",
      "TenChuKy": "Q1/2025",
      "TuNgay": "2025-01-01",
      "DenNgay": "2025-03-31"
    }
  }
}
```

**Business Logic:**

1. Validate cycle ID (required)
2. Check manager permission (validateQuanLy middleware)
3. Query `NhanVienNhiemVu` filtered by:
   - NhanVienID
   - ChuKyDanhGiaID = chuKyId
   - isDeleted = false
4. Query existing evaluations from `DanhGiaNhiemVuThuongQuy`
5. Combine assignment + evaluation data
6. Return list with MucDoKho from assignment (not template)

---

### Endpoint 2: Save Evaluation

```http
POST /api/workmanagement/kpi/nhan-vien/:NhanVienID/danh-gia
```

**Purpose:** Save/update evaluation scores (batch upsert)

**Request Body:**

```json
{
  "chuKyId": "cycle-id",
  "evaluations": [
    {
      "assignmentId": "assignment-id",
      "DiemTuDanhGia": 8.0,
      "DiemQuanLyDanhGia": 9.0,
      "GhiChu": "Good performance"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "evaluations": [
      {
        "_id": "eval-id",
        "NhanVienID": "employee-id",
        "NhiemVuThuongQuyID": "task-id",
        "ChuKyDanhGiaID": "cycle-id",
        "DiemTuDanhGia": 8.0,
        "DiemQuanLyDanhGia": 9.0,
        "MucDoKho": 7.5, // ✅ Saved from assignment
        "GhiChu": "Good performance",
        "NgayDanhGia": "2025-10-18T..."
      }
    ]
  },
  "message": "Lưu đánh giá thành công"
}
```

**Business Logic:**

1. Validate cycle ID (required)
2. Check manager permission
3. Validate scores (0-10 range)
4. For each evaluation:
   - Find assignment by assignmentId
   - Verify assignment belongs to cycle
   - Extract MucDoKho from assignment
   - Upsert `DanhGiaNhiemVuThuongQuy`:
     ```javascript
     findOneAndUpdate(
       { NhanVienID, NhiemVuThuongQuyID, ChuKyDanhGiaID },
       { ...scores, MucDoKho: assignment.MucDoKho },
       { upsert: true, new: true }
     );
     ```
5. Return saved records

---

### Endpoint 3: Calculate KPI Score

```http
GET /api/workmanagement/kpi/nhan-vien/:NhanVienID/diem-kpi?chuKyId=xxx
```

**Purpose:** Calculate weighted average KPI score

**Query Params:**

- `chuKyId` (required): Evaluation cycle ID

**Response:**

```json
{
  "success": true,
  "data": {
    "DiemKPI": 8.35,
    "XepLoai": "Giỏi",
    "SoNhiemVuDanhGia": 5,
    "TongTrongSo": 37.5,
    "ChiTiet": [
      {
        "NhiemVu": "Task A",
        "DiemTuDanhGia": 8.0,
        "DiemQuanLyDanhGia": 9.0,
        "DiemTrungBinh": "8.50",
        "TrongSo": 7.5, // ✅ MucDoKho from evaluation
        "DiemCoTrongSo": "63.75"
      }
    ]
  }
}
```

**Formula:**

```
DiemKPI = Σ(DiemTrungBinh × MucDoKho) / Σ(MucDoKho)

Where:
- DiemTrungBinh = (DiemTuDanhGia + DiemQuanLyDanhGia) / 2
- MucDoKho = Actual difficulty from assignment (stored in evaluation)
```

**Classification:**

- `>= 9.0`: Xuất sắc
- `>= 8.0`: Giỏi
- `>= 7.0`: Khá
- `>= 5.0`: Trung bình
- `< 5.0`: Yếu

**Business Logic:**

1. Query all evaluations for employee + cycle
2. For each evaluation:
   - Calculate average score: (self + manager) / 2
   - Multiply by MucDoKho (weight)
3. Sum all weighted scores
4. Divide by sum of weights
5. Classify result

---

## 🎯 KEY IMPROVEMENTS

### Before Refactor (OLD)

```javascript
// ❌ Wrong: Used default difficulty from template
const MucDoKho = nhiemVu.NhiemVuThuongQuyID.MucDoKho; // Default: 5.0

// ❌ Wrong: No cycle filter
const tasks = await NhanVienNhiemVu.find({ NhanVienID });

// ❌ Wrong: Complex parent-child structure
DanhGiaKPI → DanhGiaNhiemVuThuongQuy[] → ChiTietDiem[]
```

### After Refactor (NEW)

```javascript
// ✅ Correct: Use actual difficulty from assignment
const MucDoKho = assignment.MucDoKho; // Adjusted: 7.5

// ✅ Correct: Filter by cycle
const tasks = await NhanVienNhiemVu.find({
  NhanVienID,
  ChuKyDanhGiaID: chuKyId
});

// ✅ Correct: Flat structure
DanhGiaNhiemVuThuongQuy (standalone records)
```

---

## 🧪 TESTING GUIDE

### Prerequisites

```bash
# Ensure data is fresh (old data dropped)
# Create test data:
1. ChuKyDanhGia (Q1/2025)
2. NhanVien (employee)
3. NhiemVuThuongQuy (task templates)
4. NhanVienNhiemVu (assignments with MucDoKho = 7.5)
5. QuanLyNhanVien (manager → employee, LoaiQuanLy = "KPI")
```

### Test Case 1: Get Tasks

```bash
GET /api/workmanagement/kpi/nhan-vien/66b1dba74f79822a4752d8f8/nhiem-vu?chuKyId=xxx
Authorization: Bearer <manager-token>

Expected:
✅ 200 OK
✅ tasks array with MucDoKho from assignments
✅ DiemTuDanhGia = null (not evaluated yet)
```

### Test Case 2: Save Evaluation

```bash
POST /api/workmanagement/kpi/nhan-vien/66b1dba74f79822a4752d8f8/danh-gia
Authorization: Bearer <manager-token>
Body: {
  "chuKyId": "xxx",
  "evaluations": [
    { "assignmentId": "yyy", "DiemTuDanhGia": 8, "DiemQuanLyDanhGia": 9 }
  ]
}

Expected:
✅ 200 OK
✅ DanhGiaNhiemVuThuongQuy created with MucDoKho = 7.5 (from assignment)
✅ Unique constraint works (no duplicates)
```

### Test Case 3: Calculate KPI

```bash
GET /api/workmanagement/kpi/nhan-vien/66b1dba74f79822a4752d8f8/diem-kpi?chuKyId=xxx
Authorization: Bearer <manager-token>

Expected:
✅ 200 OK
✅ DiemKPI calculated correctly: (8+9)/2 × 7.5 / 7.5 = 8.5
✅ XepLoai = "Giỏi" (>= 8.0)
```

### Test Case 4: Upsert (Update Existing)

```bash
# Save again with different scores
POST /api/workmanagement/kpi/nhan-vien/.../danh-gia
Body: { ...same assignmentId, different scores... }

Expected:
✅ 200 OK
✅ Existing record updated (not duplicated)
✅ DiemKPI recalculated with new scores
```

### Test Case 5: Permission Check

```bash
# Try with non-manager token
GET /api/workmanagement/kpi/nhan-vien/.../nhiem-vu?chuKyId=xxx
Authorization: Bearer <non-manager-token>

Expected:
❌ 403 Forbidden
❌ "Bạn không có quyền đánh giá KPI cho nhân viên này"
```

---

## 📋 FRONTEND CHANGES (MINIMAL)

### UI/UX: NO CHANGES

- Keep existing dialog, form, table
- Keep existing Redux slice structure
- Keep existing Material-UI components

### Code Changes: ONLY API CALLS

```javascript
// OLD: No cycle in API calls
dispatch(fetchTasks(employeeId));

// NEW: Always pass chuKyId
dispatch(fetchTasks(employeeId, chuKyId));
```

### Files to Update:

1. `kpiSlice.js` - Update thunks to pass chuKyId
2. `DanhGiaNhanVienPage.js` - Ensure cycle selected before opening dialog
3. `EvaluateDialog.js` - Pass chuKyId prop from parent

---

## 🚀 DEPLOYMENT CHECKLIST

### Backend

- [x] ✅ Update DanhGiaNhiemVuThuongQuy model
- [x] ✅ Add 3 new controller methods
- [x] ✅ Add 3 new routes
- [ ] ⏳ Restart server (indexes will auto-create)
- [ ] ⏳ Test APIs with Postman

### Frontend

- [ ] ⏳ Update kpiSlice.js
- [ ] ⏳ Update page components
- [ ] ⏳ Test UI flow

### Database

- [x] ✅ Old data dropped (confirmed by user)
- [ ] ⏳ Create test data with new schema
- [ ] ⏳ Verify indexes created

---

## 📊 EXPECTED RESULTS

### Data Flow (NEW)

```
1. Manager selects cycle Q1/2025
   ↓
2. Opens employee "Nguyễn Văn A"
   ↓
3. Frontend calls: GET /nhan-vien/:id/nhiem-vu?chuKyId=xxx
   ↓
4. Backend returns tasks with MucDoKho from assignments:
   Task A: 7.5 (not 5.0 default)
   Task B: 6.0 (not 5.0 default)
   ↓
5. Manager enters scores:
   Task A: Self=8.0, Manager=9.0
   Task B: Self=7.0, Manager=8.5
   ↓
6. Frontend calls: POST /nhan-vien/:id/danh-gia
   Body: { chuKyId, evaluations: [...] }
   ↓
7. Backend saves with MucDoKho from assignments
   ↓
8. Frontend calls: GET /nhan-vien/:id/diem-kpi?chuKyId=xxx
   ↓
9. Backend calculates:
   DiemKPI = [(8+9)/2 × 7.5 + (7+8.5)/2 × 6.0] / (7.5 + 6.0)
           = [63.75 + 46.5] / 13.5
           = 8.17
   XepLoai = "Giỏi"
```

---

## 🎯 MIGRATION NOTES

### For New Installations:

✅ No migration needed (fresh start)

### For Existing Systems:

⚠️ User confirmed old data will be dropped
⚠️ No backward compatibility needed
⚠️ Clean slate approach

---

## 📚 DOCUMENTATION

**Backend Files:**

- `modules/workmanagement/models/DanhGiaNhiemVuThuongQuy.js` (refactored)
- `modules/workmanagement/controllers/kpi.controller.js` (added 3 methods)
- `modules/workmanagement/routes/kpi.api.js` (added 3 routes)

**Documentation Files:**

- `KPI_EVALUATION_REFACTOR.md` (this file)

---

**Status:** ✅ Backend COMPLETE  
**Next:** Frontend updates (kpiSlice.js, components)
