# Tổng kết thiết kế chức năng Giao Việc (Task)

Cập nhật: 2025-08-12
Phạm vi: Chuẩn hóa mô hình dữ liệu và luồng nghiệp vụ cho giao việc cụ thể (không phải nhiệm vụ thường quy), có phân cấp cha–con, bình luận và tệp đính kèm. Tạm thời bỏ qua phần thông báo realtime.

## Quyết định nghiệp vụ đã chốt

- Giao cho cá nhân hoặc nhóm.
  - Trong nhóm bắt buộc có 1 người xử lý chính (nguoiChinhId), còn lại là phối hợp.
  - Người xử lý chính chịu trách nhiệm cập nhật, báo cáo và nộp hoàn thành.
- Cho phép cập nhật tiến độ.
  - Mặc dù mang tính chủ quan, nhưng hữu ích cho theo dõi; có thể cập nhật khi: đạt mốc quan trọng, có thay đổi lớn, theo định kỳ, khi được yêu cầu, hoặc lúc nộp hoàn thành.
  - Tiến độ tổng của nhiệm vụ mặc định lấy theo tiến độ của người xử lý chính.
- Lưu lịch sử thay đổi (trạng thái/tiến độ) để audit và báo cáo.
- Mô hình cây cho nhiệm vụ: có thể tạo nhiệm vụ con từ nhiệm vụ cha.
- Bình luận trong phạm vi nhiệm vụ; cho phép reply (thread).
  - Tất cả người liên quan trong nhiệm vụ đều xem được bình luận.
  - Tác giả bình luận mới được sửa/xóa.
- Tệp đính kèm ở 3 cấp độ: nhiệm vụ, người tham gia, bình luận.
  - Tất cả người tham gia nhiệm vụ đều xem được các tệp ở cả 3 phạm vi.
  - Lưu trữ tệp trên ổ đĩa máy chủ (local), không phân loại, không mô tả, không lưu người xem.
  - Có giới hạn loại tệp (MIME) và kích thước (mặc định 25MB/tệp – có thể cấu hình).
  - Khi xóa nhiệm vụ: không xóa vật lý tệp; vẫn giữ để phục vụ khôi phục. Dùng isDeleted khi cần ẩn.
  - Khi xóa bình luận: set isDeleted cho các tệp gắn vào bình luận đó.
- Quyền xóa tệp: người giao việc (nguoiGiaoViecId) được xóa; thêm trường nguoiTaoId trong TepTin để có thể mở rộng chính sách sau.
- Thông báo khi có bình luận/tệp mới: sẽ tích hợp sau (ngoài phạm vi hiện tại).

## Mô hình dữ liệu (tên tiếng Việt)

### 1) Nhiệm vụ (NhiemVu)

- Trường chính:
  - tieuDe, moTa
  - nguoiGiaoViecId
  - nguoiThamGia: [ { nhanVienId, vaiTro: 'chinh'|'phoi_hop', trangThai, tienDo, ghiChu } ]
  - nguoiChinhId (truy vấn nhanh người xử lý chính – phải khớp phần tử có vaiTro='chinh')
  - mucDoUuTien: 'thap'|'trung_binh'|'cao'
  - thoiGianBatDau, thoiGianKetThuc (deadline)
  - trangThai: 'cho_nhan'|'dang_lam'|'cho_duyet'|'hoan_thanh'|'tu_choi'|'huy'
  - tienDoTong (mặc định = tiến độ của người 'chinh')
  - nhiemVuChaId (nullable)
  - lichSuTrangThai: [ { hanhDong, nguoiThucHienId, tuTrangThai, denTrangThai, thoiGian, ghiChu } ]
  - isDeleted (soft delete)
- Index gợi ý: (trangThai, thoiGianKetThuc), nguoiGiaoViecId, nguoiChinhId, nguoiThamGia.nhanVienId, nhiemVuChaId, isDeleted.
- Validate/logic:
  - thoiGianKetThuc > thoiGianBatDau.
  - nguoiThamGia có ít nhất 1 phần tử, và đúng 1 người vai trò 'chinh'.
  - nguoiChinhId phải trùng nhanVienId của phần tử 'chinh'.
  - Không trùng nhanVienId trong nguoiThamGia.
  - Không tự tham chiếu làm cha của chính mình.
  - Phương thức tiện ích: capNhatTienDoTongTheoNguoiChinh().

### 2) Bình luận (BinhLuan)

- Trường chính:
  - nhiemVuId, tacGiaId, noiDung
  - parentBinhLuanId (reply/thread)
  - tepTinIds: [TepTinId] (tuỳ chọn để truy vấn nhanh; nguồn sự thật là TepTin.binhLuanId)
  - isDeleted (soft delete)
- Hành vi:
  - static softDeleteWithFiles(binhLuanId): set isDeleted cho bình luận và TepTin (phamVi='binh_luan', binhLuanId=...)
- Index gợi ý: (nhiemVuId, parentBinhLuanId, createdAt), tacGiaId, isDeleted.

### 3) Tệp tin (TepTin)

- Trường chính:
  - nhiemVuId
  - phamVi: 'nhiem_vu' | 'nguoi_tham_gia' | 'binh_luan'
  - nhanVienId (bắt buộc khi phamVi='nguoi_tham_gia')
  - binhLuanId (bắt buộc khi phamVi='binh_luan')
  - nguoiTaoId (phục vụ quyền xoá/sửa)
  - tenTep, duongDan (local path hoặc URL), loaiNoiDung (validate theo whitelist), kichThuoc (<=25MB mặc định)
  - isDeleted (soft delete)
- Ràng buộc:
  - pre-validate: đảm bảo nhanVienId/binhLuanId tồn tại tương ứng với phamVi.
- Index gợi ý: (nhiemVuId, phamVi), binhLuanId, nhanVienId, nguoiTaoId, isDeleted.
- Lưu trữ:
  - Local folder đề xuất: `uploads/workmanagement/` (lưu đường dẫn tương đối vào duongDan để dễ di chuyển môi trường).

## Quan hệ dữ liệu (không hình vẽ)

- NhiemVu 1—N BinhLuan (BinhLuan.nhiemVuId)
- NhiemVu 1—N TepTin (TepTin.nhiemVuId)
- BinhLuan 1—N TepTin (TepTin.binhLuanId; phamVi='binh_luan')
- NhiemVu — NhanVien: qua mảng NhiemVu.nguoiThamGia (nhúng – không tạo collection trung gian)
- Phân cấp NhiemVu: self-reference qua nhiemVuChaId

## Quyền và hiển thị

- Bình luận
  - Xem: tất cả người tham gia nhiệm vụ (bao gồm người giao việc).
  - Tạo: người tham gia nhiệm vụ.
  - Sửa/Xóa: chỉ tác giả bình luận (kiểm tra ở service/controller).
- Tệp tin
  - Xem: tất cả người tham gia nhiệm vụ ở mọi phạm vi ('nhiem_vu' | 'nguoi_tham_gia' | 'binh_luan').
  - Tạo (upload): người tham gia nhiệm vụ.
  - Xóa: người giao việc (nguoiGiaoViecId). Có nguoiTaoId để dễ mở rộng chính sách sau.
- Nhiệm vụ con
  - Quyền tạo nhiệm vụ con: người xử lý chính của nhiệm vụ cha (chi tiết có thể mở rộng thêm vai trò quản lý).

## API tối thiểu (định hướng)

- Nhiệm vụ
  - POST /api/workmanagement/tasks
  - GET /api/workmanagement/tasks (filter/sort/paginate)
  - GET /api/workmanagement/tasks/:id
  - PATCH /api/workmanagement/tasks/:id (cập nhật thông tin/chuyển trạng thái)
  - PATCH /api/workmanagement/tasks/:id/progress (cập nhật tiến độ – người chính)
  - POST /api/workmanagement/tasks/:id/children (tạo nhiệm vụ con)
  - DELETE /api/workmanagement/tasks/:id (soft delete)
- Bình luận
  - POST /api/workmanagement/tasks/:id/comments
  - GET /api/workmanagement/tasks/:id/comments
  - PATCH /api/workmanagement/comments/:commentId
  - DELETE /api/workmanagement/comments/:commentId (softDeleteWithFiles)
- Tệp tin
  - POST /api/workmanagement/tasks/:id/files (phamVi='nhiem_vu' | 'nguoi_tham_gia' | 'binh_luan')
  - GET /api/workmanagement/tasks/:id/files
  - DELETE /api/workmanagement/files/:fileId (kiểm tra quyền người giao việc)

## Frontend – màn hình/UX

- Danh sách nhiệm vụ (List/Kanban/Calendar) + bộ lọc (trạng thái, người chính, deadline, ưu tiên).
- Chi tiết nhiệm vụ (modal/page) với các tab: Thông tin | Người tham gia | Bình luận | Tệp đính kèm | Lịch sử.
- Form tạo/sửa nhiệm vụ: chọn người tham gia, đánh dấu người chính, thời gian, ưu tiên; tùy chọn gán nhiệm vụ cha.
- Modal cập nhật tiến độ (người chính), reply thread trong bình luận, upload tệp ở 3 phạm vi.

## Kiểm thử gợi ý

- Unit: validate schema (vai trò 'chinh' duy nhất, thời gian hợp lệ, ràng buộc TepTin theo phamVi, softDeleteWithFiles).
- Integration: luồng tạo → giao → cập nhật tiến độ → comment + file → xóa comment (ẩn file) → tạo nhiệm vụ con → duyệt truy vấn file/comment theo quyền.
- E2E: danh sách/chi tiết/luồng hành động chính trên UI sau khi có FE.

## Chuẩn hóa & dọn trùng lặp (trong codebase hiện tại)

- Giữ model tiếng Việt trong module workmanagement: `NhiemVu`, `BinhLuan`, `TepTin`.
- Bỏ dùng/xóa các bản trùng: `Comment.js` (nếu có) → dùng `BinhLuan`; `File.js` (nếu có) → dùng `TepTin`.
- Hợp nhất `TaskAssignee`/`NguoiThucHienCongViec` vào mảng nhúng `nguoiThamGia` trong `NhiemVu`.
- Tạm thời bỏ qua Notification/ThongBao (sẽ tích hợp sau theo quy tắc thông báo).

## Mở rộng/điểm cần chốt thêm (tùy nhu cầu)

- Quy tắc đồng bộ trạng thái cha–con: có tự động cập nhật trạng thái cha theo con hay không; và ngược lại.
- Quy tắc tổng hợp tiến độ khi có nhiều người phối hợp (hiện tại mặc định dùng tiến độ người chính).
- Chính sách phân quyền thêm (ví dụ: quản lý cấp trên có thể xoá tệp/bình luận?).
- Cấu hình danh sách MIME/giới hạn dung lượng qua biến môi trường.
- Thư mục lưu trữ local: thống nhất `uploads/workmanagement/` và chuẩn URL phục vụ tải xuống.

---

Tài liệu này tóm lược các quyết định và thiết kế đã thống nhất để triển khai tính năng giao việc trong module Work Management. Khi cần, có thể mở rộng phần API/Service/Controller cụ thể theo khung ở trên.
