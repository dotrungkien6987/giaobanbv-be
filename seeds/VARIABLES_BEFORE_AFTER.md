# 🔄 VARIABLE AUDIT: BEFORE vs AFTER COMPARISON

> **Quick Reference**: Side-by-side comparison for implementing fixes

---

## 📊 SUMMARY TABLE

| Domain       | Before (Defined)       | After (Fixed) | Change                      |
| ------------ | ---------------------- | ------------- | --------------------------- |
| **CongViec** | 21 variables           | 24 variables  | +3 (rename 6, add 3)        |
| **YeuCau**   | 23 variables (2 dupes) | 29 variables  | +8 (remove 2 dupes, add 10) |
| **KPI**      | 13 variables           | 15 variables  | +2 (rename 2, add 2)        |
| **TOTAL**    | 57 (55 unique)         | 68 variables  | +13 net                     |

---

## 🔴 CongViec Variables: BEFORE → AFTER

### Recipient Candidates (6 variables) - NO CHANGES ✅

```javascript
// These stay the same:
{ name: "NguoiChinhID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
{ name: "NguoiGiaoViecID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
{ name: "NguoiThamGia", type: "Array", itemType: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
{ name: "NguoiThamGiaMoi", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
{ name: "NguoiThamGiaBiXoa", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
{ name: "NguoiChinhMoi", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
```

---

### Display Fields - CHANGES REQUIRED 🔴

#### Basic Fields (5 variables) - NO CHANGES ✅

```javascript
{ name: "_id", type: "ObjectId", description: "ID công việc" },
{ name: "MaCongViec", type: "String", description: "Mã công việc" },
{ name: "TieuDe", type: "String", description: "Tiêu đề công việc" },
{ name: "MoTa", type: "String", description: "Mô tả công việc" },
{ name: "TrangThai", type: "String", description: "Trạng thái hiện tại" },
```

#### Person Names (3 → 6 variables) - ADD 3 NEW ✅

```diff
  { name: "TenNguoiChinh", type: "String", description: "Tên người được giao" },
  { name: "TenNguoiGiao", type: "String", description: "Tên người giao việc" },
+ { name: "TenNguoiCapNhat", type: "String", description: "Tên người cập nhật công việc" },
+ { name: "TenNguoiChinhMoi", type: "String", description: "Tên người chính mới (khi reassign)" },
+ { name: "TenNguoiThucHien", type: "String", description: "Tên người thực hiện hành động (dynamic)" },
```

#### Priority Fields - RENAME 2 🔴

```diff
- { name: "DoUuTien", type: "String", description: "Độ ưu tiên: cao/trung bình/thấp" },
- { name: "DoUuTienCu", type: "String", description: "Độ ưu tiên cũ" },
+ { name: "MucDoUuTienMoi", type: "String", description: "Độ ưu tiên mới: cao/trung bình/thấp" },
+ { name: "MucDoUuTienCu", type: "String", description: "Độ ưu tiên cũ: cao/trung bình/thấp" },
```

#### Progress Field - RENAME 1 🔴

```diff
- { name: "TienDo", type: "Number", description: "Tiến độ %" },
+ { name: "TienDoMoi", type: "Number", description: "Tiến độ mới (%)" },
```

#### Deadline Fields - RENAME 2, ADD 1 🔴

```diff
- { name: "Deadline", type: "String", description: "Hạn hoàn thành" },
- { name: "DeadlineCu", type: "String", description: "Deadline cũ" },
+ { name: "NgayHetHan", type: "String", description: "Hạn hoàn thành (DD/MM/YYYY HH:mm)" },
+ { name: "NgayHetHanCu", type: "String", description: "Hạn hoàn thành cũ" },
+ { name: "NgayHetHanMoi", type: "String", description: "Hạn hoàn thành mới" },
```

#### File & Comment Fields (3 variables) - NO CHANGES ✅

```javascript
{ name: "TenFile", type: "String", description: "Tên file" },
{ name: "NoiDungComment", type: "String", description: "Nội dung bình luận" },
{ name: "TenNguoiComment", type: "String", description: "Người bình luận" },
```

---

## 🔴 YeuCau Variables: BEFORE → AFTER

### Recipient Candidates (4 → 9 variables) - ADD 5 NEW ✅

```diff
  { name: "NguoiYeuCauID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
  { name: "NguoiXuLyID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
  { name: "arrNguoiDieuPhoiID", type: "Array", itemType: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
  { name: "arrQuanLyKhoaID", type: "Array", itemType: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
+ { name: "NguoiSuaID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true, description: "Người sửa/cập nhật yêu cầu" },
+ { name: "NguoiBinhLuanID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true, description: "Người bình luận yêu cầu" },
+ { name: "NguoiDieuPhoiID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true, description: "Điều phối viên (single)" },
+ { name: "NguoiDuocDieuPhoiID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true, description: "Người được điều phối xử lý" },
+ { name: "NguoiNhanID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true, description: "Người nhận yêu cầu" },
```

---

### Display Fields - CHANGES REQUIRED 🔴

#### Basic Fields (5 variables) - NO CHANGES ✅

```javascript
{ name: "_id", type: "ObjectId", description: "ID yêu cầu" },
{ name: "MaYeuCau", type: "String", description: "Mã yêu cầu" },
{ name: "TieuDe", type: "String", description: "Tiêu đề yêu cầu" },
{ name: "MoTa", type: "String", description: "Mô tả chi tiết" },
{ name: "TrangThai", type: "String", description: "Trạng thái yêu cầu" },
```

#### Department Names - REMOVE DUPLICATES 🔴

```diff
  { name: "TenKhoaGui", type: "String", description: "Tên khoa gửi" },
  { name: "TenKhoaNhan", type: "String", description: "Tên khoa nhận" },
- { name: "TenKhoaGui", type: "String", description: "Tên khoa gửi" },      // ← DELETE DUPLICATE
- { name: "TenKhoaNhan", type: "String", description: "Tên khoa nhận" },    // ← DELETE DUPLICATE
```

#### Request Type (1 variable) - NO CHANGES ✅

```javascript
{ name: "TenLoaiYeuCau", type: "String", description: "Loại yêu cầu" },
```

#### Person Names (3 → 6 variables) - ADD 3 NEW ✅

```diff
  { name: "TenNguoiYeuCau", type: "String", description: "Tên người yêu cầu" },
  { name: "TenNguoiXuLy", type: "String", description: "Tên người xử lý" },
+ { name: "TenNguoiSua", type: "String", description: "Tên người sửa yêu cầu" },
+ { name: "TenNguoiThucHien", type: "String", description: "Tên người thực hiện hành động (dynamic)" },
+ { name: "TenNguoiXoa", type: "String", description: "Tên người xóa yêu cầu" },
```

#### Time Fields (2 variables) - NO CHANGES ✅

```javascript
{ name: "ThoiGianHen", type: "String", description: "Thời gian hẹn" },
{ name: "ThoiGianHenCu", type: "String", description: "Thời gian hẹn cũ" },
```

#### Rejection & Rating (4 variables) - NO CHANGES ✅

```javascript
{ name: "LyDoTuChoi", type: "String", description: "Lý do từ chối" },
{ name: "DiemDanhGia", type: "Number", description: "Điểm đánh giá" },
{ name: "NoiDungDanhGia", type: "String", description: "Nội dung đánh giá" },
```

#### Comment Fields (2 variables) - NO CHANGES ✅

```javascript
{ name: "NoiDungComment", type: "String", description: "Nội dung bình luận" },
{ name: "TenNguoiComment", type: "String", description: "Người bình luận" },
```

---

## 🔴 KPI Variables: BEFORE → AFTER

### Recipient Candidates (2 variables) - NO CHANGES ✅

```javascript
{ name: "NhanVienID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
{ name: "NguoiDanhGiaID", type: "ObjectId", ref: "NhanVien", isRecipientCandidate: true },
```

---

### Display Fields - CHANGES REQUIRED 🔴

#### Basic Fields (2 variables) - NO CHANGES ✅

```javascript
{ name: "_id", type: "ObjectId", description: "ID đánh giá KPI" },
```

#### Person & Cycle Names (3 → 5 variables) - ADD 2 NEW ✅

```diff
  { name: "TenNhanVien", type: "String", description: "Tên nhân viên" },
  { name: "TenNguoiDanhGia", type: "String", description: "Tên người đánh giá" },
  { name: "TenChuKy", type: "String", description: "Tên chu kỳ đánh giá" },
+ { name: "TenNhiemVu", type: "String", description: "Tên nhiệm vụ thường quy được đánh giá" },
+ { name: "TenNguoiDuyet", type: "String", description: "Tên người duyệt KPI" },
```

#### Criteria Name (1 variable) - NO CHANGES ✅

```javascript
{ name: "TenTieuChi", type: "String", description: "Tên tiêu chí" },
```

#### Score Fields (4 variables) - NO CHANGES ✅

```javascript
{ name: "TongDiemKPI", type: "Number", description: "Tổng điểm KPI" },
{ name: "DiemTuDanhGia", type: "Number", description: "Điểm tự đánh giá" },
{ name: "DiemQL", type: "Number", description: "Điểm quản lý" },
```

#### Feedback & Reason - RENAME 2 🔴

```diff
- { name: "NoiDungPhanHoi", type: "String", description: "Nội dung phản hồi" },
- { name: "LyDoHuyDuyet", type: "String", description: "Lý do hủy duyệt" },
+ { name: "PhanHoi", type: "String", description: "Nội dung phản hồi" },
+ { name: "LyDo", type: "String", description: "Lý do hủy duyệt" },
```

---

## 📋 IMPLEMENTATION CHECKLIST

### File: `seeds/notificationTypes.seed.js`

```javascript
// Line 24: Start of congViecVariables
const congViecVariables = [
  // ... recipient candidates (no changes)

  // Display Fields
  { name: "_id", type: "ObjectId", description: "ID công việc" },
  { name: "MaCongViec", type: "String", description: "Mã công việc" },
  { name: "TieuDe", type: "String", description: "Tiêu đề công việc" },
  { name: "MoTa", type: "String", description: "Mô tả công việc" },
  { name: "TenNguoiChinh", type: "String", description: "Tên người được giao" },
  { name: "TenNguoiGiao", type: "String", description: "Tên người giao việc" },
  {
    name: "TenNguoiCapNhat",
    type: "String",
    description: "Tên người cập nhật công việc",
  }, // ✅ NEW
  {
    name: "TenNguoiChinhMoi",
    type: "String",
    description: "Tên người chính mới",
  }, // ✅ NEW
  {
    name: "TenNguoiThucHien",
    type: "String",
    description: "Tên người thực hiện hành động",
  }, // ✅ NEW
  { name: "MucDoUuTienMoi", type: "String", description: "Độ ưu tiên mới" }, // 🔴 RENAMED
  { name: "MucDoUuTienCu", type: "String", description: "Độ ưu tiên cũ" }, // 🔴 RENAMED
  { name: "TrangThai", type: "String", description: "Trạng thái hiện tại" },
  { name: "TienDoMoi", type: "Number", description: "Tiến độ mới (%)" }, // 🔴 RENAMED
  { name: "NgayHetHan", type: "String", description: "Hạn hoàn thành" }, // 🔴 RENAMED
  { name: "NgayHetHanCu", type: "String", description: "Hạn cũ" }, // 🔴 RENAMED
  { name: "NgayHetHanMoi", type: "String", description: "Hạn mới" }, // ✅ NEW
  { name: "TenFile", type: "String", description: "Tên file" },
  { name: "NoiDungComment", type: "String", description: "Nội dung bình luận" },
  { name: "TenNguoiComment", type: "String", description: "Người bình luận" },
];
```

```javascript
// Line 92: Start of yeuCauVariables
const yeuCauVariables = [
  // Recipient Candidates
  {
    name: "NguoiYeuCauID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
  },
  {
    name: "NguoiXuLyID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
  },
  {
    name: "arrNguoiDieuPhoiID",
    type: "Array",
    itemType: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
  },
  {
    name: "arrQuanLyKhoaID",
    type: "Array",
    itemType: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
  },
  {
    name: "NguoiSuaID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người sửa yêu cầu",
  }, // ✅ NEW
  {
    name: "NguoiBinhLuanID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người bình luận",
  }, // ✅ NEW
  {
    name: "NguoiDieuPhoiID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Điều phối viên",
  }, // ✅ NEW
  {
    name: "NguoiDuocDieuPhoiID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người được điều phối",
  }, // ✅ NEW
  {
    name: "NguoiNhanID",
    type: "ObjectId",
    ref: "NhanVien",
    isRecipientCandidate: true,
    description: "Người nhận",
  }, // ✅ NEW

  // Display Fields
  { name: "_id", type: "ObjectId", description: "ID yêu cầu" },
  { name: "MaYeuCau", type: "String", description: "Mã yêu cầu" },
  { name: "TieuDe", type: "String", description: "Tiêu đề yêu cầu" },
  { name: "MoTa", type: "String", description: "Mô tả chi tiết" },
  { name: "TenKhoaGui", type: "String", description: "Tên khoa gửi" },
  { name: "TenKhoaNhan", type: "String", description: "Tên khoa nhận" },
  // 🔴 DELETE duplicate lines here (2 lines removed)
  { name: "TenLoaiYeuCau", type: "String", description: "Loại yêu cầu" },
  { name: "TenNguoiYeuCau", type: "String", description: "Tên người yêu cầu" },
  { name: "TenNguoiXuLy", type: "String", description: "Tên người xử lý" },
  { name: "TenNguoiSua", type: "String", description: "Tên người sửa" }, // ✅ NEW
  {
    name: "TenNguoiThucHien",
    type: "String",
    description: "Tên người thực hiện",
  }, // ✅ NEW
  { name: "TenNguoiXoa", type: "String", description: "Tên người xóa" }, // ✅ NEW
  { name: "ThoiGianHen", type: "String", description: "Thời gian hẹn" },
  { name: "ThoiGianHenCu", type: "String", description: "Thời gian hẹn cũ" },
  { name: "TrangThai", type: "String", description: "Trạng thái yêu cầu" },
  { name: "LyDoTuChoi", type: "String", description: "Lý do từ chối" },
  { name: "DiemDanhGia", type: "Number", description: "Điểm đánh giá" },
  { name: "NoiDungDanhGia", type: "String", description: "Nội dung đánh giá" },
  { name: "NoiDungComment", type: "String", description: "Nội dung bình luận" },
  { name: "TenNguoiComment", type: "String", description: "Người bình luận" },
];
```

```javascript
// Line 140: Start of kpiVariables
const kpiVariables = [
  // Recipient Candidates (no changes)

  // Display Fields
  { name: "_id", type: "ObjectId", description: "ID đánh giá KPI" },
  { name: "TenNhanVien", type: "String", description: "Tên nhân viên" },
  {
    name: "TenNguoiDanhGia",
    type: "String",
    description: "Tên người đánh giá",
  },
  { name: "TenChuKy", type: "String", description: "Tên chu kỳ đánh giá" },
  { name: "TenTieuChi", type: "String", description: "Tên tiêu chí" },
  { name: "TenNhiemVu", type: "String", description: "Tên nhiệm vụ" }, // ✅ NEW
  { name: "TenNguoiDuyet", type: "String", description: "Tên người duyệt" }, // ✅ NEW
  { name: "TongDiemKPI", type: "Number", description: "Tổng điểm KPI" },
  { name: "DiemTuDanhGia", type: "Number", description: "Điểm tự đánh giá" },
  { name: "DiemQL", type: "Number", description: "Điểm quản lý" },
  { name: "PhanHoi", type: "String", description: "Nội dung phản hồi" }, // 🔴 RENAMED
  { name: "LyDo", type: "String", description: "Lý do hủy duyệt" }, // 🔴 RENAMED
];
```

---

## ✅ VERIFICATION SCRIPT

After applying fixes, run this to verify:

```javascript
// Count variables per domain
const congViecCount = congViecVariables.length; // Should be 24
const yeuCauCount = yeuCauVariables.length; // Should be 29
const kpiCount = kpiVariables.length; // Should be 15

console.log(`CongViec: ${congViecCount} variables (expected 24)`);
console.log(`YeuCau: ${yeuCauCount} variables (expected 29)`);
console.log(`KPI: ${kpiCount} variables (expected 15)`);
console.log(`Total: ${congViecCount + yeuCauCount + kpiCount} (expected 68)`);
```

---

**Total Changes**:

- ✅ 13 new variables added
- 🔴 10 variables renamed
- 🔴 2 duplicate variables removed
- **Net change**: +13 variables (55 → 68)
