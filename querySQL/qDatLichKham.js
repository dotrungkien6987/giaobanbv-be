/**
 * @fileoverview SQL queries báo cáo tổng hợp đặt lịch khám qua app theo người giới thiệu
 * @module querySQL/qDatLichKham
 * @description
 *   Tổng hợp số lượt đặt lịch, số lượt có khám, số lượt không khám và tổng tiền
 *   cho từng người giới thiệu, dựa trên dữ liệu đặt lịch qua app (isdangkyquaapi = 1).
 *
 *   Tiêu chí "có khám": dangkykhamstatus = 1
 *   Tiêu chí "không khám": dangkykhamstatus ≠ 1 (0 = chưa khám, 2 = hủy)
 *   Tổng tiền: SUM từ serviceprice, chỉ lấy vienphiid liên quan (tránh full scan)
 *
 *   Tổng tiền dịch vụ (tong_tien_dichvu): CHỈ tính serviceprice có bhyt_groupcode
 *   thuộc danh sách BHYT_GROUPCODES. Nếu < MIN_DICHVU_AMOUNT → không hợp lệ.
 */

// ═══════════════════════════════════════════════════════════════════════
// CẤU HÌNH — thay đổi ở đây, tất cả queries tự động cập nhật
// ═══════════════════════════════════════════════════════════════════════

/** Nhóm dịch vụ BHYT dùng tính tong_tien_dichvu (tiền dịch vụ hợp lệ) */
const BHYT_GROUPCODES =
  "'03XN','04CDHA','05TDCN','06PTTT','07KTC','12NG','1001GoiPTTT','1002NgayGiuongLuu','1004ThuThuat'";

/** Người giới thiệu loại trừ (VD: bệnh nhân tự đặt qua app) */
const EXCLUDED_NGT_IDS = "10659";

/** Khoa loại trừ (departmentid trên bảng dangkykham) */
const EXCLUDED_DEPT_IDS = "977";

/** Ngưỡng tiền dịch vụ tối thiểu (hiện không dùng trong logic nghiệp vụ, giữ lại đề phòng) */

const qDatLichKham = {};

/**
 * Báo cáo tổng hợp đặt lịch khám theo người giới thiệu
 *
 * Mỗi dòng là một người giới thiệu (nguoigioithieu).
 * Bệnh nhân không có người giới thiệu (NULL) được gom vào dòng "Không xác định".
 *
 * Tối ưu bảng serviceprice (hàng chục triệu bản ghi):
 *   - CTE dat_lich             → lọc dangkykham trước (date range + app), tập nhỏ
 *   - CTE vienphiid_co_kham    → chỉ lấy vienphiid của bệnh nhân có khám (status=1)
 *   - CTE tong_tien_vienphiid  → INNER JOIN serviceprice với vienphiid đã lọc
 *     → PostgreSQL dùng index lookup, không full scan toàn bảng serviceprice
 *
 * @param {string} $1 - fromDate — ngày bắt đầu (YYYY-MM-DD hoặc timestamp)
 * @param {string} $2 - toDate   — ngày kết thúc (YYYY-MM-DD hoặc timestamp)
 *
 * @returns {Array<Object>} Mỗi phần tử gồm:
 *   - nguoigioithieuid   {number|null}
 *   - ma_ngt             {string}  — mã người giới thiệu
 *   - ten_ngt            {string}  — tên người giới thiệu
 *   - dien_thoai         {string}  — số điện thoại
 *   - departmentgroupid   {number}  — khoa / nhóm khoa của người giới thiệu
 *   - departmentgroupname {string}  — tên khoa / nhóm khoa
 *   - tong_dat_lich      {number}  — tổng số lượt đặt lịch
 *   - co_kham            {number}  — số lượt thực sự được khám (status = 1)
 *   - khong_kham         {number}  — số lượt chưa / hủy khám
 *   - co_kham_co_tien    {number}  — số lượt có khám VÀ phát sinh tiền (tong_tien > 0)
 *   - co_kham_khong_tien {number}  — số lượt có khám NHƯNG không phát sinh tiền (tong_tien = 0)
 *   - ngoai_tru_chua_dong {number} — số lượt có khám có tiền nhưng chưa vào viện và chưa đóng bệnh án
 *   - tong_tien          {number}  — tổng tiền dịch vụ của các lượt có khám
 *   - tong_tien_dichvu   {number}  — tổng tiền dịch vụ (chỉ nhóm BHYT cấu hình, giữ lại đề phòng)
 */
qDatLichKham.baoCaoNguoiGioiThieu = `
WITH
-- CTE 1: Lọc đặt lịch qua app trong khoảng thời gian → tập dữ liệu nhỏ làm nền
-- Loại trừ NGT tự đặt + khoa loại trừ
dat_lich AS (
    SELECT
        dangkykhamid,
        nguoigioithieuid,
        dangkykhamstatus,
        dangkykhaminitdate,
        dangkykhamdate,
        patientid_old
    FROM dangkykham
    WHERE isdangkyquaapi = 1
      AND dangkykhamdate BETWEEN $1 AND $2
      AND (nguoigioithieuid IS NULL OR nguoigioithieuid NOT IN (${EXCLUDED_NGT_IDS}))
      AND (departmentid IS NULL OR departmentid NOT IN (${EXCLUDED_DEPT_IDS}))
),

-- CTE 2: Tất cả vienphiid matching (1 dangkykhamid có thể → N vienphiid)
all_vienphi_co_kham AS (
    SELECT
        dl.dangkykhamid,
        vp.vienphiid
    FROM dat_lich dl
    INNER JOIN vienphi vp
        ON  dl.patientid_old        = vp.patientid
        AND DATE(dl.dangkykhamdate) = DATE(vp.vienphidate)
    WHERE dl.dangkykhamstatus = 1
),

-- CTE 3: Tính tổng tiền per vienphiid (tất cả dịch vụ)
tong_tien_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                         COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien
    FROM serviceprice sp
    INNER JOIN all_vienphi_co_kham ck ON sp.vienphiid = ck.vienphiid
    GROUP BY sp.vienphiid
),

-- CTE 4: Tính tổng tiền per vienphiid (chỉ nhóm BHYT cấu hình)
tong_tien_dichvu_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                         COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien_dichvu
    FROM serviceprice sp
    INNER JOIN all_vienphi_co_kham ck ON sp.vienphiid = ck.vienphiid
    WHERE sp.bhyt_groupcode IN (${BHYT_GROUPCODES})
    GROUP BY sp.vienphiid
),

-- CTE 5: Gộp tổng tiền per dangkykhamid (SUM tất cả vienphi cùng ngày)
-- Đảm bảo mỗi dangkykhamid chỉ xuất hiện 1 lần → không inflate COUNT
tong_tien_per_dk AS (
    SELECT
        ck.dangkykhamid,
        COALESCE(SUM(tt.tong_tien), 0) AS tong_tien,
        COALESCE(SUM(ttdv.tong_tien_dichvu), 0) AS tong_tien_dichvu
    FROM all_vienphi_co_kham ck
    LEFT JOIN tong_tien_vienphiid tt ON ck.vienphiid = tt.vienphiid
    LEFT JOIN tong_tien_dichvu_vienphiid ttdv ON ck.vienphiid = ttdv.vienphiid
    GROUP BY ck.dangkykhamid
),

vienphi_dedup AS (
    SELECT DISTINCT ON (dangkykhamid)
        dangkykhamid,
        vienphiid
    FROM all_vienphi_co_kham
    ORDER BY dangkykhamid, vienphiid DESC
)

SELECT
    dl.nguoigioithieuid,
    COALESCE(ngt.nguoigioithieucode, 'N/A')            AS ma_ngt,
    COALESCE(ngt.nguoigioithieuname, 'Không xác định') AS ten_ngt,
    ngt.nguoigioithieuphone                             AS dien_thoai,
    dg.departmentgroupid,
    dg.departmentgroupname,

    COUNT(dl.dangkykhamid)                               AS tong_dat_lich,
    COUNT(CASE WHEN dl.dangkykhamstatus = 1 THEN 1 END)  AS co_kham,
    COUNT(CASE WHEN dl.dangkykhamstatus != 1 THEN 1 END) AS khong_kham,
    COUNT(CASE WHEN dl.dangkykhamstatus = 1 AND COALESCE(tpd.tong_tien, 0) > 0 THEN 1 END) AS co_kham_co_tien,
    COUNT(CASE WHEN dl.dangkykhamstatus = 1 AND COALESCE(tpd.tong_tien, 0) = 0 THEN 1 END) AS co_kham_khong_tien,
    COUNT(CASE
        WHEN dl.dangkykhamstatus = 1
         AND COALESCE(tpd.tong_tien, 0) > 0
         AND COALESCE(hsba.hinhthucvaovienid, 0) <= 0
         AND COALESCE(hsba.hosobenhanstatus, 0) <= 0
        THEN 1
    END) AS ngoai_tru_chua_dong,

    COALESCE(SUM(tpd.tong_tien), 0) AS tong_tien,
    COALESCE(SUM(tpd.tong_tien_dichvu), 0) AS tong_tien_dichvu

FROM dat_lich dl
LEFT JOIN nguoigioithieu ngt
    ON dl.nguoigioithieuid = ngt.nguoigioithieuid
LEFT JOIN departmentgroup dg
    ON ngt.departmentgroupid = dg.departmentgroupid
-- JOIN 1:1 — tong_tien_per_dk đã GROUP BY dangkykhamid
LEFT JOIN tong_tien_per_dk tpd
    ON dl.dangkykhamid = tpd.dangkykhamid
LEFT JOIN vienphi_dedup vd
    ON dl.dangkykhamid = vd.dangkykhamid
LEFT JOIN vienphi vp
    ON vd.vienphiid = vp.vienphiid
LEFT JOIN hosobenhan hsba
    ON vp.hosobenhanid = hsba.hosobenhanid

GROUP BY
    dl.nguoigioithieuid,
    ngt.nguoigioithieucode,
    ngt.nguoigioithieuname,
    ngt.nguoigioithieuphone,
    dg.departmentgroupid,
    dg.departmentgroupname

ORDER BY dg.departmentgroupname ASC, co_kham DESC
`;

/**
 * Query test có sẵn tham số — copy và chạy trực tiếp trên pgAdmin / psql
 * Thay đổi from_date / to_date trong phần VALUES nếu cần test khoảng khác
 */
qDatLichKham.baoCaoNguoiGioiThieu_test = `
WITH
params AS (
    SELECT
        '2024-01-01 00:00:00'::timestamp AS from_date,
        '2024-01-31 23:59:59'::timestamp AS to_date
),
dat_lich AS (
    SELECT
        dl.dangkykhamid,
        dl.nguoigioithieuid,
        dl.dangkykhamstatus,
        dl.dangkykhamdate,
        dl.patientid_old
    FROM dangkykham dl, params p
    WHERE dl.isdangkyquaapi = 1
      AND dl.dangkykhamdate BETWEEN p.from_date AND p.to_date
      AND (dl.nguoigioithieuid IS NULL OR dl.nguoigioithieuid NOT IN (${EXCLUDED_NGT_IDS}))
      AND (dl.departmentid IS NULL OR dl.departmentid NOT IN (${EXCLUDED_DEPT_IDS}))
),
all_vienphi_co_kham AS (
    SELECT
        dl.dangkykhamid,
        vp.vienphiid
    FROM dat_lich dl
    INNER JOIN vienphi vp
        ON  dl.patientid_old        = vp.patientid
        AND DATE(dl.dangkykhamdate) = DATE(vp.vienphidate)
    WHERE dl.dangkykhamstatus = 1
),
tong_tien_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                         COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien
    FROM serviceprice sp
    INNER JOIN all_vienphi_co_kham ck ON sp.vienphiid = ck.vienphiid
    GROUP BY sp.vienphiid
),
tong_tien_dichvu_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                         COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien_dichvu
    FROM serviceprice sp
    INNER JOIN all_vienphi_co_kham ck ON sp.vienphiid = ck.vienphiid
    WHERE sp.bhyt_groupcode IN (${BHYT_GROUPCODES})
    GROUP BY sp.vienphiid
),
tong_tien_per_dk AS (
    SELECT
        ck.dangkykhamid,
        COALESCE(SUM(tt.tong_tien), 0) AS tong_tien,
        COALESCE(SUM(ttdv.tong_tien_dichvu), 0) AS tong_tien_dichvu
    FROM all_vienphi_co_kham ck
    LEFT JOIN tong_tien_vienphiid tt ON ck.vienphiid = tt.vienphiid
    LEFT JOIN tong_tien_dichvu_vienphiid ttdv ON ck.vienphiid = ttdv.vienphiid
    GROUP BY ck.dangkykhamid
),
vienphi_dedup AS (
    SELECT DISTINCT ON (dangkykhamid)
        dangkykhamid,
        vienphiid
    FROM all_vienphi_co_kham
    ORDER BY dangkykhamid, vienphiid DESC
)
SELECT
    dl.nguoigioithieuid,
    COALESCE(ngt.nguoigioithieucode, 'N/A')            AS ma_ngt,
    COALESCE(ngt.nguoigioithieuname, 'Không xác định') AS ten_ngt,
    ngt.nguoigioithieuphone                             AS dien_thoai,
    dg.departmentgroupid,
    dg.departmentgroupname,
    COUNT(dl.dangkykhamid)                               AS tong_dat_lich,
    COUNT(CASE WHEN dl.dangkykhamstatus = 1 THEN 1 END)  AS co_kham,
    COUNT(CASE WHEN dl.dangkykhamstatus != 1 THEN 1 END) AS khong_kham,
    COUNT(CASE WHEN dl.dangkykhamstatus = 1 AND COALESCE(tpd.tong_tien, 0) > 0 THEN 1 END) AS co_kham_co_tien,
    COUNT(CASE WHEN dl.dangkykhamstatus = 1 AND COALESCE(tpd.tong_tien, 0) = 0 THEN 1 END) AS co_kham_khong_tien,
    COUNT(CASE
        WHEN dl.dangkykhamstatus = 1
         AND COALESCE(tpd.tong_tien, 0) > 0
         AND COALESCE(hsba.hinhthucvaovienid, 0) <= 0
         AND COALESCE(hsba.hosobenhanstatus, 0) <= 0
        THEN 1
    END) AS ngoai_tru_chua_dong,
    COALESCE(SUM(tpd.tong_tien), 0)          AS tong_tien,
    COALESCE(SUM(tpd.tong_tien_dichvu), 0) AS tong_tien_dichvu
FROM dat_lich dl
LEFT JOIN nguoigioithieu ngt
    ON dl.nguoigioithieuid = ngt.nguoigioithieuid
LEFT JOIN departmentgroup dg
    ON ngt.departmentgroupid = dg.departmentgroupid
LEFT JOIN tong_tien_per_dk tpd
    ON dl.dangkykhamid = tpd.dangkykhamid
LEFT JOIN vienphi_dedup vd
    ON dl.dangkykhamid = vd.dangkykhamid
LEFT JOIN vienphi vp
    ON vd.vienphiid = vp.vienphiid
LEFT JOIN hosobenhan hsba
    ON vp.hosobenhanid = hsba.hosobenhanid
GROUP BY
    dl.nguoigioithieuid,
    ngt.nguoigioithieucode,
    ngt.nguoigioithieuname,
    ngt.nguoigioithieuphone,
    dg.departmentgroupid,
    dg.departmentgroupname
ORDER BY dg.departmentgroupname ASC, co_kham DESC
`;

/**
 * Báo cáo chi tiết đặt lịch khám — mỗi dòng là 1 lượt đặt lịch
 *
 * Dùng để drill-down / chứng minh số liệu từ baoCaoNguoiGioiThieu.
 * Hiển thị cả bệnh nhân không khám (dangkykhamstatus != 1), khi đó
 * các cột vienphi / hosobenhan sẽ là NULL.
 *
 * Tối ưu bảng lớn (vienphi, hosobenhan, hàng chục triệu dòng):
 *   - CTE dat_lich lọc dangkykham trước → tập nhỏ
 *   - JOIN vienphi từ dat_lich → index lookup trên vienphi.patientid
 *   - JOIN hosobenhan từ vienphi → index lookup trên hosobenhan.hosobenhanid
 *   Không bao giờ full scan vienphi hay hosobenhan.
 *
 * @param {string} $1 - fromDate — ngày bắt đầu (YYYY-MM-DD hoặc timestamp)
 * @param {string} $2 - toDate   — ngày kết thúc (YYYY-MM-DD hoặc timestamp)
 *
 * @returns {Array<Object>} Mỗi phần tử gồm:
 *   Người giới thiệu:
 *   - nguoigioithieuid, ma_ngt, ten_ngt, dien_thoai
 *   - ngt_departmentgroupid, ngt_departmentgroupname   (khoa của người giới thiệu)
 *   Đặt lịch:
 *   - dangkykhamid, dangkykhamdate, dangkykhamstatus, patientid_old
 *   Viện phí (NULL nếu không khám):
 *   - vienphiid, vienphidate
 *   - chandoanravien, chandoanravien_code
 *   - chandoanravien_kemtheo, chandoanravien_kemtheo_code
 *   - vp_departmentgroupid, vp_departmentgroupname   (khoa viện phí — khác ngt)
 *   - vp_departmentid, vp_departmentname
 *   - macskcbbd   — mã cơ sở khám chữa bệnh ban đầu từ BHYT của lượt khám
 *   - ngay_kham_truoc {timestamp | null} — ngày khám thực tế liền trước trong cửa sổ 1 năm
 *   - xutrikhambenhid_lan_truoc {number | null} — xử trí khám bệnh của lần khám liền trước
 *   - hen_kham_lai_tu_lan_truoc {boolean} — true nếu lần khám liền trước có xutrikhambenhid = 3
 *   - co_hen_kham_gan_nhat {boolean} — field chuẩn hóa cho UI/filter/formula, true nếu lần khám gần nhất là hẹn
 *   - ngay_xu_tri_hen_gan_nhat {timestamp | null} — ngày của lần khám gần nhất khi lần đó có xử trí hẹn
 *   - so_ngay_tu_lan_kham_gan_nhat {number | null} — số ngày từ đợt khám hiện tại đến lần khám gần nhất
 *   Hành chính bệnh nhân (NULL nếu không khám):
 *   - hosobenhanid, hosobenhancode, hosobenhanstatus, loaibenhanid
 *   - patientname, birthday, gioitinhname
 *   - hc_xaname, hc_huyenname, hc_tinhname
 *   Thanh toán:
 *   - tong_tien          {number}  — tổng tiền dịch vụ (0 nếu chưa khám)
 *   - tong_tien_dichvu   {number}  — tổng tiền các nhóm DV cấu hình (0 nếu chưa khám)
 */
qDatLichKham.chiTietDatLich = `
WITH
-- CTE 1: Lọc dangkykham trước — tập nhỏ, là điểm khởi đầu cho tất cả JOIN
dat_lich AS (
    SELECT
        dangkykhamid,
        nguoigioithieuid,
        dangkykhamstatus,
        dangkykhaminitdate,
        dangkykhamdate,
        patientid,
        patientid_old
    FROM dangkykham
    WHERE isdangkyquaapi = 1
      AND dangkykhamdate BETWEEN $1 AND $2
      AND (nguoigioithieuid IS NULL OR nguoigioithieuid NOT IN (${EXCLUDED_NGT_IDS}))
      AND (departmentid IS NULL OR departmentid NOT IN (${EXCLUDED_DEPT_IDS}))
),

-- CTE 2: Tập bệnh nhân đã tiếp đón trong báo cáo, dùng lại cho lịch sử 1 năm
cohort_patients AS (
    SELECT DISTINCT patientid_old AS patientid
    FROM dat_lich
    WHERE patientid_old IS NOT NULL AND patientid_old != 0
),

-- CTE 3: Chuỗi lượt khám thực tế trong 1 năm để lấy lần khám liền trước
luot_kham_1_nam AS (
    SELECT
        vp_h.patientid,
        vp_h.vienphiid,
        vp_h.vienphidate,
        hsba_h.xutrikhambenhid,
        LAG(vp_h.vienphidate) OVER (
            PARTITION BY vp_h.patientid
            ORDER BY vp_h.vienphidate ASC, vp_h.vienphiid ASC
        ) AS ngay_kham_truoc,
        LAG(hsba_h.xutrikhambenhid) OVER (
            PARTITION BY vp_h.patientid
            ORDER BY vp_h.vienphidate ASC, vp_h.vienphiid ASC
        ) AS xutrikhambenhid_lan_truoc
    FROM vienphi vp_h
    LEFT JOIN hosobenhan hsba_h
        ON vp_h.hosobenhanid = hsba_h.hosobenhanid
    WHERE vp_h.patientid = ANY(SELECT patientid FROM cohort_patients)
      AND vp_h.vienphidate >= NOW() - INTERVAL '1 year'
),

-- CTE 4: Tất cả vienphi matching (1 dangkykhamid có thể → N vienphiid)
all_vienphi AS (
    SELECT
        dl.dangkykhamid,
        vp.vienphiid
    FROM dat_lich dl
    INNER JOIN vienphi vp
        ON  dl.patientid_old        = vp.patientid
        AND DATE(dl.dangkykhamdate) = DATE(vp.vienphidate)
),

-- CTE 5: Chọn 1 vienphi (vienphiid lớn nhất) per dangkykhamid cho clinical data
vienphi_dedup AS (
    SELECT DISTINCT ON (dangkykhamid)
        dangkykhamid,
        vienphiid
    FROM all_vienphi
    ORDER BY dangkykhamid, vienphiid DESC
),

-- CTE 6: Tính tổng tiền TẤT CẢ dịch vụ per vienphiid
tong_tien_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                          COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien
    FROM serviceprice sp
    WHERE sp.vienphiid = ANY(SELECT DISTINCT vienphiid FROM all_vienphi)
    GROUP BY sp.vienphiid
),

-- CTE 7: Tính tổng tiền DỊCH VỤ (chỉ bhyt_groupcode hợp lệ) per vienphiid
tong_tien_dichvu_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                          COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien_dichvu
    FROM serviceprice sp
    WHERE sp.bhyt_groupcode IN (${BHYT_GROUPCODES})
      AND sp.vienphiid = ANY(SELECT DISTINCT vienphiid FROM all_vienphi)
    GROUP BY sp.vienphiid
),

-- CTE 8: Gộp tổng tiền per dangkykhamid (SUM tất cả vienphi cùng ngày)
tong_tien_per_dk AS (
    SELECT
        av.dangkykhamid,
        COALESCE(SUM(tt.tong_tien), 0) AS tong_tien,
        COALESCE(SUM(ttdv.tong_tien_dichvu), 0) AS tong_tien_dichvu
    FROM all_vienphi av
    LEFT JOIN tong_tien_vienphiid tt ON av.vienphiid = tt.vienphiid
    LEFT JOIN tong_tien_dichvu_vienphiid ttdv ON av.vienphiid = ttdv.vienphiid
    GROUP BY av.dangkykhamid
)

SELECT
    -- Người giới thiệu
    dl.nguoigioithieuid,
    COALESCE(ngt.nguoigioithieucode, 'N/A')            AS ma_ngt,
    COALESCE(ngt.nguoigioithieuname, 'Không xác định') AS ten_ngt,
    ngt.nguoigioithieuphone                             AS dien_thoai,
    dg_ngt.departmentgroupid                            AS ngt_departmentgroupid,
    dg_ngt.departmentgroupname                          AS ngt_departmentgroupname,

    -- Đặt lịch
    dl.dangkykhamid,
    dl.dangkykhaminitdate,
    dl.dangkykhamdate,
    dl.dangkykhamstatus,
    dl.patientid_old,
    dl.patientid,

    -- Viện phí (NULL nếu không khám) — lấy từ vienphi_dedup (1:1)
    vp.vienphiid,
    vp.vienphidate,
    vp.chandoanravien,
    vp.chandoanravien_code,
    vp.chandoanravien_kemtheo,
    vp.chandoanravien_kemtheo_code,
    dg_vp.departmentgroupid                             AS vp_departmentgroupid,
    dg_vp.departmentgroupname                           AS vp_departmentgroupname,
    vp.departmentid                                     AS vp_departmentid,
    d_vp.departmentname                                 AS vp_departmentname,
    b.macskcbbd                                         AS macskcbbd,
    lk1n.ngay_kham_truoc,
    lk1n.xutrikhambenhid_lan_truoc,
    COALESCE(lk1n.xutrikhambenhid_lan_truoc = 3, FALSE) AS hen_kham_lai_tu_lan_truoc,
    COALESCE(lk1n.xutrikhambenhid_lan_truoc = 3, FALSE) AS co_hen_kham_gan_nhat,
    CASE
        WHEN lk1n.xutrikhambenhid_lan_truoc = 3 THEN lk1n.ngay_kham_truoc
        ELSE NULL
    END                                                 AS ngay_xu_tri_hen_gan_nhat,
    CASE
        WHEN lk1n.ngay_kham_truoc IS NOT NULL AND vp.vienphidate IS NOT NULL
            THEN DATE(vp.vienphidate) - DATE(lk1n.ngay_kham_truoc)
        ELSE NULL
    END                                                 AS so_ngay_tu_lan_kham_gan_nhat,

    -- Hành chính bệnh nhân
    hsba.hosobenhanid,
    hsba.hosobenhancode,
    hsba.hosobenhanstatus,
    hsba.loaibenhanid,
    hsba.hinhthucvaovienid,
    COALESCE(hsba.patientname,   pt.patientname)   AS patientname,
    COALESCE(hsba.birthday,      pt.birthday)      AS birthday,
    COALESCE(hsba.gioitinhname,  pt.gioitinhcode)  AS gioitinhname,
    COALESCE(hsba.hc_xaname,     pt.hc_xacode)    AS hc_xaname,
    COALESCE(hsba.hc_huyenname,  pt.hc_huyencode) AS hc_huyenname,
    COALESCE(hsba.hc_tinhname,   pt.hc_tinhcode)  AS hc_tinhname,

    -- Tổng tiền (SUM tất cả vienphi cùng ngày, 0 nếu chưa khám)
    COALESCE(tpd.tong_tien, 0)                          AS tong_tien,
    COALESCE(tpd.tong_tien_dichvu, 0)                   AS tong_tien_dichvu,
    CASE
        WHEN dl.dangkykhamstatus = 1
         AND COALESCE(tpd.tong_tien, 0) > 0
         AND COALESCE(hsba.hinhthucvaovienid, 0) <= 0
         AND COALESCE(hsba.hosobenhanstatus, 0) <= 0
        THEN TRUE
        ELSE FALSE
    END                                                 AS la_ngoai_tru_chua_dong

FROM dat_lich dl
LEFT JOIN nguoigioithieu ngt
    ON dl.nguoigioithieuid = ngt.nguoigioithieuid
LEFT JOIN departmentgroup dg_ngt
    ON ngt.departmentgroupid = dg_ngt.departmentgroupid
-- Viện phí: JOIN qua vienphi_dedup (1:1) thay vì trực tiếp (1:N)
LEFT JOIN vienphi_dedup vd
    ON dl.dangkykhamid = vd.dangkykhamid
LEFT JOIN vienphi vp
    ON vd.vienphiid = vp.vienphiid
LEFT JOIN departmentgroup dg_vp
    ON vp.departmentgroupid = dg_vp.departmentgroupid
LEFT JOIN department d_vp
    ON vp.departmentid = d_vp.departmentid
LEFT JOIN bhyt b
    ON vp.bhytid = b.bhytid
LEFT JOIN luot_kham_1_nam lk1n
    ON vp.vienphiid = lk1n.vienphiid
LEFT JOIN hosobenhan hsba
    ON vp.hosobenhanid = hsba.hosobenhanid
LEFT JOIN patient pt
    ON (dl.patientid_old IS NULL OR dl.patientid_old = 0)
    AND pt.patientid = dl.patientid
-- Tổng tiền: JOIN 1:1 per dangkykhamid
LEFT JOIN tong_tien_per_dk tpd
    ON dl.dangkykhamid = tpd.dangkykhamid

ORDER BY
    dg_ngt.departmentgroupname  ASC  NULLS LAST,
    ngt.nguoigioithieuname      ASC  NULLS LAST,
    dl.dangkykhamdate           ASC
`;

/**
 * Query test chi tiết — copy và chạy trực tiếp trên pgAdmin / psql
 * Thay đổi from_date / to_date trong phần params nếu cần test khoảng khác
 */
qDatLichKham.chiTietDatLich_test = `
WITH
params AS (
    SELECT
        '2024-01-01 00:00:00'::timestamp AS from_date,
        '2024-01-31 23:59:59'::timestamp AS to_date
),
dat_lich AS (
    SELECT
        dl.dangkykhamid,
        dl.nguoigioithieuid,
        dl.dangkykhamstatus,
        dl.dangkykhaminitdate,
        dl.dangkykhamdate,
        dl.patientid,
        dl.patientid_old
    FROM dangkykham dl, params p
    WHERE dl.isdangkyquaapi = 1
      AND dl.dangkykhamdate BETWEEN p.from_date AND p.to_date
      AND (dl.nguoigioithieuid IS NULL OR dl.nguoigioithieuid NOT IN (${EXCLUDED_NGT_IDS}))
      AND (dl.departmentid IS NULL OR dl.departmentid NOT IN (${EXCLUDED_DEPT_IDS}))
),
cohort_patients AS (
    SELECT DISTINCT patientid_old AS patientid
    FROM dat_lich
    WHERE patientid_old IS NOT NULL AND patientid_old != 0
),
luot_kham_1_nam AS (
    SELECT
        vp_h.patientid,
        vp_h.vienphiid,
        vp_h.vienphidate,
        hsba_h.xutrikhambenhid,
        LAG(vp_h.vienphidate) OVER (
            PARTITION BY vp_h.patientid
            ORDER BY vp_h.vienphidate ASC, vp_h.vienphiid ASC
        ) AS ngay_kham_truoc,
        LAG(hsba_h.xutrikhambenhid) OVER (
            PARTITION BY vp_h.patientid
            ORDER BY vp_h.vienphidate ASC, vp_h.vienphiid ASC
        ) AS xutrikhambenhid_lan_truoc
    FROM vienphi vp_h
    LEFT JOIN hosobenhan hsba_h
        ON vp_h.hosobenhanid = hsba_h.hosobenhanid
    WHERE vp_h.patientid = ANY(SELECT patientid FROM cohort_patients)
      AND vp_h.vienphidate >= NOW() - INTERVAL '1 year'
),
all_vienphi AS (
    SELECT
        dl.dangkykhamid,
        vp.vienphiid
    FROM dat_lich dl
    INNER JOIN vienphi vp
        ON  dl.patientid_old        = vp.patientid
        AND DATE(dl.dangkykhamdate) = DATE(vp.vienphidate)
),
vienphi_dedup AS (
    SELECT DISTINCT ON (dangkykhamid)
        dangkykhamid,
        vienphiid
    FROM all_vienphi
    ORDER BY dangkykhamid, vienphiid DESC
),
tong_tien_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                          COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien
    FROM serviceprice sp
    WHERE sp.vienphiid = ANY(SELECT DISTINCT vienphiid FROM all_vienphi)
    GROUP BY sp.vienphiid
),
tong_tien_dichvu_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                          COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien_dichvu
    FROM serviceprice sp
    WHERE sp.bhyt_groupcode IN (${BHYT_GROUPCODES})
      AND sp.vienphiid = ANY(SELECT DISTINCT vienphiid FROM all_vienphi)
    GROUP BY sp.vienphiid
),
tong_tien_per_dk AS (
    SELECT
        av.dangkykhamid,
        COALESCE(SUM(tt.tong_tien), 0) AS tong_tien,
        COALESCE(SUM(ttdv.tong_tien_dichvu), 0) AS tong_tien_dichvu
    FROM all_vienphi av
    LEFT JOIN tong_tien_vienphiid tt ON av.vienphiid = tt.vienphiid
    LEFT JOIN tong_tien_dichvu_vienphiid ttdv ON av.vienphiid = ttdv.vienphiid
    GROUP BY av.dangkykhamid
)

SELECT
    dl.nguoigioithieuid,
    COALESCE(ngt.nguoigioithieucode, 'N/A')            AS ma_ngt,
    COALESCE(ngt.nguoigioithieuname, 'Không xác định') AS ten_ngt,
    ngt.nguoigioithieuphone                             AS dien_thoai,
    dg_ngt.departmentgroupid                            AS ngt_departmentgroupid,
    dg_ngt.departmentgroupname                          AS ngt_departmentgroupname,
    dl.dangkykhamid,
    dl.dangkykhaminitdate,
    dl.dangkykhamdate,
    dl.dangkykhamstatus,
    dl.patientid_old,
    dl.patientid,
    vp.vienphiid,
    vp.vienphidate,
    vp.chandoanravien,
    vp.chandoanravien_code,
    vp.chandoanravien_kemtheo,
    vp.chandoanravien_kemtheo_code,
    dg_vp.departmentgroupid                             AS vp_departmentgroupid,
    dg_vp.departmentgroupname                           AS vp_departmentgroupname,
    vp.departmentid                                     AS vp_departmentid,
    d_vp.departmentname                                 AS vp_departmentname,
    b.macskcbbd                                         AS macskcbbd,
    lk1n.ngay_kham_truoc,
    lk1n.xutrikhambenhid_lan_truoc,
    COALESCE(lk1n.xutrikhambenhid_lan_truoc = 3, FALSE) AS hen_kham_lai_tu_lan_truoc,
    COALESCE(lk1n.xutrikhambenhid_lan_truoc = 3, FALSE) AS co_hen_kham_gan_nhat,
    CASE
        WHEN lk1n.xutrikhambenhid_lan_truoc = 3 THEN lk1n.ngay_kham_truoc
        ELSE NULL
    END                                                 AS ngay_xu_tri_hen_gan_nhat,
    CASE
        WHEN lk1n.ngay_kham_truoc IS NOT NULL AND vp.vienphidate IS NOT NULL
            THEN DATE(vp.vienphidate) - DATE(lk1n.ngay_kham_truoc)
        ELSE NULL
    END                                                 AS so_ngay_tu_lan_kham_gan_nhat,
    hsba.hosobenhanid,
    hsba.hosobenhancode,
    hsba.hosobenhanstatus,
    hsba.loaibenhanid,
    hsba.hinhthucvaovienid,
    COALESCE(hsba.patientname,   pt.patientname)   AS patientname,
    COALESCE(hsba.birthday,      pt.birthday)      AS birthday,
    COALESCE(hsba.gioitinhname,  pt.gioitinhcode)  AS gioitinhname,
    COALESCE(hsba.hc_xaname,     pt.hc_xacode)    AS hc_xaname,
    COALESCE(hsba.hc_huyenname,  pt.hc_huyencode) AS hc_huyenname,
    COALESCE(hsba.hc_tinhname,   pt.hc_tinhcode)  AS hc_tinhname,
    COALESCE(tpd.tong_tien, 0)                          AS tong_tien,
    COALESCE(tpd.tong_tien_dichvu, 0)                   AS tong_tien_dichvu,
    CASE
        WHEN dl.dangkykhamstatus = 1
         AND COALESCE(tpd.tong_tien, 0) > 0
         AND COALESCE(hsba.hinhthucvaovienid, 0) <= 0
         AND COALESCE(hsba.hosobenhanstatus, 0) <= 0
        THEN TRUE
        ELSE FALSE
    END                                                 AS la_ngoai_tru_chua_dong
FROM dat_lich dl
LEFT JOIN nguoigioithieu ngt
    ON dl.nguoigioithieuid = ngt.nguoigioithieuid
LEFT JOIN departmentgroup dg_ngt
    ON ngt.departmentgroupid = dg_ngt.departmentgroupid
LEFT JOIN vienphi_dedup vd
    ON dl.dangkykhamid = vd.dangkykhamid
LEFT JOIN vienphi vp
    ON vd.vienphiid = vp.vienphiid
LEFT JOIN departmentgroup dg_vp
    ON vp.departmentgroupid = dg_vp.departmentgroupid
LEFT JOIN department d_vp
    ON vp.departmentid = d_vp.departmentid
LEFT JOIN bhyt b
    ON vp.bhytid = b.bhytid
LEFT JOIN luot_kham_1_nam lk1n
    ON vp.vienphiid = lk1n.vienphiid
LEFT JOIN hosobenhan hsba
    ON vp.hosobenhanid = hsba.hosobenhanid
LEFT JOIN patient pt
    ON (dl.patientid_old IS NULL OR dl.patientid_old = 0)
    AND pt.patientid = dl.patientid
LEFT JOIN tong_tien_per_dk tpd
    ON dl.dangkykhamid = tpd.dangkykhamid
ORDER BY
    dg_ngt.departmentgroupname  ASC  NULLS LAST,
    ngt.nguoigioithieuname      ASC  NULLS LAST,
    dl.dangkykhamdate           ASC
`;

/**
 * Báo cáo chi tiết đặt lịch + lịch sử khám chữa bệnh 1 năm gần nhất
 *
 * Mở rộng từ chiTietDatLich — mỗi dòng là 1 lượt đặt lịch, bổ sung thêm
 * cột `lichsu_kham` là mảng JSON chứa lịch sử khám 1 năm gần nhất.
 *
 * CHỈ áp dụng với bệnh nhân đã tiếp đón (patientid_old IS NOT NULL).
 * Frontend dùng `lichsu_kham` để phân tích: bệnh mãn tính, bệnh đồng mắc, tần suất tái khám.
 *
 * Kiến trúc: CTE pre-aggregate (1 lần quét vienphi) thay vì LATERAL (N lần)
 * Yêu cầu: index trên vienphi(patientid) + vienphi(vienphidate)
 *
 * @param {string} $1 - fromDate — ngày bắt đầu (YYYY-MM-DD hoặc timestamp)
 * @param {string} $2 - toDate   — ngày kết thúc (YYYY-MM-DD hoặc timestamp)
 *
 * @returns Toàn bộ cột chiTietDatLich, thêm:
 *   - macskcbbd {string | null}: mã cơ sở khám chữa bệnh ban đầu từ BHYT của lượt khám
 *   - ngay_kham_truoc {timestamp | null}: ngày khám thực tế liền trước trong cửa sổ 1 năm
 *   - xutrikhambenhid_lan_truoc {number | null}: xử trí khám bệnh của lần khám liền trước
 *   - hen_kham_lai_tu_lan_truoc {boolean}: true nếu lần khám liền trước có xutrikhambenhid = 3
 *   - co_hen_kham_gan_nhat {boolean}: field chuẩn hóa cho UI/filter/formula, true nếu lần khám gần nhất là hẹn
 *   - ngay_xu_tri_hen_gan_nhat {timestamp | null}: ngày của lần khám gần nhất khi lần đó có xử trí hẹn
 *   - so_ngay_tu_lan_kham_gan_nhat {number | null}: số ngày từ đợt khám hiện tại đến lần khám gần nhất
 *   - lichsu_kham {Array<Object> | null}: mảng JSON lịch sử khám 1 năm, sắp xếp mới nhất trước.
 *       Mỗi phần tử: { vienphidate, chandoanravien, chandoanravien_code,
 *                      chandoanravien_kemtheo, chandoanravien_kemtheo_code,
 *                      xutrikhambenhid }
 *       NULL nếu bệnh nhân chưa tiếp đón hoặc chưa có lịch sử trong 1 năm qua.
 *   Thanh toán:
 *   - tong_tien  {number}  — tổng tiền dịch vụ (0 nếu chưa khám)
 */
qDatLichKham.chiTietDatLich_voiLichSu = `
WITH
-- CTE 1: Lọc dangkykham — tập nhỏ, nền cho toàn bộ query
dat_lich AS (
    SELECT
        dangkykhamid,
        nguoigioithieuid,
        dangkykhamstatus,
        dangkykhaminitdate,
        dangkykhamdate,
        patientid,
        patientid_old
    FROM dangkykham
    WHERE isdangkyquaapi = 1
      AND dangkykhamdate BETWEEN $1 AND $2
      AND (nguoigioithieuid IS NULL OR nguoigioithieuid NOT IN (${EXCLUDED_NGT_IDS}))
      AND (departmentid IS NULL OR departmentid NOT IN (${EXCLUDED_DEPT_IDS}))
),

-- CTE 2: Tập bệnh nhân đã tiếp đón trong báo cáo, dùng lại cho lịch sử 1 năm
cohort_patients AS (
    SELECT DISTINCT patientid_old AS patientid
    FROM dat_lich
    WHERE patientid_old IS NOT NULL AND patientid_old != 0
),

-- CTE 3: Pre-aggregate lịch sử khám 1 năm gần nhất
lichsu_kham AS (
    SELECT
        vp_h.patientid,
        json_agg(
            json_build_object(
                'vienphidate',                 vp_h.vienphidate::text,
                'chandoanravien',              vp_h.chandoanravien,
                'chandoanravien_code',         vp_h.chandoanravien_code,
                'chandoanravien_kemtheo',      vp_h.chandoanravien_kemtheo,
                'chandoanravien_kemtheo_code', vp_h.chandoanravien_kemtheo_code,
                'xutrikhambenhid',             hsba_h.xutrikhambenhid,
                'departmentgroupid',           vp_h.departmentgroupid,
                'departmentgroupname',         dg_h.departmentgroupname,
                'departmentid',                vp_h.departmentid,
                'departmentname',              d_h.departmentname
            ) ORDER BY vp_h.vienphidate DESC
        ) AS lichsu
    FROM vienphi vp_h
    LEFT JOIN hosobenhan hsba_h ON vp_h.hosobenhanid = hsba_h.hosobenhanid
    LEFT JOIN departmentgroup dg_h ON vp_h.departmentgroupid = dg_h.departmentgroupid
    LEFT JOIN department d_h ON vp_h.departmentid = d_h.departmentid
    WHERE vp_h.patientid = ANY(SELECT patientid FROM cohort_patients)
      AND vp_h.vienphidate >= NOW() - INTERVAL '1 year'
    GROUP BY vp_h.patientid
),

-- CTE 4: Chuỗi lượt khám thực tế trong 1 năm để lấy lần khám liền trước
luot_kham_1_nam AS (
    SELECT
        vp_h.patientid,
        vp_h.vienphiid,
        vp_h.vienphidate,
        hsba_h.xutrikhambenhid,
        LAG(vp_h.vienphidate) OVER (
            PARTITION BY vp_h.patientid
            ORDER BY vp_h.vienphidate ASC, vp_h.vienphiid ASC
        ) AS ngay_kham_truoc,
        LAG(hsba_h.xutrikhambenhid) OVER (
            PARTITION BY vp_h.patientid
            ORDER BY vp_h.vienphidate ASC, vp_h.vienphiid ASC
        ) AS xutrikhambenhid_lan_truoc
    FROM vienphi vp_h
    LEFT JOIN hosobenhan hsba_h
        ON vp_h.hosobenhanid = hsba_h.hosobenhanid
    WHERE vp_h.patientid = ANY(SELECT patientid FROM cohort_patients)
      AND vp_h.vienphidate >= NOW() - INTERVAL '1 year'
),

-- CTE 5: Tất cả vienphi matching (1 dangkykhamid có thể → N vienphiid)
all_vienphi AS (
    SELECT
        dl.dangkykhamid,
        vp.vienphiid
    FROM dat_lich dl
    INNER JOIN vienphi vp
        ON  dl.patientid_old        = vp.patientid
        AND DATE(dl.dangkykhamdate) = DATE(vp.vienphidate)
),

-- CTE 6: Chọn 1 vienphi (vienphiid lớn nhất) per dangkykhamid cho clinical data
vienphi_dedup AS (
    SELECT DISTINCT ON (dangkykhamid)
        dangkykhamid,
        vienphiid
    FROM all_vienphi
    ORDER BY dangkykhamid, vienphiid DESC
),

-- CTE 7: Tính tổng tiền TẤT CẢ dịch vụ per vienphiid
tong_tien_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                          COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien
    FROM serviceprice sp
    WHERE sp.vienphiid = ANY(SELECT DISTINCT vienphiid FROM all_vienphi)
    GROUP BY sp.vienphiid
),

-- CTE 8: Tính tổng tiền DỊCH VỤ (chỉ bhyt_groupcode hợp lệ)
tong_tien_dichvu_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                          COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien_dichvu
    FROM serviceprice sp
    WHERE sp.bhyt_groupcode IN (${BHYT_GROUPCODES})
      AND sp.vienphiid = ANY(SELECT DISTINCT vienphiid FROM all_vienphi)
    GROUP BY sp.vienphiid
),

-- CTE 9: Gộp tổng tiền per dangkykhamid (SUM tất cả vienphi cùng ngày)
tong_tien_per_dk AS (
    SELECT
        av.dangkykhamid,
        COALESCE(SUM(tt.tong_tien), 0) AS tong_tien,
        COALESCE(SUM(ttdv.tong_tien_dichvu), 0) AS tong_tien_dichvu
    FROM all_vienphi av
    LEFT JOIN tong_tien_vienphiid tt ON av.vienphiid = tt.vienphiid
    LEFT JOIN tong_tien_dichvu_vienphiid ttdv ON av.vienphiid = ttdv.vienphiid
    GROUP BY av.dangkykhamid
)

SELECT
    -- Người giới thiệu
    dl.nguoigioithieuid,
    COALESCE(ngt.nguoigioithieucode, 'N/A')            AS ma_ngt,
    COALESCE(ngt.nguoigioithieuname, 'Không xác định') AS ten_ngt,
    ngt.nguoigioithieuphone                             AS dien_thoai,
    dg_ngt.departmentgroupid                            AS ngt_departmentgroupid,
    dg_ngt.departmentgroupname                          AS ngt_departmentgroupname,

    -- Đặt lịch
    dl.dangkykhamid,
    dl.dangkykhaminitdate,
    dl.dangkykhamdate,
    dl.dangkykhamstatus,
    dl.patientid_old,
    dl.patientid,

    -- Viện phí (NULL nếu không khám) — lấy từ vienphi_dedup (1:1)
    vp.vienphiid,
    vp.vienphidate,
    vp.chandoanravien,
    vp.chandoanravien_code,
    vp.chandoanravien_kemtheo,
    vp.chandoanravien_kemtheo_code,
    dg_vp.departmentgroupid                             AS vp_departmentgroupid,
    dg_vp.departmentgroupname                           AS vp_departmentgroupname,
    vp.departmentid                                     AS vp_departmentid,
    d_vp.departmentname                                 AS vp_departmentname,
    b.macskcbbd                                         AS macskcbbd,
    lk1n.ngay_kham_truoc,
    lk1n.xutrikhambenhid_lan_truoc,
    COALESCE(lk1n.xutrikhambenhid_lan_truoc = 3, FALSE) AS hen_kham_lai_tu_lan_truoc,
    COALESCE(lk1n.xutrikhambenhid_lan_truoc = 3, FALSE) AS co_hen_kham_gan_nhat,
    CASE
        WHEN lk1n.xutrikhambenhid_lan_truoc = 3 THEN lk1n.ngay_kham_truoc
        ELSE NULL
    END                                                 AS ngay_xu_tri_hen_gan_nhat,
    CASE
        WHEN lk1n.ngay_kham_truoc IS NOT NULL AND vp.vienphidate IS NOT NULL
            THEN DATE(vp.vienphidate) - DATE(lk1n.ngay_kham_truoc)
        ELSE NULL
    END                                                 AS so_ngay_tu_lan_kham_gan_nhat,

    -- Hành chính bệnh nhân (ưu tiên hosobenhan, fallback sang patient)
    hsba.hosobenhanid,
    hsba.hosobenhancode,
    hsba.hosobenhanstatus,
    hsba.loaibenhanid,
    hsba.hinhthucvaovienid,
    COALESCE(hsba.patientname,   pt.patientname)   AS patientname,
    COALESCE(hsba.birthday,      pt.birthday)      AS birthday,
    COALESCE(hsba.gioitinhname,  pt.gioitinhcode)  AS gioitinhname,
    COALESCE(hsba.hc_xaname,     pt.hc_xacode)    AS hc_xaname,
    COALESCE(hsba.hc_huyenname,  pt.hc_huyencode) AS hc_huyenname,
    COALESCE(hsba.hc_tinhname,   pt.hc_tinhcode)  AS hc_tinhname,

    -- Tổng tiền (SUM tất cả vienphi cùng ngày, 0 nếu chưa khám)
    COALESCE(tpd.tong_tien, 0)                          AS tong_tien,
    COALESCE(tpd.tong_tien_dichvu, 0)                   AS tong_tien_dichvu,
    CASE
        WHEN dl.dangkykhamstatus = 1
         AND COALESCE(tpd.tong_tien, 0) > 0
         AND COALESCE(hsba.hinhthucvaovienid, 0) <= 0
         AND COALESCE(hsba.hosobenhanstatus, 0) <= 0
        THEN TRUE
        ELSE FALSE
    END                                                 AS la_ngoai_tru_chua_dong,

    -- Lịch sử khám 1 năm gần nhất (JSON, mảng sắp xếp mới nhất trước)
    lsh.lichsu                                          AS lichsu_kham

FROM dat_lich dl
LEFT JOIN nguoigioithieu ngt
    ON dl.nguoigioithieuid = ngt.nguoigioithieuid
LEFT JOIN departmentgroup dg_ngt
    ON ngt.departmentgroupid = dg_ngt.departmentgroupid
-- Viện phí: JOIN qua vienphi_dedup (1:1) thay vì trực tiếp (1:N)
LEFT JOIN vienphi_dedup vd
    ON dl.dangkykhamid = vd.dangkykhamid
LEFT JOIN vienphi vp
    ON vd.vienphiid = vp.vienphiid
LEFT JOIN departmentgroup dg_vp
    ON vp.departmentgroupid = dg_vp.departmentgroupid
LEFT JOIN department d_vp
    ON vp.departmentid = d_vp.departmentid
LEFT JOIN bhyt b
    ON vp.bhytid = b.bhytid
LEFT JOIN luot_kham_1_nam lk1n
    ON vp.vienphiid = lk1n.vienphiid
LEFT JOIN hosobenhan hsba
    ON vp.hosobenhanid = hsba.hosobenhanid
LEFT JOIN patient pt
    ON (dl.patientid_old IS NULL OR dl.patientid_old = 0)
    AND pt.patientid = dl.patientid
-- Tổng tiền: JOIN 1:1 per dangkykhamid
LEFT JOIN tong_tien_per_dk tpd
    ON dl.dangkykhamid = tpd.dangkykhamid
-- Lịch sử: chỉ join khi đã tiếp đón (patientid_old IS NOT NULL và != 0)
LEFT JOIN lichsu_kham lsh
    ON dl.patientid_old = lsh.patientid

ORDER BY
    dg_ngt.departmentgroupname  ASC  NULLS LAST,
    ngt.nguoigioithieuname      ASC  NULLS LAST,
    dl.dangkykhamdate           ASC
`;

/**
 * Query test chiTietDatLich_voiLichSu — copy và chạy trực tiếp trên pgAdmin / psql
 * Thay đổi from_date / to_date trong phần params nếu cần test khoảng khác
 */
qDatLichKham.chiTietDatLich_voiLichSu_test = `
WITH
params AS (
    SELECT
        '2024-01-01 00:00:00'::timestamp AS from_date,
        '2024-01-31 23:59:59'::timestamp AS to_date
),
dat_lich AS (
    SELECT
        dl.dangkykhamid,
        dl.nguoigioithieuid,
        dl.dangkykhamstatus,
        dl.dangkykhaminitdate,
        dl.dangkykhamdate,
        dl.patientid,
        dl.patientid_old
    FROM dangkykham dl, params p
    WHERE dl.isdangkyquaapi = 1
      AND dl.dangkykhamdate BETWEEN p.from_date AND p.to_date
      AND (dl.nguoigioithieuid IS NULL OR dl.nguoigioithieuid NOT IN (${EXCLUDED_NGT_IDS}))
      AND (dl.departmentid IS NULL OR dl.departmentid NOT IN (${EXCLUDED_DEPT_IDS}))
),
cohort_patients AS (
    SELECT DISTINCT patientid_old AS patientid
    FROM dat_lich
    WHERE patientid_old IS NOT NULL AND patientid_old != 0
),
lichsu_kham AS (
    SELECT
        vp_h.patientid,
        json_agg(
            json_build_object(
                'vienphidate',                 vp_h.vienphidate::text,
                'chandoanravien',              vp_h.chandoanravien,
                'chandoanravien_code',         vp_h.chandoanravien_code,
                'chandoanravien_kemtheo',      vp_h.chandoanravien_kemtheo,
                'chandoanravien_kemtheo_code', vp_h.chandoanravien_kemtheo_code,
                'xutrikhambenhid',             hsba_h.xutrikhambenhid,
                'departmentgroupid',           vp_h.departmentgroupid,
                'departmentgroupname',         dg_h.departmentgroupname,
                'departmentid',                vp_h.departmentid,
                'departmentname',              d_h.departmentname
            ) ORDER BY vp_h.vienphidate DESC
        ) AS lichsu
    FROM vienphi vp_h
    LEFT JOIN hosobenhan hsba_h ON vp_h.hosobenhanid = hsba_h.hosobenhanid
    LEFT JOIN departmentgroup dg_h ON vp_h.departmentgroupid = dg_h.departmentgroupid
    LEFT JOIN department d_h ON vp_h.departmentid = d_h.departmentid
    WHERE vp_h.patientid = ANY(SELECT patientid FROM cohort_patients)
      AND vp_h.vienphidate >= NOW() - INTERVAL '1 year'
    GROUP BY vp_h.patientid
),
luot_kham_1_nam AS (
    SELECT
        vp_h.patientid,
        vp_h.vienphiid,
        vp_h.vienphidate,
        hsba_h.xutrikhambenhid,
        LAG(vp_h.vienphidate) OVER (
            PARTITION BY vp_h.patientid
            ORDER BY vp_h.vienphidate ASC, vp_h.vienphiid ASC
        ) AS ngay_kham_truoc,
        LAG(hsba_h.xutrikhambenhid) OVER (
            PARTITION BY vp_h.patientid
            ORDER BY vp_h.vienphidate ASC, vp_h.vienphiid ASC
        ) AS xutrikhambenhid_lan_truoc
    FROM vienphi vp_h
    LEFT JOIN hosobenhan hsba_h
        ON vp_h.hosobenhanid = hsba_h.hosobenhanid
    WHERE vp_h.patientid = ANY(SELECT patientid FROM cohort_patients)
      AND vp_h.vienphidate >= NOW() - INTERVAL '1 year'
),
all_vienphi AS (
    SELECT
        dl.dangkykhamid,
        vp.vienphiid
    FROM dat_lich dl
    INNER JOIN vienphi vp
        ON  dl.patientid_old        = vp.patientid
        AND DATE(dl.dangkykhamdate) = DATE(vp.vienphidate)
),
vienphi_dedup AS (
    SELECT DISTINCT ON (dangkykhamid)
        dangkykhamid,
        vienphiid
    FROM all_vienphi
    ORDER BY dangkykhamid, vienphiid DESC
),
tong_tien_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                          COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien
    FROM serviceprice sp
    WHERE sp.vienphiid = ANY(SELECT DISTINCT vienphiid FROM all_vienphi)
    GROUP BY sp.vienphiid
),
tong_tien_dichvu_vienphiid AS (
    SELECT
        sp.vienphiid,
        SUM(
            CASE
                WHEN sp.loaidoituong = 0 THEN COALESCE(sp.servicepricemoney_bhyt, 0)    * COALESCE(sp.soluong, 0)
                WHEN sp.loaidoituong = 1 THEN COALESCE(sp.servicepricemoney_nhandan, 0) * COALESCE(sp.soluong, 0)
                ELSE                          COALESCE(sp.servicepricemoney, 0)          * COALESCE(sp.soluong, 0)
            END
        ) AS tong_tien_dichvu
    FROM serviceprice sp
    WHERE sp.bhyt_groupcode IN (${BHYT_GROUPCODES})
      AND sp.vienphiid = ANY(SELECT DISTINCT vienphiid FROM all_vienphi)
    GROUP BY sp.vienphiid
),
tong_tien_per_dk AS (
    SELECT
        av.dangkykhamid,
        COALESCE(SUM(tt.tong_tien), 0) AS tong_tien,
        COALESCE(SUM(ttdv.tong_tien_dichvu), 0) AS tong_tien_dichvu
    FROM all_vienphi av
    LEFT JOIN tong_tien_vienphiid tt ON av.vienphiid = tt.vienphiid
    LEFT JOIN tong_tien_dichvu_vienphiid ttdv ON av.vienphiid = ttdv.vienphiid
    GROUP BY av.dangkykhamid
)

SELECT
    dl.nguoigioithieuid,
    COALESCE(ngt.nguoigioithieucode, 'N/A')            AS ma_ngt,
    COALESCE(ngt.nguoigioithieuname, 'Không xác định') AS ten_ngt,
    ngt.nguoigioithieuphone                             AS dien_thoai,
    dg_ngt.departmentgroupid                            AS ngt_departmentgroupid,
    dg_ngt.departmentgroupname                          AS ngt_departmentgroupname,
    dl.dangkykhamid,
    dl.dangkykhaminitdate,
    dl.dangkykhamdate,
    dl.dangkykhamstatus,
    dl.patientid_old,
    dl.patientid,
    vp.vienphiid,
    vp.vienphidate,
    vp.chandoanravien,
    vp.chandoanravien_code,
    vp.chandoanravien_kemtheo,
    vp.chandoanravien_kemtheo_code,
    dg_vp.departmentgroupid                             AS vp_departmentgroupid,
    dg_vp.departmentgroupname                           AS vp_departmentgroupname,
    vp.departmentid                                     AS vp_departmentid,
    d_vp.departmentname                                 AS vp_departmentname,
    b.macskcbbd                                         AS macskcbbd,
    lk1n.ngay_kham_truoc,
    lk1n.xutrikhambenhid_lan_truoc,
    COALESCE(lk1n.xutrikhambenhid_lan_truoc = 3, FALSE) AS hen_kham_lai_tu_lan_truoc,
    COALESCE(lk1n.xutrikhambenhid_lan_truoc = 3, FALSE) AS co_hen_kham_gan_nhat,
    CASE
        WHEN lk1n.xutrikhambenhid_lan_truoc = 3 THEN lk1n.ngay_kham_truoc
        ELSE NULL
    END                                                 AS ngay_xu_tri_hen_gan_nhat,
    CASE
        WHEN lk1n.ngay_kham_truoc IS NOT NULL AND vp.vienphidate IS NOT NULL
            THEN DATE(vp.vienphidate) - DATE(lk1n.ngay_kham_truoc)
        ELSE NULL
    END                                                 AS so_ngay_tu_lan_kham_gan_nhat,
    hsba.hosobenhanid,
    hsba.hosobenhancode,
    hsba.hosobenhanstatus,
    hsba.loaibenhanid,
    hsba.hinhthucvaovienid,
    COALESCE(hsba.patientname,   pt.patientname)   AS patientname,
    COALESCE(hsba.birthday,      pt.birthday)      AS birthday,
    COALESCE(hsba.gioitinhname,  pt.gioitinhcode)  AS gioitinhname,
    COALESCE(hsba.hc_xaname,     pt.hc_xacode)    AS hc_xaname,
    COALESCE(hsba.hc_huyenname,  pt.hc_huyencode) AS hc_huyenname,
    COALESCE(hsba.hc_tinhname,   pt.hc_tinhcode)  AS hc_tinhname,
    COALESCE(tpd.tong_tien, 0)                          AS tong_tien,
    COALESCE(tpd.tong_tien_dichvu, 0)                   AS tong_tien_dichvu,
    CASE
        WHEN dl.dangkykhamstatus = 1
         AND COALESCE(tpd.tong_tien, 0) > 0
         AND COALESCE(hsba.hinhthucvaovienid, 0) <= 0
         AND COALESCE(hsba.hosobenhanstatus, 0) <= 0
        THEN TRUE
        ELSE FALSE
    END                                                 AS la_ngoai_tru_chua_dong,
    lsh.lichsu                                          AS lichsu_kham
FROM dat_lich dl
LEFT JOIN nguoigioithieu ngt
    ON dl.nguoigioithieuid = ngt.nguoigioithieuid
LEFT JOIN departmentgroup dg_ngt
    ON ngt.departmentgroupid = dg_ngt.departmentgroupid
LEFT JOIN vienphi_dedup vd
    ON dl.dangkykhamid = vd.dangkykhamid
LEFT JOIN vienphi vp
    ON vd.vienphiid = vp.vienphiid
LEFT JOIN departmentgroup dg_vp
    ON vp.departmentgroupid = dg_vp.departmentgroupid
LEFT JOIN department d_vp
    ON vp.departmentid = d_vp.departmentid
LEFT JOIN bhyt b
    ON vp.bhytid = b.bhytid
LEFT JOIN luot_kham_1_nam lk1n
    ON vp.vienphiid = lk1n.vienphiid
LEFT JOIN hosobenhan hsba
    ON vp.hosobenhanid = hsba.hosobenhanid
LEFT JOIN patient pt
    ON (dl.patientid_old IS NULL OR dl.patientid_old = 0)
    AND pt.patientid = dl.patientid
LEFT JOIN tong_tien_per_dk tpd
    ON dl.dangkykhamid = tpd.dangkykhamid
LEFT JOIN lichsu_kham lsh
    ON dl.patientid_old = lsh.patientid
ORDER BY
    dg_ngt.departmentgroupname  ASC  NULLS LAST,
    ngt.nguoigioithieuname      ASC  NULLS LAST,
    dl.dangkykhamdate           ASC
`;

module.exports = qDatLichKham;
