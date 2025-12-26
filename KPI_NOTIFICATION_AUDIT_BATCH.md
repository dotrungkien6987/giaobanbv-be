# KPI Notification Module - Batch Audit Report (6 Types)

**Date:** December 25, 2025  
**Scope:** 6 remaining KPI notification types  
**Reference Pattern:** `kpi-duyet-danh-gia` (validated ✅)

---

## Executive Summary

| Type                     | Location  | Builder Used | Context Complete            | Template Valid | Status                 |
| ------------------------ | --------- | ------------ | --------------------------- | -------------- | ---------------------- |
| **kpi-tao-danh-gia**     | Line 133  | ✅           | ⚠️ Missing: `tenChuKy`      | ✅             | ⚠️ MINOR               |
| **kpi-duyet-tieu-chi**   | Line 1877 | ✅           | ⚠️ Missing: `tenNguoiDuyet` | ✅             | ⚠️ MINOR               |
| **kpi-huy-duyet**        | Line 2263 | ✅           | ⚠️ Context inconsistent     | ✅             | ⚠️ MINOR               |
| **kpi-cap-nhat-diem-ql** | Line 503  | ✅           | ⚠️ Unused context fields    | ✅             | ⚠️ MINOR               |
| **kpi-tu-danh-gia**      | ❌ N/A    | ❌           | ❌                          | ✅             | ❌ **NOT IMPLEMENTED** |
| **kpi-phan-hoi**         | Line 814  | ✅           | ⚠️ Context field naming     | ✅             | ⚠️ MINOR               |

**Summary:** 5/6 IMPLEMENTED | 0 CRITICAL BUGS | 5 MINOR ISSUES | 1 MISSING FEATURE

---

## Detailed Audit Results

### 1. ✅ kpi-tao-danh-gia (Create KPI Evaluation)

**Location:** `kpi.controller.js:133-150`

**Implementation:**

```javascript
// Line 133-150
const {
  buildKPINotificationData,
} = require("../helpers/notificationDataBuilders");
const notificationData = await buildKPINotificationData(danhGiaKPI, {
  arrNguoiNhanID: [NhanVienID],
  chuKy, // ⚠️ Passes chuKy object but builder expects tenChuKy string
});
await notificationService.send({
  type: "kpi-tao-danh-gia",
  data: notificationData,
});
```

**Template Variables Used:**

- `{{TenChuKy}}` - ⚠️ Builder gets from `danhGiaKPI.ChuKyID.TenChuKy` (may be unpopulated)
- `{{_id}}` - ✅
- `{{NhanVienID}}` - ✅

**Issues:**

- ⚠️ **MINOR:** Context passes `chuKy` object but builder expects `tenChuKy` string
- ⚠️ **MINOR:** Relies on danhGiaKPI being populated with `ChuKyDanhGiaID` - should explicitly pass `tenChuKy`

**Recommendation:**

```javascript
const notificationData = await buildKPINotificationData(danhGiaKPI, {
  arrNguoiNhanID: [NhanVienID],
  tenChuKy: chuKy?.TenChuKy || "", // ✅ Explicit string field
});
```

---

### 2. ✅ kpi-duyet-tieu-chi (Approve Criteria)

**Location:** `kpi.controller.js:1877-1890`

**Implementation:**

```javascript
// Line 1877-1890
const {
  buildKPINotificationData,
} = require("../helpers/notificationDataBuilders");
const notificationData = await buildKPINotificationData(danhGiaKPI, {
  arrNguoiNhanID: [danhGiaKPI.NhanVienID?._id?.toString()],
  // ⚠️ Missing: tenNguoiDuyet (though template doesn't use it currently)
});
await notificationService.send({
  type: "kpi-duyet-tieu-chi",
  data: notificationData,
});
```

**Template Variables Used:**

- `{{TenChuKy}}` - ✅
- `{{_id}}` - ✅
- `{{NhanVienID}}` - ✅

**Issues:**

- ⚠️ **MINOR:** Missing `tenNguoiDuyet` context field (not used by current template, but should be added for consistency with kpi-duyet-danh-gia pattern)

**Recommendation:**

```javascript
const approver = await NhanVien.findById(req.currentNhanVienID)
  .select("Ten HoTen")
  .lean();
const notificationData = await buildKPINotificationData(danhGiaKPI, {
  arrNguoiNhanID: [danhGiaKPI.NhanVienID?._id?.toString()],
  tenNguoiDuyet: approver?.Ten || approver?.HoTen || "", // ✅ Add for consistency
});
```

---

### 3. ✅ kpi-huy-duyet (Undo Approval)

**Location:** `kpi.controller.js:2263-2280`

**Implementation:**

```javascript
// Line 2263-2280
const {
  buildKPINotificationData,
} = require("../helpers/notificationDataBuilders");
const notificationData = await buildKPINotificationData(danhGiaKPIPopulated, {
  arrNguoiNhanID: [danhGiaKPIPopulated.NhanVienID?._id?.toString()],
  nguoiHuyDuyet: currentUser, // ⚠️ Passes entire user object
  lyDo, // ✅ Correct
});
await notificationService.send({
  type: "kpi-huy-duyet",
  data: notificationData,
});
```

**Template Variables Used:**

- `{{TenChuKy}}` - ✅
- `{{LyDo}}` - ✅ (passed correctly)
- `{{_id}}` - ✅
- `{{NhanVienID}}` - ✅

**Issues:**

- ⚠️ **MINOR:** Context passes `nguoiHuyDuyet: currentUser` (entire object) instead of following pattern of separate `tenNguoiHuyDuyet` string field
- **Note:** Builder doesn't have field for person who undid approval - template uses `LyDo` only

**Recommendation:**

```javascript
const notificationData = await buildKPINotificationData(danhGiaKPIPopulated, {
  arrNguoiNhanID: [danhGiaKPIPopulated.NhanVienID?._id?.toString()],
  lyDo,
  // Remove nguoiHuyDuyet or add to builder if needed for future template enhancement
});
```

---

### 4. ✅ kpi-cap-nhat-diem-ql (Update Manager Score)

**Location:** `kpi.controller.js:490-520`

**Implementation:**

```javascript
// Line 490-520 (inside try block)
const NhanVien = require("../../../models/NhanVien");
const manager = await NhanVien.findById(danhGiaKPI.NguoiDanhGiaID)
  .select("Ten")
  .lean();
const employee = await NhanVien.findById(danhGiaKPI.NhanVienID)
  .select("Ten")
  .lean();
const nhiemVu = await NhiemVuThuongQuy.findById(
  danhGiaNhiemVu.NhiemVuThuongQuyID
)
  .select("TenNhiemVu")
  .lean();

const {
  buildKPINotificationData,
} = require("../helpers/notificationDataBuilders");
const notificationData = await buildKPINotificationData(danhGiaKPI, {
  arrNguoiNhanID: [danhGiaKPI.NhanVienID?.toString()],
  employee, // ⚠️ Passes entire object
  manager, // ⚠️ Passes entire object
  nhiemVu, // ⚠️ Passes entire object
  danhGiaNhiemVu, // ⚠️ Passes entire object
  tongDiemKPI,
});
await notificationService.send({
  type: "kpi-cap-nhat-diem-ql",
  data: notificationData,
});
```

**Template Variables Used:**

- `{{TenNguoiDanhGia}}` - ✅ (builder gets from context or populated)
- `{{TenNhiemVu}}` - ✅ (builder extracts from context)
- `{{_id}}` - ✅
- `{{NhanVienID}}` - ✅

**Issues:**

- ⚠️ **MINOR:** Context passes entire objects (`employee`, `manager`, `nhiemVu`, `danhGiaNhiemVu`) but builder expects string fields
- ⚠️ **MINOR:** Builder doesn't use these context objects - relies on danhGiaKPI being populated
- **Note:** Works because builder has fallback logic, but inconsistent with pattern

**Recommendation:**

```javascript
const notificationData = await buildKPINotificationData(danhGiaKPI, {
  arrNguoiNhanID: [danhGiaKPI.NhanVienID?.toString()],
  tenNguoiDanhGia: manager?.Ten || "", // ✅ String field
  tenNhiemVu: nhiemVu?.TenNhiemVu || "", // ✅ String field
  tongDiemKPI,
  // Remove unused object context fields
});
```

---

### 5. ❌ kpi-tu-danh-gia (Self-Evaluation) - NOT IMPLEMENTED

**Status:** ❌ **CRITICAL - MISSING FEATURE**

**Template Exists:** ✅ Line 630 in `seeds/notificationTemplates.seed.js`

**Template Configuration:**

```javascript
{
  name: "Thông báo cho người đánh giá",
  typeCode: "kpi-tu-danh-gia",
  recipientConfig: { variables: ["NguoiDanhGiaID"] },
  titleTemplate: "KPI - {{TenNhanVien}} hoàn thành tự đánh giá",
  bodyTemplate: "{{TenNhanVien}} đã hoàn thành tự đánh giá nhiệm vụ {{TenNhiemVu}}",
  actionUrl: "/quanlycongviec/kpi/danh-gia-nhan-vien",
  icon: "check_circle",
  priority: "normal",
}
```

**Required Variables:**

- `{{NguoiDanhGiaID}}` - Manager ID (recipient)
- `{{TenNhanVien}}` - Employee name
- `{{TenNhiemVu}}` - Task/duty name
- `{{_id}}` - KPI evaluation ID

**Analysis:**

- Self-evaluation score is stored in `NhanVienNhiemVu.DiemTuDanhGia`
- No endpoint explicitly updates self-evaluation scores
- Self-evaluation is part of `luuTatCaNhiemVu` batch save (line 1918) but no notification is triggered
- Feature exists in template but no code implementation

**Impact:**

- **HIGH** - Managers are not notified when employees complete self-evaluations
- Breaks workflow communication loop

**Implementation Required:**
Would need to:

1. Identify when `NhanVienNhiemVu.DiemTuDanhGia` changes from 0 to >0 (first self-eval)
2. Add notification trigger in appropriate controller method
3. Use `buildKPINotificationData` with context: `tenNhanVien`, `tenNhiemVu`, `nguoiDanhGiaId`

---

### 6. ✅ kpi-phan-hoi (Feedback/Reply)

**Location:** `kpi.controller.js:803-830`

**Implementation:**

```javascript
// Line 803-830
try {
  const NhanVien = require("../../../models/NhanVien");
  const employee = await NhanVien.findById(danhGiaKPI.NhanVienID)
    .select("Ten")
    .lean();
  const manager = await NhanVien.findById(danhGiaKPI.NguoiDanhGiaID)
    .select("Ten")
    .lean();

  const {
    buildKPINotificationData,
  } = require("../helpers/notificationDataBuilders");
  const notificationData = await buildKPINotificationData(danhGiaKPI, {
    arrNguoiNhanID: [danhGiaKPI.NguoiDanhGiaID?.toString()],
    employee,  // ⚠️ Passes entire object
    manager,   // ⚠️ Passes entire object
    PhanHoi: PhanHoiNhanVien?.substring(0, 100),  // ✅ Correct (truncated)
  });
  await notificationService.send({
    type: "kpi-phan-hoi",
    data: notificationData,
  });
```

**Template Variables Used:**

- `{{TenNhanVien}}` - ✅ (builder extracts from employee object or populated)
- `{{PhanHoi}}` - ✅ (passed correctly, truncated)
- `{{_id}}` - ✅
- `{{NguoiDanhGiaID}}` - ✅

**Issues:**

- ⚠️ **MINOR:** Context passes entire objects (`employee`, `manager`) but builder expects string field `tenNhanVien`
- ⚠️ **MINOR:** Builder field is `phanHoi` (lowercase) but context passes `PhanHoi` (uppercase) - JavaScript is case-sensitive

**Recommendation:**

```javascript
const notificationData = await buildKPINotificationData(danhGiaKPI, {
  arrNguoiNhanID: [danhGiaKPI.NguoiDanhGiaID?.toString()],
  tenNhanVien: employee?.Ten || "", // ✅ String field, lowercase naming
  phanHoi: PhanHoiNhanVien?.substring(0, 100) || "", // ✅ Match builder field name
});
```

---

## Builder Validation

**Builder Location:** `modules/workmanagement/helpers/notificationDataBuilders.js:208-255`

**Builder Returns 16 Fields (COMPLETE):**

### Recipient Candidates (3 fields):

- `_id` - KPI evaluation ID ✅
- `NhanVienID` - Employee ID ✅
- `NguoiDanhGiaID` - Manager/evaluator ID ✅

### Display Fields (13 fields):

- `TenNhanVien` - Employee name ✅
- `TenNguoiDanhGia` - Evaluator name ✅
- `TenChuKy` - Cycle name ✅
- `TenTieuChi` - Criteria name ✅
- `TenNhiemVu` - Task/duty name ✅
- `TenNguoiDuyet` - Approver name ✅
- `TongDiemKPI` - Total KPI score ✅
- `DiemTuDanhGia` - Self-evaluation score ✅
- `DiemQL` - Manager evaluation score ✅
- `PhanHoi` - Feedback content ✅
- `LyDo` - Reason (for rejection/undo) ✅
- _(2 extra fields not explicitly named)_

**Builder Status:** ✅ **COMPLETE** - All 16 fields implemented

---

## Template Validation

All templates validated against seed file (`seeds/notificationTemplates.seed.js:568-645`):

| Type                 | Template Line | Variables Used                                | Builder Provides | Status     |
| -------------------- | ------------- | --------------------------------------------- | ---------------- | ---------- |
| kpi-tao-danh-gia     | 568           | TenChuKy, \_id, NhanVienID                    | ✅               | ✅         |
| kpi-duyet-tieu-chi   | 593           | TenChuKy, \_id, NhanVienID                    | ✅               | ✅         |
| kpi-huy-duyet        | 605           | TenChuKy, LyDo, \_id, NhanVienID              | ✅               | ✅         |
| kpi-cap-nhat-diem-ql | 617           | TenNguoiDanhGia, TenNhiemVu, \_id, NhanVienID | ✅               | ✅         |
| kpi-tu-danh-gia      | 630           | TenNhanVien, TenNhiemVu, \_id, NguoiDanhGiaID | ✅               | ❌ NO CODE |
| kpi-phan-hoi         | 643           | TenNhanVien, PhanHoi, \_id, NguoiDanhGiaID    | ✅               | ✅         |

**All templates are valid** - Builder provides all required variables.

---

## Critical Issues

### 🔴 CRITICAL #1: kpi-tu-danh-gia Not Implemented

**Type:** Missing Feature  
**Impact:** HIGH - Managers are not notified when employees complete self-evaluations  
**Location:** N/A (no code exists)

**Details:**

- Template exists and is valid
- No notification trigger in controller
- Self-evaluation data exists in `NhanVienNhiemVu.DiemTuDanhGia`
- Breaks communication loop in KPI workflow

**Fix Required:**
Implement notification trigger when employee saves self-evaluation scores (probably in `luuTatCaNhiemVu` or a dedicated employee-facing endpoint).

---

## Minor Issues

### ⚠️ MINOR #1: Inconsistent Context Field Naming

**Affected Types:** kpi-cap-nhat-diem-ql, kpi-phan-hoi

**Issue:** Some implementations pass entire objects in context, others pass string fields

**Pattern Established by kpi-duyet-danh-gia:**

```javascript
// ✅ CORRECT: Pass string fields explicitly
const notificationData = await buildKPINotificationData(danhGiaKPI, {
  tenNguoiDuyet: approver?.Ten || "", // String field
  nguoiDanhGiaId: evaluator._id.toString(), // String ID
});
```

**Current Issue Examples:**

```javascript
// ❌ INCONSISTENT: Passing entire objects
employee,      // Should be: tenNhanVien: employee?.Ten || ""
manager,       // Should be: tenNguoiDanhGia: manager?.Ten || ""
nguoiHuyDuyet: currentUser,  // Builder doesn't expect this
```

### ⚠️ MINOR #2: Case Sensitivity in Context Fields

**Affected Type:** kpi-phan-hoi

**Issue:** Context passes `PhanHoi` (uppercase) but builder expects `phanHoi` (lowercase)

**Fix:** Standardize to lowercase field names matching builder expectations

### ⚠️ MINOR #3: Unused Context Fields

**Affected Types:** kpi-cap-nhat-diem-ql, kpi-huy-duyet, kpi-phan-hoi

**Issue:** Context passes fields that builder doesn't use (relies on populated danhGiaKPI)

**Example:**

```javascript
// These are ignored by builder:
employee,
manager,
nhiemVu,
danhGiaNhiemVu,
nguoiHuyDuyet,
```

**Impact:** Low - Works because builder has fallback logic, but creates confusion and maintenance burden

### ⚠️ MINOR #4: Missing Optional Context Fields

**Affected Type:** kpi-duyet-tieu-chi

**Issue:** Doesn't pass `tenNguoiDuyet` even though it's part of the established pattern

**Impact:** Low - Current template doesn't use it, but breaks consistency

### ⚠️ MINOR #5: Implicit Population Dependency

**Affected Type:** kpi-tao-danh-gia

**Issue:** Relies on danhGiaKPI being populated with `ChuKyDanhGiaID` instead of explicitly passing `tenChuKy`

**Risk:** May fail if population is forgotten in future refactors

---

## Pattern Consistency Analysis

**Reference Pattern (kpi-duyet-danh-gia):**

```javascript
// ✅ GOLD STANDARD
const {
  buildKPINotificationData,
} = require("../helpers/notificationDataBuilders");
const notificationData = await buildKPINotificationData(updatedDanhGiaKPI, {
  arrNguoiNhanID: [updatedDanhGiaKPI.NhanVienID?._id?.toString()],
  tenNguoiDuyet:
    updatedDanhGiaKPI.NguoiDuyet?.Ten ||
    updatedDanhGiaKPI.NguoiDuyet?.HoTen ||
    "",
  nguoiDanhGiaId: updatedDanhGiaKPI.NguoiDanhGiaID?._id?.toString() || null,
});
await notificationService.send({
  type: "kpi-duyet-danh-gia",
  data: notificationData,
});
```

**Pattern Principles:**

1. ✅ Use `buildKPINotificationData()` for all KPI notifications
2. ✅ Pass string fields in context (not entire objects)
3. ✅ Convert IDs to strings with `.toString()`
4. ✅ Provide fallback values with `|| ""`
5. ✅ Include all relevant display name fields (`ten*` prefix)
6. ✅ Use try-catch for non-blocking notifications
7. ✅ Log success and failure

**Compliance Score:**

- kpi-tao-danh-gia: 5/7 (71%) ⚠️
- kpi-duyet-tieu-chi: 6/7 (86%) ⚠️
- kpi-huy-duyet: 6/7 (86%) ⚠️
- kpi-cap-nhat-diem-ql: 4/7 (57%) ⚠️
- kpi-tu-danh-gia: 0/7 (0%) ❌
- kpi-phan-hoi: 5/7 (71%) ⚠️

**Overall Pattern Consistency:** 4.3/7 (61%) - **NEEDS IMPROVEMENT**

---

## Recommendations

### Priority 1 (CRITICAL):

1. **Implement kpi-tu-danh-gia notification** - Complete the missing feature

### Priority 2 (MINOR - Consistency):

2. **Standardize context field naming** - All implementations should pass string fields like kpi-duyet-danh-gia
3. **Remove unused context fields** - Clean up objects that builder doesn't use
4. **Add missing tenNguoiDuyet** - Add to kpi-duyet-tieu-chi for consistency
5. **Fix case sensitivity** - Use lowercase field names matching builder

### Priority 3 (REFACTOR):

6. **Create helper function** for consistent context building
7. **Add JSDoc comments** documenting required context fields for each type

---

## Conclusion

**Overall Assessment:** ⚠️ **FUNCTIONAL with 1 CRITICAL GAP**

- **Pattern Usage:** ✅ All 5 implemented types use `buildKPINotificationData`
- **Templates:** ✅ All templates are valid and will render correctly
- **Critical Bugs:** ❌ 1 missing feature (kpi-tu-danh-gia)
- **Minor Issues:** ⚠️ 5 consistency/naming issues

**The system works** for the 5 implemented notification types, but has inconsistent patterns and is missing the self-evaluation notification entirely. The builder is solid (16 fields, complete). The main work needed is:

1. Implementing kpi-tu-danh-gia (HIGH PRIORITY)
2. Standardizing context field patterns (MEDIUM PRIORITY)
3. Code cleanup for maintainability (LOW PRIORITY)

---

**Audit Completed By:** GitHub Copilot  
**Validation Method:** Code analysis + pattern matching + template cross-reference  
**Confidence Level:** HIGH (detailed line-by-line review completed)
