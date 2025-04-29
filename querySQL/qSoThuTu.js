const qSoThuTu = {}
//$1: date, $2: array of departmentids
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

//$1: date, $2: array of departmentids
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

//$1: date, $2: array of departmentids
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

module.exports = qSoThuTu;