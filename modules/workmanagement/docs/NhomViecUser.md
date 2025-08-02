# NhomViecUser - Nhóm Việc Người Dùng

## Mô tả

Bảng `NhomViecUser` cho phép mỗi quản lý tạo ra các nhóm việc riêng để phân loại và theo dõi công việc một cách có tổ chức. Đây là tính năng bổ sung giúp cải thiện khả năng quản lý và theo dõi công việc của các quản lý.

## Tính năng chính

### 1. Quản lý Nhóm Việc Cá nhân

- Mỗi quản lý có thể tạo các nhóm việc riêng
- Tùy chỉnh tên, mô tả, màu sắc và biểu tượng
- Sắp xếp thứ tự hiển thị

### 2. Chia sẻ Nhóm Việc

- Có thể chia sẻ nhóm việc với các quản lý khác trong cùng khoa
- Kiểm soát quyền truy cập linh hoạt

### 3. Thống kê Tự động

- Tự động tính toán số lượng công việc trong nhóm
- Theo dõi tỷ lệ hoàn thành
- Cập nhật thống kê theo thời gian thực

## Cấu trúc Schema

```javascript
{
  TenNhom: String,              // Tên nhóm việc
  MoTa: String,                 // Mô tả chi tiết
  NguoiTaoID: ObjectId,         // Người tạo nhóm
  KhoaID: ObjectId,             // Khoa/Phòng ban
  MauSac: String,               // Mã màu hex (#3498db)
  BieuTuong: String,            // Icon hoặc emoji
  ThuTu: Number,                // Thứ tự sắp xếp
  TrangThaiHoatDong: Boolean,   // Trạng thái hoạt động
  LaChiaSe: Boolean,            // Có chia sẻ không
  CacQuanLyDuocChiaSe: [ObjectId], // Danh sách được chia sẻ
  ThongKe: {
    TongSoCongViec: Number,
    SoCongViecHoanThanh: Number,
    SoCongViecDangThucHien: Number,
    NgayCapNhatThongKe: Date
  }
}
```

## Quan hệ với bảng khác

```
NhomViecUser
    ↓ (1:n)
CongViecDuocGiao (AssignedTask)
    ↓ (n:1)
NhiemVuThuongQuy (RoutineDuty)
```

## Các phương thức quan trọng

### 1. `coTheTriCap(userId)`

Kiểm tra xem người dùng có quyền truy cập nhóm việc này không.

```javascript
const nhomViec = await NhomViecUser.findById(nhomId);
const coQuyen = nhomViec.coTheTriCap(userId);
```

### 2. `capNhatThongKe()`

Cập nhật thống kê của nhóm việc.

```javascript
await nhomViec.capNhatThongKe();
```

### 3. `layNhomTheoQuanLy(userId, khoaId)`

Lấy danh sách nhóm việc mà người dùng có thể truy cập.

```javascript
const danhSachNhom = await NhomViecUser.layNhomTheoQuanLy(userId, khoaId);
```

## Virtual Fields

### 1. `TyLeHoanThanh`

Tính tỷ lệ hoàn thành công việc trong nhóm.

```javascript
const tyLe = nhomViec.TyLeHoanThanh; // Trả về phần trăm (0-100)
```

### 2. `CongViecTrongNhom`

Populate tất cả công việc trong nhóm.

```javascript
const nhomViec = await NhomViecUser.findById(id).populate("CongViecTrongNhom");
```

## Ví dụ sử dụng

### Tạo nhóm việc mới

```javascript
const nhomViecMoi = new NhomViecUser({
  TenNhom: "Dự án Nâng cấp HIS",
  MoTa: "Các công việc liên quan đến việc nâng cấp hệ thống HIS",
  NguoiTaoID: quanLyId,
  KhoaID: khoaId,
  MauSac: "#e74c3c",
  BieuTuong: "fas fa-hospital",
  ThuTu: 1,
});

await nhomViecMoi.save();
```

### Gán công việc vào nhóm

```javascript
const congViec = new CongViecDuocGiao({
  TieuDe: "Cài đặt module X",
  MoTa: "Cài đặt và cấu hình module X cho HIS",
  NhiemVuThuongQuyID: nhiemVuId,
  NguoiGiaoViecID: quanLyId,
  NhomViecID: nhomViecId, // Gán vào nhóm việc
  // ... các trường khác
});

await congViec.save();
```

### Lấy danh sách nhóm việc của quản lý

```javascript
const danhSachNhom = await NhomViecUser.layNhomTheoQuanLy(userId).populate(
  "CongViecTrongNhom"
);

danhSachNhom.forEach((nhom) => {
  console.log(`${nhom.TenNhom}: ${nhom.TyLeHoanThanh}% hoàn thành`);
});
```

### Chia sẻ nhóm việc

```javascript
const nhomViec = await NhomViecUser.findById(nhomId);
nhomViec.LaChiaSe = true;
nhomViec.CacQuanLyDuocChiaSe.push(quanLyKhacId);
await nhomViec.save();
```

## Tích hợp với UI

### Hiển thị danh sách nhóm

```javascript
// Frontend có thể sử dụng màu sắc và biểu tượng để hiển thị
const nhomViec = {
  ten: "Dự án ABC",
  mauSac: "#3498db",
  bieuTuong: "fas fa-project-diagram",
  tyLeHoanThanh: 75,
};
```

### Lọc công việc theo nhóm

```javascript
// API endpoint để lấy công việc theo nhóm
GET /api/congviec?nhomViecId=60a7b8f8d5f4a20015b4c5e7
```

## Migration Script

Để tích hợp với dữ liệu hiện có, có thể tạo script migration:

```javascript
// Tạo nhóm mặc định cho các công việc hiện tại chưa có nhóm
const taoNhomMacDinh = async () => {
  const congViecChuaCoNhom = await CongViecDuocGiao.find({ NhomViecID: null });

  for (const congViec of congViecChuaCoNhom) {
    // Tạo hoặc tìm nhóm mặc định cho người giao việc
    let nhomMacDinh = await NhomViecUser.findOne({
      NguoiTaoID: congViec.NguoiGiaoViecID,
      TenNhom: "Công việc chung",
    });

    if (!nhomMacDinh) {
      nhomMacDinh = new NhomViecUser({
        TenNhom: "Công việc chung",
        MoTa: "Nhóm mặc định cho các công việc chưa được phân loại",
        NguoiTaoID: congViec.NguoiGiaoViecID,
        KhoaID: congViec.KhoaID, // Cần tìm cách lấy KhoaID
        MauSac: "#95a5a6",
      });
      await nhomMacDinh.save();
    }

    congViec.NhomViecID = nhomMacDinh._id;
    await congViec.save();
  }
};
```

## Lưu ý quan trọng

1. **Bảo mật**: Luôn kiểm tra quyền truy cập trước khi cho phép thao tác với nhóm việc
2. **Hiệu suất**: Sử dụng indexes đã được định nghĩa để tối ưu hóa truy vấn
3. **Thống kê**: Gọi `capNhatThongKe()` định kỳ hoặc khi có thay đổi quan trọng
4. **Xóa dữ liệu**: Không thể xóa nhóm việc nếu còn công việc được gán vào
