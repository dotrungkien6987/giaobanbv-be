# Fix: Approve KPI Permission Logic

**Date:** October 16, 2025  
**Issue:** Lỗi 403 Forbidden khi duyệt KPI do logic permission sai

---

## 🐛 Vấn Đề

### Lỗi Gốc:

```
ERROR AppError: Bạn không có quyền duyệt đánh giá KPI này
    at kpi.controller.js:455:11
  statusCode: 403,
  errorType: 'Forbidden'
```

### Root Causes:

1. **Sai logic PhanQuyen**

   - Code cũ: `req.user?.PhanQuyen === "admin"` (chỉ check admin)
   - Thiếu check `"superadmin"`
   - Không check bảng `QuanLyNhanVien`

2. **Thiếu validation mối quan hệ quản lý**

   - Không check record trong `QuanLyNhanVien` với `LoaiQuanLy = "KPI"`
   - Quản lý không có relationship không được duyệt

3. **Logic nghiệp vụ không đúng**
   - Dự án dùng **string** cho PhanQuyen: `"nhanvien"`, `"quanly"`, `"admin"`, `"superadmin"`
   - KHÔNG dùng số (1, 2, 3, 4)

---

## ✅ Giải Pháp

### File Changed:

- `modules/workmanagement/controllers/kpi.controller.js`

### Logic Mới (Line 447-485):

```javascript
// ✅ FIX: Permission check theo QuanLyNhanVien với LoaiQuanLy = "KPI"
const userPhanQuyen = req.user?.PhanQuyen;
const isAdmin = userPhanQuyen === "admin" || userPhanQuyen === "superadmin";

let hasPermission = false;

if (isAdmin) {
  // Admin/SuperAdmin có quyền duyệt tất cả
  hasPermission = true;
} else {
  // Check relationship trong bảng QuanLyNhanVien
  const quanLyRelation = await QuanLyNhanVien.findOne({
    NguoiQuanLyID: req.user.NhanVienID,
    NhanVienID: nhanVienBeingEvaluatedId,
    LoaiQuanLy: "KPI",
  });

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

## 🎯 Permission Logic Tree

```
User đang duyệt KPI của Nhân viên B
│
├─ PhanQuyen === "admin" hoặc "superadmin"
│  └─ ✅ Cho phép duyệt TẤT CẢ
│
└─ Check bảng QuanLyNhanVien:
   └─ EXISTS {
        NguoiQuanLyID: currentUser.NhanVienID,
        NhanVienID: B._id,
        LoaiQuanLy: "KPI"  ← QUAN TRỌNG!
      }
      ├─ ✅ Có record → Cho phép duyệt
      └─ ❌ Không có → TỪ CHỐI với message rõ ràng
```

---

## 📊 Test Scenarios

### ✅ Scenario 1: Admin duyệt KPI bất kỳ

```javascript
User: { PhanQuyen: "admin" }
KPI: { NhanVienID: "any-nhanvien-id" }
Result: ✅ Cho phép (Admin bypass)
```

### ✅ Scenario 2: SuperAdmin duyệt KPI bất kỳ

```javascript
User: { PhanQuyen: "superadmin" }
KPI: { NhanVienID: "any-nhanvien-id" }
Result: ✅ Cho phép (SuperAdmin bypass)
```

### ✅ Scenario 3: Quản lý có quan hệ KPI

```javascript
User: { PhanQuyen: "quanly", NhanVienID: "manager-A" }
QuanLyNhanVien: {
  NguoiQuanLyID: "manager-A",
  NhanVienID: "employee-B",
  LoaiQuanLy: "KPI"  ← Có KPI
}
KPI: { NhanVienID: "employee-B" }
Result: ✅ Cho phép
```

### ❌ Scenario 4: Quản lý KHÔNG có quan hệ KPI

```javascript
User: { PhanQuyen: "quanly", NhanVienID: "manager-A" }
QuanLyNhanVien: {
  NguoiQuanLyID: "manager-A",
  NhanVienID: "employee-B",
  LoaiQuanLy: "NGHIEP_VU"  ← KHÔNG phải KPI
}
KPI: { NhanVienID: "employee-B" }
Result: ❌ TỪ CHỐI "Không có quyền duyệt KPI của nhân viên này"
```

### ❌ Scenario 5: Quản lý duyệt nhân viên khác

```javascript
User: { PhanQuyen: "quanly", NhanVienID: "manager-A" }
QuanLyNhanVien: KHÔNG CÓ RECORD nào cho employee-C
KPI: { NhanVienID: "employee-C" }
Result: ❌ TỪ CHỐI
```

### ❌ Scenario 6: Nhân viên thường

```javascript
User: { PhanQuyen: "nhanvien" }
Result: ❌ TỪ CHỐI (Không phải admin, không có record QuanLyNhanVien)
```

---

## 🔧 Changes Summary

| Aspect               | Before (❌)         | After (✅)                                      |
| -------------------- | ------------------- | ----------------------------------------------- |
| **PhanQuyen check**  | `=== "admin"` only  | `=== "admin" \|\| === "superadmin"`             |
| **QuanLyNhanVien**   | Không check         | Check `LoaiQuanLy: "KPI"`                       |
| **Permission logic** | Sai nghiệp vụ       | Đúng theo bảng QuanLyNhanVien                   |
| **Error message**    | Generic             | Chi tiết "Vui lòng kiểm tra phân quyền quản lý" |
| **NguoiDanhGiaID**   | ✅ Đã có (line 893) | ✅ Giữ nguyên                                   |

---

## 📝 Notes

1. **Model QuanLyNhanVien đã được import** (line 7) → Không cần thêm import
2. **NguoiDanhGiaID đã được set** trong `getChamDiemDetail` (line 893) → Không cần fix
3. **PhanQuyen enum:** `"nhanvien"` | `"quanly"` | `"admin"` | `"superadmin"`
4. **Validation middleware** đã check quyền chấm, nhưng endpoint duyệt cần check riêng

---

## 🧪 Testing Checklist

- [ ] Admin duyệt KPI → 200 OK
- [ ] SuperAdmin duyệt KPI → 200 OK
- [ ] Quản lý có LoaiQuanLy="KPI" duyệt → 200 OK
- [ ] Quản lý có LoaiQuanLy="NGHIEP_VU" duyệt → 403 Forbidden
- [ ] Quản lý không có record QuanLyNhanVien → 403 Forbidden
- [ ] Nhân viên thường duyệt → 403 Forbidden
- [ ] Điểm được tính đúng sau duyệt
- [ ] TrangThai chuyển sang "DA_DUYET"
- [ ] TongDiemKPI được cập nhật

---

## 🚀 Deploy Notes

1. Restart backend sau khi apply fix
2. Test endpoint: `PUT /api/workmanagement/kpi/:id/duyet`
3. Kiểm tra log để confirm logic hoạt động đúng
4. Verify database có record QuanLyNhanVien với LoaiQuanLy="KPI"

---

**Status:** ✅ Completed  
**Tested:** Syntax OK, no errors  
**Ready for:** Manual testing
