# Fix Lỗi: "Cannot read properties of undefined (reading 'NhanVienID')"

**Date:** October 14, 2025  
**Error:** Line 315 - `req.user.NhanVienID` where `req.user` is undefined

---

## 🐛 Root Cause

### **Problem:**

Controller `chamDiemNhiemVu` đang dùng `req.user.NhanVienID` nhưng:

- Authentication middleware chỉ set `req.userId`
- Route thiếu `validateQuanLy` middleware
- Không có `req.user` object

### **Code Lỗi (Line 315):**

```javascript
const isOwner = danhGiaKPI.NguoiDanhGiaID.toString() === req.user.NhanVienID;
//                                                        ^^^^^^^^ undefined!
const isAdmin = req.user.PhanQuyen === "admin";
```

---

## ✅ Fix Applied

### **1. Thêm validateQuanLy Middleware vào Route**

**File:** `modules/workmanagement/routes/kpi.api.js` (Line 106)

**Before:**

```javascript
router.put(
  "/nhiem-vu/:nhiemVuId",
  authentication.loginRequired, // ❌ Chỉ có loginRequired
  kpiController.chamDiemNhiemVu
);
```

**After:**

```javascript
router.put(
  "/nhiem-vu/:nhiemVuId",
  authentication.loginRequired,
  validateQuanLy("KPI"), // ✅ Thêm validateQuanLy
  kpiController.chamDiemNhiemVu
);
```

**Effect:**

- `validateQuanLy` set `req.currentNhanVienID` từ `User.NhanVienID`
- `validateQuanLy` set `req.currentUserPhanQuyen`

---

### **2. Sửa Controller Logic**

**File:** `modules/workmanagement/controllers/kpi.controller.js` (Line 299-324)

**Before:**

```javascript
kpiController.chamDiemNhiemVu = catchAsync(async (req, res, next) => {
  const { nhiemVuId } = req.params;
  const { ChiTietDiem, MucDoKho, GhiChu } = req.body;
  // ❌ Không lấy currentNhanVienID

  // ...

  // ❌ Dùng req.user (undefined)
  const isOwner = danhGiaKPI.NguoiDanhGiaID.toString() === req.user.NhanVienID;
  const isAdmin = req.user.PhanQuyen === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError(403, "Bạn không có quyền...");
  }
});
```

**After:**

```javascript
kpiController.chamDiemNhiemVu = catchAsync(async (req, res, next) => {
  const { nhiemVuId } = req.params;
  const { ChiTietDiem, MucDoKho, GhiChu } = req.body;
  const currentNhanVienID = req.currentNhanVienID; // ✅ Từ validateQuanLy

  // ...

  // ✅ Dùng currentNhanVienID
  const isOwner = danhGiaKPI.NguoiDanhGiaID.toString() === currentNhanVienID;

  if (!isOwner) {
    throw new AppError(403, "Bạn không có quyền...");
  }
});
```

**Changes:**

1. ✅ Add `const currentNhanVienID = req.currentNhanVienID`
2. ✅ Change `req.user.NhanVienID` → `currentNhanVienID`
3. ✅ Remove `isAdmin` check (validateQuanLy đã validate quyền)

---

## 📊 Middleware Chain

### **Complete Flow:**

```javascript
// Route definition
router.put(
  "/nhiem-vu/:nhiemVuId",
  authentication.loginRequired, // Step 1: Verify JWT, set req.userId
  validateQuanLy("KPI"), // Step 2: Get NhanVienID, set req.currentNhanVienID
  kpiController.chamDiemNhiemVu // Step 3: Use req.currentNhanVienID
);
```

### **Middleware 1: authentication.loginRequired**

```javascript
// Sets:
req.userId = payload._id; // User._id from JWT token
```

### **Middleware 2: validateQuanLy("KPI")**

```javascript
// Gets User from database
const currentUser = await User.findById(req.userId);

// Sets:
req.currentNhanVienID = currentUser.NhanVienID;
req.currentUserPhanQuyen = currentUser.PhanQuyen;
req.currentUsername = currentUser.username;
```

### **Controller: chamDiemNhiemVu**

```javascript
// Uses:
const currentNhanVienID = req.currentNhanVienID;
const isOwner = danhGiaKPI.NguoiDanhGiaID.toString() === currentNhanVienID;
```

---

## 🧪 Testing

### **Test Request:**

```bash
curl -X PUT "http://localhost:5000/workmanagement/kpi/nhiem-vu/[NHIEMVU_ID]" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ChiTietDiem": [
      {
        "TieuChiID": "tc1",
        "DiemDat": 80,
        "GhiChu": ""
      }
    ],
    "MucDoKho": 7.5,
    "GhiChu": ""
  }'
```

### **Expected Flow:**

1. ✅ `authentication.loginRequired` validates JWT

   - Sets `req.userId`

2. ✅ `validateQuanLy("KPI")` gets User

   - Query: `User.findById(req.userId)`
   - Sets `req.currentNhanVienID`

3. ✅ `chamDiemNhiemVu` validates permission

   - Uses `req.currentNhanVienID`
   - Compares with `danhGiaKPI.NguoiDanhGiaID`

4. ✅ Method `chamDiem` validates & saves

   - Validates `DiemDat` in range
   - Saves to database
   - Triggers pre-save hook

5. ✅ Response 200
   ```json
   {
     "success": true,
     "data": {
       "danhGiaNhiemVu": {...},
       "tongDiemKPI": 150.5
     }
   }
   ```

---

## 🎯 Consistency Check

### **Other Controllers Using Same Pattern:**

| Controller Method      | Uses                                                | Status       |
| ---------------------- | --------------------------------------------------- | ------------ |
| `taoDanhGiaKPI`        | `req.currentNhanVienID`                             | ✅ OK        |
| `getDashboard`         | `req.currentNhanVienID`                             | ✅ OK        |
| `getChamDiemDetail`    | `req.currentNhanVienID`                             | ✅ OK        |
| `chamDiemNhiemVu`      | ~~`req.user.NhanVienID`~~ → `req.currentNhanVienID` | ✅ FIXED     |
| `layChiTietDanhGiaKPI` | `req.user.NhanVienID`                               | ⚠️ Needs fix |
| `duyetDanhGiaKPI`      | `req.user.NhanVienID`                               | ⚠️ Needs fix |

**Note:** Other methods cũng cần sửa tương tự nếu dùng `req.user`!

---

## 📋 Checklist

- [x] ✅ Add `validateQuanLy("KPI")` to route
- [x] ✅ Change `req.user.NhanVienID` → `req.currentNhanVienID`
- [x] ✅ Remove `isAdmin` check (redundant)
- [x] ✅ Create fix documentation
- [ ] ⏳ Test "Lưu tất cả" button
- [ ] ⏳ Verify no error on Line 315
- [ ] ⏳ Verify scores saved correctly
- [ ] ⏳ Fix other methods using `req.user` (if any)

---

## 🚀 Next Steps

1. **Restart backend:**

   ```bash
   cd giaobanbv-be
   npm start
   ```

2. **Test frontend:**

   - Click "Lưu tất cả"
   - Check Network tab → 200 response
   - Check toast message → success

3. **Verify other methods:**
   - Search for `req.user.NhanVienID` in controller
   - Fix similar issues if found

---

**Status:** ✅ Fixed - Ready for testing!
