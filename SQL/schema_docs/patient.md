# Bảng `patient`

## Mô tả

Bảng `patient` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| patientid | integer | Không | nextval('patient_patientid_seq'::regclass) | Có | |
| patientcode | text | Có |  | Không | |
| card_id | text | Có |  | Không | |
| patientname | text | Có |  | Không | |
| patientpassword | text | Có |  | Không | |
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
| bo_name | text | Có |  | Không | |
| bo_trinhdovanhoaid | integer | Có |  | Không | |
| bo_nghenghiepcode | text | Có |  | Không | |
| me_name | text | Có |  | Không | |
| me_trinhdovanhoaid | integer | Có |  | Không | |
| me_nghenghiepcode | text | Có |  | Không | |
| cmnd | text | Có |  | Không | |
| noicapcmnd | text | Có |  | Không | |
| ngaycapcmnd | timestamp without time zone | Có |  | Không | |
| registerdate | timestamp without time zone | Có |  | Không | |
| lastaccessdate | timestamp without time zone | Có |  | Không | |
| imagedata | bytea | Có |  | Không | |
| imagesize | integer | Có | 0 | Không | |
| nguoigioithieuid | integer | Có | 0 | Không | |
| patientremark | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| patient_id | text | Có |  | Không | |
| ngayphathanhthe | timestamp without time zone | Có |  | Không | |
| ngayhethanthe | timestamp without time zone | Có |  | Không | |
| ngayhethanluutruhsba | timestamp without time zone | Có |  | Không | |
| namhethanluutruhsba | integer | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| registerstt | integer | Có |  | Không | |
| isencript | integer | Có |  | Không | |
| malifegap | text | Có |  | Không | |
| masothue | text | Có |  | Không | |
| nguoithan_cmnn_cccd | text | Có |  | Không | |
| listdiungthuoc | text | Có |  | Không | |
| pidid | text | Có |  | Không | |
| syncdatawarehouse | integer | Có |  | Không | |
| synctime | numeric | Có |  | Không | |
| manhanvien | text | Có |  | Không | |
| masodinhdanh | text | Có |  | Không | |
| patientemail | text | Có |  | Không | |
| dm_viptypeid | integer | Có |  | Không | |
| bo_bhxh | text | Có |  | Không | |
| me_bhxh | text | Có |  | Không | |
| patientphone | text | Có |  | Không | |
| mabhxh | text | Có |  | Không | |
| dm_nguoithantypeid | integer | Có |  | Không | |
| bo_address | text | Có |  | Không | |
| bo_phone | text | Có |  | Không | |
| bo_mabhxh | text | Có |  | Không | |
| bo_cmnd | text | Có |  | Không | |
| me_address | text | Có |  | Không | |
| me_phone | text | Có |  | Không | |
| me_mabhxh | text | Có |  | Không | |
| me_cmnd | text | Có |  | Không | |
| nguoithan_mabhxh | text | Có |  | Không | |
| imagedata_thebhyt | bytea | Có |  | Không | |
| imagedata_cccdt | bytea | Có |  | Không | |
| imagedata_cccds | bytea | Có |  | Không | |
| imagesize_thebhyt | integer | Có | 0 | Không | |
| imagesize_cccdt | integer | Có | 0 | Không | |
| imagesize_cccds | integer | Có | 0 | Không | |
| dm_nhommauid | integer | Có |  | Không | |
| dm_nhommaurhid | integer | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
