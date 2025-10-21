# Implementation: Criteria-Based KPI Evaluation System

**Date:** December 2024  
**Status:** ✅ **IMPLEMENTED** - Backend & Frontend Integration Complete

---

## Overview

Implemented **criteria-based KPI evaluation system** that allows managers to score employees based on multiple evaluation criteria (tiêu chí) configured per evaluation cycle. This replaces the simplified 0-10 scoring with a sophisticated multi-level structure.

### Key Features

1. ✅ **Criteria Configuration per Cycle** - Each ChuKyDanhGia has TieuChiCauHinh array
2. ✅ **Task-Level Evaluation** - Each task (NhiemVu) scored across multiple criteria
3. ✅ **Criteria Types** - TANG_DIEM (positive points) and GIAM_DIEM (negative points)
4. ✅ **Formula-Based Calculation** - Auto-calculate scores using defined formula
5. ✅ **Existing UI Compatibility** - Works with existing v2 components (Accordion + nested tables)

---

## Data Structure

### ChuKyDanhGia (Evaluation Cycle)

```javascript
{
  _id: ObjectId,
  TenChuKy: "Tháng 1/2025",
  NgayBatDau: Date,
  NgayKetThuc: Date,
  TieuChiCauHinh: [
    {
      TenTieuChi: "Hoàn thành đúng hạn",
      LoaiTieuChi: "TANG_DIEM", // or "GIAM_DIEM"
      GiaTriMin: 0,
      GiaTriMax: 100,
      DonVi: "%",
      ThuTu: 1,
      GhiChu: "Tỷ lệ hoàn thành công việc đúng deadline"
    },
    // ... more criteria
  ]
}
```

### DanhGiaNhiemVuThuongQuy (Task Evaluation)

```javascript
{
  _id: ObjectId,
  NhanVienID: ObjectId,
  NhiemVuThuongQuyID: ObjectId,
  ChuKyDanhGiaID: ObjectId, // ✅ REQUIRED field
  MucDoKho: 5, // 1-10, difficulty weight
  ChiTietDiem: [
    {
      TenTieuChi: "Hoàn thành đúng hạn",
      LoaiTieuChi: "TANG_DIEM",
      GiaTriMin: 0,
      GiaTriMax: 100,
      DonVi: "%",
      DiemDat: 85, // ← Manager enters this (0-100)
      GhiChu: "Hoàn thành tốt hầu hết công việc"
    },
    // ... scores for other criteria
  ],
  TongDiemTieuChi: 75, // Calculated: Σ(TANG_DIEM) - Σ(GIAM_DIEM)
  DiemNhiemVu: 37.5, // Calculated: (MucDoKho × TongDiemTieuChi) / 100
}
```

### DanhGiaKPI (KPI Container)

```javascript
{
  _id: ObjectId,
  ChuKyID: ObjectId,
  NhanVienID: ObjectId,
  NguoiDanhGiaID: ObjectId,
  TongDiemKPI: 150.5, // Sum of all DiemNhiemVu
  TrangThai: "DA_DUYET", // "CHUA_DUYET" or "DA_DUYET"
  NgayDuyet: Date
}
```

---

## Calculation Formula

### Step 1: Calculate TongDiemTieuChi

```
TongDiemTieuChi = Σ(TANG_DIEM criteria scores) - Σ(GIAM_DIEM criteria scores)
```

**Example:**

- Hoàn thành đúng hạn (TANG_DIEM): 85
- Chất lượng công việc (TANG_DIEM): 90
- Số lỗi phát sinh (GIAM_DIEM): 10

```
TongDiemTieuChi = (85 + 90) - (10) = 165
```

### Step 2: Calculate DiemNhiemVu

```
DiemNhiemVu = (MucDoKho × TongDiemTieuChi) / 100
```

**Example:** If MucDoKho = 7

```
DiemNhiemVu = (7 × 165) / 100 = 11.55
```

### Step 3: Calculate TongDiemKPI

```
TongDiemKPI = Σ(DiemNhiemVu for all tasks)
```

---

## Backend Implementation

### New API Endpoints

#### 1. GET `/api/workmanagement/kpi/cham-diem-tieu-chi`

**Purpose:** Load evaluation detail with criteria for scoring

**Query Params:**

- `chuKyId` (required)
- `nhanVienId` (required)

**Response:**

```javascript
{
  success: true,
  data: {
    danhGiaKPI: { ... }, // Auto-created if not exists
    danhGiaNhiemVuList: [
      {
        _id: null, // null if new, ObjectId if exists
        NhanVienID: "...",
        NhiemVuThuongQuyID: { _id, TenNhiemVu, MoTa },
        ChuKyDanhGiaID: "...",
        MucDoKho: 5,
        ChiTietDiem: [
          {
            TenTieuChi: "Hoàn thành đúng hạn",
            LoaiTieuChi: "TANG_DIEM",
            GiaTriMin: 0,
            GiaTriMax: 100,
            DonVi: "%",
            DiemDat: 0, // Pre-filled from existing or default to 0
            GhiChu: ""
          },
          // ... other criteria from TieuChiCauHinh
        ],
        TongDiemTieuChi: 0,
        DiemNhiemVu: 0
      },
      // ... other tasks
    ],
    chuKy: { ... }
  }
}
```

**Key Logic:**

1. Validate manager has permission to evaluate employee
2. Load ChuKyDanhGia with TieuChiCauHinh
3. Load task assignments (NhanVienNhiemVu) filtered by ChuKyDanhGiaID
4. Load existing evaluations if any
5. Build ChiTietDiem array from TieuChiCauHinh, preserving existing scores

#### 2. POST `/api/workmanagement/kpi/duyet-kpi-tieu-chi/:danhGiaKPIId`

**Purpose:** Save criteria scores and approve KPI

**Body:**

```javascript
{
  nhiemVuList: [
    {
      _id: "...", // optional, for updates
      NhiemVuThuongQuyID: "...",
      MucDoKho: 5,
      ChiTietDiem: [
        {
          TenTieuChi: "Hoàn thành đúng hạn",
          LoaiTieuChi: "TANG_DIEM",
          DiemDat: 85,
          GhiChu: "Tốt",
        },
        // ... other criteria scores
      ],
    },
    // ... other tasks
  ];
}
```

**Response:**

```javascript
{
  success: true,
  data: {
    danhGiaKPI: {
      TongDiemKPI: 150.5,
      TrangThai: "DA_DUYET",
      NgayDuyet: "2024-12-15T..."
    },
    danhGiaNhiemVuList: [ ... ] // Saved evaluations
  }
}
```

**Key Logic:**

1. Validate all criteria scores are 0-100
2. For each task:
   - Calculate: `TongDiemTieuChi = Σ(TANG_DIEM) - Σ(GIAM_DIEM)`
   - Calculate: `DiemNhiemVu = (MucDoKho × TongDiemTieuChi) / 100`
   - Upsert DanhGiaNhiemVuThuongQuy with composite key (NhanVienID, NhiemVuThuongQuyID, ChuKyDanhGiaID)
3. Sum all DiemNhiemVu → TongDiemKPI
4. Update DanhGiaKPI: TongDiemKPI, TrangThai = "DA_DUYET", NgayDuyet

### Controller Methods

**File:** `modules/workmanagement/controllers/kpi.controller.js`

```javascript
// ✅ NEW: Criteria-based evaluation endpoints
kpiController.getChamDiemTieuChi = catchAsync(async (req, res, next) => {
  // ... implementation (lines 1214-1340)
});

kpiController.duyetKPITieuChi = catchAsync(async (req, res, next) => {
  // ... implementation (lines 1342-1437)
});
```

### Routes

**File:** `modules/workmanagement/routes/kpi.api.js`

```javascript
// ✅ CRITERIA-BASED KPI EVALUATION ROUTES (for v2 component)
router.get(
  "/cham-diem-tieu-chi",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.getChamDiemTieuChi
);

router.post(
  "/duyet-kpi-tieu-chi/:danhGiaKPIId",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.duyetKPITieuChi
);
```

---

## Frontend Integration

### Redux Slice Updates

**File:** `src/features/QuanLyCongViec/KPI/kpiSlice.js`

#### Updated Action: getChamDiemDetail

```javascript
export const getChamDiemDetail = (chuKyId, nhanVienId) => async (dispatch) => {
  dispatch(slice.actions.startLoading());
  try {
    // ✅ Changed endpoint to criteria-based version
    const response = await apiService.get(
      "/workmanagement/kpi/cham-diem-tieu-chi",
      {
        params: { chuKyId, nhanVienId },
      }
    );

    dispatch(
      slice.actions.getChamDiemDetailSuccess({
        danhGiaKPI: response.data.data.danhGiaKPI,
        nhiemVuList: response.data.data.danhGiaNhiemVuList,
        syncWarning: null,
      })
    );
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};
```

#### Updated Action: approveKPI

```javascript
export const approveKPI = (danhGiaKPIId) => async (dispatch, getState) => {
  const { currentNhiemVuList } = getState().kpi;

  // Validation: Check all tasks scored
  const unscoredTasks = currentNhiemVuList.filter(
    (nv) => nv.TongDiemTieuChi === 0
  );

  if (unscoredTasks.length > 0) {
    toast.error(`Còn ${unscoredTasks.length} nhiệm vụ chưa chấm điểm`);
    return;
  }

  dispatch(slice.actions.startSaving());
  try {
    // ✅ Prepare payload with criteria scores
    const nhiemVuList = currentNhiemVuList.map((nv) => ({
      _id: nv._id,
      NhiemVuThuongQuyID: nv.NhiemVuThuongQuyID?._id || nv.NhiemVuThuongQuyID,
      MucDoKho: nv.MucDoKho,
      ChiTietDiem: nv.ChiTietDiem,
    }));

    // ✅ Call new criteria-based endpoint
    const response = await apiService.post(
      `/workmanagement/kpi/duyet-kpi-tieu-chi/${danhGiaKPIId}`,
      { nhiemVuList }
    );

    dispatch(slice.actions.approveKPISuccess(response.data.data.danhGiaKPI));
    toast.success("Đã duyệt KPI thành công");
  } catch (error) {
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};
```

### Existing UI Components (No Changes Needed)

**The v2 components already support criteria-based scoring:**

1. **ChamDiemKPIDialog** - Main dialog with header, progress tracking
2. **ChamDiemKPITable** - Displays tasks with expandable criteria rows
3. Accordion structure for each task
4. Nested table for criteria with columns:
   - Tiêu chí (Criterion name)
   - Loại (TĂNG/GIẢM)
   - Điểm (0-100 input)
   - Ghi chú (Notes)

**Components Location:**

- `src/features/QuanLyCongViec/KPI/v2/components/ChamDiemKPIDialog.js`
- `src/features/QuanLyCongViec/KPI/v2/components/ChamDiemKPITable.js`

---

## Migration from Old Endpoint

### Before (Deprecated)

```javascript
GET /api/workmanagement/kpi/cham-diem?chuKyId=xxx&nhanVienId=yyy
```

**Issues:**

- ❌ Returns 410 Gone error
- ❌ Was trying to create DanhGiaNhiemVuThuongQuy without required ChuKyDanhGiaID
- ❌ Simple scoring (0-10 per task) not criteria-based

### After (New)

```javascript
GET /api/workmanagement/kpi/cham-diem-tieu-chi?chuKyId=xxx&nhanVienId=yyy
```

**Benefits:**

- ✅ Properly handles ChuKyDanhGiaID requirement
- ✅ Returns tasks with pre-populated ChiTietDiem from TieuChiCauHinh
- ✅ Supports criteria-based scoring (0-100 per criterion)
- ✅ Auto-calculates TongDiemTieuChi and DiemNhiemVu

---

## Testing Guide

### Prerequisites

1. Create ChuKyDanhGia with TieuChiCauHinh:

```javascript
{
  TenChuKy: "Test Cycle",
  TieuChiCauHinh: [
    { TenTieuChi: "Hoàn thành", LoaiTieuChi: "TANG_DIEM", GiaTriMax: 100 },
    { TenTieuChi: "Chất lượng", LoaiTieuChi: "TANG_DIEM", GiaTriMax: 100 },
    { TenTieuChi: "Lỗi", LoaiTieuChi: "GIAM_DIEM", GiaTriMax: 100 }
  ]
}
```

2. Assign tasks to employee:

```javascript
NhanVienNhiemVu.create({
  NhanVienID: "...",
  NhiemVuThuongQuyID: "...",
  ChuKyDanhGiaID: "...", // ← REQUIRED
  MucDoKho: 5,
});
```

3. Setup manager permission:

```javascript
QuanLyNhanVien.create({
  NhanVienQuanLy: "...",
  NhanVienDuocQuanLy: "...",
  LoaiQuanLy: "KPI",
});
```

### Test Flow

#### Step 1: Load Evaluation Detail

**Request:**

```
GET /api/workmanagement/kpi/cham-diem-tieu-chi?chuKyId=xxx&nhanVienId=yyy
Authorization: Bearer {token}
```

**Expected:**

- ✅ Returns danhGiaKPI (auto-created if not exists)
- ✅ Returns danhGiaNhiemVuList with tasks
- ✅ Each task has ChiTietDiem array matching TieuChiCauHinh
- ✅ Existing scores preserved if re-loading

#### Step 2: Enter Scores in UI

**Frontend Actions:**

1. Open ChamDiemKPIDialog
2. Expand task accordion
3. Enter scores for each criterion (0-100)
4. Verify real-time calculation:
   - TongDiemTieuChi = TANG - GIAM
   - DiemNhiemVu = (MucDoKho × TongDiem) / 100

#### Step 3: Approve KPI

**Request:**

```
POST /api/workmanagement/kpi/duyet-kpi-tieu-chi/xxx
Authorization: Bearer {token}
Content-Type: application/json

{
  "nhiemVuList": [
    {
      "NhiemVuThuongQuyID": "...",
      "MucDoKho": 5,
      "ChiTietDiem": [
        { "TenTieuChi": "Hoàn thành", "LoaiTieuChi": "TANG_DIEM", "DiemDat": 85 },
        { "TenTieuChi": "Chất lượng", "LoaiTieuChi": "TANG_DIEM", "DiemDat": 90 },
        { "TenTieuChi": "Lỗi", "LoaiTieuChi": "GIAM_DIEM", "DiemDat": 10 }
      ]
    }
  ]
}
```

**Expected:**

- ✅ Validates scores are 0-100
- ✅ Calculates TongDiemTieuChi = 85 + 90 - 10 = 165
- ✅ Calculates DiemNhiemVu = (5 × 165) / 100 = 8.25
- ✅ Updates DanhGiaKPI.TongDiemKPI (sum of all tasks)
- ✅ Sets TrangThai = "DA_DUYET"
- ✅ Sets NgayDuyet

#### Step 4: Verify Results

**Query Database:**

```javascript
// Check DanhGiaNhiemVuThuongQuy
db.danhgianhanvuthuongquy.find({
  NhanVienID: "...",
  ChuKyDanhGiaID: "...",
});

// Verify:
// - ChiTietDiem array has all criteria with DiemDat
// - TongDiemTieuChi calculated correctly
// - DiemNhiemVu calculated correctly

// Check DanhGiaKPI
db.danhgiakpi.findOne({ _id: "..." });

// Verify:
// - TongDiemKPI = sum of all DiemNhiemVu
// - TrangThai = "DA_DUYET"
// - NgayDuyet is set
```

---

## Error Handling

### Common Errors

#### 1. "ChuKyDanhGiaID is required"

**Cause:** Trying to save DanhGiaNhiemVuThuongQuy without ChuKyDanhGiaID

**Solution:** ✅ Fixed - new endpoints always include ChuKyDanhGiaID from cycle selection

#### 2. "Chu kỳ này chưa có cấu hình tiêu chí"

**Cause:** ChuKyDanhGia.TieuChiCauHinh is empty

**Solution:** Add criteria to cycle configuration before evaluating

#### 3. "Điểm tiêu chí phải từ 0 đến 100"

**Cause:** Invalid score input

**Solution:** Frontend validation ensures inputs are within range

#### 4. "Còn X nhiệm vụ chưa chấm điểm"

**Cause:** Attempting to approve KPI with unscored tasks

**Solution:** Score all tasks before clicking approve button

---

## Files Modified

### Backend

1. ✅ **kpi.controller.js** (+250 lines)

   - Added `getChamDiemTieuChi()`
   - Added `duyetKPITieuChi()`

2. ✅ **kpi.api.js** (+30 lines)
   - Added route: `GET /cham-diem-tieu-chi`
   - Added route: `POST /duyet-kpi-tieu-chi/:danhGiaKPIId`

### Frontend

3. ✅ **kpiSlice.js** (~40 lines modified)
   - Updated `getChamDiemDetail()` to call new endpoint
   - Updated `approveKPI()` to send criteria scores

### Documentation

4. ✅ **IMPLEMENTATION_CRITERIA_BASED_KPI.md** (this file)

---

## Summary

### What Was Implemented

✅ **Backend:**

- New endpoint to load evaluation with criteria from TieuChiCauHinh
- New endpoint to save criteria scores and approve KPI
- Formula-based calculation (TANG_DIEM - GIAM_DIEM × MucDoKho)
- Proper handling of ChuKyDanhGiaID requirement

✅ **Frontend:**

- Redux actions updated to use new criteria-based endpoints
- Compatible with existing v2 UI components
- No UI changes needed (components already support criteria scoring)

✅ **Data Flow:**

1. Manager selects cycle → Frontend loads tasks with criteria
2. Manager enters scores (0-100) for each criterion
3. Frontend calculates real-time preview
4. On approve → Backend validates, calculates, saves
5. DanhGiaKPI updated with TongDiemKPI and DA_DUYET status

### Next Steps

1. **Testing:** E2E flow with real data
2. **Documentation:** Update API docs with new endpoints
3. **Training:** Inform managers about criteria-based scoring
4. **Monitoring:** Track formula calculations for accuracy

---

**Implementation Date:** December 15, 2024  
**Implemented By:** AI Assistant  
**Status:** ✅ Ready for Testing
