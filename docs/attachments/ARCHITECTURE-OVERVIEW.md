# Tổng quan Kiến trúc Đính kèm Tệp (One-to-many + OwnerField)

Mục đích: Giải thích mô hình, routes, lưu trữ và luồng xử lý cho lập trình viên.

## Mô hình

- `TepTin` (Mongo):
  - Bắt buộc: `TenFile`, `TenGoc`, `LoaiFile`, `KichThuoc`, `DuongDan` (relative), `NguoiTaiLenID`, `TrangThai` (ACTIVE/DELETED), `NgayTaiLen`.
  - Sở hữu: `OwnerType: String`, `OwnerID: ObjectId`, `OwnerField: String` (mặc định `default`).
  - Index: `{ OwnerType:1, OwnerID:1, OwnerField:1, NgayTaiLen:-1 }`.
  - Lý do: một tệp thuộc một “chủ sở hữu” và một “vị trí/slot”; linh hoạt cho mọi thực thể (TapSan, BaiBao, CongViec, …).

## Lưu trữ

- Biến môi trường: `WM_UPLOAD_ROOT` → thư mục gốc tuyệt đối.
- Key tương đối: `attachments/<ownerType>/<ownerId>/<field>/<yyyy>/<mm>/<filename>`.
- DB chỉ lưu đường dẫn tương đối; khi chạy thì resolve tuyệt đối bằng `toAbs()`.
- Ưu điểm: backup đơn giản (DB + thư mục), di trú server dễ (đổi `WM_UPLOAD_ROOT`).

## Luồng upload

- Route: `POST /api/attachments/:ownerType/:ownerId/:field?/files` (yêu cầu đăng nhập).
- Multer destination dùng `ownerType/ownerId/field` để dựng thư mục dưới `WM_UPLOAD_ROOT/attachments/...`.
- Service tạo bản ghi `TepTin` cho từng file với `DuongDan` tương đối và thông tin chủ sở hữu.

Ghi chú (Công việc/Bình luận):

- Hai thực thể này không cần khái niệm field. Khi gọi route generic, có thể bỏ `:field`; hệ thống mặc định `OwnerField = 'default'` để giữ thống nhất nội bộ mà không thay đổi schema của Công việc/Bình luận.
- Sau khi áp dụng, thao tác đính kèm cho Công việc/Bình luận vẫn phải hoạt động như hiện tại (yêu cầu đăng nhập, không thêm ràng buộc field).

## Truy xuất

- Danh sách: `GET /api/attachments/:ownerType/:ownerId/:field?/files` → `{ items[] }` sắp theo `NgayTaiLen desc`.
- Đếm: `GET /api/attachments/:ownerType/:ownerId/:field?/files/count` → `{ total }`.
- Stream theo id:
  - Inline: `/api/workmanagement/files/:id/inline`.
  - Download: `/api/workmanagement/files/:id/download`.
  - Service resolve `absPath = toAbs(doc.DuongDan)` và stream với header phù hợp (Content-Type từ `mime-types`, Content-Disposition an toàn UTF-8).

## Phân quyền

- Hiện tại: chỉ yêu cầu đăng nhập cho các endpoint này.
- Tương lai: bổ sung `assertAccessByOwner(ownerType, ownerId, req)` cho ACL theo từng thực thể.

## Kiểm tra & giới hạn

- Tái sử dụng kiểm tra MIME/kích thước trong upload middleware.
- Tương lai: ràng buộc theo field (ví dụ `images` chỉ cho ảnh) qua cấu hình ownerType.

## Ví dụ cây thư mục

```
WM_UPLOAD_ROOT/
  attachments/
    tapsan/
      66ffd1a2e7.../
        images/
          2025/
            09/
              1694301010-abcd12-cover.png
        files/
          2025/
            09/
              1694301015-abcd34-paper.pdf
```

## Backup & restore

- Backup DB + `WM_UPLOAD_ROOT`.
- Restore bằng cách copy thư mục và đặt `WM_UPLOAD_ROOT`; không cần sửa DB.

## Khả năng mở rộng

- Thực thể mới? Dùng bất kỳ chuỗi `ownerType` (vd: `BaiBao`) và truyền id của nó làm `ownerId`.
- Slot/field mới? Dùng bất kỳ chuỗi `field` (vd: `supplemental`, `attachments`, `cover`).
- Không cần thay đổi schema.

## Ngoài phạm vi hiện tại

- Chia sẻ một tệp cho nhiều chủ sở hữu.
- Quét virus, thumbnails, checksums, presigned URLs, Range requests.
