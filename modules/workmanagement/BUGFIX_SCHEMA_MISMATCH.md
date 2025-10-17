# 🐛 BUGFIX - Schema Field Mismatch (NhanVien Model)

## Ngày: 13/10/2025

---

## ❌ Lỗi

```
ERROR StrictPopulateError: Cannot populate path `NhanVienDuocQuanLy.ChucDanhID`
because it is not in your schema. Set the `strictPopulate` option to false to override.
```

**Nguyên nhân**: Controller đang populate các fields không tồn tại trong NhanVien schema.

---

## 🔍 Phân Tích

### Schema Thực Tế (`models/NhanVien.js`):

```javascript
const nhanvienSchema = Schema({
  Ten: { type: String, required: true }, // ✅ Không phải "HoTen"
  MaNhanVien: { type: String, require: true },
  Email: { type: String, default: "" },
  KhoaID: { type: Schema.ObjectId, ref: "Khoa" }, // ✅ Đúng
  ChucDanh: { type: String, default: "" }, // ✅ String, không phải ObjectId
  ChucVu: { type: String, default: "" },
  Images: { type: [String], default: [] }, // ✅ Không phải "Avatar"
  // ...
});
```

### Controller SAI (trước khi fix):

```javascript
.populate({
  path: "NhanVienDuocQuanLy",
  select: "HoTen MaNhanVien Email KhoaID ChucDanhID Avatar isDeleted",
  //       ^^^^^                       ^^^^^^^^^^^^ ^^^^^^
  //       KHÔNG TỒN TẠI               KHÔNG TỒN TẠI    KHÔNG TỒN TẠI
  populate: [
    { path: "KhoaID", select: "TenKhoa MaKhoa" },
    { path: "ChucDanhID", select: "TenChucDanh" }, // ❌ ChucDanh là String!
  ],
})
```

---

## ✅ Giải Pháp

### Backend Fix

**File**: `modules/workmanagement/controllers/quanLyNhanVienController.js`

#### Method 1: `getNhanVienDuocQuanLyByCurrentUser`

```javascript
// SAI:
select: "HoTen MaNhanVien Email KhoaID ChucDanhID Avatar isDeleted",
populate: [
  { path: "KhoaID", select: "TenKhoa MaKhoa" },
  { path: "ChucDanhID", select: "TenChucDanh" },
],

// ĐÚNG:
select: "Ten MaNhanVien Email KhoaID ChucDanh ChucVu Images isDeleted",
populate: [
  { path: "KhoaID", select: "TenKhoa MaKhoa" },
  // Không populate ChucDanh vì nó là String
],
```

#### Method 2: `getNhanVienDuocQuanLy`

Áp dụng tương tự.

---

### Frontend Fix

**Files cần sửa**:

1. `SelectNhanVienButton.js`
2. `SelectNhanVienDialog.js`
3. `NhanVienCard.js`

#### Mapping Fields:

| Backend Field       | Frontend Old             | Frontend New |
| ------------------- | ------------------------ | ------------ |
| `Ten`               | `HoTen`                  | `Ten`        |
| `ChucDanh` (String) | `ChucDanhID.TenChucDanh` | `ChucDanh`   |
| `KhoaID` (ObjectId) | `Khoa`                   | `KhoaID`     |
| `Images` (Array)    | `Avatar`                 | `Images[0]`  |

#### Example Fix:

**NhanVienCard.js**:

```javascript
// SAI:
{
  nhanVien.HoTen ? nhanVien.HoTen.charAt(0).toUpperCase() : <PersonIcon />;
}
{
  nhanVien.HoTen || "Chưa có tên";
}
{
  nhanVien.Khoa?.TenKhoa;
}

// ĐÚNG:
{
  nhanVien.Ten ? nhanVien.Ten.charAt(0).toUpperCase() : <PersonIcon />;
}
{
  nhanVien.Ten || "Chưa có tên";
}
{
  nhanVien.KhoaID?.TenKhoa;
}
```

**SelectNhanVienDialog.js** - Search Filter:

```javascript
// SAI:
nv.HoTen?.toLowerCase().includes(searchLower) ||
  nv.ChucDanhID?.TenChucDanh?.toLowerCase().includes(searchLower);

// ĐÚNG:
nv.Ten?.toLowerCase().includes(searchLower) ||
  nv.ChucDanh?.toLowerCase().includes(searchLower);
```

---

## 📊 Chi Tiết Thay Đổi

### Backend: 2 locations

1. **Line ~33** - `getNhanVienDuocQuanLyByCurrentUser`
2. **Line ~74** - `getNhanVienDuocQuanLy`

### Frontend: 3 files

1. **SelectNhanVienButton.js** - Line 51
2. **SelectNhanVienDialog.js** - Lines 68, 73, 96
3. **NhanVienCard.js** - Lines 74, 89, 109, 145

---

## 🧪 Kiểm Tra

### Before Fix:

```bash
GET /api/workmanagement/quan-ly-nhan-vien/nhan-vien-duoc-quan-ly
# Error: StrictPopulateError - Cannot populate ChucDanhID
```

### After Fix:

```bash
GET /api/workmanagement/quan-ly-nhan-vien/nhan-vien-duoc-quan-ly
# Status: 200 OK
# Response:
{
  "success": true,
  "data": {
    "nhanviens": [
      {
        "_id": "...",
        "Ten": "Nguyễn Văn A",
        "MaNhanVien": "NV001",
        "Email": "nva@example.com",
        "KhoaID": {
          "_id": "...",
          "TenKhoa": "Khoa Nội",
          "MaKhoa": "NOI"
        },
        "ChucDanh": "Bác sĩ",
        "ChucVu": "Trưởng khoa",
        "Images": ["https://..."]
      }
    ],
    "total": 5
  }
}
```

---

## 📝 Bài Học

### 1. **LUÔN kiểm tra schema trước khi populate**

- Đọc file `models/` để biết chính xác field names
- Phân biệt String vs ObjectId reference
- Chỉ populate các ObjectId references

### 2. **Naming Consistency**

- Backend: `Ten` (không phải `HoTen`)
- Frontend phải match chính xác với backend response

### 3. **Mongoose Strict Mode**

- `strictPopulate: true` (default) giúp catch errors sớm
- Không nên tắt strict mode để "workaround" lỗi

### 4. **Frontend-Backend Contract**

- API response structure phải documented rõ ràng
- Frontend không được assume field names

---

## ✅ Status: RESOLVED

**Backend & Frontend đã đồng bộ!** 🚀

Chức năng chọn nhân viên đã hoạt động đúng với schema thực tế của database.
