# Fix: Approve KPI Permission Logic - FINAL

**Date:** October 16, 2025  
**Issue:** Lỗi 401 Unauthorized khi duyệt KPI do user chưa có NhanVienID

---

## 🐛 Vấn Đề

### Lỗi Cuối Cùng:

```
ERROR AppError: Tài khoản hiện tại chưa được gán với Nhân viên (NhanVienID)
    at kpi.controller.js:471:11
  statusCode: 401,
  errorType: 'Unauthorized'
```

### Root Cause:

**User chưa được liên kết với NhanVienID:**

- JWT token có thể không chứa `NhanVienID` nếu user chưa được admin gán
- Backend đọc `req.user.NhanVienID` → `undefined` → Crash khi dùng trong query
- Logic check sai: kiểm tra `currentNhanVienID` trước khi check admin → Admin cũng bị chặn

---

## ✅ Giải Pháp Cuối Cùng

### File Changed:

- `modules/workmanagement/controllers/kpi.controller.js`

### Logic Đúng (Line 470-495):

```javascript
// ✅ FIX: Đọc NhanVienID từ req.user (JWT token)
const currentNhanVienID = req.user?.NhanVienID;
const userPhanQuyen = req.user?.PhanQuyen;

// Kiểm tra user chưa có NhanVienID (chỉ admin mới được bypass)
if (
  !currentNhanVienID &&
  userPhanQuyen !== "admin" &&
  userPhanQuyen !== "superadmin"
) {
  throw new AppError(
    401,
    "Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên. Vui lòng liên hệ quản trị viên để cập nhật thông tin.",
    "Unauthorized"
  );
}

const isAdmin = userPhanQuyen === "admin" || userPhanQuyen === "superadmin";
let hasPermission = false;

if (isAdmin) {
  // Admin/SuperAdmin có quyền duyệt tất cả (không cần NhanVienID)
  hasPermission = true;
} else if (currentNhanVienID) {
  // Check relationship trong bảng QuanLyNhanVien với LoaiQuanLy = "KPI"
  const quanLyRelation = await QuanLyNhanVien.findOne({
    NguoiQuanLyID: currentNhanVienID,
    NhanVienID: nhanVienBeingEvaluatedId,
    LoaiQuanLy: "KPI",
    isDeleted: { $ne: true },
  }).lean();

  if (quanLyRelation) {
    hasPermission = true;
  }
}

if (!hasPermission) {
  throw new AppError(
    403,
    "Bạn không có quyền duyệt KPI của nhân viên này. Vui lòng kiểm tra phân quyền quản lý.",
    "Forbidden"
  );
}
```

---

## 🎯 Permission Logic Tree (Final)

```
User đang duyệt KPI của Nhân viên B
│
├─ PhanQuyen === "admin" hoặc "superadmin"
│  └─ ✅ Cho phép duyệt TẤT CẢ (bypass NhanVienID check)
│
├─ NhanVienID === null/undefined
│  └─ ❌ 401 "Tài khoản chưa được liên kết..."
│
└─ Check bảng QuanLyNhanVien:
   └─ EXISTS {
        NguoiQuanLyID: currentUser.NhanVienID,
        NhanVienID: B._id,
        LoaiQuanLy: "KPI",
        isDeleted: { $ne: true }
      }
      ├─ ✅ Có record → Cho phép duyệt
      └─ ❌ Không có → 403 "Không có quyền duyệt..."
```

---

## 📊 Test Scenarios

### ✅ Scenario 1: Admin không có NhanVienID

```javascript
User: { PhanQuyen: "admin", NhanVienID: null }
KPI: { NhanVienID: "any-nhanvien-id" }
Result: ✅ Cho phép (Admin bypass)
```

### ✅ Scenario 2: SuperAdmin duyệt KPI

```javascript
User: { PhanQuyen: "superadmin", NhanVienID: "123" }
KPI: { NhanVienID: "any-nhanvien-id" }
Result: ✅ Cho phép (SuperAdmin bypass)
```

### ✅ Scenario 3: Quản lý có NhanVienID + có quan hệ KPI

```javascript
User: { PhanQuyen: "quanly", NhanVienID: "manager-A" }
QuanLyNhanVien: {
  NguoiQuanLyID: "manager-A",
  NhanVienID: "employee-B",
  LoaiQuanLy: "KPI"
}
KPI: { NhanVienID: "employee-B" }
Result: ✅ Cho phép
```

### ❌ Scenario 4: Quản lý CHƯA có NhanVienID

```javascript
User: { PhanQuyen: "quanly", NhanVienID: null }
Result: ❌ 401 "Tài khoản chưa được liên kết..."
```

### ❌ Scenario 5: Quản lý có NhanVienID nhưng KHÔNG có quan hệ KPI

```javascript
User: { PhanQuyen: "quanly", NhanVienID: "manager-A" }
QuanLyNhanVien: {
  NguoiQuanLyID: "manager-A",
  NhanVienID: "employee-B",
  LoaiQuanLy: "NGHIEP_VU"  ← KHÔNG phải "KPI"
}
KPI: { NhanVienID: "employee-B" }
Result: ❌ 403 "Không có quyền duyệt..."
```

### ❌ Scenario 6: Nhân viên thường

```javascript
User: { PhanQuyen: "nhanvien", NhanVienID: "employee-C" }
Result: ❌ 403 (Không có record QuanLyNhanVien)
```

---

## 🔧 Changes Summary

| Aspect                | Before (❌)                          | After (✅)                            |
| --------------------- | ------------------------------------ | ------------------------------------- |
| **NhanVienID source** | `req.currentNhanVienID` (middleware) | `req.user.NhanVienID` (JWT token)     |
| **Admin bypass**      | Không đúng thứ tự                    | Admin bypass NhanVienID check TRƯỚC   |
| **QuanLyNhanVien**    | Thiếu `isDeleted` filter             | Có `isDeleted: { $ne: true }`         |
| **Error message**     | Generic                              | Rõ ràng, hướng dẫn user liên hệ admin |
| **Logic flow**        | Check NhanVienID → Check admin       | Check admin → Check NhanVienID        |

---

## 🧪 Testing Checklist

**Backend:**

- [ ] Admin duyệt KPI (không cần NhanVienID) → 200 OK
- [ ] SuperAdmin duyệt KPI → 200 OK
- [ ] Quản lý có LoaiQuanLy="KPI" duyệt → 200 OK
- [ ] Quản lý có LoaiQuanLy="NGHIEP_VU" duyệt → 403 Forbidden
- [ ] Quản lý không có NhanVienID → 401 Unauthorized
- [ ] Nhân viên thường duyệt → 403 Forbidden
- [ ] Điểm được tính đúng sau duyệt
- [ ] TrangThai chuyển sang "DA_DUYET"
- [ ] TongDiemKPI được cập nhật

**Database:**

- [ ] User có field `NhanVienID` trong collection `users`
- [ ] Có record trong `QuanLyNhanVien` với `LoaiQuanLy: "KPI"`
- [ ] JWT token chứa `NhanVienID` khi login

**Frontend:**

- [ ] Toast hiển thị message lỗi rõ ràng
- [ ] Có thể thêm check `user.NhanVienID` để disable nút duyệt sớm

---

## 📝 Key Insights

### 1. Tại sao không dùng `req.currentNhanVienID`?

- `req.currentNhanVienID` được set bởi middleware `validateQuanLy`
- Endpoint duyệt KPI **không dùng middleware này** (chỉ dùng JWT auth)
- JWT middleware chỉ set `req.user` (có field `NhanVienID`)
- **Best practice:** Đọc từ `req.user.NhanVienID` (nguồn duy nhất từ JWT)

### 2. Tại sao Admin bypass NhanVienID check?

- Admin có quyền cao nhất, không cần liên kết với nhân viên cụ thể
- Dễ dàng quản lý hệ thống mà không bị ràng buộc bởi dữ liệu nhân viên
- Tránh lỗi khi tài khoản admin chưa được gán `NhanVienID`
- **Logic:** Check admin TRƯỚC, nếu là admin thì bypass tất cả

### 3. Tại sao cần check isDeleted?

- Tránh dùng record đã bị xóa mềm trong `QuanLyNhanVien`
- Đảm bảo chỉ quan hệ đang active mới được tính
- Best practice MongoDB: `isDeleted: { $ne: true }`

### 4. Frontend không cần thay đổi

- Redux action `approveKPI` đã gửi đúng request
- Token được gửi tự động qua `apiService` (axios interceptor)
- Error handling đã hiển thị message từ backend
- **Optional:** UI có thể check `user.NhanVienID` để disable nút duyệt sớm

---

## 🚀 Deploy Checklist

1. ✅ **Backend code:** Apply fix vào `kpi.controller.js`
2. ✅ **Syntax check:** No errors found
3. ⏳ **Restart backend:** `node app.js` hoặc `npm start`
4. ⏳ **Test endpoint:** `PUT /api/workmanagement/kpi/:id/duyet`
5. ⏳ **Verify logs:** Xem console backend khi call API
6. ⏳ **Database check:**
   - Xem user có `NhanVienID` chưa: `db.users.findOne({ email: "test@example.com" })`
   - Xem có `QuanLyNhanVien` record: `db.quanlynhanviens.find({ LoaiQuanLy: "KPI" })`
7. ⏳ **JWT check:** Decode token tại jwt.io, xem có field `NhanVienID` không
8. ⏳ **Frontend test:** Thử duyệt KPI với từng role khác nhau

---

## 🎓 Lesson Learned

1. **Đọc source đúng:** `req.user` từ JWT, không phải `req.currentNhanVienID` từ middleware
2. **Check admin trước:** Bypass logic phức tạp cho role cao nhất
3. **Message rõ ràng:** Hướng dẫn user phải làm gì khi lỗi
4. **Soft delete:** Luôn check `isDeleted` khi query relationship
5. **Frontend không cần fix:** Backend trả error rõ ràng, frontend chỉ hiển thị

---

**Status:** ✅ COMPLETED  
**Files Changed:** 1 (`kpi.controller.js`)  
**Syntax Errors:** 0  
**Ready for:** Manual testing + deployment  
**Next:** Test với real data và các scenarios trên
