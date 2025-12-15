# Database Indexes for YeuCau System

## Purpose

Performance optimization for role-based queries in the Ticket/YeuCau system.

## Required Indexes

### 1. YeuCau Collection

```javascript
// Index for điều phối queries (người được điều phối)
db.yeucau.createIndex(
  {
    NguoiDuocDieuPhoiID: 1,
    TrangThai: 1,
    isDeleted: 1,
  },
  { name: "idx_nguoiduocdieuphoi_trangthai_deleted" }
);

// Index for xử lý queries (người xử lý)
db.yeucau.createIndex(
  {
    NguoiXuLyID: 1,
    TrangThai: 1,
    isDeleted: 1,
  },
  { name: "idx_nguoixuly_trangthai_deleted" }
);

// Index for khoa đích queries (điều phối dashboard)
db.yeucau.createIndex(
  {
    KhoaDichID: 1,
    TrangThai: 1,
    isDeleted: 1,
  },
  { name: "idx_khoadich_trangthai_deleted" }
);

// Index for người tạo queries (tôi gửi)
db.yeucau.createIndex(
  {
    NguoiYeuCauID: 1,
    TrangThai: 1,
    isDeleted: 1,
  },
  { name: "idx_nguoiyeucau_trangthai_deleted" }
);

// Index for chưa điều phối (dashboard điều phối)
db.yeucau.createIndex(
  {
    KhoaDichID: 1,
    TrangThai: 1,
    NguoiDuocDieuPhoiID: 1,
    isDeleted: 1,
  },
  { name: "idx_chuadieuphoi" }
);

// Index for quá hạn queries
db.yeucau.createIndex(
  {
    KhoaDichID: 1,
    TrangThai: 1,
    NgayDuKien: 1,
    isDeleted: 1,
  },
  { name: "idx_quahan" }
);

// Index for hoàn thành queries (dashboard metrics)
db.yeucau.createIndex(
  {
    NguoiXuLyID: 1,
    TrangThai: 1,
    NgayHoanThanh: 1,
    isDeleted: 1,
  },
  { name: "idx_hoanthanh_metrics" }
);

// Index for đánh giá (rating queries)
db.yeucau.createIndex(
  {
    NguoiXuLyID: 1,
    TrangThai: 1,
    SoSaoDanhGia: 1,
    isDeleted: 1,
  },
  { name: "idx_danhgia_rating" }
);

// Index for thời gian tạo (mới hôm nay)
db.yeucau.createIndex(
  {
    KhoaDichID: 1,
    TrangThai: 1,
    createdAt: -1,
    isDeleted: 1,
  },
  { name: "idx_moihomnay" }
);
```

### 2. CauHinhThongBaoKhoa Collection

```javascript
// Index for tìm người điều phối
db.cauhinhthongbaokhoa.createIndex(
  {
    "DanhSachNguoiDieuPhoi.NhanVienID": 1,
  },
  { name: "idx_nguoidieuphoi" }
);

// Index for tìm quản lý khoa
db.cauhinhthongbaokhoa.createIndex(
  {
    "DanhSachQuanLyKhoa.NhanVienID": 1,
  },
  { name: "idx_quanlykhoa" }
);
```

## Installation Script

Create a MongoDB shell script or Node.js migration:

```javascript
// scripts/addYeuCauIndexes.js
const mongoose = require("mongoose");
const YeuCau = require("../modules/workmanagement/models/YeuCau");
const CauHinhThongBaoKhoa = require("../modules/workmanagement/models/CauHinhThongBaoKhoa");

async function addIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // YeuCau indexes
    console.log("Creating YeuCau indexes...");
    await YeuCau.collection.createIndex(
      { NguoiDuocDieuPhoiID: 1, TrangThai: 1, isDeleted: 1 },
      { name: "idx_nguoiduocdieuphoi_trangthai_deleted" }
    );
    await YeuCau.collection.createIndex(
      { NguoiXuLyID: 1, TrangThai: 1, isDeleted: 1 },
      { name: "idx_nguoixuly_trangthai_deleted" }
    );
    await YeuCau.collection.createIndex(
      { KhoaDichID: 1, TrangThai: 1, isDeleted: 1 },
      { name: "idx_khoadich_trangthai_deleted" }
    );
    await YeuCau.collection.createIndex(
      { NguoiYeuCauID: 1, TrangThai: 1, isDeleted: 1 },
      { name: "idx_nguoiyeucau_trangthai_deleted" }
    );
    await YeuCau.collection.createIndex(
      { KhoaDichID: 1, TrangThai: 1, NguoiDuocDieuPhoiID: 1, isDeleted: 1 },
      { name: "idx_chuadieuphoi" }
    );
    await YeuCau.collection.createIndex(
      { KhoaDichID: 1, TrangThai: 1, NgayDuKien: 1, isDeleted: 1 },
      { name: "idx_quahan" }
    );
    await YeuCau.collection.createIndex(
      { NguoiXuLyID: 1, TrangThai: 1, NgayHoanThanh: 1, isDeleted: 1 },
      { name: "idx_hoanthanh_metrics" }
    );
    await YeuCau.collection.createIndex(
      { NguoiXuLyID: 1, TrangThai: 1, SoSaoDanhGia: 1, isDeleted: 1 },
      { name: "idx_danhgia_rating" }
    );
    await YeuCau.collection.createIndex(
      { KhoaDichID: 1, TrangThai: 1, createdAt: -1, isDeleted: 1 },
      { name: "idx_moihomn ay" }
    );

    // CauHinhThongBaoKhoa indexes
    console.log("Creating CauHinhThongBaoKhoa indexes...");
    await CauHinhThongBaoKhoa.collection.createIndex(
      { "DanhSachNguoiDieuPhoi.NhanVienID": 1 },
      { name: "idx_nguoidieuphoi" }
    );
    await CauHinhThongBaoKhoa.collection.createIndex(
      { "DanhSachQuanLyKhoa.NhanVienID": 1 },
      { name: "idx_quanlykhoa" }
    );

    console.log("✅ All indexes created successfully");

    // List all indexes
    const yeuCauIndexes = await YeuCau.collection.indexes();
    console.log("\nYeuCau indexes:");
    console.log(yeuCauIndexes.map((idx) => idx.name).join(", "));

    const cauHinhIndexes = await CauHinhThongBaoKhoa.collection.indexes();
    console.log("\nCauHinhThongBaoKhoa indexes:");
    console.log(cauHinhIndexes.map((idx) => idx.name).join(", "));
  } catch (error) {
    console.error("Error creating indexes:", error);
  } finally {
    await mongoose.disconnect();
  }
}

addIndexes();
```

## Running the Script

```powershell
# From backend root directory
cd d:\project\webBV\giaobanbv-be
node scripts/addYeuCauIndexes.js
```

## Verification

Check indexes after creation:

```javascript
// In MongoDB shell
db.yeucau.getIndexes();
db.cauhinhthongbaokhoa.getIndexes();
```

## Expected Performance Improvements

- **Badge counts queries**: 10-50x faster with indexes on NguoiDuocDieuPhoiID, NguoiXuLyID
- **Dashboard queries**: 20-100x faster with composite indexes
- **Filter queries**: 5-20x faster with TrangThai + KhoaDichID indexes
- **Permission checks**: 10x faster with DanhSachNguoiDieuPhoi index

## Notes

- Indexes use disk space (estimate: ~1-5MB per index depending on data size)
- Indexes slow down write operations slightly (~5-10%)
- Trade-off is worth it for read-heavy workload (90% reads, 10% writes)
- Monitor index usage with `db.yeucau.aggregate([{ $indexStats: {} }])`
