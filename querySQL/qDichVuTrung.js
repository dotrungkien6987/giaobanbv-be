/**
 * @fileoverview SQL queries để phát hiện dịch vụ CĐHA/XN/TDCN trùng lặp
 * @module querySQL/qDichVuTrung
 * @description Tìm các dịch vụ cùng loại được chỉ định cho 1 bệnh nhân bởi nhiều khoa khác nhau
 */

const qDichVuTrung = {};

/**
 * Query 1: Tìm các bản ghi dịch vụ trùng lặp với chi tiết đầy đủ
 *
 * Business Logic:
 * - Duplicate = cùng vienphiid + cùng servicepricecode + KHÁC departmentgroupid
 * - Trả về tất cả records matching điều kiện trên
 *
 * @param {string} $1 - fromDate (YYYY-MM-DD)
 * @param {string} $2 - toDate (YYYY-MM-DD)
 * @param {string[]} $3 - serviceTypes array (e.g., ['04CDHA', '03XN', '05TDCN'])
 * @param {number} $4 - limit (default 50)
 * @param {number} $5 - offset (calculated from page)
 *
 * @returns {Array<Object>} Array of duplicate service records với patient info
 */
qDichVuTrung.findDuplicates = `
WITH duplicate_candidates AS (
    -- BƯỚC 1: Tìm các cặp (vienphiid, servicepricecode) có >1 departmentgroupid
    SELECT
        vienphiid,
        servicepricecode,
        COUNT(DISTINCT departmentgroupid) AS dept_count,
        COUNT(*) AS total_count
    FROM serviceprice
    WHERE
        servicepricedate BETWEEN $1 AND $2
        AND bhyt_groupcode = ANY($3::text[])
    GROUP BY vienphiid, servicepricecode
    HAVING COUNT(DISTINCT departmentgroupid) > 1
),
duplicate_records AS (
    -- BƯỚC 2: Lấy chi tiết các bản ghi trùng
    SELECT
        sp.servicepriceid,
        sp.vienphiid,
        sp.servicepricecode,
        sp.servicepricename,
        sp.servicepricedate,
        sp.servicepricemoney,
        sp.soluong,
        sp.departmentid,
        sp.departmentgroupid,
        sp.bhyt_groupcode,

        -- Thông tin bệnh nhân từ hosobenhan (không cần JOIN patient table)
        hsba.hosobenhancode,
        hsba.patientid,
        hsba.patientcode,
        hsba.patientname,
        hsba.birthday,
        hsba.gioitinhcode,

        -- Thông tin khoa
        dg.departmentgroupname,
        d.departmentname

    FROM serviceprice sp
    INNER JOIN duplicate_candidates dc
        ON sp.vienphiid = dc.vienphiid
        AND sp.servicepricecode = dc.servicepricecode
    LEFT JOIN hosobenhan hsba ON sp.hosobenhanid = hsba.hosobenhanid
    LEFT JOIN departmentgroup dg ON sp.departmentgroupid = dg.departmentgroupid
    LEFT JOIN department d ON sp.departmentid = d.departmentid
    WHERE
        sp.servicepricedate BETWEEN $1 AND $2
        AND sp.bhyt_groupcode = ANY($3::text[])
)
SELECT * FROM duplicate_records
WHERE
    ($6::text IS NULL OR servicepricename = $6)
    AND ($7::text IS NULL OR departmentgroupname = $7)
ORDER BY vienphiid, servicepricecode, servicepricedate
LIMIT $4 OFFSET $5;
`;

/**
 * Query 2: Đếm tổng số bản ghi trùng lặp
 *
 * @param {string} $1 - fromDate
 * @param {string} $2 - toDate
 * @param {string[]} $3 - serviceTypes array
 *
 * @returns {Object} { total_count: number }
 */
qDichVuTrung.countDuplicates = `
WITH duplicate_candidates AS (
    SELECT
        vienphiid,
        servicepricecode,
        COUNT(DISTINCT departmentgroupid) AS dept_count
    FROM serviceprice
    WHERE
        servicepricedate BETWEEN $1 AND $2
        AND bhyt_groupcode = ANY($3::text[])
    GROUP BY vienphiid, servicepricecode
    HAVING COUNT(DISTINCT departmentgroupid) > 1
)
SELECT COUNT(*) AS total_count
FROM serviceprice sp
INNER JOIN duplicate_candidates dc
    ON sp.vienphiid = dc.vienphiid
    AND sp.servicepricecode = dc.servicepricecode
LEFT JOIN departmentgroup dg ON sp.departmentgroupid = dg.departmentgroupid
WHERE
    sp.servicepricedate BETWEEN $1 AND $2
    AND sp.bhyt_groupcode = ANY($3::text[])
    AND ($4::text IS NULL OR sp.servicepricename = $4)
    AND ($5::text IS NULL OR dg.departmentgroupname = $5);
`;

/**
 * Query 3: Top 5 dịch vụ bị trùng lặp nhiều nhất
 *
 * @param {string} $1 - fromDate
 * @param {string} $2 - toDate
 * @param {string[]} $3 - serviceTypes array
 * @param {number} $4 - limit (default 5)
 *
 * @returns {Array<Object>} Top services với count, affected patients, total cost
 */
qDichVuTrung.getTopServices = `
WITH duplicate_candidates AS (
    SELECT
        vienphiid,
        servicepricecode,
        COUNT(DISTINCT departmentgroupid) AS dept_count
    FROM serviceprice
    WHERE
        servicepricedate BETWEEN $1 AND $2
        AND bhyt_groupcode = ANY($3::text[])
    GROUP BY vienphiid, servicepricecode
    HAVING COUNT(DISTINCT departmentgroupid) > 1
)
SELECT
    sp.servicepricecode,
    sp.servicepricename,
    sp.bhyt_groupcode AS service_type,
    COUNT(*) AS duplicate_count,
    COUNT(DISTINCT sp.vienphiid) AS affected_patients,
    SUM(sp.servicepricemoney * sp.soluong) AS total_cost
FROM serviceprice sp
INNER JOIN duplicate_candidates dc
    ON sp.vienphiid = dc.vienphiid
    AND sp.servicepricecode = dc.servicepricecode
WHERE
    sp.servicepricedate BETWEEN $1 AND $2
    AND sp.bhyt_groupcode = ANY($3::text[])
GROUP BY sp.servicepricecode, sp.servicepricename, sp.bhyt_groupcode
ORDER BY duplicate_count DESC
LIMIT $4;
`;

/**
 * Query 4: Top 5 khoa chỉ định dịch vụ trùng nhiều nhất
 *
 * @param {string} $1 - fromDate
 * @param {string} $2 - toDate
 * @param {string[]} $3 - serviceTypes array
 * @param {number} $4 - limit (default 5)
 *
 * @returns {Array<Object>} Top departments với count, affected patients, total cost
 */
qDichVuTrung.getTopDepartments = `
WITH duplicate_candidates AS (
    SELECT
        vienphiid,
        servicepricecode,
        COUNT(DISTINCT departmentgroupid) AS dept_count
    FROM serviceprice
    WHERE
        servicepricedate BETWEEN $1 AND $2
        AND bhyt_groupcode = ANY($3::text[])
    GROUP BY vienphiid, servicepricecode
    HAVING COUNT(DISTINCT departmentgroupid) > 1
)
SELECT
    dg.departmentgroupid,
    dg.departmentgroupname,
    COUNT(*) AS duplicate_count,
    COUNT(DISTINCT sp.vienphiid) AS affected_patients,
    SUM(sp.servicepricemoney * sp.soluong) AS total_cost
FROM serviceprice sp
INNER JOIN duplicate_candidates dc
    ON sp.vienphiid = dc.vienphiid
    AND sp.servicepricecode = dc.servicepricecode
LEFT JOIN departmentgroup dg ON sp.departmentgroupid = dg.departmentgroupid
WHERE
    sp.servicepricedate BETWEEN $1 AND $2
    AND sp.bhyt_groupcode = ANY($3::text[])
GROUP BY dg.departmentgroupid, dg.departmentgroupname
ORDER BY duplicate_count DESC
LIMIT $4;
`;

module.exports = qDichVuTrung;
