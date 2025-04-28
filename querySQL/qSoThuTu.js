const qSoThuTu = {}
//$1: date, $2: array of departmentids
qSoThuTu.getByDateAndDepartments_Type_7 = `
SELECT 
    d.departmentname, 
    m.departmentid_des AS departmentid,
    COUNT(m.maubenhphamid) AS tong_mau_benh_pham,
    COUNT(DISTINCT m.patientid) AS tong_benh_nhan,
    COUNT(CASE WHEN m.maubenhphamstatus = 1 THEN 1 END) AS so_ca_chua_thuc_hien,
    COUNT(CASE WHEN m.maubenhphamstatus = 16 THEN 1 END) AS so_ca_da_thuc_hien_cho_ket_qua,
    COUNT(CASE WHEN m.maubenhphamstatus = 2 THEN 1 END) AS so_ca_da_tra_ket_qua,
    MAX(CASE WHEN m.maubenhphamstatus IN (2, 16) THEN m.sothutunumber ELSE NULL END) AS max_sothutunumber_da_thuc_hien,
    MAX(m.sothutunumber) AS max_sothutunumber
FROM 
    maubenhpham m
LEFT JOIN 
    department d ON m.departmentid_des = d.departmentid
WHERE 
    (m.isdeleted = 0 OR m.isdeleted IS NULL)
    AND m.maubenhphamdate::date = $1
    AND m.departmentid_des = ANY($2::int[])
GROUP BY 
    d.departmentname, m.departmentid_des
ORDER BY 
    d.departmentname
`

//$1: date, $2: array of departmentids
qSoThuTu.getByDateAndDepartments_Type_38 = `
SELECT 
    d.departmentname, 
    m.departmentid_laymau AS departmentid,
    COUNT(m.maubenhphamid) AS tong_mau_benh_pham,
    COUNT(DISTINCT m.patientid) AS tong_benh_nhan,
    
    COUNT(CASE WHEN m.maubenhphamstatus_laymau = 1 THEN 1 END) AS so_ca_chua_lay_mau,
    COUNT(CASE WHEN m.maubenhphamstatus_laymau = 2 THEN 1 END) AS so_ca_da_lay_mau,
    
    COUNT(DISTINCT CASE WHEN m.maubenhphamstatus_laymau = 2 THEN m.patientid END) AS so_benh_nhan_da_lay_mau,
    (COUNT(DISTINCT m.patientid) - COUNT(DISTINCT CASE WHEN m.maubenhphamstatus_laymau = 2 THEN m.patientid END)) AS so_benh_nhan_chua_lay_mau,
     
    COUNT(CASE WHEN m.maubenhphamstatus = 1 THEN 1 END) AS so_ca_chua_thuc_hien,
    COUNT(CASE WHEN m.maubenhphamstatus = 16 THEN 1 END) AS so_ca_da_thuc_hien_cho_ket_qua,
    COUNT(CASE WHEN m.maubenhphamstatus = 2 THEN 1 END) AS so_ca_da_tra_ket_qua,
    MAX(CASE WHEN m.maubenhphamstatus_laymau = 2 THEN m.sothutunumber_laymau ELSE NULL END) AS max_sothutunumber_da_lay_mau,
    MAX(m.sothutunumber_laymau) AS max_sothutunumber
FROM 
    maubenhpham m
LEFT JOIN 
    department d ON m.departmentid_laymau = d.departmentid
WHERE 
    (m.isdeleted = 0 OR m.isdeleted IS NULL)
    AND m.maubenhphamdate::date = $1
    AND m.departmentid_laymau = ANY($2::int[])
GROUP BY 
    d.departmentname, m.departmentid_laymau
ORDER BY 
    d.departmentname
`

//$1: date, $2: array of departmentids
qSoThuTu.getByDateAndDepartments_Type_2 = `
SELECT 
      d.departmentname, 
    s.departmentid,
    COUNT(s.sothutuid) AS tong_benh_nhan,
    
    COUNT(CASE WHEN s.sothutustatus = 0 THEN 1 END) AS so_benh_nhan_chua_kham,
    COUNT(CASE WHEN s.sothutustatus IN (1,2) THEN 1 END) AS so_benh_nhan_da_kham,
    COUNT(CASE WHEN s.sothutustatus = 4 THEN 1 END) AS so_benh_nhan_kham_xong,
    
    MAX(s.sothutunumber) AS max_sothutunumber,
    MAX(CASE WHEN s.sothutustatus IN (1,2,4) THEN s.sothutunumber ELSE NULL END) AS max_sothutunumber_da_kham
FROM 
    sothutuphongkham s
LEFT JOIN 
    department d ON s.departmentid = d.departmentid
WHERE 
    (s.isremoved = 0 OR s.isremoved IS NULL)
    AND CAST(s.sothutudate AS date) = $1
    AND s.departmentid = ANY($2::int[])
GROUP BY 
    d.departmentname, s.departmentid
ORDER BY 
    d.departmentname
`

module.exports = qSoThuTu;