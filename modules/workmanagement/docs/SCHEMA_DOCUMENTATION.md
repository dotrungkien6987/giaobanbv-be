# TÀI LIỆU MÔ TẢ CHI TIẾT CÁC SCHEMA

**Module:** Work Management System  
**Ngày tạo:** 29/07/2025  
**Phiên bản:** 1.0

---

## 1. PHONGBAN (DEPARTMENT) SCHEMA

### Mục đích

Quản lý thông tin các phòng ban trong bệnh viện.

### Cấu trúc dữ liệu

```javascript
{
  TenPhongBan: String,        // Tên đầy đủ của phòng ban (VD: "Phòng Khám Nội")
  MaPhongBan: String,         // Mã viết tắt duy nhất (VD: "PKN01")
  MoTa: String,               // Mô tả chức năng, nhiệm vụ của phòng ban
  TruongPhongID: ObjectId,    // ID của trưởng phòng (ref: User)
  PhongBanChaID: ObjectId,    // ID phòng ban cấp trên (để tạo cây tổ chức)
  TrangThaiHoatDong: Boolean, // true: đang hoạt động, false: đã dừng
  NgayThanhLap: Date,         // Ngày chính thức thành lập phòng ban
  SoDienThoai: String,        // Số điện thoại liên hệ của phòng ban
  Email: String,              // Email chính thức của phòng ban
  DiaChi: String,             // Địa chỉ vật lý (tầng, phòng)
  GhiChu: String              // Các ghi chú bổ sung khác
}
```

### Quan hệ

- **1-1** với User (TruongPhongID): Mỗi phòng ban có 1 trưởng phòng
- **1-N** với chính nó (PhongBanChaID): Cấu trúc cây phòng ban
- **1-N** với ViTriCongViec: Mỗi phòng ban có nhiều vị trí công việc



## 3. NHANVIENQUANLY (EMPLOYEE) SCHEMA

### Mục đích

Quản lý thông tin nhân viên trong hệ thống đánh giá công việc.

### Cấu trúc dữ liệu

```javascript
{
  UserID: ObjectId,           // Liên kết với bảng User chính (ref: User)
  MaNhanVien: String,         // Mã nhân viên duy nhất (VD: "NV001")
  HoTen: String,              // Họ và tên đầy đủ
  ViTriHienTaiID: ObjectId,   // Vị trí công việc hiện tại (ref: ViTriCongViec)
  PhongBanHienTaiID: ObjectId,// Phòng ban hiện tại (ref: PhongBan)
  NgayVaoLam: Date,           // Ngày chính thức bắt đầu làm việc
  TrangThaiLamViec: String,   // "ACTIVE", "INACTIVE", "ON_LEAVE", "RESIGNED"
  Email: String,              // Email công việc
  SoDienThoai: String,        // Số điện thoại liên hệ
  DiaChi: String,             // Địa chỉ nơi ở
  ChuyenMon: String,          // Chuyên môn, lĩnh vực chính
  TrinhDoHocVan: String,      // Trình độ học vấn cao nhất
  KinhNghiem: Number,         // Số năm kinh nghiệm làm việc
  GhiChu: String              // Các ghi chú khác về nhân viên
}
```

### Quan hệ

- **1-1** với User: Mỗi nhân viên liên kết với 1 tài khoản user
- **N-1** với ViTriCongViec: Nhiều nhân viên có thể cùng 1 vị trí
- **N-1** với PhongBan: Nhiều nhân viên thuộc 1 phòng ban
- **1-N** với LichSuViTriNhanVien: 1 nhân viên có nhiều lịch sử chuyển vị trí

---

## 4. LICHSUVITRINHANVIEN (EMPLOYEE POSITION HISTORY) SCHEMA

### Mục đích

Lưu lịch sử thay đổi vị trí công việc của nhân viên qua thời gian.

### Cấu trúc dữ liệu

```javascript
{
  NhanVienID: ObjectId,       // ID nhân viên (ref: NhanVienQuanLy)
  ViTriID: ObjectId,          // ID vị trí công việc (ref: ViTriCongViec)
  PhongBanID: ObjectId,       // ID phòng ban (ref: PhongBan)
  NgayBatDau: Date,           // Ngày bắt đầu làm việc ở vị trí này
  NgayKetThuc: Date,          // Ngày kết thúc (null nếu đang làm)
  LoaiThayDoi: String,        // "TUYEN_MOI", "CHUYEN_VITRI", "THANG_CHUC", "GIAM_CHUC"
  LyDoThayDoi: String,        // Lý do cụ thể thay đổi vị trí
  NguoiPheDuyetID: ObjectId,  // Người phê duyệt thay đổi (ref: User)
  NgayPheDuyet: Date,         // Ngày được phê duyệt
  TrangThai: String,          // "ACTIVE", "INACTIVE", "PENDING"
  GhiChu: String              // Ghi chú bổ sung về thay đổi
}
```

### Quan hệ

- **N-1** với NhanVienQuanLy: Nhiều lịch sử thuộc 1 nhân viên
- **N-1** với ViTriCongViec: Nhiều lịch sử có thể cùng 1 vị trí
- **N-1** với PhongBan: Nhiều lịch sử thuộc 1 phòng ban

---

## 5. NHIEMVUTHUONGQUY (ROUTINE DUTY) SCHEMA

### Mục đích

Định nghĩa các nhiệm vụ thường quy mà nhân viên phải thực hiện.

### Cấu trúc dữ liệu

```javascript
{
  TenNhiemVu: String,         // Tên nhiệm vụ (VD: "Khám bệnh nhân ngoại trú")
  MaNhiemVu: String,          // Mã định danh (VD: "NV_KB_NT_01")
  MoTa: String,               // Mô tả chi tiết cách thực hiện
  LoaiNhiemVu: String,        // "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"
  MucDoKho: Number,           // Độ khó từ 1-10 (1: dễ, 10: rất khó)
  ThoiGianThucHienDuKien: Number, // Thời gian dự kiến (phút)
  YeuCauKyNang: String,       // Kỹ năng cần thiết để thực hiện
  TrangThaiHoatDong: Boolean, // true: đang sử dụng, false: đã dừng
  NguoiTaoID: ObjectId,       // Người tạo nhiệm vụ (ref: User)
  NgayTao: Date,              // Ngày tạo nhiệm vụ
  GhiChu: String              // Ghi chú bổ sung
}
```

### Quan hệ

- **N-N** với ViTriCongViec (qua ViTriNhiemVuThuongQuy): Nhiều vị trí có thể có cùng nhiệm vụ
- **1-N** với CongViecDuocGiao: 1 nhiệm vụ có thể tạo nhiều công việc cụ thể

---

## 6. VITRINHIEMVUTHUONGQUY (POSITION ROUTINE DUTY) SCHEMA

### Mục đích

Liên kết vị trí công việc với nhiệm vụ thường quy, xác định tỷ trọng.

### Cấu trúc dữ liệu

```javascript
{
  ViTriID: ObjectId,          // ID vị trí công việc (ref: ViTriCongViec)
  NhiemVuThuongQuyID: ObjectId, // ID nhiệm vụ thường quy (ref: NhiemVuThuongQuy)
  TyTrongPhanTram: Number,    // Tỷ trọng nhiệm vụ trong công việc (0-100%)
  TrangThaiHoatDong: Boolean, // true: đang áp dụng, false: tạm dừng
  NgayGan: Date               // Ngày gán nhiệm vụ cho vị trí
}
```

### Ràng buộc nghiệp vụ

- Tổng tỷ trọng các nhiệm vụ của 1 vị trí không được vượt quá 100%
- Một cặp (ViTriID, NhiemVuThuongQuyID) chỉ tồn tại duy nhất

### Quan hệ

- **N-1** với ViTriCongViec: Nhiều liên kết thuộc 1 vị trí
- **N-1** với NhiemVuThuongQuy: Nhiều liên kết thuộc 1 nhiệm vụ

---

## 7. TIEUCHIDANHGIA (EVALUATION CRITERIA) SCHEMA

### Mục đích

Định nghĩa các tiêu chí đánh giá chung có thể áp dụng cho nhiều vị trí.

### Cấu trúc dữ liệu

```javascript
{
  TenTieuChi: String,         // Tên tiêu chí (VD: "Tác phong làm việc")
  MaTieuChi: String,          // Mã định danh (VD: "TC_TPLV_01")
  MoTa: String,               // Mô tả chi tiết tiêu chí
  LoaiTieuChi: String,        // "TANG_DIEM", "TRU_DIEM" (cộng điểm hay trừ điểm)
  DiemToiDa: Number,          // Điểm tối đa có thể đạt được (thường là 10)
  DiemToiThieu: Number,       // Điểm tối thiểu (thường là 0)
  TrongSoMacDinh: Number,     // Trọng số mặc định (0.1 - 1.0)
  TrangThaiHoatDong: Boolean, // true: đang sử dụng, false: đã dừng
  NguoiTaoID: ObjectId,       // Người tạo tiêu chí (ref: User)
  NgayTao: Date,              // Ngày tạo tiêu chí
  GhiChu: String              // Ghi chú bổ sung
}
```

### Quan hệ

- **1-N** với TieuChiTheoViTri: 1 tiêu chí có thể áp dụng cho nhiều vị trí
- **1-N** với DiemTieuChi: 1 tiêu chí có nhiều lần chấm điểm

---

## 8. TIEUCHITHEOVITRÍ (POSITION CRITERIA) SCHEMA

### Mục đích

Áp dụng tiêu chí đánh giá cụ thể cho từng vị trí với trọng số riêng.

### Cấu trúc dữ liệu

```javascript
{
  ViTriID: ObjectId,          // ID vị trí công việc (ref: ViTriCongViec)
  TieuChiID: ObjectId,        // ID tiêu chí đánh giá (ref: TieuChiDanhGia)
  TrongSo: Number,            // Trọng số riêng cho vị trí này (0.1 - 1.0)
  DiemMong​Doi: Number,        // Điểm mong đợi cho vị trí này
  BatBuoc: Boolean,           // true: bắt buộc đánh giá, false: tùy chọn
  GhiChuApDung: String,       // Ghi chú cách áp dụng cho vị trí này
  TrangThaiHoatDong: Boolean, // true: đang áp dụng, false: tạm dừng
  NgayApDung: Date            // Ngày bắt đầu áp dụng tiêu chí
}
```

### Quan hệ

- **N-1** với ViTriCongViec: Nhiều tiêu chí thuộc 1 vị trí
- **N-1** với TieuChiDanhGia: Nhiều vị trí có thể dùng cùng 1 tiêu chí

---

## 9. CHUKYDANHGIA (EVALUATION CYCLE) SCHEMA

### Mục đích

Định nghĩa các chu kỳ đánh giá KPI (tháng, quý, năm).

### Cấu trúc dữ liệu

```javascript
{
  TenChuKy: String,           // Tên chu kỳ (VD: "Đánh giá tháng 7/2025")
  MaChuKy: String,            // Mã định danh (VD: "DG_2025_T07")
  LoaiChuKy: String,          // "MONTHLY", "QUARTERLY", "YEARLY"
  NgayBatDau: Date,           // Ngày bắt đầu chu kỳ
  NgayKetThuc: Date,          // Ngày kết thúc chu kỳ
  NgayMoDanhGia: Date,        // Ngày mở đánh giá
  NgayDongDanhGia: Date,      // Ngày đóng đánh giá
  TrangThai: String,          // "CHUA_BAT_DAU", "DANG_DANHGIA", "DA_DONG"
  MoTa: String,               // Mô tả chu kỳ đánh giá
  NguoiTaoID: ObjectId,       // Người tạo chu kỳ (ref: User)
  GhiChu: String              // Ghi chú bổ sung
}
```

### Quan hệ

- **1-N** với DanhGiaKPI: 1 chu kỳ có nhiều đánh giá KPI cá nhân

---

## 10. DANHGIAKPI (KPI EVALUATION) SCHEMA

### Mục đích

Lưu kết quả đánh giá KPI của từng nhân viên trong một chu kỳ.

### Cấu trúc dữ liệu

```javascript
{
  NhanVienID: ObjectId,       // ID nhân viên được đánh giá (ref: NhanVienQuanLy)
  ChuKyID: ObjectId,          // ID chu kỳ đánh giá (ref: ChuKyDanhGia)
  NguoiDanhGiaID: ObjectId,   // ID người đánh giá (ref: User)
  TongDiem: Number,           // Tổng điểm KPI
  XepLoai: String,            // "XUAT_SAC", "TOT", "KHA", "TRUNG_BINH", "YEU"
  TrangThai: String,          // "DRAF", "SUBMITTED", "APPROVED", "REJECTED"
  NgayBatDauDanhGia: Date,    // Ngày bắt đầu đánh giá
  NgayKetThucDanhGia: Date,   // Ngày hoàn thành đánh giá
  GhiChuTongQuat: String,     // Nhận xét tổng quát của người đánh giá
  DiemTuDanhGia: Number,      // Điểm tự đánh giá của nhân viên
  GhiChuTuDanhGia: String,    // Ghi chú tự đánh giá
  TrangThaiPheDuyet: String   // "PENDING", "APPROVED", "NEED_REVISION"
}
```

### Quan hệ

- **N-1** với NhanVienQuanLy: Nhiều đánh giá thuộc 1 nhân viên
- **N-1** với ChuKyDanhGia: Nhiều đánh giá thuộc 1 chu kỳ
- **1-N** với DanhGiaNhiemVuThuongQuy: 1 đánh giá KPI có nhiều đánh giá nhiệm vụ

---

## 11. DANHGIANHIEMVUTHUONGQUY (ROUTINE DUTY EVALUATION) SCHEMA

### Mục đích

Đánh giá chi tiết từng nhiệm vụ thường quy trong một đánh giá KPI.

### Cấu trúc dữ liệu

```javascript
{
  DanhGiaKPIID: ObjectId,     // ID đánh giá KPI cha (ref: DanhGiaKPI)
  NhiemVuThuongQuyID: ObjectId, // ID nhiệm vụ được đánh giá (ref: NhiemVuThuongQuy)
  DiemDoKho: Number,          // Điểm độ khó của nhiệm vụ (1-10)
  DiemCuoi: Number,           // Điểm cuối sau khi tính toán
  GhiChuNguoiDanhGia: String, // Nhận xét của người đánh giá
  SoCongViec: Number,         // Số công việc thực hiện trong chu kỳ
  SoTicket: Number            // Số ticket liên quan đến nhiệm vụ này
}
```

### Cách tính điểm

- DiemCuoi = DiemDoKho × DiemTrungBinhTieuChi
- DiemTrungBinhTieuChi = (Tổng điểm các tiêu chí × trọng số) / Tổng trọng số

### Quan hệ

- **N-1** với DanhGiaKPI: Nhiều đánh giá nhiệm vụ thuộc 1 đánh giá KPI
- **N-1** với NhiemVuThuongQuy: Nhiều đánh giá có thể cùng 1 nhiệm vụ
- **1-N** với DiemTieuChi: 1 đánh giá nhiệm vụ có nhiều điểm tiêu chí

---

## 12. DIEMTIEUCHI (CRITERIA SCORE) SCHEMA

### Mục đích

Lưu điểm số cụ thể cho từng tiêu chí trong đánh giá nhiệm vụ.

### Cấu trúc dữ liệu

```javascript
{
  DanhGiaNhiemVuID: ObjectId, // ID đánh giá nhiệm vụ (ref: DanhGiaNhiemVuThuongQuy)
  TieuChiID: ObjectId,        // ID tiêu chí (ref: TieuChiTheoViTri)
  Diem: Number,               // Điểm thực tế (0-10)
  TrongSo: Number,            // Trọng số áp dụng (0.1-1.0)
  GhiChu: String,             // Ghi chú giải thích điểm số
  NgayDanhGia: Date,          // Ngày chấm điểm
  NguoiDanhGiaID: ObjectId    // Người chấm điểm (ref: User)
}
```

### Virtual Fields

- **DiemCoTrongSo:** Diem × TrongSo (tự động tính)

### Quan hệ

- **N-1** với DanhGiaNhiemVuThuongQuy: Nhiều điểm thuộc 1 đánh giá nhiệm vụ
- **N-1** với TieuChiTheoViTri: Nhiều điểm có thể cùng 1 tiêu chí

---

## 13. CONGVIECDUOCGIAO (ASSIGNED TASK) SCHEMA

### Mục đích

Quản lý các công việc cụ thể được giao cho nhân viên.

### Cấu trúc dữ liệu

```javascript
{
  TieuDe: String,             // Tiêu đề công việc
  MoTa: String,               // Mô tả chi tiết công việc
  NguoiGiaoID: ObjectId,      // Người giao việc (ref: User)
  NguoiNhanID: ObjectId,      // Người nhận việc (ref: User)
  NhiemVuThuongQuyID: ObjectId, // Thuộc nhiệm vụ thường quy nào (ref: NhiemVuThuongQuy)
  DoUuTien: String,           // "THAP", "TRUNG_BINH", "CAO", "KHAN_CAP"
  NgayBatDau: Date,           // Ngày dự kiến bắt đầu
  NgayKetThuc: Date,          // Ngày deadline
  NgayHoanThanh: Date,        // Ngày thực tế hoàn thành
  TrangThai: String,          // "MOI_TAO", "DA_GIAO", "DA_NHAN", "TU_CHOI", etc.
  TienDoPhanTram: Number,     // Tiến độ thực hiện (0-100%)
  ThoiGianUocTinh: Number,    // Thời gian ước tính (phút)
  ThoiGianThucTe: Number,     // Thời gian thực tế (phút)
  DanhGiaChat​Luong: Number,   // Đánh giá chất lượng (1-10)
  GhiChuNguoiGiao: String,    // Ghi chú từ người giao việc
  GhiChuNguoiNhan: String,    // Ghi chú từ người nhận việc
  LyDoTuChoi: String          // Lý do nếu từ chối nhận việc
}
```

### Trạng thái công việc

1. **MOI_TAO:** Vừa tạo, chưa giao
2. **DA_GIAO:** Đã giao cho người thực hiện
3. **DA_NHAN:** Người thực hiện đã nhận
4. **TU_CHOI:** Từ chối nhận việc
5. **DANG_THUC_HIEN:** Đang thực hiện
6. **CHO_DUYET:** Chờ phê duyệt
7. **HOAN_THANH:** Đã hoàn thành
8. **QUA_HAN:** Quá deadline
9. **TAM_DUNG:** Tạm dừng

### Quan hệ

- **N-1** với User (NguoiGiaoID, NguoiNhanID): Nhiều công việc thuộc 1 user
- **N-1** với NhiemVuThuongQuy: Nhiều công việc thuộc 1 nhiệm vụ thường quy
- **1-N** với TepTin: 1 công việc có nhiều file đính kèm
- **1-N** với BinhLuan: 1 công việc có nhiều bình luận

---

## 14. NGUOITHUCHIEN​CONGVIEC (TASK ASSIGNEE) SCHEMA

### Mục đích

Quản lý nhiều người thực hiện cùng một công việc (công việc nhóm).

### Cấu trúc dữ liệu

```javascript
{
  CongViecID: ObjectId,       // ID công việc (ref: CongViecDuocGiao)
  NhanVienID: ObjectId,       // ID nhân viên thực hiện (ref: NhanVienQuanLy)
  VaiTro: String,             // "CHINH", "PHU", "HO_TRO"
  TyLePhanCong: Number,       // Tỷ lệ phân công (0-100%)
  TrangThai: String,          // "DA_NHAN", "TU_CHOI", "HOAN_THANH"
  NgayNhanViec: Date,         // Ngày nhận việc
  NgayHoanThanh: Date,        // Ngày hoàn thành phần việc
  GhiChu: String              // Ghi chú về phần việc
}
```

### Quan hệ

- **N-1** với CongViecDuocGiao: Nhiều người thực hiện thuộc 1 công việc
- **N-1** với NhanVienQuanLy: 1 nhân viên có thể thực hiện nhiều công việc

---

## 15. LOAIYEUCAUHOTRO (SUPPORT REQUEST TYPE) SCHEMA

### Mục đích

Phân loại các loại yêu cầu hỗ trợ giữa các phòng ban.

### Cấu trúc dữ liệu

```javascript
{
  TenLoai: String,            // Tên loại yêu cầu (VD: "Hỗ trợ kỹ thuật")
  MaLoai: String,             // Mã định danh (VD: "HT_KT")
  MoTa: String,               // Mô tả chi tiết loại yêu cầu
  MauSac: String,             // Màu sắc hiển thị (#hex)
  ThoiGianXuLyUocTinh: Number, // Thời gian xử lý dự kiến (giờ)
  MucDoUuTien: String,        // "THAP", "TRUNG_BINH", "CAO"
  TrangThaiHoatDong: Boolean, // true: đang sử dụng
  NguoiTaoID: ObjectId,       // Người tạo loại (ref: User)
  GhiChu: String              // Ghi chú bổ sung
}
```

### Quan hệ

- **1-N** với YeuCauHoTro: 1 loại có nhiều yêu cầu cụ thể

---

## 16. YEUCAUHOTRO (SUPPORT REQUEST/TICKET) SCHEMA

### Mục đích

Quản lý các yêu cầu hỗ trợ giữa các phòng ban (hệ thống ticket).

### Cấu trúc dữ liệu

```javascript
{
  TieuDe: String,             // Tiêu đề yêu cầu
  MoTa: String,               // Mô tả chi tiết vấn đề
  LoaiYeuCauID: ObjectId,     // Loại yêu cầu (ref: LoaiYeuCauHoTro)
  NguoiTaoID: ObjectId,       // Người tạo yêu cầu (ref: User)
  PhongBanYeuCauID: ObjectId, // Phòng ban yêu cầu hỗ trợ (ref: PhongBan)
  PhongBanHoTroID: ObjectId,  // Phòng ban được yêu cầu hỗ trợ (ref: PhongBan)
  NguoiXuLyID: ObjectId,      // Người được assign xử lý (ref: User)
  DoUuTien: String,           // "THAP", "TRUNG_BINH", "CAO", "KHAN_CAP"
  TrangThai: String,          // "MOI_TAO", "DA_ASSIGN", "DANG_XU_LY", "CHO_PHAN_HOI", etc.
  NgayTao: Date,              // Ngày tạo yêu cầu
  NgayDuKienHoanThanh: Date,  // Ngày dự kiến hoàn thành
  NgayHoanThanh: Date,        // Ngày thực tế hoàn thành
  MucDoHaiLong: Number,       // Mức độ hài lòng (1-5 sao)
  GhiChuHaiLong: String,      // Ghi chú về mức độ hài lòng
  NhiemVuThuongQuyID: ObjectId, // Liên quan đến nhiệm vụ nào (ref: NhiemVuThuongQuy)
  GhiChu: String              // Ghi chú bổ sung
}
```

### Trạng thái ticket

1. **MOI_TAO:** Vừa tạo
2. **DA_ASSIGN:** Đã assign cho người xử lý
3. **DANG_XU_LY:** Đang được xử lý
4. **CHO_PHAN_HOI:** Chờ phản hồi từ người yêu cầu
5. **DA_GIAI_QUYET:** Đã giải quyết
6. **DONG:** Đã đóng ticket
7. **HUY:** Hủy bỏ yêu cầu

### Quan hệ

- **N-1** với LoaiYeuCauHoTro: Nhiều yêu cầu thuộc 1 loại
- **N-1** với User (NguoiTaoID, NguoiXuLyID): Nhiều yêu cầu thuộc 1 user
- **N-1** với PhongBan: Nhiều yêu cầu liên quan 1 phòng ban
- **1-N** với TepTin: 1 yêu cầu có nhiều file đính kèm
- **1-N** với BinhLuan: 1 yêu cầu có nhiều bình luận

---

## 17. TEPTIN (FILE ATTACHMENT) SCHEMA

### Mục đích

Quản lý file đính kèm trong công việc và yêu cầu hỗ trợ.

### Cấu trúc dữ liệu

```javascript
{
  TenFile: String,            // Tên file lưu trên server
  TenGoc: String,             // Tên file gốc do user upload
  LoaiFile: String,           // "image", "document", "video", "audio", "other"
  KichThuoc: Number,          // Kích thước file (bytes)
  DuongDan: String,           // Đường dẫn lưu file
  CongViecID: ObjectId,       // Thuộc công việc nào (ref: CongViecDuocGiao)
  YeuCauHoTroID: ObjectId,    // Thuộc yêu cầu hỗ trợ nào (ref: YeuCauHoTro)
  NguoiTaiLenID: ObjectId,    // Người upload (ref: User)
  MoTa: String,               // Mô tả file
  TrangThai: String,          // "ACTIVE", "DELETED"
  NgayTaiLen: Date            // Ngày upload
}
```

### Virtual Fields

- **KichThuocFormat:** Hiển thị kích thước dạng KB, MB, GB
- **DuoiFile:** Extension của file
- **laUrl():** Method trả về URL để download

### Quan hệ

- **N-1** với CongViecDuocGiao: Nhiều file thuộc 1 công việc
- **N-1** với YeuCauHoTro: Nhiều file thuộc 1 yêu cầu hỗ trợ
- **N-1** với User: Nhiều file do 1 user upload

---

## 18. BINHLUAN (COMMENT) SCHEMA

### Mục đích

Hệ thống comment cho công việc và yêu cầu hỗ trợ.

### Cấu trúc dữ liệu

```javascript
{
  NoiDung: String,            // Nội dung bình luận
  CongViecID: ObjectId,       // Thuộc công việc nào (ref: CongViecDuocGiao)
  YeuCauHoTroID: ObjectId,    // Thuộc yêu cầu hỗ trợ nào (ref: YeuCauHoTro)
  NguoiBinhLuanID: ObjectId,  // Người bình luận (ref: User)
  BinhLuanChaID: ObjectId,    // ID bình luận cha (để tạo cây comment)
  LoaiBinhLuan: String,       // "COMMENT", "FEEDBACK", "QUESTION", "SOLUTION"
  TrangThai: String,          // "ACTIVE", "DELETED", "HIDDEN"
  NgayBinhLuan: Date,         // Ngày tạo bình luận
  NgayCapNhat: Date           // Ngày cập nhật gần nhất
}
```

### Virtual Fields

- **TraLoi:** Các bình luận trả lời (populate từ BinhLuanChaID)

### Quan hệ

- **N-1** với CongViecDuocGiao: Nhiều comment thuộc 1 công việc
- **N-1** với YeuCauHoTro: Nhiều comment thuộc 1 yêu cầu
- **N-1** với User: Nhiều comment do 1 user tạo
- **1-N** với chính nó: Cấu trúc cây comment (reply)

---

## 19. THONGBAO (NOTIFICATION) SCHEMA

### Mục đích

Hệ thống thông báo tự động cho người dùng.

### Cấu trúc dữ liệu

```javascript
{
  TieuDe: String,             // Tiêu đề thông báo
  NoiDung: String,            // Nội dung chi tiết
  LoaiThongBao: String,       // "TASK_ASSIGNED", "TASK_COMPLETED", "TICKET_CREATED", etc.
  NguoiNhanID: ObjectId,      // Người nhận thông báo (ref: User)
  NguoiGuiID: ObjectId,       // Người gửi (ref: User)
  LienKetDen: String,         // URL liên kết đến trang liên quan
  TrangThai: String,          // "UNREAD", "READ", "DELETED"
  MucDoUuTien: String,        // "LOW", "NORMAL", "HIGH", "URGENT"
  NgayTao: Date,              // Ngày tạo thông báo
  NgayDoc: Date,              // Ngày người dùng đọc
  NgayHetHan: Date,           // Ngày hết hạn thông báo
  DuLieuLienQuan: Mixed       // Dữ liệu bổ sung (JSON)
}
```

### Loại thông báo

- **TASK_ASSIGNED:** Được giao công việc mới
- **TASK_COMPLETED:** Công việc đã hoàn thành
- **TASK_OVERDUE:** Công việc quá hạn
- **TICKET_CREATED:** Có ticket mới
- **TICKET_ASSIGNED:** Được assign ticket
- **COMMENT:** Có bình luận mới
- **EVALUATION:** Có đánh giá KPI
- **SYSTEM:** Thông báo hệ thống
- **REMINDER:** Nhắc nhở

### Virtual Fields

- **ThoiGianTruoc:** Hiển thị thời gian tương đối (VD: "2 giờ trước")
- **DaHetHan:** Boolean kiểm tra đã hết hạn chưa

### Quan hệ

- **N-1** với User (NguoiNhanID, NguoiGuiID): Nhiều thông báo thuộc 1 user

---

## KẾT LUẬN

Hệ thống schema được thiết kế với các đặc điểm:

### ✅ Ưu điểm

1. **Tính toàn vẹn:** Ràng buộc dữ liệu và validation chặt chẽ
2. **Hiệu suất:** Indexing tối ưu cho các truy vấn thường dùng
3. **Mở rộng:** Dễ dàng thêm field mới mà không ảnh hưởng hệ thống
4. **Truy vết:** Đầy đủ timestamps và lịch sử thay đổi
5. **Linh hoạt:** Virtual fields và methods hỗ trợ business logic

### 🎯 Lưu ý sử dụng

1. **Population:** Sử dụng populate() để lấy dữ liệu liên quan
2. **Validation:** Tận dụng pre-save hooks để kiểm tra dữ liệu
3. **Performance:** Sử dụng các static methods có sẵn thay vì viết query thủ công
4. **Relationships:** Hiểu rõ mối quan hệ giữa các collection để tránh data inconsistency
