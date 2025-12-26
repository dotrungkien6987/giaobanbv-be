# 🔄 Migration Guide: Centralized Notification Builders

**Purpose:** Guide for developers to add new notifications using centralized builders  
**Date:** December 2024  
**Prerequisites:** Read IMPLEMENTATION_CENTRALIZED_BUILDERS.md first

---

## 📋 Quick Reference

### Available Builders

1. **buildYeuCauNotificationData(yeuCau, context)** - 29 fields  
   File: `modules/workmanagement/helpers/notificationDataBuilders.js`

2. **buildCongViecNotificationData(congViec, context)** - 29 fields  
   File: `modules/workmanagement/helpers/notificationDataBuilders.js`

3. **buildKPINotificationData(danhGiaKPI, context)** - 16 fields  
   File: `modules/workmanagement/helpers/notificationDataBuilders.js`

### All Available Variables

See **VARIABLES_QUICK_REFERENCE.md** for complete list of 68 variables across 3 domains.

---

## 🚀 How to Add a New Notification

### Step 1: Choose Your Domain

Determine which builder to use based on the entity triggering the notification:

- **YeuCau-related?** → Use `buildYeuCauNotificationData()`
- **CongViec-related?** → Use `buildCongViecNotificationData()`
- **KPI-related?** → Use `buildKPINotificationData()`

### Step 2: Add Notification Type to Seeds

Edit: `seeds/notificationTypes.seed.js`

```javascript
{
  code: "yeucau-moi-action", // Unique code
  name: "Yêu cầu mới action", // Display name
  category: "YEUCAU", // YEUCAU | CONGVIEC | KPI
  description: "Mô tả action mới",
  isActive: true,
},
```

### Step 3: Add Template to Seeds

Edit: `seeds/notificationTemplates.seed.js`

```javascript
{
  typeCode: "yeucau-moi-action", // Must match type code
  titleTemplate: "{{TenNguoiYeuCau}} đã {{action}} yêu cầu {{MaYeuCau}}",
  bodyTemplate: "Tiêu đề: {{TieuDe}}\nKhoa: {{TenKhoaGui}} → {{TenKhoaNhan}}",
  actionUrl: "/yeu-cau/{{_id}}", // Frontend route
  priority: "MEDIUM", // LOW | MEDIUM | HIGH | URGENT
},
```

**Available Variables:**

- YeuCau: See VARIABLES_QUICK_REFERENCE.md - 29 fields
- CongViec: See VARIABLES_QUICK_REFERENCE.md - 29 fields
- KPI: See VARIABLES_QUICK_REFERENCE.md - 16 fields

### Step 4: Call notificationService.send()

In your service/controller file:

```javascript
// Import builder
const {
  buildYeuCauNotificationData,
} = require("../helpers/notificationDataBuilders");

// Inside your service method
try {
  // Build notification data
  const notificationData = buildYeuCauNotificationData(yeuCau, {
    // Required: Recipient IDs (array)
    arrNguoiNhanID: [nguoiNhanId], // For single recipient
    // OR
    arrNguoiLienQuanID: [...relatedNhanVienIDs], // For multiple recipients

    // Optional: Additional context (pass populated docs or computed values)
    populated, // If you have pre-populated yeuCau
    nguoiSua, // If action = edit
    nguoiBinhLuan, // If action = comment
    NoiDungThayDoi: "Field1, Field2", // Custom field
  });

  // Send notification
  await notificationService.send({
    type: "yeucau-moi-action", // Must match type code
    data: notificationData,
  });

  console.log("[ServiceName] ✅ Sent notification: yeucau-moi-action");
} catch (error) {
  console.error("[ServiceName] ❌ Notification failed:", error.message);
}
```

### Step 5: Test

1. **Trigger the action** (e.g., create yêu cầu)
2. **Check console** for "✅ Sent notification" log
3. **Check frontend** - Bell icon should show new notification
4. **Click notification** - Should navigate to correct page
5. **Check template rendering** - No "undefined" values

---

## 📝 Pattern Examples

### Example 1: YeuCau - Simple Notification

**Scenario:** Notify coordinator when yêu cầu is created

```javascript
const {
  buildYeuCauNotificationData,
} = require("../helpers/notificationDataBuilders");

// After yeuCau created
const arrNguoiDieuPhoiID = cauHinhKhoaDich.layDanhSachNguoiDieuPhoiIDs();

const notificationData = buildYeuCauNotificationData(yeuCau, {
  arrNguoiDieuPhoiID, // Recipients
  populated, // Pre-populated yeuCau with Khoa, NhanVien refs
  snapshotDanhMuc, // Danh mục snapshot
});

await notificationService.send({
  type: "yeucau-tao-moi",
  data: notificationData,
});
```

### Example 2: CongViec - Complex Context

**Scenario:** Notify when main assignee changes

```javascript
const {
  buildCongViecNotificationData,
} = require("../helpers/notificationDataBuilders");

// Get old & new assignees
const oldAssignee = await NhanVien.findById(oldMainAssigneeId)
  .select("Ten")
  .lean();
const newAssignee = await NhanVien.findById(newMainAssigneeId)
  .select("Ten")
  .lean();

// Build recipients list
const arrNguoiNhan = [
  oldMainAssigneeId,
  newMainAssigneeId,
  congviec.NguoiGiaoViecID?.toString(),
].filter((id) => id && id !== currentUser.NhanVienID?.toString());

const notificationData = buildCongViecNotificationData(congviec, {
  arrNguoiLienQuanID: [...new Set(arrNguoiNhan)],
  nguoiCapNhat: performer, // Who changed the assignee
  nguoiChinhCu: oldAssignee, // Pass entire doc
  nguoiChinhMoi: newAssignee, // Pass entire doc
  NguoiChinhMoiID: newMainAssigneeId, // For recipient resolution
});

await notificationService.send({
  type: "congviec-thay-doi-nguoi-chinh",
  data: notificationData,
});
```

### Example 3: KPI - With Optional Context

**Scenario:** Notify employee when manager scores them

```javascript
const {
  buildKPINotificationData,
} = require("../helpers/notificationDataBuilders");

// Fetch related docs
const employee = await NhanVien.findById(danhGiaKPI.NhanVienID)
  .select("Ten")
  .lean();
const manager = await NhanVien.findById(danhGiaKPI.NguoiDanhGiaID)
  .select("Ten")
  .lean();
const nhiemVu = await NhiemVuThuongQuy.findById(
  danhGiaNhiemVu.NhiemVuThuongQuyID
)
  .select("TenNhiemVu")
  .lean();

const notificationData = buildKPINotificationData(danhGiaKPI, {
  arrNguoiNhanID: [danhGiaKPI.NhanVienID?.toString()],
  employee,
  manager,
  nhiemVu,
  danhGiaNhiemVu, // Pass entire doc for DiemNhiemVu
  tongDiemKPI, // Computed value
});

await notificationService.send({
  type: "kpi-cap-nhat-diem-ql",
  data: notificationData,
});
```

---

## 🎯 Best Practices

### 1. Always Use Builders

❌ **DON'T:**

```javascript
await notificationService.send({
  type: "yeucau-tao-moi",
  data: {
    _id: yeuCau._id.toString(),
    MaYeuCau: yeuCau.MaYeuCau,
    TieuDe: yeuCau.TieuDe,
    // Manual building = inconsistent, incomplete
  },
});
```

✅ **DO:**

```javascript
const {
  buildYeuCauNotificationData,
} = require("../helpers/notificationDataBuilders");
const notificationData = buildYeuCauNotificationData(yeuCau, {
  /* context */
});
await notificationService.send({
  type: "yeucau-tao-moi",
  data: notificationData,
});
```

### 2. Pass Populated Docs When Available

```javascript
// If you already have populated yeuCau
const populated = await YeuCau.findById(yeuCauId)
  .populate("KhoaNguonID", "TenKhoa")
  .populate("NguoiYeuCauID", "Ten")
  .lean();

// Pass it to builder (saves redundant queries)
const notificationData = buildYeuCauNotificationData(yeuCau, { populated });
```

### 3. Handle Errors Gracefully

```javascript
try {
  await notificationService.send({ ... });
  console.log("✅ Sent notification");
} catch (error) {
  // Log error but DON'T throw (non-blocking)
  console.error("❌ Notification failed:", error.message);
}
```

### 4. Use Descriptive Context Keys

```javascript
// ❌ Bad: Ambiguous keys
const notificationData = buildYeuCauNotificationData(yeuCau, {
  data1: nguoiSua,
  data2: noiDung,
});

// ✅ Good: Clear keys
const notificationData = buildYeuCauNotificationData(yeuCau, {
  nguoiSua,
  NoiDungThayDoi: noiDung,
});
```

### 5. Check VARIABLES_QUICK_REFERENCE.md Before Writing Templates

Before adding a template variable like `{{NewVar}}`, check if it's already provided by the builder:

```javascript
// Check VARIABLES_QUICK_REFERENCE.md first!
// If TenNguoiYeuCau already exists, use it:
titleTemplate: "{{TenNguoiYeuCau}} đã tạo yêu cầu"; // ✅

// Don't create duplicate:
titleTemplate: "{{NguoiTaoTen}} đã tạo yêu cầu"; // ❌ Redundant
```

---

## 🔍 Troubleshooting

### Issue 1: "undefined" in Template

**Problem:** Template shows `{{SomeVar}} = undefined`

**Solution:**

1. Check VARIABLES_QUICK_REFERENCE.md - is `SomeVar` in the list?
2. If NOT, you need to:
   - Add it to the builder function
   - Pass required data in `context` parameter
3. If YES, check your context object:
   ```javascript
   const notificationData = buildYeuCauNotificationData(yeuCau, {
     populated, // ← Make sure this contains the required refs
   });
   ```

### Issue 2: Notification Not Sent

**Problem:** No console log "✅ Sent notification"

**Solution:**

1. Check notification type exists:
   ```bash
   # In MongoDB
   db.notificationtypes.findOne({ code: "your-type-code" })
   ```
2. Check template exists:
   ```bash
   db.notificationtemplates.findOne({ typeCode: "your-type-code" })
   ```
3. Check recipient IDs are valid:
   ```javascript
   console.log("Recipients:", notificationData.arrNguoiNhanID);
   // Should be array of valid MongoDB ObjectIds
   ```

### Issue 3: Recipients Not Receiving

**Problem:** Notification sent but user doesn't see it

**Solution:**

1. Check recipient has a User account (NhanVien → User link):
   ```javascript
   const user = await User.findOne({ NhanVienID: recipientId });
   console.log("User:", user); // Should exist
   ```
2. Check frontend socket connection:
   ```javascript
   // In browser console
   console.log(socket.connected); // Should be true
   ```
3. Check NotificationDropdown component for errors

### Issue 4: Performance Issues

**Problem:** Notification sending is slow

**Solution:**

1. Check if you're over-populating:

   ```javascript
   // ❌ Bad: Deep populates in loop
   for (const id of recipientIds) {
     const yeuCau = await YeuCau.findById(id).populate("...").populate("...");
   }

   // ✅ Good: Populate once, reuse
   const populated = await YeuCau.findById(id).populate("...").lean();
   const notificationData = buildYeuCauNotificationData(yeuCau, { populated });
   ```

2. Use `.lean()` for read-only queries (faster)
3. Batch notifications if sending to many users

---

## 📚 Advanced: Adding New Variables to Builders

If you need a NEW variable not in the 68 existing ones:

### Step 1: Update Builder Function

Edit: `modules/workmanagement/helpers/notificationDataBuilders.js`

```javascript
function buildYeuCauNotificationData(yeuCau, context = {}) {
  // ... existing code ...

  return {
    // ... existing 29 fields ...

    // Add new field
    NewField: context.newFieldValue || yeuCau.NewField || "Default",
  };
}
```

### Step 2: Update VARIABLES_QUICK_REFERENCE.md

Add row to table:

| Variable | Type   | Description | Domain | IsRecipient | Status |
| -------- | ------ | ----------- | ------ | ----------- | ------ |
| NewField | String | Description | YeuCau | false       | keep   |

### Step 3: Update All Calls (If Needed)

If the new variable requires context data:

```javascript
// In service files
const notificationData = buildYeuCauNotificationData(yeuCau, {
  // ... existing context ...
  newFieldValue: computedValue, // Add new context
});
```

### Step 4: Use in Templates

```javascript
{
  titleTemplate: "Yêu cầu {{MaYeuCau}} - {{NewField}}",
  // NewField is now available!
}
```

---

## 🎓 Learning Resources

1. **IMPLEMENTATION_CENTRALIZED_BUILDERS.md** - Full implementation details
2. **VARIABLES_QUICK_REFERENCE.md** - Complete 68 variables table
3. **AUDIT_NOTIFICATION_SYSTEM.md** - Original 42/44 types audit
4. **notificationDataBuilders.js** - Source code with JSDoc

---

## 🤝 Support

If you encounter issues not covered in this guide:

1. Check console logs (backend + frontend)
2. Review existing notification implementations (yeuCau.service.js lines 175, 306, etc.)
3. Test with simple template first (e.g., `{{MaYeuCau}}` only)
4. Check MongoDB collections (notificationtypes, notificationtemplates, notifications)

---

_Last updated: December 2024 - GitHub Copilot (Claude Sonnet 4.5)_
