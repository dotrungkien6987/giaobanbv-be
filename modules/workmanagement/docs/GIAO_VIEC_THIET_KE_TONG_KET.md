# Tổng kết thiết kế chức năng Giao Việc (Công việc)

Cập nhật: 2025-08-12
Phạm vi: Chuẩn hóa mô hình dữ liệu và luồng nghiệp vụ cho giao việc cụ thể (không phải nhiệm vụ thường quy), có phân cấp cha–con, bình luận và tệp đính kèm. Tạm thời bỏ qua phần thông báo realtime.

## Quyết định nghiệp vụ đã chốt

- Giao cho cá nhân hoặc nhóm.
  - Trong nhóm bắt buộc có 1 người xử lý chính (NguoiChinhID), còn lại là phối hợp.
  - Người xử lý chính chịu trách nhiệm cập nhật, báo cáo và nộp hoàn thành.
- Cho phép cập nhật tiến độ.
  - Mặc dù mang tính chủ quan, nhưng hữu ích cho theo dõi; có thể cập nhật khi: đạt mốc quan trọng, có thay đổi lớn, theo định kỳ, khi được yêu cầu, hoặc lúc nộp hoàn thành.
  - Tiến độ tổng của công việc mặc định lấy theo tiến độ của người xử lý chính.
- Lưu lịch sử thay đổi (trạng thái/tiến độ) để audit và báo cáo.
- Mô hình cây cho công việc: có thể tạo công việc con từ công việc cha.
- Bình luận trong phạm vi công việc; cho phép reply (thread).
  - Tất cả người liên quan trong công việc đều xem được bình luận.
  - Tác giả bình luận mới được sửa/xóa.
- Tệp đính kèm ở 3 cấp độ: công việc, người tham gia, bình luận.
  - Tất cả người tham gia công việc đều xem được các tệp ở cả 3 phạm vi.
  - Lưu trữ tệp trên ổ đĩa máy chủ (local). Không theo dõi người xem.
  - Có giới hạn loại tệp (MIME) và kích thước (mặc định 25MB/tệp – có thể cấu hình).
  - Khi xóa công việc: không xóa vật lý tệp; vẫn giữ để phục vụ khôi phục. Dùng isDeleted khi cần ẩn.
  - Khi xóa bình luận: set isDeleted cho các tệp gắn vào bình luận đó.
- Quyền xóa tệp: người giao việc (NguoiGiaoViecID) được xóa; có NguoiTaiLenID (nguoiTaoId) trong TepTin để mở rộng chính sách sau.
- Thông báo khi có bình luận/tệp mới: sẽ tích hợp sau (ngoài phạm vi hiện tại).

## Mô hình dữ liệu (tên tiếng Việt)

### 1) Công việc (CongViec)

- Trường chính (bám theo model hiện tại):
  - TieuDe, MoTa
  - NguoiGiaoViecID
  - NguoiThamGia: [ { NhanVienID, VaiTro: 'CHINH'|'PHOI_HOP', TrangThai, TienDo, GhiChu } ]
  - NguoiChinhID (truy vấn nhanh người xử lý chính – phải khớp phần tử có VaiTro='CHINH')
  - MucDoUuTien: 'THAP'|'BINH_THUONG'|'CAO'|'KHAN_CAP'
  - NgayBatDau, NgayHetHan (deadline)
  - TrangThai: 'TAO_MOI'|'DA_GIAO'|'CHAP_NHAN'|'TU_CHOI'|'DANG_THUC_HIEN'|'CHO_DUYET'|'HOAN_THANH'|'QUA_HAN'|'HUY'
  - PhanTramTienDoTong (mặc định = tiến độ của người 'CHINH')
  - CongViecChaID (nullable)
  - LichSuTrangThai: [ { HanhDong, NguoiThucHienID, TuTrangThai, DenTrangThai, ThoiGian, GhiChu } ]
  - isDeleted (soft delete)
- Index gợi ý: (TrangThai, NgayHetHan), NguoiGiaoViecID, NguoiChinhID, NguoiThamGia.NhanVienID, CongViecChaID, isDeleted.
- Validate/logic:

  - NgayHetHan > NgayBatDau.
  - NguoiThamGia có ít nhất 1 phần tử, và đúng 1 người VaiTro='CHINH'.
  - NguoiChinhID phải trùng NhanVienID của phần tử VaiTro='CHINH'.
  - Không trùng NhanVienID trong NguoiThamGia.
  - Không tự tham chiếu làm cha của chính mình.
  - Phương thức tiện ích: capNhatTienDoTongTheoNguoiChinh().

  Bổ sung đề xuất (nếu cần dùng sau): Danh sách Nhãn/Tag, Điểm ưu tiên số (PriorityScore), Điểm rủi ro.

### 2) Bình luận (BinhLuan)

- Trường chính:
  - CongViecID, NguoiBinhLuanID (tác giả), NoiDung
  - BinhLuanChaID (reply/thread)
  - TepTinIds: [TepTinID] (tùy chọn để truy vấn nhanh; nguồn sự thật là TepTin.BinhLuanID)
  - LoaiBinhLuan: 'COMMENT'|'FEEDBACK'|'QUESTION'|'SOLUTION'
  - TrangThai: 'ACTIVE'|'DELETED'|'HIDDEN'
  - NgayBinhLuan, NgayCapNhat
- Hành vi:
  - static softDeleteWithFiles(binhLuanId): set TrangThai='DELETED' cho bình luận và các TepTin có BinhLuanID=...
- Index gợi ý: (CongViecID, BinhLuanChaID, createdAt), NguoiBinhLuanID, TrangThai.

### 3) Tệp tin (TepTin)

- Trường chính:
  - CongViecID
  - BinhLuanID (khi đính kèm vào bình luận)
  - NguoiTaiLenID (nguoiTaoId)
  - TenFile (tên lưu), TenGoc, LoaiFile (MIME), KichThuoc (<=25MB mặc định), DuongDan (local path hoặc URL), MoTa (tùy chọn)
  - TrangThai: 'ACTIVE'|'DELETED', NgayTaiLen
  - (Khuyến nghị) PhamVi: 'CONG_VIEC' | 'NGUOI_THAM_GIA' | 'BINH_LUAN'
  - (Khuyến nghị) NhanVienID (bắt buộc khi PhamVi='NGUOI_THAM_GIA')
- Ràng buộc:
  - pre-validate: nếu PhamVi='BINH_LUAN' thì bắt buộc có BinhLuanID; nếu PhamVi='NGUOI_THAM_GIA' thì bắt buộc có NhanVienID; kiểm tra LoaiFile theo whitelist; giới hạn KichThuoc theo env (mặc định 25MB).
- Index gợi ý: (CongViecID, PhamVi), BinhLuanID, NhanVienID, NguoiTaiLenID, TrangThai, NgayTaiLen.
- Lưu trữ:
  - Local folder đề xuất: `uploads/workmanagement/` (lưu đường dẫn tương đối vào DuongDan để dễ di chuyển môi trường).

## Quan hệ dữ liệu (không hình vẽ)

- CongViec 1—N BinhLuan (BinhLuan.CongViecID)
- CongViec 1—N TepTin (TepTin.CongViecID)
- BinhLuan 1—N TepTin (TepTin.BinhLuanID; khi đính kèm bình luận)
- CongViec — NhanVien: qua mảng CongViec.NguoiThamGia (nhúng – không tạo collection trung gian)
- Phân cấp CongViec: self-reference qua CongViecChaID

## Quyền và hiển thị

- Bình luận
  - Xem: tất cả người tham gia công việc (bao gồm người giao việc).
  - Tạo: người tham gia công việc.
  - Sửa/Xóa: chỉ tác giả bình luận (kiểm tra ở service/controller).
- Tệp tin
  - Xem: tất cả người tham gia công việc ở mọi phạm vi ('CONG_VIEC' | 'NGUOI_THAM_GIA' | 'BINH_LUAN' nếu dùng PhamVi).
  - Tạo (upload): người tham gia công việc.
  - Xóa: người giao việc (NguoiGiaoViecID). Có NguoiTaiLenID để dễ mở rộng chính sách sau.
- Công việc con
  - Quyền tạo công việc con: người xử lý chính của công việc cha (chi tiết có thể mở rộng thêm vai trò quản lý).

## API tối thiểu (định hướng)

- Công việc
  - POST /api/workmanagement/congviec
  - GET /api/workmanagement/congviec (filter/sort/paginate)
  - GET /api/workmanagement/congviec/:id
  - PATCH /api/workmanagement/congviec/:id (cập nhật thông tin/chuyển trạng thái)
  - PATCH /api/workmanagement/congviec/:id/progress (cập nhật tiến độ – người chính)
  - POST /api/workmanagement/congviec/:id/children (tạo công việc con)
  - DELETE /api/workmanagement/congviec/:id (soft delete)
- Bình luận
  - POST /api/workmanagement/congviec/:id/binhluan
  - GET /api/workmanagement/congviec/:id/binhluan
  - PATCH /api/workmanagement/binhluan/:binhLuanId
  - DELETE /api/workmanagement/binhluan/:binhLuanId (softDeleteWithFiles)
- Tệp tin
  - POST /api/workmanagement/congviec/:id/teptin (PhamVi='CONG_VIEC' | 'NGUOI_THAM_GIA' | 'BINH_LUAN')
  - GET /api/workmanagement/congviec/:id/teptin
  - DELETE /api/workmanagement/teptin/:fileId (kiểm tra quyền người giao việc)

## Frontend – màn hình/UX

- Danh sách công việc (List/Kanban/Calendar) + bộ lọc (trạng thái, người chính, deadline, ưu tiên).
- Chi tiết công việc (modal/page) với các tab: Thông tin | Người tham gia | Bình luận | Tệp đính kèm | Lịch sử.
- Form tạo/sửa công việc: chọn người tham gia, đánh dấu người chính, thời gian, ưu tiên; tùy chọn gán công việc cha.
- Modal cập nhật tiến độ (người chính), reply thread trong bình luận, upload tệp ở 3 phạm vi.

## Kiểm thử gợi ý

- Unit: validate schema (VaiTro 'CHINH' duy nhất, thời gian hợp lệ, ràng buộc TepTin theo PhamVi, softDeleteWithFiles).
- Integration: luồng tạo → giao → cập nhật tiến độ → bình luận + tệp → xóa bình luận (ẩn tệp) → tạo công việc con → duyệt truy vấn tệp/bình luận theo quyền.
- E2E: danh sách/chi tiết/luồng hành động chính trên UI sau khi có FE.

## Chuẩn hóa & dọn trùng lặp (trong codebase hiện tại)

- Giữ model tiếng Việt trong module workmanagement: `CongViec`, `BinhLuan`, `TepTin`.
- Bỏ dùng/xóa các bản trùng: `Comment.js` (nếu có) → dùng `BinhLuan`; `File.js` (nếu có) → dùng `TepTin`.
- Hợp nhất `TaskAssignee`/`NguoiThucHienCongViec` vào mảng nhúng `NguoiThamGia` trong `CongViec`.
- Tạm thời bỏ qua Notification/ThongBao (sẽ tích hợp sau theo quy tắc thông báo).

## Mở rộng/điểm cần chốt thêm (tùy nhu cầu)

- Quy tắc đồng bộ trạng thái cha–con: có tự động cập nhật trạng thái cha theo con hay không; và ngược lại.
- Quy tắc tổng hợp tiến độ khi có nhiều người phối hợp (hiện tại mặc định dùng tiến độ người chính).
- Chính sách phân quyền thêm (ví dụ: quản lý cấp trên có thể xoá tệp/bình luận?).
- Cấu hình danh sách MIME/giới hạn dung lượng qua biến môi trường.
- Thư mục lưu trữ local: thống nhất `uploads/workmanagement/` và chuẩn URL phục vụ tải xuống.

---

Tài liệu này tóm lược các quyết định và thiết kế đã thống nhất để triển khai tính năng giao việc trong module Work Management. Khi cần, có thể mở rộng phần API/Service/Controller cụ thể theo khung ở trên.
