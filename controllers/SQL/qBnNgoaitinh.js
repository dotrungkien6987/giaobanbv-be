const qBnNgoaitinh = {}
//$1: fromdate, $2: todate
qBnNgoaitinh.getByDateRange = `
with bnngoaitinh as
(
select hosobenhanid, hosobenhandate, xutrikhambenhid,hinhthucvaovienid,patientid,patientname,hosobenhandate_ravien,hc_xacode,hc_huyencode,hc_tinhcode,hc_quocgianame,hc_huyenname,hc_tinhname
from hosobenhan where hosobenhandate >= $1 and hosobenhandate < $2 
and hc_tinhcode<>'25')
select hc_xacode,hc_huyencode,hc_tinhcode,hc_quocgianame,hc_huyenname,hc_tinhname,
       count (patientid) as sobenhnhan
 from bnngoaitinh
 group by hc_xacode,hc_huyencode,hc_tinhcode,hc_quocgianame,hc_huyenname,hc_tinhname
`
module.exports = qBnNgoaitinh;