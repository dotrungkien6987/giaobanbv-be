# Bảng `maubenhpham`

## Mô tả

Bảng `maubenhpham` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| maubenhphamid | integer | Không | nextval('maubenhpham_maubenhphamid_seq'::regclass) | Có | |
| medicalrecordid | integer | Có | 0 | Không | |
| patientid | integer | Có | 0 | Không | |
| vienphiid | integer | Có | 0 | Không | |
| hosobenhanid | integer | Có | 0 | Không | |
| dathutien | integer | Có | 0 | Không | |
| servicepriceid_master | integer | Có | 0 | Không | |
| phieudieutriid | integer | Có | 0 | Không | |
| sothutuid | integer | Có | 0 | Không | |
| sothutunumber | integer | Có | 0 | Không | |
| medicinestoreid | integer | Có | 0 | Không | |
| departmentgroupid | integer | Có | 0 | Không | |
| departmentid | integer | Có | 0 | Không | |
| buonggiuong | text | Có |  | Không | |
| userid | integer | Có | 0 | Không | |
| departmentgroupid_des | integer | Có | 0 | Không | |
| departmentid_des | integer | Có | 0 | Không | |
| medicinestorebillid | integer | Có | 0 | Không | |
| sophieu | text | Có |  | Không | |
| barcode | text | Có |  | Không | |
| maubenhphamtype | integer | Có | 0 | Không | |
| maubenhphamphieutype | integer | Có | 0 | Không | |
| maubenhphamgrouptype | integer | Có | 0 | Không | |
| maubenhphamdatastatus | integer | Có | 0 | Không | |
| maubenhphamprintstatus | integer | Có | 0 | Không | |
| maubenhphamstatus | integer | Có | 0 | Không | |
| maubenhphamdate | timestamp without time zone | Có |  | Không | |
| maubenhphamfinishdate | timestamp without time zone | Có |  | Không | |
| unmapedhisservice | text | Có |  | Không | |
| isdeleted | integer | Có | 0 | Không | |
| maubenhphamdeletedate | timestamp without time zone | Có |  | Không | |
| userdelete | text | Có |  | Không | |
| usercreate | text | Có |  | Không | |
| userupdatebarcode | text | Có |  | Không | |
| userlastupdate | text | Có |  | Không | |
| userupdatebarcodedate | timestamp without time zone | Có |  | Không | |
| userlastupdatedate | timestamp without time zone | Có |  | Không | |
| patientpid | text | Có |  | Không | |
| doituong | text | Có |  | Không | |
| patientname | text | Có |  | Không | |
| patientaddress | text | Có |  | Không | |
| patientphone | text | Có |  | Không | |
| patientbirthday | timestamp without time zone | Có |  | Không | |
| patientsex | integer | Có |  | Không | |
| chandoan | text | Có |  | Không | |
| remark | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| maubenhphamdate_sudung | timestamp without time zone | Có |  | Không | |
| maubenhphamhaophi | integer | Có | 0 | Không | |
| datamung | integer | Có | 0 | Không | |
| sothutunumberdagoi | integer | Có | 0 | Không | |
| sothutuid_laymau | integer | Có | 0 | Không | |
| sothutunumber_laymau | integer | Có | 0 | Không | |
| sothutunumberdagoi_laymau | integer | Có | 0 | Không | |
| departmentid_laymau | integer | Có | 0 | Không | |
| maubenhphamstatus_laymau | integer | Có | 0 | Không | |
| maubenhphamdate_thuchien | timestamp without time zone | Có |  | Không | |
| maubenhphamdate_laymau | timestamp without time zone | Có |  | Không | |
| departmentid_des_org | integer | Có | 0 | Không | |
| userduyetall | integer | Có | 0 | Không | |
| usertrakq | integer | Có | 0 | Không | |
| ismaubenhphamtemp | integer | Có | 0 | Không | |
| sothutuphongkhamid | integer | Có | 0 | Không | |
| userthuchien | integer | Có |  | Không | |
| thoigiandukiencoketqua | timestamp without time zone | Có |  | Không | |
| sodienthoaibaotinkhicoketqua | text | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| dacodichvuthutien | integer | Có |  | Không | |
| dacodichvuduyetcanlamsang | integer | Có |  | Không | |
| sessionid | integer | Có | 0 | Không | |
| isautongaygiuong | integer | Có |  | Không | |
| sothutuchidinhcanlamsang | integer | Có |  | Không | |
| isencript | integer | Có |  | Không | |
| maubenhphamdate_org | timestamp without time zone | Có |  | Không | |
| departmentid_traketqua | integer | Có |  | Không | |
| numbertraketqua | integer | Có |  | Không | |
| isdatraketqua | integer | Có |  | Không | |
| usertraketqua | integer | Có |  | Không | |
| maubenhphamtraketquadate | timestamp without time zone | Có |  | Không | |
| remarkdetail | text | Có |  | Không | |
| chandoan_code | text | Có |  | Không | |
| hl7_is | integer | Có |  | Không | |
| hl7_isdatraketqua | integer | Có |  | Không | |
| hl7_maubenhphamtraketquadate | timestamp without time zone | Có |  | Không | |
| loidanbacsi | text | Có |  | Không | |
| phieutonghopsuatanid | integer | Có |  | Không | |
| medicinekiemkeid | integer | Có |  | Không | |
| isloaidonthuoc | integer | Có |  | Không | |
| servicepriceid_thanhtoanrieng | integer | Có |  | Không | |
| sothutunumber_h_n | integer | Có |  | Không | |
| userlaymau | integer | Có |  | Không | |
| dm_loaibenhphamcode | text | Có |  | Không | |
| ketquanhanxet | text | Có |  | Không | |
| ketquaghichu | text | Có |  | Không | |
| maubenhphamtype_capcuu | integer | Có |  | Không | |
| chandoan_code_2 | text | Có |  | Không | |
| chandoan_2 | text | Có |  | Không | |
| chandoan_code_3 | text | Có |  | Không | |
| chandoan_3 | text | Có |  | Không | |
| dotdungthuoc | text | Có |  | Không | |
| dotdung_tungay | timestamp without time zone | Có |  | Không | |
| dotdung_denngay | timestamp without time zone | Có |  | Không | |
| nhiemtrungbenhvien | integer | Có |  | Không | |
| nhiemtrungcongdong | integer | Có |  | Không | |
| tinhtrangmau | text | Có |  | Không | |
| dathuchienylenh | integer | Có |  | Không | |
| servicepriceid_goipttt | integer | Có |  | Không | |
| chandoan_yhct_code | text | Có |  | Không | |
| chandoan_yhct | text | Có |  | Không | |
| solanin | integer | Có |  | Không | |
| kystatus | integer | Có |  | Không | |
| donthuocquocgia | integer | Có |  | Không | |
| kyketquastatus | integer | Có |  | Không | |
| ghichuicd10 | text | Có |  | Không | |
| dm_viptypeid | integer | Có |  | Không | |
| madonthuocdientu | text | Có |  | Không | |
| dm_tuchoibenhphamid | integer | Có |  | Không | |
| tuchoi_userid | integer | Có |  | Không | |
| tuchoi_thoigian | timestamp without time zone | Có |  | Không | |
| is_sendpacs | integer | Có |  | Không | |
| json_ghichuicd | text | Có |  | Không | |
| dm_benhphamtypeid | integer | Có |  | Không | |
| userid_tinhtrangmau | integer | Có |  | Không | |
| mauid | integer | Có |  | Không | |
| lpb_user | integer | Có |  | Không | |
| lpb_thoigian | timestamp without time zone | Có |  | Không | |
| maubenhphamid_master | integer | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú
Đây là bảng dữ liệu của mẫu bệnh phẩm, có thể hiểu là các chỉ định cận lâm sàng trong bệnh viện. Giải thích 1 số trường như sau
departmentid_des: liên kết với department, là phòng thực hiện đối với các dịch vụ chản đoán hình ảnh, thăm dò chức năng
maubenhphamdate: Thời gian chỉ định
maubenhphamstatus: = 1 là Chưa thực hiện, =16 là đã thực hiện chưa có kết quả, = 2 là đã trả kết quả

maubenhphamstatus_laymau: =1 là chưa lấy mẫu, =2 là đã lấy mẫu