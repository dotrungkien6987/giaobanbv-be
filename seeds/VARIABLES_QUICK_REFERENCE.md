# 🗂️ NOTIFICATION VARIABLES - QUICK REFERENCE TABLE

> **All 68 variables** across 45 notification types  
> **Color codes**: ✅ OK | 🔴 Rename needed | ✅ New addition

---

## 📊 COMPLETE VARIABLES TABLE

| #                                   | Variable Name                      | Type     | Domain   | isRecipient? | Status        | Action                  |
| ----------------------------------- | ---------------------------------- | -------- | -------- | ------------ | ------------- | ----------------------- |
| **CONGVIEC - Recipient Candidates** |
| 1                                   | NguoiChinhID                       | ObjectId | CongViec | ✅ Yes       | ✅ OK         | Keep                    |
| 2                                   | NguoiGiaoViecID                    | ObjectId | CongViec | ✅ Yes       | ✅ OK         | Keep                    |
| 3                                   | NguoiThamGia                       | Array    | CongViec | ✅ Yes       | ✅ OK         | Keep                    |
| 4                                   | NguoiThamGiaMoi                    | ObjectId | CongViec | ✅ Yes       | ✅ OK         | Keep                    |
| 5                                   | NguoiThamGiaBiXoa                  | ObjectId | CongViec | ✅ Yes       | ✅ OK         | Keep                    |
| 6                                   | NguoiChinhMoi                      | ObjectId | CongViec | ✅ Yes       | ✅ OK         | Keep                    |
| **CONGVIEC - Display Fields**       |
| 7                                   | \_id                               | ObjectId | CongViec | No           | ✅ OK         | Keep                    |
| 8                                   | MaCongViec                         | String   | CongViec | No           | ✅ OK         | Keep                    |
| 9                                   | TieuDe                             | String   | CongViec | No           | ✅ OK         | Keep                    |
| 10                                  | MoTa                               | String   | CongViec | No           | ✅ OK         | Keep                    |
| 11                                  | TenNguoiChinh                      | String   | CongViec | No           | ✅ OK         | Keep                    |
| 12                                  | TenNguoiGiao                       | String   | CongViec | No           | ✅ OK         | Keep                    |
| 13                                  | TenNguoiCapNhat                    | String   | CongViec | No           | ✅ **NEW**    | **Add**                 |
| 14                                  | TenNguoiChinhMoi                   | String   | CongViec | No           | ✅ **NEW**    | **Add**                 |
| 15                                  | TenNguoiThucHien                   | String   | CongViec | No           | ✅ **NEW**    | **Add**                 |
| 16                                  | ~~DoUuTien~~ → **MucDoUuTienMoi**  | String   | CongViec | No           | 🔴 **RENAME** | **Rename**              |
| 17                                  | ~~DoUuTienCu~~ → **MucDoUuTienCu** | String   | CongViec | No           | 🔴 **RENAME** | **Rename**              |
| 18                                  | TrangThai                          | String   | CongViec | No           | ✅ OK         | Keep                    |
| 19                                  | ~~TienDo~~ → **TienDoMoi**         | Number   | CongViec | No           | 🔴 **RENAME** | **Rename**              |
| 20                                  | ~~Deadline~~ → **NgayHetHan**      | String   | CongViec | No           | 🔴 **RENAME** | **Rename**              |
| 21                                  | ~~DeadlineCu~~ → **NgayHetHanCu**  | String   | CongViec | No           | 🔴 **RENAME** | **Rename**              |
| 22                                  | NgayHetHanMoi                      | String   | CongViec | No           | ✅ **NEW**    | **Add**                 |
| 23                                  | TenFile                            | String   | CongViec | No           | ✅ OK         | Keep                    |
| 24                                  | NoiDungComment                     | String   | CongViec | No           | ✅ OK         | Keep                    |
| 25                                  | TenNguoiComment                    | String   | CongViec | No           | ✅ OK         | Keep                    |
| **YEUCAU - Recipient Candidates**   |
| 26                                  | NguoiYeuCauID                      | ObjectId | YeuCau   | ✅ Yes       | ✅ OK         | Keep                    |
| 27                                  | NguoiXuLyID                        | ObjectId | YeuCau   | ✅ Yes       | ✅ OK         | Keep                    |
| 28                                  | arrNguoiDieuPhoiID                 | Array    | YeuCau   | ✅ Yes       | ✅ OK         | Keep                    |
| 29                                  | arrQuanLyKhoaID                    | Array    | YeuCau   | ✅ Yes       | ✅ OK         | Keep                    |
| 30                                  | NguoiSuaID                         | ObjectId | YeuCau   | ✅ Yes       | ✅ **NEW**    | **Add**                 |
| 31                                  | NguoiBinhLuanID                    | ObjectId | YeuCau   | ✅ Yes       | ✅ **NEW**    | **Add**                 |
| 32                                  | NguoiDieuPhoiID                    | ObjectId | YeuCau   | ✅ Yes       | ✅ **NEW**    | **Add**                 |
| 33                                  | NguoiDuocDieuPhoiID                | ObjectId | YeuCau   | ✅ Yes       | ✅ **NEW**    | **Add**                 |
| 34                                  | NguoiNhanID                        | ObjectId | YeuCau   | ✅ Yes       | ✅ **NEW**    | **Add**                 |
| **YEUCAU - Display Fields**         |
| 35                                  | \_id                               | ObjectId | YeuCau   | No           | ✅ OK         | Keep                    |
| 36                                  | MaYeuCau                           | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 37                                  | TieuDe                             | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 38                                  | MoTa                               | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 39                                  | TenKhoaGui                         | String   | YeuCau   | No           | ✅ OK         | Keep (delete duplicate) |
| 40                                  | TenKhoaNhan                        | String   | YeuCau   | No           | ✅ OK         | Keep (delete duplicate) |
| 41                                  | TenLoaiYeuCau                      | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 42                                  | TenNguoiYeuCau                     | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 43                                  | TenNguoiXuLy                       | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 44                                  | TenNguoiSua                        | String   | YeuCau   | No           | ✅ **NEW**    | **Add**                 |
| 45                                  | TenNguoiThucHien                   | String   | YeuCau   | No           | ✅ **NEW**    | **Add**                 |
| 46                                  | TenNguoiXoa                        | String   | YeuCau   | No           | ✅ **NEW**    | **Add**                 |
| 47                                  | ThoiGianHen                        | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 48                                  | ThoiGianHenCu                      | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 49                                  | TrangThai                          | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 50                                  | LyDoTuChoi                         | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 51                                  | DiemDanhGia                        | Number   | YeuCau   | No           | ✅ OK         | Keep                    |
| 52                                  | NoiDungDanhGia                     | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 53                                  | NoiDungComment                     | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| 54                                  | TenNguoiComment                    | String   | YeuCau   | No           | ✅ OK         | Keep                    |
| **KPI - Recipient Candidates**      |
| 55                                  | NhanVienID                         | ObjectId | KPI      | ✅ Yes       | ✅ OK         | Keep                    |
| 56                                  | NguoiDanhGiaID                     | ObjectId | KPI      | ✅ Yes       | ✅ OK         | Keep                    |
| **KPI - Display Fields**            |
| 57                                  | \_id                               | ObjectId | KPI      | No           | ✅ OK         | Keep                    |
| 58                                  | TenNhanVien                        | String   | KPI      | No           | ✅ OK         | Keep                    |
| 59                                  | TenNguoiDanhGia                    | String   | KPI      | No           | ✅ OK         | Keep                    |
| 60                                  | TenChuKy                           | String   | KPI      | No           | ✅ OK         | Keep                    |
| 61                                  | TenTieuChi                         | String   | KPI      | No           | ✅ OK         | Keep                    |
| 62                                  | TenNhiemVu                         | String   | KPI      | No           | ✅ **NEW**    | **Add**                 |
| 63                                  | TenNguoiDuyet                      | String   | KPI      | No           | ✅ **NEW**    | **Add**                 |
| 64                                  | TongDiemKPI                        | Number   | KPI      | No           | ✅ OK         | Keep                    |
| 65                                  | DiemTuDanhGia                      | Number   | KPI      | No           | ✅ OK         | Keep                    |
| 66                                  | DiemQL                             | Number   | KPI      | No           | ✅ OK         | Keep                    |
| 67                                  | ~~NoiDungPhanHoi~~ → **PhanHoi**   | String   | KPI      | No           | 🔴 **RENAME** | **Rename**              |
| 68                                  | ~~LyDoHuyDuyet~~ → **LyDo**        | String   | KPI      | No           | 🔴 **RENAME** | **Rename**              |

---

## 📈 STATISTICS

```
Total Variables:              68
├─ CongViec:                 25 (6 recipient + 19 display)
├─ YeuCau:                   29 (9 recipient + 20 display)
└─ KPI:                      15 (2 recipient + 13 display)

Actions Required:
├─ Keep as-is:               45 variables (66%)
├─ Rename:                    8 variables (12%)
├─ Add new:                  13 variables (19%)
└─ Remove duplicates:         2 variables (3%)
```

---

## 🔍 USAGE PATTERNS

### By Type

| Type         | Count | Examples                                          |
| ------------ | ----- | ------------------------------------------------- |
| **ObjectId** | 23    | \_id, NguoiChinhID, NguoiYeuCauID, NhanVienID     |
| **String**   | 42    | TieuDe, MaCongViec, TenNguoiChinh, TenKhoaGui     |
| **Number**   | 5     | TienDoMoi, DiemDanhGia, TongDiemKPI, DiemQL       |
| **Array**    | 3     | NguoiThamGia, arrNguoiDieuPhoiID, arrQuanLyKhoaID |

### By Purpose

| Purpose                  | Count | Examples                                      |
| ------------------------ | ----- | --------------------------------------------- |
| **Recipient Candidates** | 17    | NguoiChinhID, NguoiXuLyID, arrNguoiDieuPhoiID |
| **Person Names**         | 19    | TenNguoiChinh, TenNguoiYeuCau, TenNhanVien    |
| **IDs/Codes**            | 6     | \_id, MaCongViec, MaYeuCau                    |
| **Descriptions**         | 8     | TieuDe, MoTa, NoiDungComment, NoiDungDanhGia  |
| **Dates/Times**          | 5     | NgayHetHan, ThoiGianHen, NgayHetHanCu         |
| **Status/Priority**      | 5     | TrangThai, MucDoUuTienMoi, TienDoMoi          |
| **Ratings/Scores**       | 5     | DiemDanhGia, TongDiemKPI, DiemQL              |
| **Reasons/Feedback**     | 3     | LyDoTuChoi, PhanHoi, LyDo                     |

---

## 🎨 NAMING CONVENTIONS

### ObjectId Fields (Recipient Candidates)

- **Pattern**: `Nguoi{Role}ID` or `arr{Group}ID`
- **Examples**:
  - NguoiChinhID (single person)
  - arrNguoiDieuPhoiID (multiple people)
- **Always**: isRecipientCandidate = true

### Display Fields - Person Names

- **Pattern**: `TenNguoi{Role}`
- **Examples**: TenNguoiChinh, TenNguoiYeuCau, TenNguoiDanhGia
- **Rule**: Must match corresponding ID field (NguoiChinhID → TenNguoiChinh)

### Display Fields - Codes/IDs

- **Pattern**: `Ma{Entity}` or `_id`
- **Examples**: MaCongViec, MaYeuCau
- **Usage**: Displayed in notifications, linked to detail pages

### Display Fields - Vietnamese Dates

- **Pattern**: `NgayXXX` or `ThoiGianXXX`
- **Examples**: NgayHetHan, ThoiGianHen
- **Format**: DD/MM/YYYY HH:mm (already formatted by services)

### Display Fields - Numeric Values

- **Pattern**: `Diem{Type}`, `Tien{Type}`, `Tong{Type}`
- **Examples**: DiemDanhGia, TienDoMoi, TongDiemKPI
- **Type**: Always Number

---

## 🔗 VARIABLE RELATIONSHIPS

### CongViec Relationships

```
NguoiChinhID ──────────► TenNguoiChinh
NguoiGiaoViecID ───────► TenNguoiGiao
NguoiThamGia ──────────► (Array, no single name)
NguoiThamGiaMoi ───────► (Dynamic, passed in context)
NguoiThamGiaBiXoa ─────► (Dynamic, passed in context)
NguoiChinhMoi ─────────► TenNguoiChinhMoi (NEW)
```

### YeuCau Relationships

```
NguoiYeuCauID ─────────► TenNguoiYeuCau
NguoiXuLyID ───────────► TenNguoiXuLy
arrNguoiDieuPhoiID ────► (Array, no single name)
arrQuanLyKhoaID ───────► (Array, no single name)
NguoiSuaID ────────────► TenNguoiSua (NEW)
NguoiBinhLuanID ───────► TenNguoiComment
NguoiDuocDieuPhoiID ───► (Dynamic, passed in context)
```

### KPI Relationships

```
NhanVienID ────────────► TenNhanVien
NguoiDanhGiaID ────────► TenNguoiDanhGia
(No ID field) ─────────► TenNguoiDuyet (dynamic)
```

---

## 📍 TEMPLATE VARIABLE USAGE

### Most Used Variables (Top 10)

| Variable               | Usage Count   | In Types            |
| ---------------------- | ------------- | ------------------- |
| `{{_id}}`              | 90+ templates | All 45 types        |
| `{{TieuDe}}`           | 85+ templates | All types           |
| `{{MaCongViec}}`       | 38 templates  | CongViec types (19) |
| `{{MaYeuCau}}`         | 34 templates  | YeuCau types (17)   |
| `{{TenNguoiThucHien}}` | 30+ templates | All domains         |
| `{{TenKhoaGui}}`       | 17 templates  | YeuCau types        |
| `{{TenKhoaNhan}}`      | 17 templates  | YeuCau types        |
| `{{TenNguoiYeuCau}}`   | 16 templates  | YeuCau types        |
| `{{NoiDungComment}}`   | 14 templates  | CongViec + YeuCau   |
| `{{TenNguoiComment}}`  | 14 templates  | CongViec + YeuCau   |

### Rarely Used Variables

| Variable        | Usage       | Why?                                   |
| --------------- | ----------- | -------------------------------------- |
| `TenTieuChi`    | 0 templates | KPI criterion name (not displayed yet) |
| `TongDiemKPI`   | 1 template  | Only in duyet-danh-gia                 |
| `DiemTuDanhGia` | 0 templates | Not displayed in notifications         |
| `DiemQL`        | 0 templates | Not displayed in notifications         |
| `TrangThai`     | 0 templates | Internal state, not user-facing        |
| `TenLoaiYeuCau` | 0 templates | Passed but not used                    |

---

## ✅ VALIDATION CHECKLIST

Use this to verify after fixes:

### Variable Definitions (notificationTypes.seed.js)

- [ ] CongViec: 25 variables (6 recipient + 19 display)
- [ ] YeuCau: 29 variables (9 recipient + 20 display)
- [ ] KPI: 15 variables (2 recipient + 13 display)
- [ ] No duplicate definitions
- [ ] All recipient candidates have isRecipientCandidate: true
- [ ] All ObjectId fields have ref: "NhanVien"

### Template Compatibility

- [ ] All `{{MucDoUuTien*}}` resolve correctly
- [ ] All `{{NgayHetHan*}}` resolve correctly
- [ ] All `{{TienDoMoi}}` resolve correctly
- [ ] All `{{PhanHoi}}` resolve correctly
- [ ] All `{{LyDo}}` resolve correctly
- [ ] No template errors when rendering

### Service Integration

- [ ] All services pass matching variable names
- [ ] No duplicate field passing (TenNguoiBinhLuan removed)
- [ ] All dynamic variables documented
- [ ] Null safety with fallbacks

---

## 🎯 QUICK LOOKUP BY DOMAIN

### CongViec Only (25 variables)

**Recipient Candidates (6)**:
NguoiChinhID, NguoiGiaoViecID, NguoiThamGia, NguoiThamGiaMoi, NguoiThamGiaBiXoa, NguoiChinhMoi

**Display Fields (19)**:
\_id, MaCongViec, TieuDe, MoTa, TenNguoiChinh, TenNguoiGiao, TenNguoiCapNhat ✅NEW, TenNguoiChinhMoi ✅NEW, TenNguoiThucHien ✅NEW, MucDoUuTienMoi 🔴RENAME, MucDoUuTienCu 🔴RENAME, TrangThai, TienDoMoi 🔴RENAME, NgayHetHan 🔴RENAME, NgayHetHanCu 🔴RENAME, NgayHetHanMoi ✅NEW, TenFile, NoiDungComment, TenNguoiComment

---

### YeuCau Only (29 variables)

**Recipient Candidates (9)**:
NguoiYeuCauID, NguoiXuLyID, arrNguoiDieuPhoiID, arrQuanLyKhoaID, NguoiSuaID ✅NEW, NguoiBinhLuanID ✅NEW, NguoiDieuPhoiID ✅NEW, NguoiDuocDieuPhoiID ✅NEW, NguoiNhanID ✅NEW

**Display Fields (20)**:
\_id, MaYeuCau, TieuDe, MoTa, TenKhoaGui, TenKhoaNhan, TenLoaiYeuCau, TenNguoiYeuCau, TenNguoiXuLy, TenNguoiSua ✅NEW, TenNguoiThucHien ✅NEW, TenNguoiXoa ✅NEW, ThoiGianHen, ThoiGianHenCu, TrangThai, LyDoTuChoi, DiemDanhGia, NoiDungDanhGia, NoiDungComment, TenNguoiComment

---

### KPI Only (15 variables)

**Recipient Candidates (2)**:
NhanVienID, NguoiDanhGiaID

**Display Fields (13)**:
\_id, TenNhanVien, TenNguoiDanhGia, TenChuKy, TenTieuChi, TenNhiemVu ✅NEW, TenNguoiDuyet ✅NEW, TongDiemKPI, DiemTuDanhGia, DiemQL, PhanHoi 🔴RENAME, LyDo 🔴RENAME

---

**Total unique variables**: 68 (after all fixes applied)  
**Ready for implementation**: Use [VARIABLES_BEFORE_AFTER.md](VARIABLES_BEFORE_AFTER.md) for code changes
