# Migration: Thêm field LoaiKhoa vào KhoaBinhQuanBenhAn

## Mục đích

Cập nhật tất cả records trong `DaTaFix.KhoaBinhQuanBenhAn` để thêm field `LoaiKhoa` (nếu chưa có).

## Tại sao cần migration?

- Model `DaTaFix` đã được cập nhật với field `LoaiKhoa` bắt buộc
- Dữ liệu cũ trong database có thể chưa có field này
- Feature "Khuyến Cáo Khoa BQBA" yêu cầu composite key (KhoaID + LoaiKhoa + Nam)

## Cách chạy migration

### Option 1: Chạy script tự động

```bash
cd giaobanbv-be
node scripts/migrateKhoaBinhQuanBenhAn.js
```

Script sẽ:

1. ✅ Kết nối MongoDB
2. ✅ Tìm datafix document
3. ✅ Kiểm tra records cần update
4. ✅ Cập nhật `LoaiKhoa = "noitru"` (default) cho records chưa có
5. ✅ Lưu vào database
6. ✅ Hiển thị kết quả

### Option 2: Update thủ công qua MongoDB shell

```javascript
use giaobanbv

db.datafixes.findOne()  // Xem dữ liệu hiện tại

// Update tất cả records chưa có LoaiKhoa
db.datafixes.updateMany(
  {},
  {
    $set: {
      "KhoaBinhQuanBenhAn.$[elem].LoaiKhoa": "noitru"
    }
  },
  {
    arrayFilters: [
      { "elem.LoaiKhoa": { $exists: false } }
    ]
  }
)
```

## Sau khi migration

### 1. Verify dữ liệu

```bash
# Vào MongoDB shell
mongo giaobanbv

# Kiểm tra
db.datafixes.findOne().KhoaBinhQuanBenhAn
```

Tất cả records phải có field `LoaiKhoa`.

### 2. Cập nhật dữ liệu thực tế

Migration script sẽ set default `LoaiKhoa = "noitru"` cho tất cả.

**Cần cập nhật thủ công** các khoa ngoại trú qua giao diện:

1. Vào `/khoa-binh-quan-benh-an`
2. Edit từng khoa
3. Chọn đúng "Loại khoa": Nội trú / Ngoại trú
4. Lưu

### 3. Danh sách khoa cần kiểm tra

Các khoa thường là **Ngoại trú**:

- Khoa Khám bệnh
- Khoa Ngoại trú
- Phòng khám chuyên khoa
- Khoa Y học cổ truyền (nếu chỉ khám ngoại)
- Khoa Phục hồi chức năng (nếu chỉ khám ngoại)

Các khoa thường là **Nội trú**:

- Khoa Nội
- Khoa Ngoại
- Khoa Sản
- Khoa Nhi
- Khoa Hồi sức cấp cứu
- Khoa Phẫu thuật
- v.v.

## Rollback (nếu cần)

Nếu migration gặp lỗi, restore từ backup:

```bash
# Restore từ backup MongoDB
mongorestore --db giaobanbv /path/to/backup
```

Hoặc set lại field về rỗng:

```javascript
db.datafixes.updateMany(
  {},
  {
    $set: {
      "KhoaBinhQuanBenhAn.$[].LoaiKhoa": "",
    },
  }
);
```

## Checklist sau migration

- [ ] Chạy migration script thành công
- [ ] Verify tất cả records có `LoaiKhoa`
- [ ] Cập nhật đúng loại khoa cho từng khoa
- [ ] Test tạo khuyến cáo (dropdown hiển thị đúng)
- [ ] Test hiển thị bảng "Bình Quân Bệnh Án" (data match đúng)
- [ ] Kiểm tra composite key matching (KhoaID + LoaiKhoa)

## Lưu ý

⚠️ **QUAN TRỌNG**:

- Migration chỉ set default `LoaiKhoa = "noitru"`
- Phải cập nhật thủ công các khoa ngoại trú
- Không chạy migration nhiều lần (đã có LoaiKhoa thì skip)

📌 **Best Practice**:

- Backup database trước khi migration
- Chạy trên môi trường dev/staging trước
- Verify kỹ sau khi migration
- Document lại các thay đổi

## Liên hệ

Nếu gặp vấn đề, liên hệ developer hoặc tạo issue.
