# Quick Reference - New TieuChiCauHinh Flow

**Version:** 2.0 (Clean Schema)  
**Date:** October 15, 2025

---

## 🎯 Key Changes

| Aspect                    | Old (Deprecated)                     | New (Current)                                                                      |
| ------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| **Criteria Storage**      | `TieuChiDanhGia` collection (master) | `ChuKy.TieuChiCauHinh` array (snapshot)                                            |
| **Reference Type**        | ObjectId (`TieuChiID`)               | Self-contained data                                                                |
| **ChiTietDiem Structure** | `{ TieuChiID, DiemDat, GhiChu }`     | `{ TenTieuChi, LoaiTieuChi, GiaTriMin, GiaTriMax, DonVi, ThuTu, DiemDat, GhiChu }` |
| **Data Source**           | JOIN with TieuChiDanhGia             | Embedded snapshot                                                                  |
| **Migration Needed**      | Yes (old data)                       | No (fresh start)                                                                   |

---

## 📂 File Structure

```
giaobanbv-be/
├── modules/workmanagement/
│   ├── controllers/
│   │   ├── kpi.controller.js ✅ (no TieuChiDanhGia import)
│   │   └── chuKyDanhGia.controller.js ✅ (CRUD with TieuChiCauHinh)
│   ├── models/
│   │   ├── TieuChiDanhGia.js ⚠️ (exists but NOT exported)
│   │   ├── ChuKyDanhGia.js ✅ (has TieuChiCauHinh field)
│   │   ├── DanhGiaNhiemVuThuongQuy.js ✅ (self-contained ChiTietDiem)
│   │   └── index.js ✅ (TieuChiDanhGia removed from exports)
│   └── routes/
│       └── chuKyDanhGia.api.js ✅ (POST/PUT/GET endpoints)
├── scripts/
│   └── cleanDatabaseForNewSchema.js ✅ (cleanup tool)
└── _backups/
    └── scripts/
        └── migrateTieuChiToChuKy.js.bak (archived)
```

---

## 🔄 Data Flow

### Create Chu Kỳ → Add Criteria → Init KPI → Score

```
1. Admin tạo ChuKy
   ↓
   ChuKyDanhGia.create({
     TenChuKy: "Q4 2024",
     TieuChiCauHinh: [
       { TenTieuChi: "Hoàn thành", LoaiTieuChi: "TANG_DIEM", ... },
       { TenTieuChi: "Vi phạm", LoaiTieuChi: "GIAM_DIEM", ... }
     ]
   })
   ↓
2. Init KPI cho NV
   ↓
   const chuKy = await ChuKyDanhGia.findById(chuKyId);
   ↓
   DanhGiaNhiemVuThuongQuy.create({
     ChiTietDiem: chuKy.TieuChiCauHinh.map(tc => ({
       ...tc,        // Copy tất cả fields
       DiemDat: 0    // Init score = 0
     }))
   })
   ↓
3. Chấm điểm
   ↓
   nhiemVu.ChiTietDiem = nhiemVu.ChiTietDiem.map(tc => {
     const updated = chiTietMap.get(tc.TenTieuChi); // Match by name
     return { ...tc, DiemDat: updated.DiemDat };
   })
```

---

## 💻 Code Examples

### Backend: Create ChuKy with Criteria

```javascript
// chuKyDanhGia.controller.js - taoChuKy()
const { TieuChiCauHinh, TenChuKy, Thang, Nam, ... } = req.body;

const chuKyMoi = await ChuKyDanhGia.create({
  TenChuKy,
  Thang,
  Nam,
  TieuChiCauHinh: TieuChiCauHinh || [], // ← Snapshot array
  // ...
});
```

### Backend: Update Criteria

```javascript
// chuKyDanhGia.controller.js - capNhat()
const { TieuChiCauHinh } = req.body;

if (Array.isArray(TieuChiCauHinh)) {
  chuKy.TieuChiCauHinh = TieuChiCauHinh;
  chuKy.markModified("TieuChiCauHinh"); // ← CRITICAL!
}

await chuKy.save();
```

### Backend: Init KPI (Copy from ChuKy)

```javascript
// kpi.controller.js - getChamDiemDetail()
const chuKy = await ChuKyDanhGia.findById(chuKyId);

const nhiemVuList = assignments.map((nv) => ({
  ChiTietDiem: (chuKy.TieuChiCauHinh || []).map((tc, idx) => ({
    TenTieuChi: tc.TenTieuChi,
    LoaiTieuChi: tc.LoaiTieuChi,
    GiaTriMin: tc.GiaTriMin,
    GiaTriMax: tc.GiaTriMax,
    DonVi: tc.DonVi,
    ThuTu: idx,
    DiemDat: 0,
    GhiChu: "",
  })),
  // ...
}));
```

### Backend: Score Task (Match by TenTieuChi)

```javascript
// kpi.controller.js - saveChamDiem()
const chiTietMap = new Map(
  ChiTietDiem.map((c) => [c.TenTieuChi, c]) // ← String key, not ObjectId
);

danhGiaNhiemVu.ChiTietDiem = danhGiaNhiemVu.ChiTietDiem.map((tc) => {
  const updated = chiTietMap.get(tc.TenTieuChi);
  if (updated) {
    return { ...tc.toObject(), DiemDat: updated.DiemDat };
  }
  return tc;
});
```

### Frontend: Form Submit

```javascript
// ThongTinChuKyDanhGia.js
const onSubmit = async (data) => {
  const payload = {
    ...data,
    TieuChiCauHinh: tieuChiList, // ← From TieuChiConfigSection state
  };

  if (isEdit) {
    await apiService.put(`/chu-ky-danh-gia/${chuKy._id}`, payload);
  } else {
    await apiService.post("/chu-ky-danh-gia", payload);
  }
};
```

---

## 🗄️ Database Schema

### ChuKyDanhGia Collection

```javascript
{
  _id: ObjectId("..."),
  TenChuKy: "Quý 4 - 2024",
  Thang: 10,
  Nam: 2024,
  NgayBatDau: ISODate("2024-10-01"),
  NgayKetThuc: ISODate("2024-12-31"),
  TieuChiCauHinh: [ // ← Snapshot array
    {
      _id: ObjectId("..."),
      TenTieuChi: "Hoàn thành đúng hạn",
      LoaiTieuChi: "TANG_DIEM",
      GiaTriMin: 0,
      GiaTriMax: 100,
      DonVi: "%",
      ThuTu: 0,
      GhiChu: "Hoàn thành nhiệm vụ đúng deadline"
    },
    {
      _id: ObjectId("..."),
      TenTieuChi: "Vi phạm quy định",
      LoaiTieuChi: "GIAM_DIEM",
      GiaTriMin: 0,
      GiaTriMax: 10,
      DonVi: "lần",
      ThuTu: 1,
      GhiChu: ""
    }
  ],
  isDong: false,
  isDeleted: false
}
```

### DanhGiaNhiemVuThuongQuy Collection

```javascript
{
  _id: ObjectId("..."),
  DanhGiaKPIID: ObjectId("..."),
  NhiemVuThuongQuyID: ObjectId("..."),
  NhanVienID: ObjectId("..."),
  MucDoKho: 3,
  ChiTietDiem: [ // ← Self-contained, copied from ChuKy
    {
      _id: ObjectId("..."),
      TenTieuChi: "Hoàn thành đúng hạn", // ← No TieuChiID!
      LoaiTieuChi: "TANG_DIEM",
      GiaTriMin: 0,
      GiaTriMax: 100,
      DonVi: "%",
      ThuTu: 0,
      DiemDat: 85, // ← User input
      GhiChu: "Hoàn thành 17/20 tasks đúng hạn"
    },
    {
      _id: ObjectId("..."),
      TenTieuChi: "Vi phạm quy định",
      LoaiTieuChi: "GIAM_DIEM",
      GiaTriMin: 0,
      GiaTriMax: 10,
      DonVi: "lần",
      ThuTu: 1,
      DiemDat: 2, // ← User input
      GhiChu: "Trễ 2 buổi họp"
    }
  ],
  TongDiemTieuChi: 83, // = 85 - 2
  DiemNhiemVu: 2.49,   // = 3 × 83 / 100
  GhiChu: ""
}
```

---

## 🧪 Testing Commands

### 1. Clean Database

```bash
cd d:\project\webBV\giaobanbv-be
node scripts/cleanDatabaseForNewSchema.js
```

### 2. Start Servers

```bash
# Terminal 1 - Backend
cd giaobanbv-be
npm start

# Terminal 2 - Frontend
cd fe-bcgiaobanbvt
npm start
```

### 3. Verify MongoDB

```javascript
// MongoDB Shell
use giaobanbv

// Should be empty
db.danhgiakpis.countDocuments()        // 0
db.danhgianhiemvuthuongquys.countDocuments() // 0
db.tieuchidanhgias.countDocuments()    // 0
db.chukydanhgias.countDocuments()      // 0

// Should have data
db.nhanviens.countDocuments()          // > 0
db.nhiemvuthuongquys.countDocuments()  // > 0
```

---

## ⚠️ Common Gotchas

### 1. TieuChiID No Longer Exists

```javascript
// ❌ OLD - Will fail
ChiTietDiem.map((c) => [c.TieuChiID.toString(), c]);

// ✅ NEW - Use string field
ChiTietDiem.map((c) => [c.TenTieuChi, c]);
```

### 2. Must Call markModified() for Arrays

```javascript
// ❌ Wrong - Mongoose won't detect change
chuKy.TieuChiCauHinh = newArray;
await chuKy.save(); // Not saved!

// ✅ Correct
chuKy.TieuChiCauHinh = newArray;
chuKy.markModified("TieuChiCauHinh");
await chuKy.save(); // Saved!
```

### 3. ChiTietDiem is Self-Contained

```javascript
// ❌ OLD - Query TieuChiDanhGia
const tieuChi = await TieuChiDanhGia.findById(item.TieuChiID);
if (item.DiemDat > tieuChi.GiaTriMax) { ... }

// ✅ NEW - Use embedded data
if (item.DiemDat > item.GiaTriMax) { ... }
```

### 4. No Populate for ChiTietDiem

```javascript
// ❌ OLD - Populate TieuChiID
.populate({
  path: "ChiTietDiem.TieuChiID",
  select: "TenTieuChi LoaiTieuChi"
})

// ✅ NEW - No populate needed
.populate("NhiemVuThuongQuyID")
// ChiTietDiem already has all data
```

---

## 📚 Documentation Files

- `CODE_CLEANUP_SUMMARY.md` - Detailed cleanup changes
- `CRUD_FLOW_CHUKY_TIEUCHI.md` - Technical flow diagram
- `TEST_GUIDE_TIEUCHI_CAUHINH.md` - Step-by-step testing
- `IMPLEMENTATION_TIEU_CHI_THEO_CHU_KY.md` - Original implementation guide

---

**Status:** ✅ Ready for use  
**Last Updated:** October 15, 2025  
**Breaking:** Yes (requires DB cleanup)
