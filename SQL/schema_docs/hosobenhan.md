# Bảng `hosobenhan`

## Mô tả

Bảng `hosobenhan` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| hosobenhanid | integer | Không | nextval('hosobenhan_hosobenhanid_seq'::regclass) | Có | |
| soluutru | text | Có |  | Không | |
| hosobenhancode | text | Có |  | Không | |
| isuploaded | integer | Có |  | Không | |
| isdownloaded | integer | Có |  | Không | |
| loaibenhanid | integer | Có |  | Không | |
| userid | integer | Có |  | Không | |
| departmentgroupid | integer | Có |  | Không | |
| departmentid | integer | Có |  | Không | |
| hinhthucvaovienid | integer | Có |  | Không | |
| ketquadieutriid | integer | Có |  | Không | |
| xutrikhambenhid | integer | Có |  | Không | |
| hinhthucravienid | integer | Có |  | Không | |
| hosobenhanstatus | integer | Có |  | Không | |
| patientid | integer | Có |  | Không | |
| hosobenhandate | timestamp without time zone | Có |  | Không | |
| hosobenhandate_ravien | timestamp without time zone | Có |  | Không | |
| chandoanvaovien_code | text | Có |  | Không | |
| chandoanvaovien | text | Có |  | Không | |
| chandoanravien_code | text | Có |  | Không | |
| chandoanravien | text | Có |  | Không | |
| chandoanravien_kemtheo_code | text | Có |  | Không | |
| chandoanravien_kemtheo | text | Có |  | Không | |
| lastaccessdate | timestamp without time zone | Có |  | Không | |
| hosobenhanremark | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| soluutru_remark | text | Có |  | Không | |
| soluutru_vitri | text | Có |  | Không | |
| soluutru_nguoiluu | integer | Có |  | Không | |
| sovaovien | text | Có | ''::text | Không | |
| patientname | text | Có |  | Không | |
| birthday | timestamp without time zone | Có |  | Không | |
| birthday_year | integer | Có |  | Không | |
| gioitinhcode | text | Có |  | Không | |
| nghenghiepcode | text | Có |  | Không | |
| hc_dantoccode | text | Có |  | Không | |
| hc_quocgiacode | text | Có |  | Không | |
| hc_sonha | text | Có |  | Không | |
| hc_thon | text | Có |  | Không | |
| hc_xacode | text | Có |  | Không | |
| hc_huyencode | text | Có |  | Không | |
| hc_tinhcode | text | Có |  | Không | |
| noilamviec | text | Có |  | Không | |
| nguoithan | text | Có |  | Không | |
| nguoithan_name | text | Có |  | Không | |
| nguoithan_phone | text | Có |  | Không | |
| nguoithan_address | text | Có |  | Không | |
| gioitinhname | text | Có |  | Không | |
| nghenghiepname | text | Có |  | Không | |
| hc_dantocname | text | Có |  | Không | |
| hc_quocgianame | text | Có |  | Không | |
| hc_xaname | text | Có |  | Không | |
| hc_huyenname | text | Có |  | Không | |
| hc_tinhname | text | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| isencript | integer | Có |  | Không | |
| soluutru_thoigianluu | timestamp without time zone | Có |  | Không | |
| patient_id | text | Có |  | Không | |
| imagedata | bytea | Có |  | Không | |
| imagesize | integer | Có | 0 | Không | |
| patientcode | text | Có |  | Không | |
| ismocapcuu | integer | Có |  | Không | |
| bhytcode | text | Có |  | Không | |
| malifegap | text | Có |  | Không | |
| matainan | integer | Có |  | Không | |
| cannang | double precision | Có |  | Không | |
| thoigianmotran | timestamp without time zone | Có |  | Không | |
| userthuchienmotranbhyt | integer | Có |  | Không | |
| usermotranbhyt | integer | Có |  | Không | |
| lydomotranbhyt | text | Có |  | Không | |
| nguoithan_cmnn_cccd | text | Có |  | Không | |
| syncdatawarehouse | integer | Có |  | Không | |
| synctime | numeric | Có |  | Không | |
| manhanvien | text | Có |  | Không | |
| dm_viptypeid | integer | Có |  | Không | |
| tomtat_quatrinhbenhly | text | Có |  | Không | |
| tomtat_ketquacls | text | Có |  | Không | |
| tomtat_phuongphapdieutri | text | Có |  | Không | |
| tomtat_tinhtrangbn_ravien | text | Có |  | Không | |
| tomtat_isconchet | integer | Có |  | Không | |
| tomtat_ishanchenangluchvds | integer | Có |  | Không | |
| patientphone | text | Có |  | Không | |
| chandoanravien_yhct_code | text | Có |  | Không | |
| chandoanravien_yhct | text | Có |  | Không | |
| chandoanravien_yhct_kemtheo_code | text | Có |  | Không | |
| chandoanravien_yhct_kemtheo | text | Có |  | Không | |
| serumcre | double precision | Có |  | Không | |
| chieucao | double precision | Có |  | Không | |
| imagedata_thebhyt | bytea | Có |  | Không | |
| imagedata_cccdt | bytea | Có |  | Không | |
| imagedata_cccds | bytea | Có |  | Không | |
| imagesize_thebhyt | integer | Có | 0 | Không | |
| imagesize_cccdt | integer | Có | 0 | Không | |
| imagesize_cccds | integer | Có | 0 | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
