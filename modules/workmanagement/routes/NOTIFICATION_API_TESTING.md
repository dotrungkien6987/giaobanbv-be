# Notification API Testing Guide

## Base URL

```
http://localhost:8020/api/workmanagement/notifications
```

## Authentication

All endpoints require authentication. Include JWT token in header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📋 NOTIFICATION TYPE ENDPOINTS

### 1. Get All Notification Types

```http
GET /types
GET /types?isActive=true
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "types": [
      {
        "_id": "...",
        "code": "yeucau-tao-moi",
        "name": "Thông báo tạo yêu cầu mới",
        "description": "Gửi khi có yêu cầu mới từ khoa khác",
        "variables": [
          {
            "name": "NguoiYeuCauID",
            "type": "ObjectId",
            "ref": "NhanVien",
            "isRecipientCandidate": true
          }
        ],
        "isActive": true
      }
    ],
    "total": 44
  }
}
```

### 2. Get Type by ID

```http
GET /types/:id
```

### 3. Get Type by Code

```http
GET /types/code/yeucau-tao-moi
```

### 4. Create Notification Type (Admin)

```http
POST /types

Body:
{
  "code": "test-notification",
  "name": "Test Notification",
  "description": "Test notification type",
  "variables": [
    {
      "name": "NguoiNhanID",
      "type": "ObjectId",
      "ref": "NhanVien",
      "isRecipientCandidate": true,
      "description": "Người nhận thông báo"
    },
    {
      "name": "TieuDe",
      "type": "String",
      "description": "Tiêu đề"
    }
  ],
  "isActive": true
}
```

### 5. Update Notification Type (Admin)

```http
PUT /types/:id

Body:
{
  "name": "Updated Name",
  "description": "Updated description",
  "isActive": false
}
```

### 6. Delete Notification Type (Admin)

```http
DELETE /types/:id
```

**Note:** Soft delete - sets `isActive = false`. Cannot delete if templates exist.

---

## 📧 NOTIFICATION TEMPLATE ENDPOINTS

### 1. Get All Templates

```http
GET /templates
GET /templates?typeCode=yeucau-tao-moi
GET /templates?isEnabled=true
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "_id": "...",
        "name": "Thông báo cho điều phối viên",
        "typeCode": "yeucau-tao-moi",
        "recipientConfig": {
          "variables": ["arrNguoiDieuPhoiID"]
        },
        "titleTemplate": "Yêu cầu mới: {{MaYeuCau}}",
        "bodyTemplate": "Khoa {{TenKhoaGui}} yêu cầu: {{TieuDe}}",
        "actionUrl": "/yeucau/{{_id}}",
        "icon": "notification",
        "priority": "normal",
        "isEnabled": true
      }
    ],
    "total": 53
  }
}
```

### 2. Get Template by ID

```http
GET /templates/:id
```

### 3. Create Template (Admin)

```http
POST /templates

Body:
{
  "name": "Template cho người yêu cầu",
  "typeCode": "yeucau-tao-moi",
  "recipientConfig": {
    "variables": ["NguoiYeuCauID"]
  },
  "titleTemplate": "Yêu cầu {{MaYeuCau}} đã được tiếp nhận",
  "bodyTemplate": "Yêu cầu '{{TieuDe}}' của bạn đã được gửi đến khoa {{TenKhoaNhan}}",
  "actionUrl": "/yeucau/{{_id}}",
  "icon": "check_circle",
  "priority": "normal",
  "isEnabled": true
}
```

**Validation:**

- `typeCode` must exist in NotificationType
- `recipientConfig.variables` must be recipient candidates of the type

### 4. Update Template (Admin)

```http
PUT /templates/:id

Body:
{
  "name": "Updated Template Name",
  "titleTemplate": "New title: {{MaYeuCau}}",
  "isEnabled": false
}
```

### 5. Delete Template (Admin)

```http
DELETE /templates/:id
```

**Note:** Soft delete - sets `isEnabled = false`

### 6. Preview Template with Sample Data

```http
POST /templates/:id/preview

Body:
{
  "data": {
    "MaYeuCau": "YC-001",
    "TieuDe": "Yêu cầu hỗ trợ kỹ thuật",
    "TenKhoaGui": "Khoa Nội",
    "TenKhoaNhan": "Khoa Ngoại",
    "_id": "64f3cb6035c717ab00d75b8b"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "preview": {
      "title": "Yêu cầu mới: YC-001",
      "body": "Khoa Khoa Nội yêu cầu: Yêu cầu hỗ trợ kỹ thuật",
      "actionUrl": "/yeucau/64f3cb6035c717ab00d75b8b",
      "icon": "notification",
      "priority": "normal"
    },
    "extractedVars": ["MaYeuCau", "TieuDe", "TenKhoaGui", "_id"]
  }
}
```

---

## 🛠️ ADMIN TOOLS

### 1. Clear Cache

```http
POST /clear-cache
```

**Description:** Manually clear notification service cache (types & templates)

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Cache cleared successfully"
  }
}
```

### 2. Test Send Notification

```http
POST /test-send

Body:
{
  "type": "yeucau-tao-moi",
  "data": {
    "_id": "64f3cb6035c717ab00d75b8b",
    "MaYeuCau": "YC-TEST-001",
    "TieuDe": "Test notification",
    "TenKhoaGui": "Khoa Nội",
    "TenKhoaNhan": "Khoa Ngoại",
    "NguoiYeuCauID": "66b1dba74f79822a4752d90d",
    "arrNguoiDieuPhoiID": ["66b1dba74f79822a4752d90d"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "result": {
      "success": true,
      "sent": 2,
      "failed": 0
    }
  }
}
```

---

## 🧪 TESTING WORKFLOW

### Step 1: Verify Types Exist

```bash
GET /types
# Should return 44 types from seed data
```

### Step 2: Verify Templates Exist

```bash
GET /templates
# Should return 53 templates from seed data
```

### Step 3: Get Type Details

```bash
GET /types/code/yeucau-tao-moi
# Check variables structure
```

### Step 4: Get Templates for Type

```bash
GET /templates?typeCode=yeucau-tao-moi
# Should return templates for this type
```

### Step 5: Preview Template

```bash
POST /templates/:templateId/preview
Body: { "data": { ...sample data... } }
# Verify rendering works correctly
```

### Step 6: Test Send (with Real User IDs)

```bash
POST /test-send
Body: {
  "type": "yeucau-tao-moi",
  "data": { ...real NhanVienIDs and data... }
}
# Check notification created in DB
# Verify socket event emitted
```

### Step 7: Create New Template

```bash
POST /templates
Body: { ...new template data... }
# Verify validation works
```

### Step 8: Update Template

```bash
PUT /templates/:id
Body: { "isEnabled": false }
# Verify cache is cleared
```

---

## ❌ ERROR RESPONSES

### Type Not Found

```json
{
  "success": false,
  "errors": {
    "message": "Không tìm thấy notification type"
  },
  "message": "TYPE_NOT_FOUND"
}
```

### Validation Error

```json
{
  "success": false,
  "errors": {
    "message": "Code và name là bắt buộc"
  },
  "message": "VALIDATION_ERROR"
}
```

### Duplicate Code

```json
{
  "success": false,
  "errors": {
    "message": "Notification type với code 'yeucau-tao-moi' đã tồn tại"
  },
  "message": "DUPLICATE_CODE"
}
```

### Type In Use

```json
{
  "success": false,
  "errors": {
    "message": "Không thể xóa type này vì có 3 template(s) đang sử dụng"
  },
  "message": "TYPE_IN_USE"
}
```

### Invalid Recipient Variable

```json
{
  "success": false,
  "errors": {
    "message": "Variable 'InvalidVar' không phải recipient candidate của type 'yeucau-tao-moi'"
  },
  "message": "INVALID_RECIPIENT_VARIABLE"
}
```

---

## 🔐 AUTHORIZATION

**Current Implementation:** All endpoints require `authentication.loginRequired`

**Recommended:** Add role-based access control for admin-only endpoints:

- Type CRUD → Admin only
- Template CRUD → Admin only
- Preview → All authenticated users
- Test Send → Admin only
- Clear Cache → Admin only

**Example Middleware:**

```javascript
const adminOnly = (req, res, next) => {
  if (req.user.PhanQuyen < 3) {
    // 3 = Admin
    throw new AppError(403, "Không có quyền truy cập", "FORBIDDEN");
  }
  next();
};

router.post(
  "/types",
  authentication.loginRequired,
  adminOnly,
  controller.createType
);
```

---

## 📊 DATABASE QUERIES

**Count Types:**

```javascript
db.notificationtypes.countDocuments({ isActive: true });
```

**Count Templates:**

```javascript
db.notificationtemplates.countDocuments({ isEnabled: true });
```

**Find Templates by Type:**

```javascript
db.notificationtemplates.find({ typeCode: "yeucau-tao-moi", isEnabled: true });
```

**Check Notifications Created:**

```javascript
db.notifications
  .find({ type: "yeucau-tao-moi" })
  .sort({ createdAt: -1 })
  .limit(10);
```

---

## 🎯 NEXT STEPS

1. **Add Postman Collection** - Import và test tất cả endpoints
2. **Implement Admin Role Check** - Add middleware cho admin-only routes
3. **Add Request Validation** - Use Joi hoặc express-validator
4. **Add Pagination** - Cho GET /types và GET /templates
5. **Add Search/Filter** - Search by name, description
6. **Add Bulk Operations** - Enable/disable multiple templates
7. **Add Usage Statistics** - Track template usage count

---

**Document Version:** 1.0  
**Date:** 2025-12-20  
**Status:** Ready for Testing
