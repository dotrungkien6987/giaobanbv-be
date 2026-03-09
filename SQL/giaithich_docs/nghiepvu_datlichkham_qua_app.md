# Nghiệp vụ & Kiến trúc truy vấn — Đặt lịch khám qua App

---

## 1. Quy trình nghiệp vụ

### 1.1 Luồng đặt lịch

1. Nhân viên y tế sử dụng **app đặt lịch khám** để đặt lịch cho bệnh nhân.
2. Mỗi lượt đặt tạo 1 bản ghi trong bảng `dangkykham` với `isdangkyquaapi = 1`.
3. Bộ phận tiếp đón xem danh sách đặt lịch và chính thức tiếp đón bệnh nhân trên HIS.
4. Sau tiếp đón, bệnh nhân được khám và hệ thống HIS tạo `vienphi` (phiếu thu) + `hosobenhan` (hồ sơ bệnh án).

### 1.2 Hai hệ thống độc lập

| App đặt lịch         | HIS (Hospital Information System)            |
| -------------------- | -------------------------------------------- |
| Bảng `dangkykham`    | Bảng `vienphi`, `hosobenhan`, `serviceprice` |
| `patientid` (ID tạm) | `patientid` thực sự trong lịch sử bệnh nhân  |
| `nguoigioithieuid`   | `tbuser.userid` (qua bảng `nguoigioithieu`)  |

Vì app và HIS là 2 hệ thống riêng biệt, không có liên kết dữ liệu trực tiếp. Bảng `nguoigioithieu` đóng vai trò **ánh xạ** nhân viên đăng ký app với user HIS thông qua `nguoigioithieu.agencyid = tbuser.userid`.

### 1.3 patientid vs patientid_old

| Trường                     | Ý nghĩa                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dangkykham.patientid`     | ID tạm — sinh ra khi đặt lịch qua app, **không có ý nghĩa thực tế** trong HIS                                                                                         |
| `dangkykham.patientid_old` | ID thực — được gán khi tiếp đón chính thức. Nếu bệnh nhân đã có lịch sử thì dùng ID cũ; nếu bệnh nhân mới thì `patientid_old = patientid`. Nếu `NULL` **hoặc `= 0`** = chưa tiếp đón |

**Kết nối với HIS:**

```
dangkykham.patientid_old = vienphi.patientid
                         = hosobenhan.patientid  (qua vienphi.hosobenhanid)
```

### 1.4 dangkykhamstatus

| Giá trị | Ý nghĩa                                   |
| ------- | ----------------------------------------- |
| `0`     | Chưa khám                                 |
| `1`     | Đã khám (có viện phí tương ứng trong HIS) |
| `2`     | Đã hủy                                    |

### 1.5 Ràng buộc nghiệp vụ

- **1 bệnh nhân / 1 ngày = 1 vienphiid**: Trong cùng 1 ngày, 1 `patientid` chỉ có tối đa 1 bản ghi trong `vienphi`.
- Bảng `nguoigioithieu` là **cấu hình 1 lần** — không thay đổi thường xuyên.
- `tbuser` là bảng nhân viên y tế của HIS. Liên kết: `nguoigioithieu.agencyid = tbuser.userid`.

---

## 2. Các bảng liên quan

| Bảng              | Vai trò                                             | Ghi chú                                                                |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `dangkykham`      | Lịch đặt khám qua app                               | Lọc bằng `isdangkyquaapi = 1`                                          |
| `nguoigioithieu`  | Người giới thiệu (nhân viên đặt lịch)               | Cấu hình 1 lần; `agencyid = tbuser.userid`                             |
| `departmentgroup` | Nhóm khoa                                           | Dùng cho cả `nguoigioithieu` và `vienphi` (2 alias riêng)              |
| `tbuser`          | Nhân viên HIS                                       | Liên kết qua `nguoigioithieu.agencyid`                                 |
| `vienphi`         | Phiếu thu — phát sinh khi bệnh nhân vào khám        | Liên kết: `patientid_old + ngày`                                       |
| `hosobenhan`      | Hồ sơ bệnh án — hành chính bệnh nhân chính thức     | Liên kết qua `vienphi.hosobenhanid`                                    |
| `serviceprice`    | Chi tiết dịch vụ thanh toán                         | Hàng chục triệu dòng; luôn filter qua `vienphiid` trước                |
| `patient`         | Thông tin bệnh nhân khi đặt qua app (chưa tiếp đón) | Fallback khi `patientid_old IS NULL` hoặc `= 0`; chỉ có `_code`, không có `_name` |
| `department`      | Khoa/phòng                                          | Dùng từ `vienphi.departmentid`                                         |

---

## 3. Mục tiêu báo cáo

### 3.1 baoCaoNguoiGioiThieu (Báo cáo tổng hợp)

> Trong khoảng thời gian, mỗi `nguoigioithieu` đặt được bao nhiêu lịch, bao nhiêu thực sự khám, tổng tiền thanh toán là bao nhiêu.

**Output mỗi dòng:** 1 người giới thiệu  
**Cột chính:** `tong_dat_lich`, `co_kham`, `khong_kham`, `tong_tien`

### 3.2 chiTietDatLich (Báo cáo chi tiết)

> Drill-down để kiểm chứng số liệu tổng hợp — mỗi dòng là 1 lượt đặt lịch, hiển thị đầy đủ thông tin kể cả các lịch chưa khám.

**Output mỗi dòng:** 1 lượt đặt lịch (`dangkykhamid`)  
**Các cột vienphi/hosobenhan = NULL** nếu bệnh nhân chưa khám.  
**Cột bổ sung:** `patientid` (ID tạm từ app), `tong_tien` (= 0 nếu chưa khám)

### 3.3 chiTietDatLich_voiLichSu (Chi tiết + lịch sử khám)

> Mở rộng từ `chiTietDatLich` — bổ sung thêm cột `lichsu_kham` chứa **mảng JSON lịch sử khám 1 năm gần nhất** của bệnh nhân.

**Output mỗi dòng:** 1 lượt đặt lịch (`dangkykhamid`)  
**Cột bổ sung so với chiTietDatLich:** `lichsu_kham` — mảng JSON sắp xếp mới nhất trước.  
Mỗi phần tử: `{ vienphidate, chandoanravien, chandoanravien_code, chandoanravien_kemtheo, chandoanravien_kemtheo_code }`  
`NULL` nếu bệnh nhân chưa tiếp đón hoặc chưa từng khám trong 1 năm qua.

---

## 4. Kiến trúc truy vấn

### 4.1 Chiến lược tối ưu chung

Cả hai báo cáo đều xây dựng theo nguyên tắc **"lọc trước, join sau"** để tránh full scan trên các bảng lớn (`vienphi`, `hosobenhan`, `serviceprice`):

```
dangkykham  →  CTE dat_lich (nhỏ, đã lọc)
                    ↓ (index lookup)
              vienphi  →  hosobenhan
                    ↓ (index lookup)
              serviceprice  (chỉ vienphiid liên quan)
```

### 4.2 baoCaoNguoiGioiThieu — 3 CTE

```
CTE dat_lich
    └─ Filter dangkykham: isdangkyquaapi=1, date range
       → Tập nhỏ, làm nền cho toàn bộ query

CTE vienphiid_co_kham
    └─ INNER JOIN vienphi từ dat_lich (chỉ status=1)
       → Xác định vienphiid của các lượt đã khám thực sự

CTE tong_tien_vienphiid
    └─ INNER JOIN serviceprice từ vienphiid_co_kham
       → Tổng tiền THEO loaidoituong (BHYT/Nhân dân/Mặc định)
       → Không bao giờ quét toàn bộ serviceprice

Main SELECT
    └─ GROUP BY nguoigioithieu + departmentgroup
```

**Công thức tính tiền:**

```sql
CASE
  WHEN loaidoituong = 0 THEN servicepricemoney_bhyt    * soluong  -- BHYT
  WHEN loaidoituong = 1 THEN servicepricemoney_nhandan * soluong  -- Nhân dân
  ELSE                       servicepricemoney         * soluong  -- Mặc định
END
```

### 4.3 chiTietDatLich — 2 CTE + nhiều LEFT JOIN

```
CTE dat_lich
    └─ Filter dangkykham (giữ cả patientid lẫn patientid_old)

CTE tong_tien_vienphiid
    └─ = ANY(list vienphiid từ dat_lich) → index lookup trên serviceprice
       → Tổng tiền theo loaidoituong, GROUP BY vienphiid
       → Không bao giờ quét toàn bộ serviceprice

Main SELECT với chuỗi LEFT JOIN:
  ngt           ← nguoigioithieu (thông tin người giới thiệu)
  dg_ngt        ← departmentgroup của người giới thiệu
  vp            ← vienphi (patientid_old + ngày khám)
  dg_vp         ← departmentgroup của viện phí (alias KHÁC dg_ngt)
  d_vp          ← department (khoa khám)
  hsba          ← hosobenhan (qua vienphi.hosobenhanid)
  pt            ← patient (fallback, CHỈ khi patientid_old IS NULL hoặc = 0)
  tt            ← tong_tien_vienphiid (LEFT JOIN qua vp.vienphiid)
```

**Lưu ý quan trọng — 2 alias departmentgroup:**

| Alias    | Nguồn                              | Ý nghĩa                          |
| -------- | ---------------------------------- | -------------------------------- |
| `dg_ngt` | `nguoigioithieu.departmentgroupid` | Khoa của người giới thiệu        |
| `dg_vp`  | `vienphi.departmentgroupid`        | Khoa bệnh nhân thực sự được khám |

Hai khoa này **có thể khác nhau** vì bệnh nhân có thể được giới thiệu từ 1 khoa nhưng thực tế khám ở khoa khác.

### 4.4 Fallback thông tin bệnh nhân

Khi `patientid_old IS NULL` **hoặc `= 0`** (bệnh nhân đặt lịch nhưng chưa tiếp đón), không có `hosobenhan`. Fallback sang bảng `patient`:

```sql
-- JOIN điều kiện kép: chỉ join khi patientid_old NULL hoặc = 0
LEFT JOIN patient pt
    ON (dl.patientid_old IS NULL OR dl.patientid_old = 0)
    AND pt.patientid = dl.patientid

-- COALESCE: ưu tiên hosobenhan, fallback sang patient
COALESCE(hsba.patientname,  pt.patientname)  AS patientname
COALESCE(hsba.gioitinhname, pt.gioitinhcode) AS gioitinhname  -- patient chỉ có _code!
COALESCE(hsba.hc_xaname,    pt.hc_xacode)   AS hc_xaname
```

> **Lưu ý:** Bảng `patient` chỉ lưu `gioitinhcode`, `hc_xacode`, `hc_huyencode`, `hc_tinhcode` — **không có trường `_name`**. Khi hiển thị fallback sẽ là giá trị code thay vì tên đầy đủ.

### 4.5 chiTietDatLich_voiLichSu — 3 CTE + nhiều LEFT JOIN

```
CTE dat_lich
    └─ (giống chiTietDatLich)

CTE lichsu_kham
    └─ Pre-aggregate 1 lần cho TẤT CẢ bệnh nhân trong báo cáo
       WHERE patientid = ANY(DISTINCT patientid_old từ dat_lich)
         AND vienphidate >= NOW() - INTERVAL '1 year'
       → json_agg(...) ORDER BY vienphidate DESC
       → Không dùng LATERAL — tránh N subquery

CTE tong_tien_vienphiid
    └─ (giống chiTietDatLich)

Main SELECT: giống chiTietDatLich + thêm:
  lsh           ← lichsu_kham (LEFT JOIN qua dl.patientid_old = lsh.patientid)
```

**Lịch sử khám — cấu trúc JSON mỗi phần tử:**

| Trường                        | Kiểu   | Ghi chú                                    |
| ----------------------------- | ------ | ------------------------------------------ |
| `vienphidate`                 | `text` | Cast `::text` để giữ nguyên định dạng gốc  |
| `chandoanravien`              | `text` | Chẩn đoán ra viện                          |
| `chandoanravien_code`         | `text` | Mã ICD chẩn đoán chính                     |
| `chandoanravien_kemtheo`      | `text` | Chẩn đoán kèm theo                         |
| `chandoanravien_kemtheo_code` | `text` | Mã ICD chẩn đoán kèm theo                  |

> **Lý do cast `::text` cho `vienphidate`:** `json_build_object` serialize `timestamp` theo ISO 8601 với `T` (ví dụ `"2024-01-15T08:30:00"`). Cast `::text` giữ nguyên định dạng hiển thị của PostgreSQL (ví dụ `"2024-01-15 08:30:00"`).

---

## 5. File nguồn

Tất cả query được định nghĩa trong:

```
querySQL/qDatLichKham.js
```

| Property                            | Mô tả                                              | Tham số                    |
| ----------------------------------- | -------------------------------------------------- | -------------------------- |
| `baoCaoNguoiGioiThieu`              | Báo cáo tổng hợp theo người giới thiệu             | `$1` fromDate, `$2` toDate |
| `baoCaoNguoiGioiThieu_test`         | Bản test với tham số hardcoded                     | —                          |
| `chiTietDatLich`                    | Chi tiết từng lượt đặt lịch                        | `$1` fromDate, `$2` toDate |
| `chiTietDatLich_test`               | Bản test với tham số hardcoded                     | —                          |
| `chiTietDatLich_voiLichSu`          | Chi tiết + lịch sử khám 1 năm (JSON)               | `$1` fromDate, `$2` toDate |
| `chiTietDatLich_voiLichSu_test`     | Bản test với tham số hardcoded                     | —                          |

**Cột output của chiTietDatLich / chiTietDatLich_voiLichSu:**

| Nhóm                       | Cột                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Người giới thiệu           | `nguoigioithieuid`, `ma_ngt`, `ten_ngt`, `dien_thoai`, `ngt_departmentgroupid`, `ngt_departmentgroupname`                                                                                                    |
| Đặt lịch                   | `dangkykhamid`, `dangkykhamdate`, `dangkykhamstatus`, `patientid_old`, `patientid`                                                                                                                            |
| Viện phí                   | `vienphiid`, `vienphidate`, `chandoanravien`, `chandoanravien_code`, `chandoanravien_kemtheo`, `chandoanravien_kemtheo_code`, `vp_departmentgroupid`, `vp_departmentgroupname`, `vp_departmentid`, `vp_departmentname` |
| Hành chính BN              | `hosobenhanid`, `hosobenhancode`, `hosobenhanstatus`, `loaibenhanid`, `patientname`, `birthday`, `gioitinhname`, `hc_xaname`, `hc_huyenname`, `hc_tinhname`                                                   |
| Thanh toán                 | `tong_tien` — tổng tiền dịch vụ, `= 0` nếu chưa khám                                                                                                                                                        |
| Lịch sử *(voiLichSu only)* | `lichsu_kham` — mảng JSON, `NULL` nếu chưa tiếp đón hoặc chưa từng khám trong 1 năm                                                                                                                         |

**Cách dùng:**

```javascript
const qDatLichKham = require("./querySQL/qDatLichKham");

// Báo cáo tổng hợp
pool.query(qDatLichKham.baoCaoNguoiGioiThieu, ["2024-01-01", "2024-01-31"]);

// Chi tiết
pool.query(qDatLichKham.chiTietDatLich, ["2024-01-01", "2024-01-31"]);

// Chi tiết + lịch sử khám
pool.query(qDatLichKham.chiTietDatLich_voiLichSu, ["2024-01-01", "2024-01-31"]);
```
