# Hướng dẫn Triển khai Đính kèm Tệp (One-to-many + OwnerField)

Tài liệu này hướng dẫn agent triển khai cơ chế đính kèm tệp dùng chung cho mọi thực thể. Giả định đã xác nhận:

- Các field đính kèm theo thực thể là tùy biến (chọn tự do qua tham số route `:field`), mặc định `default`.
- Phân quyền: chỉ yêu cầu đăng nhập (login) tạm thời.
- Áp dụng ngay cây thư mục vật lý rõ ràng và mang tính tổng quát để mở rộng cho thực thể/field mới.
- Giới hạn định dạng/kích thước file giữ nguyên theo cấu hình hiện có.
- Chưa cần tính năng “đính kèm tệp đã có”.
- Dự án mới, không có dữ liệu cũ nên không cần migration.

Kết quả cần đạt:

- Mỗi tệp thuộc chính xác 1 “chủ sở hữu” (OwnerType, OwnerID) và 1 “vị trí/slot” (OwnerField).
- Lưu đường dẫn tương đối (relative) trong DB; tệp vật lý nằm dưới một upload root cấu hình được.
- Cấu trúc thư mục: `attachments/<ownerType>/<ownerId>/<field>/<yyyy>/<mm>/<filename>`.
- Cung cấp REST API generic để upload/liệt kê/đếm theo owner+field; stream vẫn theo fileId.

Lưu ý quan trọng (Công việc/Bình luận):

- Với Công việc và Bình luận hiện có, KHÔNG cần gắn theo field. Khi dùng route generic, không truyền `:field` (hoặc để mặc định). Hệ thống tự đặt `OwnerField = 'default'` nội bộ.
- Không thay đổi schema của hai thực thể Công việc/Bình luận. Sau khi agent chỉnh sửa, luồng đính kèm cho Công việc/Bình luận phải tiếp tục hoạt động như cũ (chỉ yêu cầu đăng nhập).

---

## 0) Chuẩn bị

- Đảm bảo `middlewares/authentication.js` có `loginRequired`.
- Quyết định giá trị tuyệt đối cho `WM_UPLOAD_ROOT` và đặt vào `.env`.

---

## 1) Cấu hình lưu trữ và hàm resolve đường dẫn

File: `modules/workmanagement/helpers/uploadConfig.js`

- Xuất (export):
  - `uploadRoot`: lấy từ env `WM_UPLOAD_ROOT` hoặc mặc định `<project>/uploads/workmanagement`.
  - `toAbs(relOrAbs)`: trả về đường dẫn tuyệt đối (chấp nhận giá trị tuyệt đối; nếu tương đối thì resolve dưới `uploadRoot` và chặn path traversal).

Ví dụ khung:

- `const uploadRoot = path.resolve(process.env.WM_UPLOAD_ROOT || path.join(process.cwd(), 'uploads', 'workmanagement'));`
- `function toAbs(relOrAbs) { if (path.isAbsolute(relOrAbs)) return relOrAbs; const abs = path.resolve(uploadRoot, relOrAbs||''); if (!abs.startsWith(uploadRoot)) throw new Error('Invalid'); return abs; }`

---

## 2) Helper tạo key (đường dẫn tương đối)

Thêm file: `modules/workmanagement/helpers/attachmentPath.js`

- `safeName(name)` → làm sạch tên file.
- `buildRelKey({ ownerType, ownerId, field='default', originalName, date=new Date() })` → trả về `attachments/<type>/<id>/<field>/<yyyy>/<mm>/<filename>`.

---

## 3) Đích ghi của upload middleware (multer)

File: `modules/workmanagement/middlewares/upload.middleware.js`

- Giữ kiểm tra MIME/kích thước như hiện tại.
- Trong `destination`, nhận tham số từ route generic: `req.params.ownerType`, `req.params.ownerId`, `req.params.field || 'default'`.
- Dựng thư mục bằng `buildRelKey` (bỏ phần tên file) và đảm bảo nằm dưới `uploadRoot` với `fs.ensureDir`.
- Giữ logic đặt tên file (timestamp + short id + base/ext an toàn).

Gợi ý:

- `const relKey = buildRelKey({ ownerType, ownerId, field, originalName: 'placeholder' });`
- `const dest = path.resolve(uploadRoot, path.dirname(relKey));`

---

## 4) Thay đổi model TepTin

File: `modules/workmanagement/models/TepTin.js`

- Thêm trường: `OwnerType: String`, `OwnerID: ObjectId`, `OwnerField: String` (mặc định `default`).
- `DuongDan: String` lưu relative path.
- Thêm index: `{ OwnerType:1, OwnerID:1, OwnerField:1, NgayTaiLen:-1 }`.
- Vì dự án mới, có thể bỏ các trường legacy nếu không cần.

---

## 5) API generic cho attachments

Thêm các file:

- `modules/workmanagement/routes/attachments.api.js`
- `modules/workmanagement/controllers/attachment.controller.js`
- `modules/workmanagement/services/attachment.service.js`

Định nghĩa (mount dưới `/api/attachments` và yêu cầu `loginRequired`):

- `POST /:ownerType/:ownerId/:field?/files` (multipart `files[]`) → upload.
- `GET /:ownerType/:ownerId/:field?/files` → list.
- `GET /:ownerType/:ownerId/:field?/files/count` → count.

Ghi chú Service:

- Khi upload: tính `relPath = path.relative(uploadRoot, f.path)`; tạo bản ghi `TepTin` với Owner fields; trả DTO có inline/download URLs.
- Khi list/count: lọc theo OwnerType/OwnerID và OwnerField (tùy chọn).
- Stream theo fileId có thể tái dùng endpoints `/api/workmanagement/files/:id/inline|download`; resolve tuyệt đối qua `toAbs(doc.DuongDan)`.

---

## 6) Đăng ký router

- Trong `app.js` (hoặc routes index), thêm:
  - `const attachmentsRoutes = require('./modules/workmanagement/routes/attachments.api');`
  - `app.use('/api/attachments', attachmentsRoutes);`

---

## 7) Cấu hình .env và kiểm thử nhanh

- `.env`: đặt `WM_UPLOAD_ROOT` là đường dẫn tuyệt đối.
- Kịch bản thử:
  1. Upload đến `/api/attachments/TapSan/<id>/images/files` với nhiều file.
  2. List `/api/attachments/TapSan/<id>/images/files` và count.
  3. Stream 1 `fileId` dạng inline/download.
  4. Kiểm tra file tồn tại tại `WM_UPLOAD_ROOT/attachments/tapsan/<id>/images/<yyyy>/<mm>/...`.

Tiêu chí đạt:

- DB lưu `DuongDan` dạng relative, có OwnerType/OwnerID/OwnerField.
- Mọi endpoint yêu cầu login và hoạt động với giá trị `ownerType`/`field` bất kỳ.
- File vật lý được ghi đúng theo cây thư mục bắt buộc.

---

## 8) Mở rộng (ngoài phạm vi bước này)

- ACL theo từng ownerType; ràng buộc theo field (ví dụ chỉ ảnh cho `images`).
- Checksum, dedupe, thumbnails, Range requests.
- Presigned URLs/token ngắn hạn.
