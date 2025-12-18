# 📚 NOTIFICATION INTEGRATION GUIDE - Phase 2 & 3

> **Hướng dẫn chi tiết cách tích hợp thông báo vào hệ thống**
>
> Created: December 16, 2025  
> Version: 2.0 - Comprehensive Implementation

---

## 📖 MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cách lấy requiredVariables](#2-cách-lấy-requiredvariables)
3. [Integration Pattern - Step by Step](#3-integration-pattern---step-by-step)
4. [30 Templates Reference](#4-30-templates-reference)
5. [Ví dụ thực tế theo module](#5-ví-dụ-thực-tế-theo-module)
6. [Testing & Debugging](#6-testing--debugging)
7. [Best Practices](#7-best-practices)

---

## 1. TỔNG QUAN KIẾN TRÚC

### 🔄 **Flow hoàn chỉnh:**

```
┌─────────────────┐
│  Business Logic │  ← Controller/Service thực hiện action
│   (Service)     │
└────────┬────────┘
         │
         │ 1. Prepare context object
         │    (đọc từ database, request)
         ▼
┌─────────────────┐
│ triggerService  │  ← Fire notification trigger
│    .fire()      │
└────────┬────────┘
         │
         │ 2. Load config từ notificationTriggers.js
         │    Check enabled, get handler type
         ▼
┌─────────────────┐
│   Handler       │  ← Extract recipients từ context
│  (_handleXXX)   │    Sử dụng config.recipients
└────────┬────────┘
         │
         │ 3. Convert NhanVienID → UserID
         │    Exclude performer
         ▼
┌─────────────────┐
│ Template Engine │  ← Render {{variables}} với context
│  (renderVars)   │
└────────┬────────┘
         │
         │ 4. Create Notification records
         ▼
┌─────────────────┐
│  socketService  │  ← Emit real-time qua Socket.IO
│   .emitToUser() │
└────────┬────────┘
         │
         │ 5. Real-time delivery
         ▼
┌─────────────────┐
│   Frontend UI   │  ← NotificationBell, Toast, Dropdown
│   (React App)   │
└─────────────────┘
```

### 📦 **3 tầng kiến trúc:**

```javascript
// ────────────────────────────────────────────────────────────────────
// LAYER 1: Configuration (notificationTriggers.js)
// ────────────────────────────────────────────────────────────────────
"YeuCau.TIEP_NHAN": {
  enabled: true,
  template: "YEUCAU_ACCEPTED",
  handler: "yeuCauStateMachine",
  recipients: "requester",
  excludePerformer: true,
}

// ────────────────────────────────────────────────────────────────────
// LAYER 2: Business Logic (service methods)
// ────────────────────────────────────────────────────────────────────
const tiepNhanYeuCau = async (req) => {
  // 1. Business logic
  await yeuCau.updateOne({ TrangThai: "DA_TIEP_NHAN" });

  // 2. Prepare context
  const context = { yeuCau, performerId, variables... };

  // 3. Fire trigger
  await triggerService.fire("YeuCau.TIEP_NHAN", context);
};

// ────────────────────────────────────────────────────────────────────
// LAYER 3: Notification Delivery (triggerService + notificationService)
// ────────────────────────────────────────────────────────────────────
// - Extract recipients
// - Convert IDs
// - Render template
// - Send to database + Socket.IO
```

---

## 2. CÁCH LẤY REQUIREDVARIABLES

### ✅ **Quy trình 4 bước:**

```
BƯỚC 1: Đọc template bodyTemplate
         ↓ Tìm tất cả {{variable}}

BƯỚC 2: Đọc code business logic
         ↓ Xem document có field gì

BƯỚC 3: Populate nested references
         ↓ Lấy tên, title từ ObjectId

BƯỚC 4: Flatten và pass vào context
         ↓ Không dùng nested object
```

### 📊 **Ví dụ cụ thể - YEUCAU_CREATED:**

#### **Template có 8 variables:**

```javascript
{
  type: "YEUCAU_CREATED",
  titleTemplate: "🆕 Yêu cầu mới: {{requestCode}}",
  bodyTemplate: "{{requesterName}} ({{sourceDept}}) gửi yêu cầu \"{{requestTitle}}\" đến {{targetDept}}. Loại yêu cầu: {{requestType}}. Thời gian hẹn: {{deadline}}.",
  actionUrlTemplate: "/quan-ly-cong-viec/yeu-cau/{{requestId}}",

  requiredVariables: [
    "requestCode",      // ← Cần lấy từ database
    "requesterName",    // ← Cần lấy từ database
    "sourceDept",       // ← Cần lấy từ database
    "requestTitle",     // ← Cần lấy từ database
    "targetDept",       // ← Cần lấy từ database
    "requestType",      // ← Cần lấy từ database
    "deadline",         // ← Cần lấy từ database
    "requestId"         // ← Cần lấy từ database
  ]
}
```

#### **Code integration:**

```javascript
// File: yeuCau.service.js
const taoYeuCau = async (req) => {
  const { user } = req;
  const payload = req.body;

  // ────────────────────────────────────────────────────────────────────
  // 1️⃣ CREATE DOCUMENT (Business logic)
  // ────────────────────────────────────────────────────────────────────
  const yeuCau = await YeuCau.create({
    MaYeuCau: payload.maYeuCau, // ← requestCode
    TieuDe: payload.tieuDe, // ← requestTitle
    KhoaYeuCauID: user.KhoaID, // ← sourceDept (ObjectId)
    KhoaDuocYeuCauID: payload.khoaDuocYeuCau, // ← targetDept (ObjectId)
    LoaiYeuCauID: payload.loaiYeuCau, // ← requestType (ObjectId)
    ThoiGianHen: payload.thoiGianHen, // ← deadline (Date)
    NguoiYeuCauID: user.NhanVienID, // ← requester (ObjectId)
  });

  // ────────────────────────────────────────────────────────────────────
  // 2️⃣ POPULATE nested references để lấy tên
  // ────────────────────────────────────────────────────────────────────
  const populated = await YeuCau.findById(yeuCau._id)
    .populate("NguoiYeuCauID", "Ten") // ← requesterName
    .populate("KhoaYeuCauID", "TenKhoa") // ← sourceDept name
    .populate("KhoaDuocYeuCauID", "TenKhoa") // ← targetDept name
    .populate("LoaiYeuCauID", "TenLoai"); // ← requestType name

  // ────────────────────────────────────────────────────────────────────
  // 3️⃣ CHUẨN BỊ CONTEXT - Flatten variables
  // ────────────────────────────────────────────────────────────────────
  const context = {
    // Main object (handler dùng để extract recipients)
    yeuCau: populated,
    performerId: user.NhanVienID, // ← Exclude người tạo

    // Template variables (PHẢI MATCH requiredVariables)
    requestCode: populated.MaYeuCau,
    requesterName: populated.NguoiYeuCauID?.Ten || "Người yêu cầu",
    sourceDept: populated.KhoaYeuCauID?.TenKhoa || "Khoa",
    requestTitle: populated.TieuDe,
    targetDept: populated.KhoaDuocYeuCauID?.TenKhoa || "Khoa đích",
    requestType: populated.LoaiYeuCauID?.TenLoai || "Yêu cầu",
    deadline: dayjs(populated.ThoiGianHen).format("DD/MM/YYYY HH:mm"),
    requestId: populated._id.toString(),
  };

  // ────────────────────────────────────────────────────────────────────
  // 4️⃣ FIRE TRIGGER
  // ────────────────────────────────────────────────────────────────────
  try {
    await triggerService.fire("YeuCau.TAO_MOI", context);
  } catch (notifError) {
    console.error("[taoYeuCau] Notification error:", notifError.message);
  }

  return populated;
};
```

### 🗺️ **Mapping Table: Database Field → Template Variable**

| **Template Variable** | **Database Field**                | **Cần Populate?** | **Format?**   |
| --------------------- | --------------------------------- | ----------------- | ------------- |
| `requestCode`         | `yeuCau.MaYeuCau`                 | ❌ No             | ❌ No         |
| `requestTitle`        | `yeuCau.TieuDe`                   | ❌ No             | ❌ No         |
| `requestId`           | `yeuCau._id`                      | ❌ No             | ✅ toString() |
| `requesterName`       | `yeuCau.NguoiYeuCauID.Ten`        | ✅ Yes            | ❌ No         |
| `sourceDept`          | `yeuCau.KhoaYeuCauID.TenKhoa`     | ✅ Yes            | ❌ No         |
| `targetDept`          | `yeuCau.KhoaDuocYeuCauID.TenKhoa` | ✅ Yes            | ❌ No         |
| `requestType`         | `yeuCau.LoaiYeuCauID.TenLoai`     | ✅ Yes            | ❌ No         |
| `deadline`            | `yeuCau.ThoiGianHen`              | ❌ No             | ✅ dayjs()    |

### 🎯 **Rule of Thumb:**

1. **Tìm {{variables}}** trong template → List ra tất cả
2. **Map với DB fields** → Xem field nào cần populate
3. **Populate đầy đủ** → `.populate("FieldID", "Ten Email")`
4. **Format dates** → `dayjs(date).format("DD/MM/YYYY HH:mm")`
5. **Flatten object** → Pass flat variables, không dùng nested
6. **Handle null** → Dùng optional chaining `?.` và fallback `|| "Default"`

---

## 3. INTEGRATION PATTERN - STEP BY STEP

### 📦 **Template tích hợp chuẩn:**

```javascript
// ═══════════════════════════════════════════════════════════════════
// PATTERN: Tích hợp notification vào service method
// ═══════════════════════════════════════════════════════════════════

const triggerService = require("../../../services/triggerService");
const dayjs = require("dayjs");

// Example: YeuCau.TIEP_NHAN action
const tiepNhanYeuCau = async (req) => {
  const { yeuCauId } = req.params;
  const { user } = req;
  const { lyDo, thoiGianHen } = req.body;

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Thực hiện business logic
  // ─────────────────────────────────────────────────────────────────
  const yeuCau = await YeuCau.findById(yeuCauId);
  if (!yeuCau) throw new AppError(404, "Không tìm thấy yêu cầu");

  // Update status
  yeuCau.TrangThai = "DA_TIEP_NHAN";
  yeuCau.NguoiXuLyID = user.NhanVienID;
  yeuCau.ThoiGianHen = thoiGianHen;
  await yeuCau.save();

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Populate để lấy đủ data cho notification
  // ─────────────────────────────────────────────────────────────────
  const populated = await YeuCau.findById(yeuCau._id)
    .populate("NguoiYeuCauID", "Ten") // ← Người yêu cầu
    .populate("NguoiXuLyID", "Ten") // ← Người tiếp nhận
    .populate("KhoaYeuCauID", "TenKhoa"); // ← Khoa yêu cầu

  // ─────────────────────────────────────────────────────────────────
  // STEP 3: Chuẩn bị context với ĐÚNG tên variables trong template
  // ─────────────────────────────────────────────────────────────────
  // ✅ Xem template YEUCAU_ACCEPTED có các variables:
  // - accepterName, requestTitle, requestCode, deadline, note, requestId

  const context = {
    // Main object (handler dùng để extract recipients)
    yeuCau: populated,
    performerId: user.NhanVienID, // ← Exclude người tiếp nhận

    // Template variables (phải match với requiredVariables)
    accepterName: populated.NguoiXuLyID?.Ten || "Người tiếp nhận",
    requestTitle: populated.TieuDe,
    requestCode: populated.MaYeuCau,
    deadline: dayjs(thoiGianHen).format("DD/MM/YYYY HH:mm"),
    note: lyDo || "Không có ghi chú",
    requestId: populated._id.toString(),
  };

  // ─────────────────────────────────────────────────────────────────
  // STEP 4: Fire notification trigger
  // ─────────────────────────────────────────────────────────────────
  try {
    await triggerService.fire("YeuCau.TIEP_NHAN", context);
  } catch (notifError) {
    // Log lỗi nhưng không fail transaction
    console.error("[tiepNhanYeuCau] Notification error:", notifError.message);
  }

  return populated;
};
```

### 🔍 **Debugging Context:**

**Nếu notification không render đúng, log context:**

```javascript
console.log("🔔 [DEBUG] Notification context:", {
  triggerKey: "YeuCau.TIEP_NHAN",
  context: JSON.stringify(context, null, 2),
  requiredVars: [
    "accepterName",
    "requestTitle",
    "requestCode",
    "deadline",
    "note",
    "requestId",
  ],
});

await triggerService.fire("YeuCau.TIEP_NHAN", context);
```

### ⚠️ **Common Mistakes:**

```javascript
// ❌ SAI: Dùng nested object
const context = {
  yeuCau: populated,
  user: {
    name: "Nguyễn Văn A", // ← Sẽ không render {{user.name}}
  },
};

// ✅ ĐÚNG: Flatten variables
const context = {
  yeuCau: populated,
  userName: "Nguyễn Văn A", // ← OK, render {{userName}}
};

// ❌ SAI: Không populate
const yeuCau = await YeuCau.findById(id); // NguoiYeuCauID là ObjectId
context.requesterName = yeuCau.NguoiYeuCauID; // ← Sẽ là ObjectId string!

// ✅ ĐÚNG: Populate trước
const yeuCau = await YeuCau.findById(id).populate("NguoiYeuCauID", "Ten");
context.requesterName = yeuCau.NguoiYeuCauID?.Ten; // ← OK, là tên người

// ❌ SAI: Date không format
context.deadline = new Date("2025-12-16"); // ← Render [object Date]

// ✅ ĐÚNG: Format với dayjs
context.deadline = dayjs(new Date("2025-12-16")).format("DD/MM/YYYY HH:mm");
```

---

## 4. 30 TEMPLATES REFERENCE

### 📋 **Quick Lookup Table**

| **Trigger Key**                | **Template Type**        | **Priority** | **requiredVariables** |
| ------------------------------ | ------------------------ | ------------ | --------------------- |
| **YeuCau.TAO_MOI**             | YEUCAU_CREATED           | normal       | 8 variables           |
| **YeuCau.TIEP_NHAN**           | YEUCAU_ACCEPTED          | normal       | 6 variables           |
| **YeuCau.TU_CHOI**             | YEUCAU_REJECTED          | **urgent**   | 5 variables           |
| **YeuCau.DIEU_PHOI**           | YEUCAU_DISPATCHED        | normal       | 7 variables           |
| **YeuCau.GUI_VE_KHOA**         | YEUCAU_RETURNED_TO_DEPT  | normal       | 5 variables           |
| **YeuCau.HOAN_THANH**          | YEUCAU_COMPLETED         | normal       | 6 variables           |
| **YeuCau.HUY_TIEP_NHAN**       | YEUCAU_CANCELLED         | **urgent**   | 5 variables           |
| **YeuCau.DOI_THOI_GIAN_HEN**   | YEUCAU_DEADLINE_CHANGED  | normal       | 7 variables           |
| **YeuCau.DANH_GIA**            | YEUCAU_RATED             | normal       | 6 variables           |
| **YeuCau.DONG**                | YEUCAU_CLOSED            | normal       | 5 variables           |
| **YeuCau.MO_LAI**              | YEUCAU_REOPENED          | normal       | 5 variables           |
| **YeuCau.NHAC_LAI**            | YEUCAU_REMINDER          | normal       | 6 variables           |
| **YeuCau.BAO_QUAN_LY**         | YEUCAU_ESCALATED         | **urgent**   | 6 variables           |
| **YeuCau.XOA**                 | YEUCAU_DELETED           | normal       | 4 variables           |
| **YeuCau.SUA**                 | YEUCAU_UPDATED           | normal       | 5 variables           |
| **CongViec.capNhatDeadline**   | TASK_DEADLINE_UPDATED    | normal       | 7 variables           |
| **CongViec.ganNguoiThamGia**   | TASK_PARTICIPANT_ADDED   | normal       | 7 variables           |
| **CongViec.xoaNguoiThamGia**   | TASK_PARTICIPANT_REMOVED | normal       | 5 variables           |
| **CongViec.thayDoiNguoiChinh** | TASK_ASSIGNEE_CHANGED    | normal       | 7 variables           |
| **CongViec.thayDoiUuTien**     | TASK_PRIORITY_CHANGED    | normal       | 7 variables           |
| **CongViec.capNhatTienDo**     | TASK_PROGRESS_UPDATED    | normal       | 7 variables           |
| **CongViec.uploadFile**        | TASK_FILE_UPLOADED       | normal       | 6 variables           |
| **CongViec.xoaFile**           | TASK_FILE_DELETED        | normal       | 6 variables           |
| **KPI.capNhatDiemQL**          | KPI_SCORE_UPDATED        | normal       | 7 variables           |
| **KPI.tuDanhGia**              | KPI_SELF_EVALUATED       | normal       | 5 variables           |
| **KPI.phanHoi**                | KPI_FEEDBACK_ADDED       | normal       | 4 variables           |

---

## 5. VÍ DỤ THỰC TẾ THEO MODULE

### 🎫 **MODULE 1: YEUCAU**

#### **Example 1: YEUCAU_DEADLINE_CHANGED - Đổi thời gian hẹn**

**Template variables:**

```
updaterName, requestTitle, requestCode,
oldDeadline, newDeadline, reason, requestId
```

**Code integration:**

```javascript
// File: yeuCau.service.js
const doiThoiGianHen = async (req) => {
  const { yeuCauId } = req.params;
  const { thoiGianHenMoi, lyDo } = req.body;
  const { user } = req;

  const yeuCau = await YeuCau.findById(yeuCauId);
  if (!yeuCau) throw new AppError(404, "Không tìm thấy yêu cầu");

  // ⚠️ QUAN TRỌNG: Lưu giá trị CŨ trước khi update
  const oldDeadline = yeuCau.ThoiGianHen;

  // Update
  yeuCau.ThoiGianHen = thoiGianHenMoi;
  await yeuCau.save();

  // Populate
  const populated = await YeuCau.findById(yeuCau._id)
    .populate("NguoiYeuCauID", "Ten")
    .populate("NguoiXuLyID", "Ten");

  // Get updater name
  const updater = await NhanVien.findById(user.NhanVienID).select("Ten");

  // Prepare context
  const context = {
    yeuCau: populated,
    performerId: user.NhanVienID,

    updaterName: updater?.Ten || "Quản trị viên",
    requestTitle: populated.TieuDe,
    requestCode: populated.MaYeuCau,
    oldDeadline: dayjs(oldDeadline).format("DD/MM/YYYY HH:mm"), // ← Giá trị CŨ
    newDeadline: dayjs(thoiGianHenMoi).format("DD/MM/YYYY HH:mm"), // ← Giá trị MỚI
    reason: lyDo || "Không có lý do",
    requestId: populated._id.toString(),
  };

  await triggerService.fire("YeuCau.DOI_THOI_GIAN_HEN", context);

  return populated;
};
```

#### **Example 2: YEUCAU_ESCALATED - Báo cáo quản lý**

**Template variables:**

```
requesterName, requestTitle, requestCode,
escalationReason, deadline, requestId
```

**Code integration:**

```javascript
const baoQuanLy = async (req) => {
  const { yeuCauId } = req.params;
  const { lyDo } = req.body;
  const { user } = req;

  const yeuCau = await YeuCau.findById(yeuCauId)
    .populate("NguoiYeuCauID", "Ten")
    .populate("KhoaDuocYeuCauID", "TruongKhoa"); // ← Lấy trưởng khoa

  if (!yeuCau) throw new AppError(404, "Không tìm thấy yêu cầu");

  // Update escalation flag
  yeuCau.DaBaoQuanLy = true;
  yeuCau.NgayBaoQuanLy = new Date();
  yeuCau.LyDoBaoQuanLy = lyDo;
  await yeuCau.save();

  // Context
  const context = {
    yeuCau: yeuCau,
    performerId: user.NhanVienID,
    specificRecipient: yeuCau.KhoaDuocYeuCauID?.TruongKhoa, // ← Gửi cho trưởng khoa

    requesterName: yeuCau.NguoiYeuCauID?.Ten || "Người yêu cầu",
    requestTitle: yeuCau.TieuDe,
    requestCode: yeuCau.MaYeuCau,
    escalationReason: lyDo,
    deadline: dayjs(yeuCau.ThoiGianHen).format("DD/MM/YYYY HH:mm"),
    requestId: yeuCau._id.toString(),
  };

  await triggerService.fire("YeuCau.BAO_QUAN_LY", context);

  return yeuCau;
};
```

---

### 📋 **MODULE 2: CONGVIEC**

#### **Example 3: TASK_DEADLINE_UPDATED - Đổi deadline công việc**

**File:** `congViec.service.js` - Method: `updateCongViec()`

```javascript
const updateCongViec = async (req) => {
  const { taskId } = req.params;
  const payload = req.body;
  const { user } = req;

  const congViec = await CongViec.findById(taskId);
  if (!congViec) throw new AppError(404, "Không tìm thấy công việc");

  // ─────────────────────────────────────────────────────────────────
  // 🆕 DETECT FIELD CHANGES
  // ─────────────────────────────────────────────────────────────────
  const changes = {};

  // Deadline changed?
  if (payload.deadline) {
    const newDeadline = new Date(payload.deadline);
    const oldDeadline = congViec.Deadline;

    if (oldDeadline?.getTime() !== newDeadline.getTime()) {
      changes.deadline = { old: oldDeadline, new: newDeadline };
    }
  }

  // Priority changed?
  if (payload.priority && payload.priority !== congViec.UuTien) {
    changes.priority = { old: congViec.UuTien, new: payload.priority };
  }

  // Update fields
  if (payload.deadline) congViec.Deadline = payload.deadline;
  if (payload.priority) congViec.UuTien = payload.priority;
  await congViec.save();

  // Populate
  const populated = await CongViec.findById(congViec._id)
    .populate("NguoiChinh", "Ten")
    .populate("NguoiGiaoViec", "Ten")
    .populate("NguoiThamGia", "Ten");

  const updater = await NhanVien.findById(user.NhanVienID).select("Ten");

  // ─────────────────────────────────────────────────────────────────
  // 🔔 FIRE NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────

  // 1. Deadline changed notification
  if (changes.deadline) {
    const context = {
      congViec: populated,
      performerId: user.NhanVienID,

      updaterName: updater?.Ten || "Quản trị viên",
      taskName: populated.TenCongViec,
      taskCode: populated.MaCongViec,
      oldDeadline: dayjs(changes.deadline.old).format("DD/MM/YYYY HH:mm"),
      newDeadline: dayjs(changes.deadline.new).format("DD/MM/YYYY HH:mm"),
      reason: payload.lyDoDoiDeadline || "Không có lý do",
      taskId: populated._id.toString(),
    };

    try {
      await triggerService.fire("CongViec.capNhatDeadline", context);
    } catch (err) {
      console.error("[updateCongViec] Deadline notification error:", err);
    }
  }

  // 2. Priority changed notification
  if (changes.priority) {
    const priorityMap = { 1: "Thấp", 2: "Trung bình", 3: "Cao", 4: "Khẩn cấp" };

    const context = {
      congViec: populated,
      performerId: user.NhanVienID,

      updaterName: updater?.Ten || "Quản trị viên",
      taskName: populated.TenCongViec,
      taskCode: populated.MaCongViec,
      oldPriority: priorityMap[changes.priority.old] || "Không xác định",
      newPriority: priorityMap[changes.priority.new] || "Không xác định",
      reason: payload.lyDoDoiUuTien || "Không có lý do",
      taskId: populated._id.toString(),
    };

    try {
      await triggerService.fire("CongViec.thayDoiUuTien", context);
    } catch (err) {
      console.error("[updateCongViec] Priority notification error:", err);
    }
  }

  return populated;
};
```

#### **Example 4: TASK_PARTICIPANT_ADDED - Thêm người tham gia**

```javascript
const ganNguoiThamGia = async (req) => {
  const { taskId } = req.params;
  const { nguoiThamGiaIds } = req.body; // Array of NhanVienID
  const { user } = req;

  const congViec = await CongViec.findById(taskId);
  if (!congViec) throw new AppError(404, "Không tìm thấy công việc");

  // Filter new participants (not already in list)
  const currentIds = congViec.NguoiThamGia.map((id) => id.toString());
  const newParticipantIds = nguoiThamGiaIds.filter(
    (id) => !currentIds.includes(id.toString())
  );

  if (newParticipantIds.length === 0) {
    return { message: "Không có người tham gia mới" };
  }

  // Add to array
  congViec.NguoiThamGia.push(...newParticipantIds);
  await congViec.save();

  // Populate
  const populated = await CongViec.findById(congViec._id)
    .populate("NguoiChinh", "Ten")
    .populate("NguoiThamGia", "Ten");

  const adder = await NhanVien.findById(user.NhanVienID).select("Ten");

  // ─────────────────────────────────────────────────────────────────
  // 🔔 FIRE NOTIFICATION FOR EACH NEW PARTICIPANT
  // ─────────────────────────────────────────────────────────────────
  for (const participantId of newParticipantIds) {
    const context = {
      congViec: populated,
      performerId: user.NhanVienID,
      specificRecipient: participantId, // ← Chỉ gửi cho người này

      adderName: adder?.Ten || "Quản trị viên",
      taskName: populated.TenCongViec,
      taskCode: populated.MaCongViec,
      role: "Người tham gia",
      deadline: dayjs(populated.Deadline).format("DD/MM/YYYY HH:mm"),
      description: populated.MoTa || "Không có mô tả",
      taskId: populated._id.toString(),
    };

    try {
      await triggerService.fire("CongViec.ganNguoiThamGia", context);
    } catch (err) {
      console.error(`[ganNguoiThamGia] Notification error:`, err);
    }
  }

  return populated;
};
```

---

### 🎯 **MODULE 3: KPI**

#### **Example 5: KPI_SCORE_UPDATED - Cập nhật điểm KPI**

```javascript
// File: kpi.controller.js
const capNhatDiemQL = catchAsync(async (req, res, next) => {
  const { evaluationId, nhiemVuId } = req.params;
  const { diemQL, nhanXet } = req.body;
  const { user } = req;

  // Find evaluation
  const danhGia = await DanhGiaKPI.findById(evaluationId)
    .populate("NhanVienID", "Ten")
    .populate("NguoiDanhGiaID", "Ten")
    .populate("ChuKyID", "TenChuKy");

  if (!danhGia) throw new AppError(404, "Không tìm thấy đánh giá KPI");

  // Find routine duty in evaluation
  const nhiemVu = danhGia.DanhGiaNhiemVuThuongQuy.find(
    (nv) => nv.NhiemVuThuongQuyID.toString() === nhiemVuId
  );

  if (!nhiemVu) throw new AppError(404, "Không tìm thấy nhiệm vụ");

  // Update score
  nhiemVu.DiemQL = diemQL;
  nhiemVu.NhanXet = nhanXet;
  await danhGia.save();

  // Get nhiemVu name
  const nhiemVuDoc = await NhiemVuThuongQuy.findById(nhiemVuId).select(
    "TenNhiemVu GiaTriMax"
  );

  // ─────────────────────────────────────────────────────────────────
  // 🔔 FIRE NOTIFICATION TO EMPLOYEE
  // ─────────────────────────────────────────────────────────────────
  const context = {
    danhGiaKPI: danhGia,
    performerId: user.NhanVienID,

    managerName: danhGia.NguoiDanhGiaID?.Ten || "Quản lý",
    cycleName: danhGia.ChuKyID?.TenChuKy || "Chu kỳ",
    taskName: nhiemVuDoc?.TenNhiemVu || "Nhiệm vụ",
    score: diemQL,
    maxScore: nhiemVuDoc?.GiaTriMax || 100,
    feedback: nhanXet || "Không có nhận xét",
    evaluationId: danhGia._id.toString(),
  };

  try {
    await triggerService.fire("KPI.capNhatDiemQL", context);
  } catch (err) {
    console.error("[capNhatDiemQL] Notification error:", err.message);
  }

  return sendResponse(
    res,
    200,
    true,
    { danhGia },
    null,
    "Cập nhật điểm KPI thành công"
  );
});
```

---

## 6. TESTING & DEBUGGING

### 🧪 **Checklist Testing:**

#### **1. Template Rendering Test:**

```javascript
// Test trong MongoDB shell hoặc seed script
const NotificationTemplate = require("../models/Notification");

const testTemplateRendering = async () => {
  const template = await NotificationTemplate.findOne({
    type: "YEUCAU_CREATED",
  });

  const testContext = {
    requestCode: "YC-001",
    requesterName: "Nguyễn Văn A",
    sourceDept: "Khoa Nội",
    requestTitle: "Yêu cầu sửa máy in",
    targetDept: "Khoa CNTT",
    requestType: "Sửa chữa thiết bị",
    deadline: "16/12/2025 14:30",
    requestId: "507f1f77bcf86cd799439011",
  };

  const rendered = template.renderVariables(testContext);

  console.log("✅ Title:", rendered.title);
  console.log("✅ Body:", rendered.body);
  console.log("✅ URL:", rendered.actionUrl);

  // Expected output:
  // Title: 🆕 Yêu cầu mới: YC-001
  // Body: Nguyễn Văn A (Khoa Nội) gửi yêu cầu "Yêu cầu sửa máy in"
  //       đến Khoa CNTT. Loại yêu cầu: Sửa chữa thiết bị.
  //       Thời gian hẹn: 16/12/2025 14:30.
  // URL: /quan-ly-cong-viec/yeu-cau/507f1f77bcf86cd799439011
};
```

#### **2. Trigger Integration Test:**

```javascript
// Test fire trigger manually
const triggerService = require("./services/triggerService");

const testTrigger = async () => {
  try {
    await triggerService.fire("YeuCau.TIEP_NHAN", {
      yeuCau: mockYeuCau,
      performerId: "507f1f77bcf86cd799439011",
      accepterName: "Test User",
      requestTitle: "Test Request",
      requestCode: "YC-TEST",
      deadline: "16/12/2025 15:00",
      note: "Test notification",
      requestId: "507f1f77bcf86cd799439012",
    });

    console.log("✅ Trigger fired successfully");
  } catch (error) {
    console.error("❌ Trigger error:", error.message);
  }
};

// Check logs for:
// ✅ [triggerService] Firing trigger: YeuCau.TIEP_NHAN
// ✅ [triggerService] Handler: yeuCauStateMachine
// ✅ [triggerService] Recipients found: 1 NhanVienIDs
// ✅ [notificationService] Sent 1 notifications
```

#### **3. Socket.IO Real-time Test:**

**Frontend browser console:**

```javascript
// Check socket connection
console.log("Socket connected:", window.socketInstance?.connected);

// Listen for test notification
window.socketInstance?.on("newNotification", (data) => {
  console.log("🔔 Received notification:", data);
  console.log("Title:", data.title);
  console.log("Body:", data.body);
  console.log("Action URL:", data.actionUrl);
});
```

#### **4. Database Verification:**

```javascript
// MongoDB shell commands

// Check Notification collection
db.notifications.find({ type: "YEUCAU_CREATED" }).limit(5).pretty();

// Check unread notifications for user
db.notifications
  .find({
    recipientId: ObjectId("USER_ID"),
    isRead: false,
  })
  .count();

// Check template usage stats
db.notificationtemplates
  .find({}, { type: 1, usageCount: 1, lastUsedAt: 1 })
  .pretty();

// Check latest notifications
db.notifications.find().sort({ createdAt: -1 }).limit(10).pretty();
```

---

### 🐛 **Common Issues & Solutions:**

| **Problem**                        | **Cause**                                  | **Solution**                                        |
| ---------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| Notification không hiển thị        | Socket không connect                       | Check `SOCKET_URL` env, verify JWT token            |
| Template render sai                | Variable name không khớp requiredVariables | Log context, check spelling, case-sensitive         |
| Không gửi cho đúng người           | Handler logic sai hoặc NhanVienID wrong    | Debug handler, verify populated document            |
| Gửi cả cho performer               | `excludePerformer: false`                  | Set `excludePerformer: true` in config              |
| Missing nested data (Ten, TenKhoa) | Populate thiếu hoặc sai field              | Add `.populate("FieldID", "Ten Email")`             |
| Date format sai (object Date)      | Không format với dayjs                     | Use `dayjs(date).format("DD/MM/YYYY HH:mm")`        |
| ObjectId thay vì tên               | Forgot to populate                         | Always populate before preparing context            |
| Undefined variables trong template | Variable name typo                         | Check requiredVariables list, match exactly         |
| Duplicate notifications            | Fire trigger nhiều lần                     | Check business logic, ensure single fire per action |
| Notification lag                   | Quá nhiều recipients                       | Use batch operations, optimize handler              |

---

## 7. BEST PRACTICES

### ✅ **DO (NÊN LÀM):**

1. **Always populate trước khi fire trigger**

   ```javascript
   const populated = await YeuCau.findById(id)
     .populate("NguoiYeuCauID", "Ten")
     .populate("KhoaYeuCauID", "TenKhoa");
   ```

2. **Use try-catch để không break business logic**

   ```javascript
   try {
     await triggerService.fire("YeuCau.TAO_MOI", context);
   } catch (error) {
     console.error("[taoYeuCau] Notification error:", error.message);
     // Business logic continues...
   }
   ```

3. **Format dates consistently**

   ```javascript
   deadline: dayjs(date).format("DD/MM/YYYY HH:mm");
   ```

4. **Log errors for debugging**

   ```javascript
   console.error("[methodName] Notification error:", error.message);
   ```

5. **Use descriptive variable names**

   ```javascript
   updaterName, requesterName, taskName; // ✅ Clear
   ```

6. **Exclude performer cho user actions**

   ```javascript
   excludePerformer: true; // Don't notify user about their own action
   ```

7. **Pass flat variables**

   ```javascript
   context: {
     userName: user.Ten,        // ✅ Flat
     userEmail: user.Email,     // ✅ Flat
   }
   ```

8. **Test template rendering trước**
   ```javascript
   const rendered = template.renderVariables(testContext);
   console.log("Preview:", rendered.title, rendered.body);
   ```

### ❌ **DON'T (KHÔNG NÊN):**

1. **Không dùng nested object trong template variables**

   ```javascript
   // ❌ WRONG
   context: {
     user: {
       name: "A";
     }
   }
   template: "{{user.name}}";

   // ✅ CORRECT
   context: {
     userName: "A";
   }
   template: "{{userName}}";
   ```

2. **Không hardcode user IDs**

   ```javascript
   // ❌ WRONG
   recipients: ["507f1f77bcf86cd799439011"];

   // ✅ CORRECT
   recipients: extractedFromDocument;
   ```

3. **Không skip populate**

   ```javascript
   // ❌ WRONG
   const yeuCau = await YeuCau.findById(id);
   context.requesterName = yeuCau.NguoiYeuCauID; // ObjectId!

   // ✅ CORRECT
   const yeuCau = await YeuCau.findById(id).populate("NguoiYeuCauID", "Ten");
   context.requesterName = yeuCau.NguoiYeuCauID?.Ten;
   ```

4. **Không throw error khi notification fail**

   ```javascript
   // ❌ WRONG
   await triggerService.fire(...);  // Might crash business logic

   // ✅ CORRECT
   try {
     await triggerService.fire(...);
   } catch (error) {
     console.error("Notification error:", error);
   }
   ```

5. **Không forget performerId**

   ```javascript
   // ❌ WRONG
   context: { yeuCau: populated }  // Missing performerId

   // ✅ CORRECT
   context: {
     yeuCau: populated,
     performerId: user.NhanVienID  // For exclusion
   }
   ```

6. **Không duplicate trigger keys**

   ```javascript
   // ❌ WRONG - Same key for different actions
   "YeuCau.update": { ... }  // General update
   "YeuCau.update": { ... }  // Deadline update (overwrites!)

   // ✅ CORRECT - Unique keys
   "YeuCau.capNhatThongTin": { ... }
   "YeuCau.DOI_THOI_GIAN_HEN": { ... }
   ```

7. **Không dùng English trong template content**

   ```javascript
   // ❌ WRONG
   titleTemplate: "New request created";

   // ✅ CORRECT
   titleTemplate: "🆕 Yêu cầu mới";
   ```

8. **Không skip testing**
   ```javascript
   // Always test before deploy:
   // 1. Template rendering
   // 2. Trigger integration
   // 3. Socket.IO delivery
   // 4. Database records
   ```

---

### 📊 **Performance Tips:**

#### **1. Batch Operations:**

```javascript
// ✅ GOOD: Send to multiple users at once
const recipientIds = [id1, id2, id3, ...];
await notificationService.sendToMany(recipientIds, template, context);

// ❌ BAD: Loop and send one by one
for (const id of recipientIds) {
  await notificationService.send(id, template, context);  // Slow!
}
```

#### **2. Selective Populate:**

```javascript
// ✅ GOOD: Populate only needed fields
.populate("NguoiChinh", "Ten Email")
.populate("KhoaID", "TenKhoa")

// ❌ BAD: Populate everything (slower, more memory)
.populate("NguoiChinh")
.populate("KhoaID")
```

#### **3. Cache Templates:**

```javascript
// ✅ GOOD: Load template once, reuse multiple times
const template = await NotificationTemplate.findOne({ type: "TASK_ASSIGNED" });

for (const task of tasks) {
  await notificationService.sendWithTemplate(recipientId, template, context);
}

// ❌ BAD: Load template in each iteration
for (const task of tasks) {
  const template = await NotificationTemplate.findOne(...);  // Repeated DB call!
  await notificationService.send(...);
}
```

#### **4. Async/Parallel Operations:**

```javascript
// ✅ GOOD: Fire notifications in parallel with other operations
await Promise.all([
  yeuCau.save(),
  triggerService.fire("YeuCau.TAO_MOI", context),
  logService.createLog("YeuCau created"),
]);

// ❌ BAD: Sequential operations (slower)
await yeuCau.save();
await triggerService.fire("YeuCau.TAO_MOI", context);
await logService.createLog("YeuCau created");
```

---

## 📝 APPENDIX: Full Variable Mapping

### **YeuCau Module Variables:**

| **Variable**     | **Database Source**               | **Type** | **Format**     |
| ---------------- | --------------------------------- | -------- | -------------- |
| requestCode      | `yeuCau.MaYeuCau`                 | String   | Direct         |
| requestTitle     | `yeuCau.TieuDe`                   | String   | Direct         |
| requestId        | `yeuCau._id`                      | ObjectId | `.toString()`  |
| requesterName    | `yeuCau.NguoiYeuCauID.Ten`        | String   | Populate       |
| accepterName     | `yeuCau.NguoiXuLyID.Ten`          | String   | Populate       |
| rejectorName     | `performer.Ten`                   | String   | Query NhanVien |
| dispatcherName   | `yeuCau.NguoiDieuPhoiID.Ten`      | String   | Populate       |
| performerName    | `yeuCau.NguoiXuLyID.Ten`          | String   | Populate       |
| completerName    | `performer.Ten`                   | String   | Query NhanVien |
| cancellerName    | `performer.Ten`                   | String   | Query NhanVien |
| updaterName      | `performer.Ten`                   | String   | Query NhanVien |
| closerName       | `performer.Ten`                   | String   | Query NhanVien |
| reopenerName     | `performer.Ten`                   | String   | Query NhanVien |
| raterName        | `performer.Ten`                   | String   | Query NhanVien |
| deleterName      | `performer.Ten`                   | String   | Query NhanVien |
| sourceDept       | `yeuCau.KhoaYeuCauID.TenKhoa`     | String   | Populate       |
| targetDept       | `yeuCau.KhoaDuocYeuCauID.TenKhoa` | String   | Populate       |
| requestType      | `yeuCau.LoaiYeuCauID.TenLoai`     | String   | Populate       |
| deadline         | `yeuCau.ThoiGianHen`              | Date     | dayjs format   |
| oldDeadline      | `oldValue`                        | Date     | dayjs format   |
| newDeadline      | `newValue`                        | Date     | dayjs format   |
| content          | `yeuCau.NoiDung`                  | String   | Direct         |
| result           | `yeuCau.KetQua`                   | String   | Direct         |
| completedTime    | `yeuCau.NgayHoanThanh`            | Date     | dayjs format   |
| reason           | `payload.lyDo`                    | String   | From request   |
| note             | `payload.ghiChu`                  | String   | From request   |
| rating           | `payload.danhGia`                 | Number   | Direct         |
| feedback         | `payload.nhanXet`                 | String   | From request   |
| finalStatus      | `yeuCau.TrangThai`                | String   | Direct         |
| reminderNote     | `payload.noiDungNhac`             | String   | From request   |
| escalationReason | `payload.lyDoBaoQuanLy`           | String   | From request   |
| changedFields    | `Object.keys(changes).join(", ")` | String   | Computed       |

### **CongViec Module Variables:**

| **Variable**  | **Database Source**                 | **Type** | **Format**       |
| ------------- | ----------------------------------- | -------- | ---------------- |
| taskId        | `congViec._id`                      | ObjectId | `.toString()`    |
| taskName      | `congViec.TenCongViec`              | String   | Direct           |
| taskCode      | `congViec.MaCongViec`               | String   | Direct           |
| updaterName   | `performer.Ten`                     | String   | Query NhanVien   |
| adderName     | `performer.Ten`                     | String   | Query NhanVien   |
| removerName   | `performer.Ten`                     | String   | Query NhanVien   |
| assignerName  | `performer.Ten`                     | String   | Query NhanVien   |
| uploaderName  | `performer.Ten`                     | String   | Query NhanVien   |
| deleterName   | `performer.Ten`                     | String   | Query NhanVien   |
| oldDeadline   | `oldValue`                          | Date     | dayjs format     |
| newDeadline   | `newValue`                          | Date     | dayjs format     |
| deadline      | `congViec.Deadline`                 | Date     | dayjs format     |
| reason        | `payload.lyDo`                      | String   | From request     |
| role          | Custom or `"Người tham gia"`        | String   | Hardcoded/custom |
| description   | `congViec.MoTa`                     | String   | Direct           |
| currentStatus | `congViec.TrangThai`                | String   | Direct           |
| action        | `"cho bạn"` or custom               | String   | Computed         |
| oldPriority   | `priorityMap[oldValue]`             | String   | Map lookup       |
| newPriority   | `priorityMap[newValue]`             | String   | Map lookup       |
| oldProgress   | `congViec.TienDo`                   | Number   | Direct           |
| newProgress   | `payload.tienDo`                    | Number   | From request     |
| note          | `payload.ghiChu`                    | String   | From request     |
| fileCount     | `files.length`                      | Number   | Array length     |
| fileNames     | `files.map(f => f.name).join(", ")` | String   | Array join       |
| fileName      | `file.TenFile`                      | String   | Direct           |

### **KPI Module Variables:**

| **Variable**    | **Database Source**             | **Type** | **Format**     |
| --------------- | ------------------------------- | -------- | -------------- |
| evaluationId    | `danhGiaKPI._id`                | ObjectId | `.toString()`  |
| managerName     | `danhGiaKPI.NguoiDanhGiaID.Ten` | String   | Populate       |
| employeeName    | `danhGiaKPI.NhanVienID.Ten`     | String   | Populate       |
| cycleName       | `danhGiaKPI.ChuKyID.TenChuKy`   | String   | Populate       |
| taskName        | `nhiemVu.TenNhiemVu`            | String   | Query document |
| score           | `nhiemVu.DiemQL`                | Number   | Direct         |
| maxScore        | `nhiemVu.GiaTriMax`             | Number   | Direct         |
| feedback        | `nhiemVu.NhanXet`               | String   | Direct         |
| selfScore       | `danhGiaKPI.TongDiemTuDanhGia`  | Number   | Computed       |
| feedbackContent | `payload.phanHoi`               | String   | From request   |

---

## 🚀 PHASE 3 IMPLEMENTATION PLAN

### **Week 1: YeuCau Module (15 triggers)**

**Day 1-2: Refactor yeuCauStateMachine.js**

- Remove inline notification code (line 629-730)
- Use triggerService.fire() instead
- Update all state transition methods

**Day 3-4: Add trigger integrations**

- Integrate all 15 triggers into service methods
- Test each trigger individually

**Day 5: Create handler**

- Add yeuCauStateMachine handler to triggerService.js
- Test recipient extraction logic

### **Week 2: CongViec Module (8 triggers)**

**Day 1-2: Field change detection**

- Implement change detection in updateCongViec()
- Add deadline, priority, participant notifications

**Day 3-4: Participant management**

- Add/remove participant notifications
- Assignee change notifications

**Day 5: Testing**

- Integration testing
- Bug fixes

### **Week 3: KPI Module + Polish (3 triggers)**

**Day 1: KPI notifications**

- Score update notifications
- Self-evaluation notifications
- Feedback notifications

**Day 2-3: Comprehensive testing**

- Test all 30 triggers
- Performance testing
- Socket.IO delivery verification

**Day 4-5: Documentation & deployment**

- Update documentation
- Deploy to staging
- Production deployment

---

**Last Updated:** December 16, 2025  
**Version:** 2.0  
**Author:** GitHub Copilot  
**Status:** Phase 2 Complete ✅ - Ready for Phase 3 🚀
