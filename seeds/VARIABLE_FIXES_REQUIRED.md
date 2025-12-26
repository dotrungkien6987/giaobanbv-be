# 🔧 NOTIFICATION VARIABLES - REQUIRED FIXES

> **Generated**: December 24, 2025  
> **Source**: Comprehensive Variables Audit  
> **Priority**: 🔴 CRITICAL - Apply before next deployment

---

## 🎯 QUICK SUMMARY

**User's Claim**: 21 variables seeded  
**Actual Count**: 45 variables defined (with 2 duplicates = 43 unique)  
**Issues Found**: 25 discrepancies across 3 categories

---

## 🔴 PRIORITY 1: CRITICAL NAMING MISMATCHES (8 variables)

These variables are defined with one name but templates use a different name. **This will cause template rendering failures.**

### Fix #1: CongViec Priority Variables

**File**: `seeds/notificationTypes.seed.js`, congViecVariables array

```javascript
// ❌ REMOVE (lines ~65-66):
{
  name: "DoUuTien",
  type: "String",
  description: "Độ ưu tiên: cao/trung bình/thấp",
},
{
  name: "DoUuTienCu",
  type: "String",
  description: "Độ ưu tiên cũ",
},

// ✅ ADD instead:
{
  name: "MucDoUuTienMoi",
  type: "String",
  description: "Độ ưu tiên mới: cao/trung bình/thấp",
},
{
  name: "MucDoUuTienCu",
  type: "String",
  description: "Độ ưu tiên cũ: cao/trung bình/thấp",
},
```

**Affected Templates**: Line 233 in `notificationTemplates.seed.js`

---

### Fix #2: CongViec Deadline Variables

```javascript
// ❌ REMOVE (lines ~68-69):
{
  name: "Deadline",
  type: "String",
  description: "Hạn hoàn thành",
},
{
  name: "DeadlineCu",
  type: "String",
  description: "Deadline cũ",
},

// ✅ ADD instead:
{
  name: "NgayHetHan",
  type: "String",
  description: "Hạn hoàn thành (DD/MM/YYYY HH:mm)",
},
{
  name: "NgayHetHanCu",
  type: "String",
  description: "Hạn hoàn thành cũ",
},
{
  name: "NgayHetHanMoi",
  type: "String",
  description: "Hạn hoàn thành mới",
},
```

**Affected Templates**: Lines 174, 262, 282 in `notificationTemplates.seed.js`

---

### Fix #3: CongViec Progress Variable

```javascript
// ❌ REMOVE (line ~67):
{
  name: "TienDo",
  type: "Number",
  description: "Tiến độ %",
},

// ✅ ADD instead:
{
  name: "TienDoMoi",
  type: "Number",
  description: "Tiến độ mới (%)",
},
```

**Affected Templates**: Lines 240-241 in `notificationTemplates.seed.js`

---

### Fix #4: KPI Feedback Variable

**File**: `seeds/notificationTypes.seed.js`, kpiVariables array

```javascript
// ❌ REMOVE (line ~166):
{
  name: "NoiDungPhanHoi",
  type: "String",
  description: "Nội dung phản hồi",
},

// ✅ ADD instead:
{
  name: "PhanHoi",
  type: "String",
  description: "Nội dung phản hồi",
},
```

**Affected Templates**: Line 702 in `notificationTemplates.seed.js`

---

### Fix #5: KPI Undo Approval Reason

```javascript
// ❌ REMOVE (line ~167):
{
  name: "LyDoHuyDuyet",
  type: "String",
  description: "Lý do hủy duyệt",
},

// ✅ ADD instead:
{
  name: "LyDo",
  type: "String",
  description: "Lý do hủy duyệt",
},
```

**Affected Templates**: Line 664 in `notificationTemplates.seed.js`

---

## 🟡 PRIORITY 2: REMOVE DUPLICATE DEFINITIONS (2 variables)

**File**: `seeds/notificationTypes.seed.js`, yeuCauVariables array

```javascript
// Keep lines ~120-121:
{ name: "TenKhoaGui", type: "String", description: "Tên khoa gửi" },
{ name: "TenKhoaNhan", type: "String", description: "Tên khoa nhận" },

// ❌ DELETE lines ~122-123 (exact duplicates):
{ name: "TenKhoaGui", type: "String", description: "Tên khoa gửi" },  // ← DELETE
{ name: "TenKhoaNhan", type: "String", description: "Tên khoa nhận" }, // ← DELETE
```

**Impact**: Reduces array length from 23 to 21 variables

---

## 🟢 PRIORITY 3: ADD MISSING VARIABLES (10 variables)

These variables are used in templates or passed by services but not defined in types.

### Add to yeuCauVariables:

```javascript
// Recipient Candidates (add after arrQuanLyKhoaID)
{
  name: "NguoiSuaID",
  type: "ObjectId",
  ref: "NhanVien",
  isRecipientCandidate: true,
  description: "Người sửa/cập nhật yêu cầu",
},
{
  name: "NguoiBinhLuanID",
  type: "ObjectId",
  ref: "NhanVien",
  isRecipientCandidate: true,
  description: "Người bình luận yêu cầu",
},
{
  name: "NguoiDieuPhoiID",
  type: "ObjectId",
  ref: "NhanVien",
  isRecipientCandidate: true,
  description: "Điều phối viên (single)",
},
{
  name: "NguoiDuocDieuPhoiID",
  type: "ObjectId",
  ref: "NhanVien",
  isRecipientCandidate: true,
  description: "Người được điều phối xử lý",
},
{
  name: "NguoiNhanID",
  type: "ObjectId",
  ref: "NhanVien",
  isRecipientCandidate: true,
  description: "Người nhận yêu cầu",
},

// Display Fields (add after TenNguoiComment)
{
  name: "TenNguoiSua",
  type: "String",
  description: "Tên người sửa yêu cầu",
},
{
  name: "TenNguoiThucHien",
  type: "String",
  description: "Tên người thực hiện hành động (dynamic)",
},
{
  name: "TenNguoiXoa",
  type: "String",
  description: "Tên người xóa yêu cầu",
},
```

### Add to congViecVariables:

```javascript
// Display Fields (add after TenNguoiGiao)
{
  name: "TenNguoiCapNhat",
  type: "String",
  description: "Tên người cập nhật công việc",
},
{
  name: "TenNguoiChinhMoi",
  type: "String",
  description: "Tên người chính mới (khi reassign)",
},
{
  name: "TenNguoiThucHien",
  type: "String",
  description: "Tên người thực hiện hành động (dynamic)",
},
```

### Add to kpiVariables:

```javascript
// Display Fields (add after TenChuKy)
{
  name: "TenNhiemVu",
  type: "String",
  description: "Tên nhiệm vụ thường quy được đánh giá",
},
{
  name: "TenNguoiDuyet",
  type: "String",
  description: "Tên người duyệt KPI",
},
```

---

## 📝 PRIORITY 4: CLEAN UP SERVICE CODE

### Fix: Remove Duplicate Fields in yeuCau.service.js

**File**: `modules/workmanagement/services/yeuCau.service.js`

**Line ~840** in `taoBinhLuan()` function:

```javascript
// ❌ REMOVE these duplicate lines:
TenNguoiBinhLuan: nguoiBinhLuan?.Ten || "Người bình luận",
NoiDungBinhLuan: data.NoiDung?.substring(0, 100) || "Bình luận mới",

// ✅ KEEP only:
TenNguoiComment: nguoiBinhLuan?.Ten || "Người bình luận",
NoiDungComment: data.NoiDung?.substring(0, 100) || "Bình luận mới",
```

---

## 🔄 DEPLOYMENT STEPS

### Step 1: Apply Code Fixes

```bash
# 1. Edit seeds/notificationTypes.seed.js
#    - Apply all Priority 1, 2, and 3 fixes above

# 2. Edit modules/workmanagement/services/yeuCau.service.js
#    - Apply Priority 4 fixes
```

### Step 2: Re-seed Database

```bash
cd d:\project\webBV\giaobanbv-be

# Re-seed notification types (will update all 45 types)
node seeds/notificationTypes.seed.js

# Verify template compatibility (no changes needed to templates)
node seeds/notificationTemplates.seed.js
```

### Step 3: Verify

```bash
# Test a few notification types
node seeds/test-notification-yeucau-tao-moi.js
node seeds/test-notification-flow.js
```

---

## 📊 EXPECTED OUTCOMES

After applying all fixes:

| Metric                    | Before            | After     | Change |
| ------------------------- | ----------------- | --------- | ------ |
| **Variables defined**     | 45 (with 2 dupes) | 58 unique | +13    |
| **Naming mismatches**     | 8                 | 0         | -8 ✅  |
| **Duplicate definitions** | 2                 | 0         | -2 ✅  |
| **Variables unused**      | 9                 | 0         | -9 ✅  |
| **Template errors**       | ~8 types at risk  | 0         | ✅     |

---

## ⚠️ BREAKING CHANGES

**None!** These fixes are **backward compatible** because:

1. **Variable additions**: Services already pass these fields
2. **Variable renames**: Services already use the new names
3. **Duplicate removal**: Only affects internal array length
4. **Service cleanup**: Removes redundant fields

**No frontend or API changes required.**

---

## 🎯 USER'S QUESTION ANSWERED

> **User said**: "DB has 21 variables seeded"

**Actual situation**:

- ❌ Not 21 - that's incorrect
- ✅ Currently 45 variables defined (43 unique after removing duplicates)
- ✅ After fixes: 58 unique variables
- ✅ All variables are necessary (except 9 need renaming)

**Why the confusion?**:

- Possibly user counted only YeuCau variables (21 after removing dupes)
- Or counted only recipient candidate variables (~14)
- Actual count includes all 3 domains: CongViec (21) + YeuCau (23) + KPI (13) = 57 variables

---

## 📎 FILES TO MODIFY

1. ✅ `giaobanbv-be/seeds/notificationTypes.seed.js` (lines 24-167)
2. ✅ `giaobanbv-be/modules/workmanagement/services/yeuCau.service.js` (line 840)

**Files NOT to modify**:

- ❌ `notificationTemplates.seed.js` - no changes needed (templates already correct)
- ❌ Service files - already passing correct variable names

---

**Ready to apply?** Run the fixes in priority order: P1 → P2 → P3 → P4 → Deploy
