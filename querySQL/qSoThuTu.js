/**
 * @fileoverview Các truy vấn SQL để thống kê và phân tích số thứ tự phòng khám, mẫu bệnh phẩm
 * @module querySQL/qSoThuTu
 * @description Các truy vấn SQL để lấy thông tin về số thứ tự bệnh nhân, mẫu bệnh phẩm theo từng phòng ban
 * @requires module:postgres-pool
 */

const qSoThuTu = {}

/**
 * Truy vấn thống kê mẫu bệnh phẩm theo phòng thực hiện (chẩn đoán hình ảnh, thăm dò chức năng)
 * @param {Date} $1 - Ngày thống kê (format: 'YYYY-MM-DD')
 * @param {Array<number>} $2 - Mảng ID phòng ban cần thống kê
 * @returns {Array<Object>} Kết quả thống kê mẫu bệnh phẩm theo từng phòng ban
 * 
 * @property {string} departmentname - Tên phòng ban
 * @property {number} departmentid - ID phòng ban
 * @property {number} tong_mau_benh_pham - Tổng số mẫu bệnh phẩm
 * @property {number} tong_benh_nhan - Tổng số bệnh nhân duy nhất
 * @property {number} so_ca_chua_thuc_hien - Số mẫu bệnh phẩm chưa thực hiện
 * @property {number} so_ca_da_thuc_hien_cho_ket_qua - Số mẫu đã thực hiện, đang chờ kết quả
 * @property {number} so_ca_da_tra_ket_qua - Số mẫu đã trả kết quả
 * @property {number} max_sothutunumber_da_thuc_hien - Số thứ tự lớn nhất đã thực hiện
 * @property {number} max_sothutunumber - Số thứ tự lớn nhất (cả chưa thực hiện)
 * @property {number} latest_sothutunumber_da_thuc_hien - Số thứ tự đã thực hiện gần đây nhất
 * @property {number} sothutunumber_du_kien_tiep_theo - Số thứ tự dự kiến cần thực hiện tiếp theo
 */
qSoThuTu.getByDateAndDepartments_Type_7 = `
WITH filtered_data AS (
    SELECT 
        m.*,
        ROW_NUMBER() OVER (PARTITION BY m.departmentid_des ORDER BY m.maubenhphamdate_thuchien DESC) AS rn_processed
    FROM 
        maubenhpham m
    WHERE 
        (m.isdeleted = 0 OR m.isdeleted IS NULL)
        AND m.maubenhphamdate::date = $1
         AND m.maubenhphamdate > '2025-11-07'::date  -- ✅ THÊM DÒNG NÀY (partial index filter)
        AND m.departmentid_des = ANY($2::int[])
),
latest_processed AS (
    SELECT 
        departmentid_des,
        sothutunumber
    FROM 
        filtered_data
    WHERE 
        maubenhphamstatus IN (2, 16)
        AND maubenhphamdate_thuchien IS NOT NULL
        AND rn_processed = 1
),
dept_stats AS (
    SELECT
        fd.departmentid_des,
        d.departmentname,
        COUNT(fd.maubenhphamid) AS tong_mau_benh_pham,
        COUNT(DISTINCT fd.patientid) AS tong_benh_nhan,
        COUNT(CASE WHEN fd.maubenhphamstatus = 1 THEN 1 END) AS so_ca_chua_thuc_hien,
        COUNT(CASE WHEN fd.maubenhphamstatus = 16 THEN 1 END) AS so_ca_da_thuc_hien_cho_ket_qua,
        COUNT(CASE WHEN fd.maubenhphamstatus = 2 THEN 1 END) AS so_ca_da_tra_ket_qua,
        MAX(CASE WHEN fd.maubenhphamstatus IN (2, 16) THEN fd.sothutunumber ELSE NULL END) AS max_sothutunumber_da_thuc_hien,
        MAX(fd.sothutunumber) AS max_sothutunumber,
        lp.sothutunumber AS latest_sothutunumber_da_thuc_hien,
        MIN(CASE WHEN fd.maubenhphamstatus = 1 THEN fd.sothutunumber ELSE NULL END) AS min_unprocessed_number,
        MIN(CASE WHEN fd.maubenhphamstatus = 1 AND fd.sothutunumber > COALESCE(lp.sothutunumber, 0) THEN fd.sothutunumber ELSE NULL END) AS next_after_latest_number
    FROM
        filtered_data fd
    LEFT JOIN
        department d ON fd.departmentid_des = d.departmentid
    LEFT JOIN
        latest_processed lp ON fd.departmentid_des = lp.departmentid_des
    GROUP BY
        fd.departmentid_des, d.departmentname, lp.sothutunumber
)
SELECT 
    departmentname, 
    departmentid_des AS departmentid,
    tong_mau_benh_pham,
    tong_benh_nhan,
    so_ca_chua_thuc_hien,
    so_ca_da_thuc_hien_cho_ket_qua,
    so_ca_da_tra_ket_qua,
    max_sothutunumber_da_thuc_hien,
    max_sothutunumber,
    latest_sothutunumber_da_thuc_hien,
    CASE 
        WHEN so_ca_chua_thuc_hien = 0 THEN NULL
        ELSE 
            COALESCE(
                next_after_latest_number,
                min_unprocessed_number
            )
    END AS sothutunumber_du_kien_tiep_theo
FROM 
    dept_stats
ORDER BY 
    departmentname
`

/**
 * Truy vấn thống kê mẫu bệnh phẩm theo phòng lấy mẫu (xét nghiệm)
 * @param {Date} $1 - Ngày thống kê (format: 'YYYY-MM-DD')
 * @param {Array<number>} $2 - Mảng ID phòng ban cần thống kê
 * @returns {Array<Object>} Kết quả thống kê mẫu bệnh phẩm theo từng phòng ban
 * 
 * @property {string} departmentname - Tên phòng ban
 * @property {number} departmentid - ID phòng ban
 * @property {number} tong_mau_benh_pham - Tổng số mẫu bệnh phẩm
 * @property {number} tong_benh_nhan - Tổng số bệnh nhân duy nhất
 * @property {number} so_ca_chua_lay_mau - Số ca chưa lấy mẫu
 * @property {number} so_ca_da_lay_mau - Số ca đã lấy mẫu
 * @property {number} so_benh_nhan_da_lay_mau - Số bệnh nhân đã lấy mẫu
 * @property {number} so_benh_nhan_chua_lay_mau - Số bệnh nhân chưa lấy mẫu
 * @property {number} so_ca_chua_thuc_hien - Số mẫu bệnh phẩm chưa thực hiện
 * @property {number} so_ca_da_thuc_hien_cho_ket_qua - Số mẫu đã thực hiện, đang chờ kết quả
 * @property {number} so_ca_da_tra_ket_qua - Số mẫu đã trả kết quả
 * @property {number} max_sothutunumber_da_lay_mau - Số thứ tự lớn nhất đã lấy mẫu
 * @property {number} max_sothutunumber - Số thứ tự lớn nhất (cả chưa lấy mẫu)
 * @property {number} latest_sothutunumber_da_lay_mau - Số thứ tự lấy mẫu gần đây nhất
 * @property {number} sothutunumber_du_kien_tiep_theo - Số thứ tự dự kiến cần lấy mẫu tiếp theo
 */
qSoThuTu.getByDateAndDepartments_Type_38 = `
WITH filtered_data AS (
    SELECT 
        m.*,
        ROW_NUMBER() OVER (PARTITION BY m.departmentid_laymau ORDER BY m.maubenhphamdate_laymau DESC) AS rn_processed
    FROM 
        maubenhpham m
    WHERE 
        (m.isdeleted = 0 OR m.isdeleted IS NULL)
        AND m.maubenhphamdate::date = $1
        AND m.maubenhphamdate > '2025-11-07'::date  -- ✅ THÊM DÒNG NÀY (partial index filter)
        AND m.departmentid_laymau = ANY($2::int[])
),
latest_processed AS (
    SELECT 
        departmentid_laymau,
        sothutunumber_laymau
    FROM 
        filtered_data
    WHERE 
        maubenhphamstatus_laymau = 2
        AND maubenhphamdate_laymau IS NOT NULL
        AND rn_processed = 1
),
dept_stats AS (
    SELECT
        fd.departmentid_laymau,
        d.departmentname,
        COUNT(fd.maubenhphamid) AS tong_mau_benh_pham,
        COUNT(DISTINCT fd.patientid) AS tong_benh_nhan,
        
        COUNT(CASE WHEN fd.maubenhphamstatus_laymau = 1 THEN 1 END) AS so_ca_chua_lay_mau,
        COUNT(CASE WHEN fd.maubenhphamstatus_laymau = 2 THEN 1 END) AS so_ca_da_lay_mau,
        
        COUNT(DISTINCT CASE WHEN fd.maubenhphamstatus_laymau = 2 THEN fd.patientid END) AS so_benh_nhan_da_lay_mau,
        (COUNT(DISTINCT fd.patientid) - COUNT(DISTINCT CASE WHEN fd.maubenhphamstatus_laymau = 2 THEN fd.patientid END)) AS so_benh_nhan_chua_lay_mau,
         
        COUNT(CASE WHEN fd.maubenhphamstatus = 1 THEN 1 END) AS so_ca_chua_thuc_hien,
        COUNT(CASE WHEN fd.maubenhphamstatus = 16 THEN 1 END) AS so_ca_da_thuc_hien_cho_ket_qua,
        COUNT(CASE WHEN fd.maubenhphamstatus = 2 THEN 1 END) AS so_ca_da_tra_ket_qua,
        MAX(CASE WHEN fd.maubenhphamstatus_laymau = 2 THEN fd.sothutunumber_laymau ELSE NULL END) AS max_sothutunumber_da_lay_mau,
        MAX(fd.sothutunumber_laymau) AS max_sothutunumber,
        lp.sothutunumber_laymau AS latest_sothutunumber_da_lay_mau,
        MIN(CASE WHEN fd.maubenhphamstatus_laymau = 1 THEN fd.sothutunumber_laymau ELSE NULL END) AS min_unprocessed_number,
        MIN(CASE WHEN fd.maubenhphamstatus_laymau = 1 AND fd.sothutunumber_laymau > COALESCE(lp.sothutunumber_laymau, 0) THEN fd.sothutunumber_laymau ELSE NULL END) AS next_after_latest_number
    FROM
        filtered_data fd
    LEFT JOIN
        department d ON fd.departmentid_laymau = d.departmentid
    LEFT JOIN
        latest_processed lp ON fd.departmentid_laymau = lp.departmentid_laymau
    GROUP BY
        fd.departmentid_laymau, d.departmentname, lp.sothutunumber_laymau
)
SELECT 
    departmentname, 
    departmentid_laymau AS departmentid,
    tong_mau_benh_pham,
    tong_benh_nhan,
    
    so_ca_chua_lay_mau,
    so_ca_da_lay_mau,
    
    so_benh_nhan_da_lay_mau,
    so_benh_nhan_chua_lay_mau,
     
    so_ca_chua_thuc_hien,
    so_ca_da_thuc_hien_cho_ket_qua,
    so_ca_da_tra_ket_qua,
    max_sothutunumber_da_lay_mau,
    max_sothutunumber,
    latest_sothutunumber_da_lay_mau,
    CASE 
        WHEN so_ca_chua_lay_mau = 0 THEN NULL
        ELSE 
            COALESCE(
                next_after_latest_number,
                min_unprocessed_number
            )
    END AS sothutunumber_du_kien_tiep_theo
FROM 
    dept_stats
ORDER BY 
    departmentname
`

/**
 * Truy vấn thống kê số thứ tự phòng khám
 * @param {Date} $1 - Ngày thống kê (format: 'YYYY-MM-DD')
 * @param {Array<number>} $2 - Mảng ID phòng ban cần thống kê
 * @returns {Array<Object>} Kết quả thống kê số thứ tự phòng khám theo từng phòng ban
 * 
 * @property {string} departmentname - Tên phòng ban
 * @property {number} departmentid - ID phòng ban
 * @property {number} tong_benh_nhan - Tổng số bệnh nhân
 * @property {number} so_benh_nhan_chua_kham - Số bệnh nhân chưa khám
 * @property {number} so_benh_nhan_da_kham - Số bệnh nhân đã khám
 * @property {number} so_benh_nhan_kham_xong - Số bệnh nhân đã khám xong
 * @property {number} max_sothutunumber - Số thứ tự lớn nhất (cả chưa khám)
 * @property {number} max_sothutunumber_da_kham - Số thứ tự lớn nhất đã khám
 * @property {number} latest_benh_nhan_da_kham - Số thứ tự bệnh nhân được khám gần đây nhất
 * @property {number} sothutunumber_du_kien_tiep_theo - Số thứ tự dự kiến cần khám tiếp theo
 */
qSoThuTu.getByDateAndDepartments_Type_2 = `
WITH filtered_data AS (
    SELECT 
        s.*,
        ROW_NUMBER() OVER (PARTITION BY s.departmentid ORDER BY s.sothutudate_start DESC) AS rn_processed
    FROM 
        sothutuphongkham s
    WHERE 
        (s.isremoved = 0 OR s.isremoved IS NULL)
        AND CAST(s.sothutudate AS date) = $1
         AND s.sothutudate > '2025-11-07'::date  -- ✅ THÊM DÒNG NÀY (partial index filter)
        AND s.departmentid = ANY($2::int[])
),
latest_processed AS (
    SELECT 
        departmentid,
        sothutunumber
    FROM 
        filtered_data
    WHERE 
        sothutustatus IN (1, 2, 4)
        AND sothutudate_start IS NOT NULL
        AND rn_processed = 1
),
dept_stats AS (
    SELECT
        fd.departmentid,
        d.departmentname, 
        COUNT(fd.sothutuid) AS tong_benh_nhan,
        COUNT(CASE WHEN fd.sothutustatus = 0 THEN 1 END) AS so_benh_nhan_chua_kham,
        COUNT(CASE WHEN fd.sothutustatus IN (1, 2) THEN 1 END) AS so_benh_nhan_da_kham,
        COUNT(CASE WHEN fd.sothutustatus = 4 THEN 1 END) AS so_benh_nhan_kham_xong,
        MAX(fd.sothutunumber) AS max_sothutunumber,
        MAX(CASE WHEN fd.sothutustatus IN (1, 2, 4) THEN fd.sothutunumber ELSE NULL END) AS max_sothutunumber_da_kham,
        lp.sothutunumber AS latest_benh_nhan_da_kham,
        MIN(CASE WHEN fd.sothutustatus = 0 THEN fd.sothutunumber ELSE NULL END) AS min_unprocessed_number,
        MIN(CASE WHEN fd.sothutustatus = 0 AND fd.sothutunumber > COALESCE(lp.sothutunumber, 0) THEN fd.sothutunumber ELSE NULL END) AS next_after_latest_number
    FROM
        filtered_data fd
    LEFT JOIN
        department d ON fd.departmentid = d.departmentid
    LEFT JOIN
        latest_processed lp ON fd.departmentid = lp.departmentid
    GROUP BY
        fd.departmentid, d.departmentname, lp.sothutunumber
)
SELECT 
    departmentname, 
    departmentid,
    tong_benh_nhan,
    so_benh_nhan_chua_kham,
    so_benh_nhan_da_kham,
    so_benh_nhan_kham_xong,
    max_sothutunumber,
    max_sothutunumber_da_kham,
    latest_benh_nhan_da_kham,
    CASE 
        WHEN so_benh_nhan_chua_kham = 0 THEN NULL
        ELSE 
            COALESCE(
                next_after_latest_number,
                min_unprocessed_number
            )
    END AS sothutunumber_du_kien_tiep_theo
FROM 
    dept_stats
ORDER BY 
    departmentname
`
/**
 * Truy vấn thống kê bệnh nhân nội trú theo phòng ban
 * @param {Date} $1 - Ngày thống kê (format: 'YYYY-MM-DD')
 * @param {Array<number>} $2 - Mảng ID phòng ban cần thống kê
 * @returns {Array<Object>} Kết quả thống kê bệnh nhân theo từng phòng ban
 * 
 * @property {number} departmentid - ID phòng ban
 * @property {string} departmentname - Tên phòng ban
 * @property {number} departmentgroupid - ID nhóm phòng ban
 * @property {string} departmentgroupname - Tên nhóm phòng ban
 * @property {number} bhyt_count - Số bệnh nhân BHYT
 * @property {number} vienphi_count - Số bệnh nhân viện phí
 * @property {number} yeucau_count - Số bệnh nhân yêu cầu
 * @property {number} total_count - Tổng số bệnh nhân
 * @property {number} dang_dieu_tri - Số bệnh nhân đang điều trị
 * @property {number} dieu_tri_ket_hop - Số bệnh nhân đang điều trị kết hợp
 * @property {number} doi_nhap_khoa - Số bệnh nhân đang đợi nhập khoa * @property {number} chuyen_khoa_den - Số bệnh nhân từ khoa khác chuyển đến
 * @property {number} chuyen_dieu_tri_ket_hop_den - Số bệnh nhân từ khoa khác chuyển điều trị kết hợp
 * @property {number} benh_nhan_chuyen_khoa - Số bệnh nhân chuyển khoa đi (đã kết thúc)
 * @property {number} benh_nhan_ra_vien - Số bệnh nhân đã ra viện
 */
qSoThuTu.getByDateAndDepartments_Type_3 = `
SELECT 
    d.departmentid,
    d.departmentname,
    d.departmentgroupid,
    dg.departmentgroupname,
    dg.departmentgroupname || ' : ' || d.departmentname AS TenKhoa, 
    COUNT(CASE WHEN mr.doituongbenhnhanid = 1 and mr.medicalrecordstatus <> 99 THEN 1 END) AS bhyt_count,
    COUNT(CASE WHEN mr.doituongbenhnhanid = 2 and mr.medicalrecordstatus <> 99 THEN 1 END) AS vienphi_count,
    COUNT(CASE WHEN mr.doituongbenhnhanid = 3 and mr.medicalrecordstatus <> 99 THEN 1 END) AS yeucau_count,
    COUNT(Case when  mr.medicalrecordstatus <> 99 THEN 1 END) AS total_count,
    COUNT(CASE WHEN mr.medicalrecordstatus = 2 THEN 1 END) AS dang_dieu_tri,
    COUNT(CASE WHEN mr.medicalrecordstatus in (4,5,7) THEN 1 END) AS dieu_tri_ket_hop_di,
    COUNT(CASE WHEN mr.medicalrecordstatus = 0 THEN 1 END) AS doi_nhap_khoa,
    COUNT(CASE WHEN mr.medicalrecordstatus = 2 AND mr.hinhthucvaovienid = 2 THEN 1 END) AS chuyen_khoa_den,
    COUNT(CASE WHEN mr.medicalrecordstatus in (2) AND mr.hinhthucvaovienid = 3 THEN 1 END) AS chuyen_dieu_tri_ket_hop_den,
    COUNT(CASE WHEN mr.medicalrecordstatus = 99 AND mr.hinhthucravienid = 8 AND mr.thoigianravien::date = $1 THEN 1 END) AS benh_nhan_chuyen_khoa,
    COUNT(CASE WHEN mr.medicalrecordstatus = 99 AND mr.hinhthucravienid in (1,2,3,4,5,6,7) AND mr.thoigianravien::date = $1 THEN 1 END) AS benh_nhan_ra_vien
FROM department d
JOIN departmentgroup dg ON d.departmentgroupid = dg.departmentgroupid
LEFT JOIN medicalrecord mr ON mr.departmentid = d.departmentid
WHERE d.departmenttype = 3
    AND d.departmentid = ANY($2::int[])
    AND ((mr.medicalrecordstatus <> 99 AND mr.thoigianvaovien::date > CURRENT_DATE - INTERVAL '60 days')
         OR (mr.medicalrecordstatus = 99 AND mr.thoigianravien::date = $1))
    
GROUP BY 
    d.departmentid,
    d.departmentname,
    d.departmentgroupid,
    dg.departmentgroupname
ORDER BY 
    d.departmentname
`;
module.exports = qSoThuTu;