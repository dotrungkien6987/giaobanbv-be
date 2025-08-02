# Hướng Dẫn Sử Dụng Work Management Module - Phiên Bản Mới

## 📋 Tổng Quan

Work Management Module đã được refactor hoàn toàn để loại bỏ JobPosition entity và áp dụng các gợi ý cải tiến hệ thống. Cấu trúc mới sử dụng tên tiếng Việt và tích hợp các tính năng quản lý trạng thái, lịch sử và thông báo tự động.

## 🏗️ Cấu Trúc Mới

### Models Chính

1. **NhanVienNhiemVu** (thay thế EmployeeRoutineDuty)

   - Gán nhiệm vụ trực tiếp từ nhân viên đến nhiệm vụ thường quy
   - Không còn qua JobPosition trung gian

2. **LichSuGanNhiemVu** (mới)

   - Tracking lịch sử thay đổi assignment
   - Audit trail cho việc gán nhiệm vụ

3. **QuanLyTrangThaiCongViec** (mới)

   - State machine cho workflow công việc
   - Quản lý chuyển đổi trạng thái

4. **QuyTacThongBao** (mới)
   - Rule engine cho notifications
   - Template-based notification system

## 🚀 Cách Sử Dụng

### 1. Gán Nhiệm Vụ Cho Nhân Viên

```javascript
const { NhanVienNhiemVu, LichSuGanNhiemVu } = require("../models");

// Tạo assignment mới
const assignment = new NhanVienNhiemVu({
  NhanVienID: nhanVienId,
  NhiemVuThuongQuyID: nhiemVuId,
  TyTrongPhanTram: 70, // Tỷ trọng phần trăm
  NguoiGanID: nguoiGanId,
  LyDoGan: "Phù hợp với kỹ năng và kinh nghiệm",
});

await assignment.save();

// Tự động tạo lịch sử
await LichSuGanNhiemVu.taoGhiNhan({
  nhanVienId,
  nhiemVuId,
  tyTrong: 70,
  nguoiGanId,
  lyDo: "Gán nhiệm vụ mới",
  loaiThayDoi: "GAN_MOI",
});
```

### 2. Kiểm Tra Tải Trọng Công Việc

```javascript
// Lấy thông tin tải trọng của nhân viên
const capacityInfo = await NhanVienNhiemVu.layThongTinTaiTrong(nhanVienId);
console.log(capacityInfo);
// {
//   tongTyTrong: 120,
//   soLuongNhiemVu: 3,
//   tinhTrangTaiTrong: 'QUA_TAI'
// }

// Lấy danh sách nhân viên quá tải
const overloadedEmployees = await NhanVienNhiemVu.layNhanVienQuaTai();
```

### 3. Quản Lý Trạng Thái Công Việc

```javascript
const { QuanLyTrangThaiCongViec, TRANG_THAI_CONG_VIEC } = require("../models");

// Khởi tạo state management cho công việc mới
const stateManager = new QuanLyTrangThaiCongViec({
  CongViecID: congViecId,
  TrangThaiHienTai: TRANG_THAI_CONG_VIEC.MOI_TAO,
});

await stateManager.save();

// Chuyển trạng thái
await stateManager.chuyenTrangThai(
  TRANG_THAI_CONG_VIEC.DA_GIAO,
  nguoiThayDoiId,
  "Đã giao việc cho nhân viên thực hiện"
);
```

### 4. Thiết Lập Notification Rules

```javascript
const { QuyTacThongBao } = require("../models");

const notificationRule = new QuyTacThongBao({
  TenQuyTac: "Thông báo công việc ưu tiên cao",
  LoaiSuKien: "CONG_VIEC_DUOC_GIAO",
  DieuKien: [
    {
      TenTruong: "mucDoUuTien",
      ToanTu: "equals",
      GiaTri: "CAO",
    },
  ],
  NguoiNhan: [
    {
      LoaiNguoiNhan: "NGUOI_THUC_HIEN",
    },
    {
      LoaiNguoiNhan: "QUAN_LY_TRUC_TIEP",
    },
  ],
  KenhThongBao: ["IN_APP", "EMAIL"],
  MauThongBao: {
    TieuDe: "Công việc ưu tiên cao: {{tenCongViec}}",
    NoiDung:
      "Bạn được giao công việc ưu tiên cao {{tenCongViec}} bởi {{nguoiGiao}}. Vui lòng xem chi tiết và thực hiện ngay.",
    Placeholder: ["tenCongViec", "nguoiGiao"],
  },
});

await notificationRule.save();
```

## 📊 Truy Vấn Dữ Liệu

### Lấy Thông Tin Assignment

```javascript
// Lấy tất cả assignments của nhân viên
const assignments = await NhanVienNhiemVu.find({
  NhanVienID: nhanVienId,
  isDeleted: false,
})
  .populate("NhiemVuThuongQuyID")
  .populate("NguoiGanID");

// Lấy lịch sử assignments
const history = await LichSuGanNhiemVu.find({
  NhanVienID: nhanVienId,
})
  .sort({ NgayBatDau: -1 })
  .populate("NguoiGanID");
```

### Thống Kê và Reports

```javascript
// Thống kê tải trọng theo phòng ban
const departmentStats = await NhanVienNhiemVu.thongKeTaiTrongTheoPhongBan();

// Báo cáo hiệu suất assignments
const performanceReport = await LichSuGanNhiemVu.baoCaoHieuSuat({
  tuNgay: new Date("2024-01-01"),
  denNgay: new Date("2024-12-31"),
});
```

## 🔄 Migration từ Cấu Trúc Cũ

### Chạy Migration Script

```bash
# Di chuyển đến thư mục migrations
cd modules/workmanagement/migrations

# Chạy migration script
node 001_remove_job_position.js
```

### Kiểm Tra Sau Migration

```javascript
// Verify data integrity
const verificationResults = await verifyMigration();
console.log("Migration verification:", verificationResults);
```

## 🧪 Testing

### Chạy Test Suite

```bash
cd modules/workmanagement/tests
node run_tests.js
```

### Test Coverage

Test suite bao gồm:

- ✅ Schema validation
- ✅ Business logic methods
- ✅ State transitions
- ✅ Notification rules
- ✅ Integration tests

## ⚠️ Lưu Ý Quan Trọng

### Soft Delete

- Tất cả models đều sử dụng soft delete pattern
- Sử dụng `isDeleted: false` trong queries
- Dùng method `xoaMem()` thay vì `remove()`

### Validation Rules

- **Không** validate tổng tỷ trọng ≤ 100% (theo yêu cầu)
- Tỷ trọng có thể vượt quá 100% cho thiết kế linh hoạt
- Validate bắt buộc: NhanVienID, NhiemVuThuongQuyID, TyTrongPhanTram

### Performance Considerations

- Sử dụng indexes cho các queries phổ biến
- Populate chỉ khi cần thiết
- Cache thông tin tải trọng cho performance

## 🔧 Troubleshooting

### Lỗi Thường Gặp

1. **ValidationError: TyTrongPhanTram required**

   ```javascript
   // Đảm bảo always provide TyTrongPhanTram
   const assignment = new NhanVienNhiemVu({
     // ... other fields
     TyTrongPhanTram: 50, // Required field
   });
   ```

2. **State Transition Error**

   ```javascript
   // Kiểm tra valid transitions trước khi chuyển
   if (stateRecord.kiemTraCoDuocChuyen(newState)) {
     await stateRecord.chuyenTrangThai(newState, userId, reason);
   }
   ```

3. **Notification Rule Condition Error**
   ```javascript
   // Đảm bảo condition format đúng
   const condition = {
     TenTruong: "fieldName",
     ToanTu: "equals", // equals, not_equals, greater_than, etc.
     GiaTri: "expectedValue",
   };
   ```

## 📞 Support

- **Technical Issues**: Xem logs trong console và check validation errors
- **Business Logic**: Tham khảo business rules trong model definitions
- **Performance**: Monitor queries và sử dụng proper indexes

---

**Cập nhật lần cuối**: Tháng 1, 2025  
**Phiên bản**: 2.0.0 (Post-JobPosition Refactor)
