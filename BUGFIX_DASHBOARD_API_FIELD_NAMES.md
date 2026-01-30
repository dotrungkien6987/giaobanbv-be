# 🔥 HOTFIX: Dashboard APIs Field Names

**Date**: January 29, 2026  
**Priority**: 🔴 CRITICAL  
**Impact**: 3/4 Dashboard APIs luôn trả về 0 hoặc mảng rỗng

---

## 🐛 Vấn Đề

Dashboard APIs sử dụng **tên field và enum sai hoàn toàn** so với schema, khiến queries không match bất kỳ document nào.

| API                  | Lỗi                                                        | Hậu quả                                             |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| `getCongViecSummary` | Dùng `NguoiNhanID`, `NguoiGiaoID`, `DA_HUY`                | **total=0, urgent=0** luôn                          |
| `getUrgentTasks`     | Cùng lỗi như trên                                          | **tasks=[] luôn**                                   |
| `getYeuCauSummary`   | Dùng `NguoiGuiID`, `KhoaNhanID`, `CHO_XU_LY`, `HOAN_THANH` | **sent=0, needAction=0, inProgress=0, completed=0** |

---

## ✅ Sửa Chữa

### 1. CongViec Summary API (congViec.controller.js, line 844-868)

#### ❌ TRƯỚC:

```javascript
CongViec.countDocuments({
  $or: [
    { NguoiNhanID: objectId(nhanVienId) }, // ❌ Field không tồn tại
    { NguoiGiaoID: objectId(nhanVienId) }, // ❌ Field không tồn tại
  ],
  TrangThai: { $nin: ["HOAN_THANH", "DA_HUY"] }, // ❌ DA_HUY không tồn tại
  isDeleted: { $ne: true },
});
```

#### ✅ SAU:

```javascript
CongViec.countDocuments({
  $or: [
    { NguoiChinhID: objectId(nhanVienId) }, // ✅ Người chính thực hiện
    { NguoiGiaoViecID: objectId(nhanVienId) }, // ✅ Người giao việc
    { "NguoiThamGia.NhanVienID": objectId(nhanVienId) }, // ✅ Người tham gia
  ],
  TrangThai: { $ne: "HOAN_THANH" }, // ✅ Schema chỉ có 5 states, không có DA_HUY
  isDeleted: { $ne: true },
});
```

**Giải thích logic mới**:

- Đếm công việc mà user là **người chính**, **người giao**, hoặc **người tham gia**
- Bỏ `DA_HUY` vì schema CongViec chỉ có 5 trạng thái: `TAO_MOI, DA_GIAO, DANG_THUC_HIEN, CHO_DUYET, HOAN_THANH`
- Công việc bị xóa dùng soft delete (`isDeleted = true`), không có status `DA_HUY`

---

### 2. Urgent Tasks API (congViec.controller.js, line 1064-1110)

Sửa tương tự như API 1:

#### Changes:

- `NguoiNhanID` → `NguoiChinhID`
- `NguoiGiaoID` → `NguoiGiaoViecID`
- Thêm `"NguoiThamGia.NhanVienID"` vào $or query
- `TrangThai: { $nin: ["HOAN_THANH", "DA_HUY"] }` → `TrangThai: { $ne: "HOAN_THANH" }`

Sửa ở **2 nơi**:

1. Query chính `.find()` (line 1066-1074)
2. Query đếm total `.countDocuments()` (line 1091-1100)

---

### 3. YeuCau Summary API (yeuCau.controller.js, line 334-362)

#### ❌ TRƯỚC:

```javascript
// Query 1: Yêu cầu tôi gửi
YeuCau.countDocuments({
  NguoiGuiID: objectId(nhanVienId), // ❌ Field không tồn tại
  isDeleted: { $ne: true },
});

// Query 2-4: Khoa tôi nhận
YeuCau.countDocuments({
  KhoaNhanID: user.KhoaID, // ❌ Field không tồn tại
  TrangThai: "CHO_XU_LY", // ❌ Status không tồn tại
  isDeleted: { $ne: true },
});
```

#### ✅ SAU:

```javascript
// Query 1: Yêu cầu tôi gửi
YeuCau.countDocuments({
  NguoiYeuCauID: objectId(nhanVienId), // ✅ Correct field
  isDeleted: { $ne: true },
});

// Query 2: Cần xử lý
YeuCau.countDocuments({
  KhoaDichID: user.KhoaID, // ✅ Khoa đích (khoa nhận)
  TrangThai: "MOI", // ✅ Correct status
  isDeleted: { $ne: true },
});

// Query 3: Đang xử lý (không đổi)
YeuCau.countDocuments({
  KhoaDichID: user.KhoaID,
  TrangThai: "DANG_XU_LY", // ✅ Đã đúng
  isDeleted: { $ne: true },
});

// Query 4: Hoàn thành
YeuCau.countDocuments({
  KhoaDichID: user.KhoaID,
  TrangThai: "DA_HOAN_THANH", // ✅ Correct status (có DA_ prefix)
  isDeleted: { $ne: true },
});
```

**Field name mapping**:

- `NguoiGuiID` → `NguoiYeuCauID` (người tạo yêu cầu)
- `KhoaNhanID` → `KhoaDichID` (khoa đích - khoa nhận yêu cầu)

**Status enum mapping** (YeuCau schema):

- `CHO_XU_LY` → `MOI` (vừa tạo, chờ tiếp nhận)
- `DANG_XU_LY` → `DANG_XU_LY` ✅ (đúng rồi)
- `HOAN_THANH` → `DA_HOAN_THANH` (có prefix DA\_)

**Schema có 5 states**: `MOI, DANG_XU_LY, DA_HOAN_THANH, DA_DONG, TU_CHOI`

---

## 🧪 Cách Test

### 1. Test CongViec APIs

```bash
# Terminal 1: Start backend
cd d:\project\webBV\giaobanbv-be
npm start

# Terminal 2: Test với curl (thay <token> và <nhanVienId>)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8020/api/workmanagement/congviec/summary/<nhanVienId>

# Kết quả mong đợi: { total: >0, urgent: >0 } (nếu có dữ liệu)
```

### 2. Test YeuCau API

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8020/api/workmanagement/yeucau/summary/<nhanVienId>

# Kết quả mong đợi: { sent: >0, needAction: >0, ... } (nếu có dữ liệu)
```

### 3. Test Frontend Dashboard

```bash
# Terminal 3: Start frontend
cd d:\project\webBV\fe-bcgiaobanbvt
npm start

# Truy cập: http://localhost:3000
# Login và vào Trang chủ
# Kiểm tra 3 summary cards có hiển thị số đúng không
```

---

## 📊 Schema Reference

### CongViec Schema

```javascript
{
  NguoiGiaoViecID: ObjectId,      // ✅ Người giao việc
  NguoiChinhID: ObjectId,         // ✅ Người chính (assignee)
  NguoiThamGia: [{                // ✅ Mảng người tham gia
    NhanVienID: ObjectId,
    VaiTro: "CHINH" | "PHOI_HOP"
  }],
  TrangThai: "TAO_MOI" | "DA_GIAO" | "DANG_THUC_HIEN" | "CHO_DUYET" | "HOAN_THANH",
  isDeleted: Boolean
}
```

### YeuCau Schema

```javascript
{
  NguoiYeuCauID: ObjectId,        // ✅ Người tạo yêu cầu
  KhoaNguonID: ObjectId,          // Khoa nguồn (khoa người gửi)
  KhoaDichID: ObjectId,           // ✅ Khoa đích (khoa nhận)
  TrangThai: "MOI" | "DANG_XU_LY" | "DA_HOAN_THANH" | "DA_DONG" | "TU_CHOI",
  isDeleted: Boolean
}
```

---

## 🎯 Impact Analysis

### Trước khi sửa:

- ❌ Dashboard luôn hiển thị **0 công việc**
- ❌ Dashboard luôn hiển thị **0 yêu cầu**
- ❌ Widget "Công việc ưu tiên" luôn **rỗng**
- ❌ User experience rất tệ - tưởng không có data

### Sau khi sửa:

- ✅ Dashboard hiển thị đúng số lượng công việc/yêu cầu
- ✅ Widget urgent tasks hiển thị công việc gần deadline
- ✅ Summary cards phản ánh đúng workload của user
- ✅ Đếm đủ 3 vai trò: người chính, người giao, người tham gia

---

## 📝 Lưu Ý

1. **isDeleted pattern**: Hệ thống dùng soft delete, không có hard delete hay status `DA_HUY`
2. **$or query logic**: Bây giờ đếm đủ 3 vai trò của user trong task:
   - Người chính thực hiện (NguoiChinhID)
   - Người giao việc (NguoiGiaoViecID)
   - Người tham gia (NguoiThamGia.NhanVienID)
3. **YeuCau perspective**: "Sent" là user-based, còn lại (needAction, inProgress, completed) là department-based

---

## 🚀 Next Steps

Sau khi verify APIs hoạt động, cần thảo luận:

1. **Manager vs Employee logic**: Hiện tại APIs trả về cùng data cho cả 2 roles
   - Manager có nên thấy tổng hợp của team không?
   - Cần thêm parameter `isTeamView` không?

2. **YeuCau perspective issue**: "Sent" từ user, còn lại từ department
   - Logic hiện tại có hợp lý không?
   - Có nên tách thành 2 widgets riêng: "Cá nhân" vs "Khoa" không?

3. **UI/UX improvements**:
   - Thêm toggle "Cá nhân / Team" cho Manager?
   - Phân biệt "Công việc nhận" vs "Công việc giao"?
   - Badge colors theo priority/status?

---

## ✅ Checklist

- [x] Sửa `getCongViecSummary` - field names + status
- [x] Sửa `getUrgentTasks` - field names + status (2 queries)
- [x] Sửa `getYeuCauSummary` - field names + status (4 queries)
- [ ] Test APIs với Postman/curl
- [ ] Test Dashboard frontend
- [ ] Verify số liệu hiển thị đúng
- [ ] Thảo luận business logic tiếp theo
