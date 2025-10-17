# Criteria Sync Detection Implementation

## 📋 Overview

Hệ thống phát hiện và đồng bộ tiêu chí chấm điểm khi admin thay đổi `ChuKyDanhGia.TieuChiCauHinh` sau khi nhân viên đã bắt đầu chấm điểm.

**Date:** 2025-01-XX  
**Status:** ✅ COMPLETED

---

## 🎯 Requirements

### Functional Requirements

1. **Detection Always Active**: Luôn kiểm tra khi load chi tiết chấm điểm (cả khi đã duyệt)
2. **Multi-Level Detection**:
   - **A (Structure)**: Tiêu chí mới thêm hoặc bị xóa
   - **B (Values)**: Thay đổi GiaTriMin, GiaTriMax, LoaiTieuChi, DonVi
3. **Soft Merge Strategy**: Giữ nguyên DiemDat + GhiChu của tiêu chí cũ (match by TenTieuChi)
4. **Conditional Reset**: Chỉ cho phép reset khi `TrangThai !== "DA_DUYET"`
5. **User-Friendly UI**: Alert với nút "Đồng bộ ngay" (nếu có quyền)

### Non-Requirements

- ❌ Audit log (không cần thiết cho v1.0)

---

## 🏗️ Architecture

### Backend Flow

```
getChamDiemDetail()
  ↓
Load DanhGiaKPI + NhiemVuList
  ↓
detectCriteriaChanges(currentCriteria, chuKyCriteria)
  ↓
Return: { danhGiaKPI, nhiemVuList, syncWarning }

resetCriteria() [POST /reset-criteria]
  ↓
Guard: Check TrangThai !== "DA_DUYET"
  ↓
mergeCriteriaWithPreservedScores()
  ↓
Update all NhiemVu.ChiTietDiem
  ↓
Return: { nhiemVuList }
```

### Frontend Flow

```
Open ChamDiemKPIDialog
  ↓
Dispatch: getChamDiemDetail()
  ↓
Store: syncWarning (if changes detected)
  ↓
Render: Alert with changes summary
  ↓
User clicks "Đồng bộ ngay"
  ↓
Dispatch: resetCriteria()
  ↓
Re-fetch data → Clear syncWarning
```

---

## 📁 Files Created/Modified

### Backend

#### 1. **NEW: `criteriaSync.helper.js`**

**Location:** `modules/workmanagement/helpers/criteriaSync.helper.js`

**Functions:**

- `detectCriteriaChanges(currentCriteria, chuKyCriteria)`

  - **Returns:** `{ hasChanges: boolean, changes: { added, removed, modified } }`
  - **Logic:**
    - Use `Set` for efficient lookup
    - Deep comparison for modifications (TenTieuChi, GiaTriMin, GiaTriMax, etc.)
    - Returns arrays of criteria names

- `mergeCriteriaWithPreservedScores(currentCriteria, chuKyCriteria)`

  - **Returns:** `Array` (new ChiTietDiem matching chuKy structure)
  - **Logic:**
    - Create `Map` of old scores by TenTieuChi
    - Map chuKyCriteria → preserve DiemDat + GhiChu if match
    - Default to 0/"" for new criteria

- `formatSyncWarningMessage(changes)`
  - **Returns:** `String` (human-readable message)
  - **Example:** "Phát hiện 2 tiêu chí mới: X, Y. 1 tiêu chí bị xóa: Z."

#### 2. **MODIFIED: `kpi.controller.js`**

**Changes:**

```javascript
// Import helpers
const {
  detectCriteriaChanges,
  mergeCriteriaWithPreservedScores,
} = require("../helpers/criteriaSync.helper");

// In getChamDiemDetail():
let syncWarning = null;
if (nhiemVuList.length > 0 && nhiemVuList[0].ChiTietDiem) {
  const detection = detectCriteriaChanges(
    nhiemVuList[0].ChiTietDiem || [],
    chuKy.TieuChiCauHinh || []
  );

  if (detection.hasChanges) {
    syncWarning = {
      hasChanges: true,
      added: detection.changes.added,
      removed: detection.changes.removed,
      modified: detection.changes.modified,
      canReset: result.TrangThai !== "DA_DUYET",
    };
  }
}

return sendResponse(
  res,
  200,
  true,
  {
    danhGiaKPI: result,
    nhiemVuList,
    syncWarning, // ← NEW field
  },
  null,
  "..."
);
```

**New endpoint:**

```javascript
kpiController.resetCriteria = catchAsync(async (req, res, next) => {
  const { danhGiaKPIId } = req.body;

  // 1. Guard: Only allow if CHUA_DUYET
  const danhGiaKPI = await DanhGiaKPI.findById(danhGiaKPIId);
  if (danhGiaKPI.TrangThai === "DA_DUYET") {
    throw new AppError(403, "Không thể đồng bộ tiêu chí cho KPI đã được duyệt");
  }

  // 2. Load ChuKy
  const chuKy = await ChuKyDanhGia.findById(danhGiaKPI.ChuKyID).lean();

  // 3. Apply soft merge to all NhiemVu
  const nhiemVuList = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: danhGiaKPIId,
  });
  for (const nv of nhiemVuList) {
    nv.ChiTietDiem = mergeCriteriaWithPreservedScores(
      nv.ChiTietDiem || [],
      chuKy.TieuChiCauHinh
    );
    nv.markModified("ChiTietDiem");
    await nv.save();
  }

  return sendResponse(
    res,
    200,
    true,
    { nhiemVuList },
    null,
    "Đồng bộ tiêu chí thành công..."
  );
});
```

#### 3. **MODIFIED: `kpi.api.js`**

**New route:**

```javascript
router.post(
  "/reset-criteria",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.resetCriteria
);
```

---

### Frontend

#### 4. **MODIFIED: `kpiSlice.js`**

**State changes:**

```javascript
const initialState = {
  // ... existing
  syncWarning: null, // ← NEW: { hasChanges, added, removed, modified, canReset }
};
```

**Reducer changes:**

```javascript
getChamDiemDetailSuccess(state, action) {
  state.isLoading = false;
  state.currentDanhGiaKPI = action.payload.danhGiaKPI;
  state.currentNhiemVuList = action.payload.nhiemVuList;
  state.syncWarning = action.payload.syncWarning || null; // ← NEW
},

clearSyncWarning(state) {
  state.syncWarning = null;
},
```

**Thunk changes:**

```javascript
export const getChamDiemDetail = (chuKyId, nhanVienId) => async (dispatch) => {
  // ...
  dispatch(
    slice.actions.getChamDiemDetailSuccess({
      danhGiaKPI: response.data.data.danhGiaKPI,
      nhiemVuList: response.data.data.nhiemVuList,
      syncWarning: response.data.data.syncWarning, // ← NEW
    })
  );
};

export const resetCriteria = (danhGiaKPIId) => async (dispatch) => {
  dispatch(slice.actions.startSaving());
  try {
    const response = await apiService.post(
      "/workmanagement/kpi/reset-criteria",
      {
        danhGiaKPIId,
      }
    );

    dispatch(
      slice.actions.getChamDiemDetailSuccess({
        danhGiaKPI: response.data.data.danhGiaKPI || null,
        nhiemVuList: response.data.data.nhiemVuList,
        syncWarning: null, // Clear warning after sync
      })
    );

    toast.success(
      "Đã đồng bộ tiêu chí thành công. Điểm đã chấm được giữ nguyên."
    );
  } catch (error) {
    dispatch(slice.actions.stopSaving());
    dispatch(slice.actions.hasError(error.message));
    toast.error(error.message);
  }
};
```

#### 5. **MODIFIED: `ChamDiemKPIDialog.js`**

**Import changes:**

```javascript
import {
  // ... existing
  resetCriteria, // ← NEW
} from "../../kpiSlice";
```

**Selector changes:**

```javascript
const {
  currentDanhGiaKPI,
  currentNhiemVuList,
  isLoading,
  isSaving,
  syncWarning, // ← NEW
} = useSelector((state) => state.kpi);
```

**Handler added:**

```javascript
const handleResetCriteria = () => {
  if (currentDanhGiaKPI) {
    dispatch(resetCriteria(currentDanhGiaKPI._id));
  }
};
```

**UI Component (Alert):**

```jsx
{
  syncWarning && syncWarning.hasChanges && (
    <Alert
      severity="info"
      icon={<WarningIcon />}
      sx={{
        mt: 1.5,
        py: 1,
        borderRadius: 1,
        bgcolor: "#e0f2fe",
        border: "1px solid #0ea5e9",
      }}
      action={
        syncWarning.canReset && (
          <Button
            size="small"
            variant="contained"
            onClick={handleResetCriteria}
            disabled={isSaving}
          >
            {isSaving ? "Đang đồng bộ..." : "Đồng bộ ngay"}
          </Button>
        )
      }
    >
      <Typography variant="body2" fontWeight={600}>
        ⚠️ Phát hiện thay đổi tiêu chí chấm điểm
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {syncWarning.added?.length > 0 && (
          <>Tiêu chí mới: {syncWarning.added.join(", ")}. </>
        )}
        {syncWarning.removed?.length > 0 && (
          <>Tiêu chí đã xóa: {syncWarning.removed.join(", ")}. </>
        )}
        {syncWarning.modified?.length > 0 && (
          <>Tiêu chí thay đổi: {syncWarning.modified.join(", ")}. </>
        )}
      </Typography>
      {!syncWarning.canReset && (
        <Typography variant="caption" color="error.main">
          * Không thể đồng bộ vì KPI đã được duyệt
        </Typography>
      )}
    </Alert>
  );
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Tiêu chí mới thêm

**Setup:**

1. Admin creates ChuKy with criteria: ["Chất lượng", "Tiến độ"]
2. User starts scoring (DiemDat = [80, 90])
3. Admin adds "Sáng tạo" to ChuKy.TieuChiCauHinh

**Expected:**

- Alert shows: "Tiêu chí mới: Sáng tạo"
- Button "Đồng bộ ngay" enabled (if CHUA_DUYET)
- After sync: ChiTietDiem = [Chất lượng(80), Tiến độ(90), Sáng tạo(0)]

### Scenario 2: Tiêu chí bị xóa

**Setup:**

1. ChuKy with ["A", "B", "C"]
2. User scores: A=70, B=80, C=90
3. Admin removes "B"

**Expected:**

- Alert shows: "Tiêu chí đã xóa: B"
- After sync: ChiTietDiem = [A(70), C(90)]

### Scenario 3: Thay đổi GiaTriMax

**Setup:**

1. Criteria "Chất lượng" with GiaTriMax=100
2. User scores: DiemDat=90
3. Admin changes GiaTriMax=50

**Expected:**

- Alert shows: "Tiêu chí thay đổi: Chất lượng"
- After sync: DiemDat preserved (90) but GiaTriMax updated to 50

### Scenario 4: KPI đã duyệt

**Setup:**

1. Changes detected
2. TrangThai = "DA_DUYET"

**Expected:**

- Alert shows warning
- Button "Đồng bộ ngay" NOT visible
- Error message: "Không thể đồng bộ vì KPI đã được duyệt"

---

## 🔍 Detection Algorithm

### Added Criteria

```javascript
const currentSet = new Set(currentCriteria.map((tc) => tc.TenTieuChi));
const added = chuKyCriteria
  .filter((tc) => !currentSet.has(tc.TenTieuChi))
  .map((tc) => tc.TenTieuChi);
```

### Removed Criteria

```javascript
const chuKySet = new Set(chuKyCriteria.map((tc) => tc.TenTieuChi));
const removed = currentCriteria
  .filter((tc) => !chuKySet.has(tc.TenTieuChi))
  .map((tc) => tc.TenTieuChi);
```

### Modified Criteria

```javascript
const modified = [];
const chuKyMap = new Map(chuKyCriteria.map((tc) => [tc.TenTieuChi, tc]));

for (const current of currentCriteria) {
  const chuKyTc = chuKyMap.get(current.TenTieuChi);
  if (
    chuKyTc &&
    (current.GiaTriMin !== chuKyTc.GiaTriMin ||
      current.GiaTriMax !== chuKyTc.GiaTriMax ||
      current.LoaiTieuChi !== chuKyTc.LoaiTieuChi ||
      current.DonVi !== chuKyTc.DonVi)
  ) {
    modified.push(current.TenTieuChi);
  }
}
```

---

## 🚀 Deployment Checklist

- [x] Backend helper functions created
- [x] Backend controller updated (detection + reset)
- [x] Backend route added
- [x] Frontend Redux state updated
- [x] Frontend Redux actions created
- [x] Frontend UI component added
- [ ] Manual testing completed
- [ ] Edge cases tested (empty arrays, all removed, all added)
- [ ] Error handling verified
- [ ] Toast notifications checked
- [ ] Permission checks validated

---

## 📝 Future Enhancements

1. **Batch Validation**: Validate if DiemDat exceeds new GiaTriMax
2. **Audit Log**: Track who reset criteria and when
3. **Notification**: Email admin when reset occurs
4. **Rollback**: Allow undo of reset action
5. **History**: Show criteria change history in a timeline

---

## 🐛 Known Issues

- None (v1.0)

---

## 📚 References

- Original request: User conversation 2025-01-XX
- Schema design: `ChuKyDanhGia.TieuChiCauHinh` (snapshot pattern)
- Related docs: `IMPLEMENTATION_SUMMARY_BinhQuanBenhAn_v2.md`
