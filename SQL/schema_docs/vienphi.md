# Bảng `vienphi`

## Mô tả

Bảng `vienphi` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| vienphiid | integer | Không | nextval('vienphi_vienphiid_seq'::regclass) | Có | |
| vienphicode | text | Có |  | Không | |
| loaivienphiid | integer | Có |  | Không | |
| vienphistatus | integer | Có |  | Không | |
| hosobenhanid | integer | Có |  | Không | |
| doituongbenhnhanid | integer | Có |  | Không | |
| dathutienkham | integer | Có |  | Không | |
| bhytid | integer | Có |  | Không | |
| patientid | integer | Có |  | Không | |
| vienphidate | timestamp without time zone | Có |  | Không | |
| vienphidate_ravien | timestamp without time zone | Có |  | Không | |
| chandoanvaovien | text | Có |  | Không | |
| chandoanvaovien_code | text | Có |  | Không | |
| chandoanravien | text | Có |  | Không | |
| chandoanravien_code | text | Có |  | Không | |
| tongtiendichvu | double precision | Có |  | Không | |
| tongtiendichvu_bhyt | double precision | Có |  | Không | |
| tongtienmiengiam | double precision | Có |  | Không | |
| tongtiendatra | double precision | Có |  | Không | |
| tongtienconno | double precision | Có |  | Không | |
| isneedupdatemoney | integer | Có | 0 | Không | |
| lastaccessdate | timestamp without time zone | Có |  | Không | |
| vienphiremark | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| departmentgroupid | integer | Có |  | Không | |
| departmentid | integer | Có |  | Không | |
| chandoanravien_kemtheo | text | Có |  | Không | |
| chandoanravien_kemtheo_code | text | Có |  | Không | |
| bhyt_traituyen | double precision | Có |  | Không | |
| bhyt_thangluongtoithieu | double precision | Có |  | Không | |
| bhyt_gioihanbhyttrahoantoan | double precision | Có |  | Không | |
| duyet_ngayduyet | timestamp without time zone | Có |  | Không | |
| duyet_nguoiduyet | integer | Có |  | Không | |
| duyet_sothutuduyet | integer | Có |  | Không | |
| money_khambenh | double precision | Có |  | Không | |
| money_xetnghiem | double precision | Có |  | Không | |
| money_chandoanhinhanh | double precision | Có |  | Không | |
| money_thamdochucnang | double precision | Có |  | Không | |
| money_thuoctrongdanhmuc | double precision | Có |  | Không | |
| money_thuocngoaidanhmuc | double precision | Có |  | Không | |
| money_mauchephammau | double precision | Có |  | Không | |
| money_phauthuatthuthuat | double precision | Có |  | Không | |
| money_vattutrongdanhmuc | double precision | Có |  | Không | |
| money_vattungoaidanhmuc | double precision | Có |  | Không | |
| money_dichvukythuatcao | double precision | Có |  | Không | |
| money_thuocungthungoaidanhmuc | double precision | Có |  | Không | |
| money_ngaygiuongchuyenkhoa | double precision | Có |  | Không | |
| money_vanchuyen | double precision | Có |  | Không | |
| tongtiendichvu_bh | double precision | Có |  | Không | |
| tongtiendichvu_dv | double precision | Có |  | Không | |
| money_phuthu | double precision | Có |  | Không | |
| money_dv_khambenh | double precision | Có |  | Không | |
| money_dv_xetnghiem | double precision | Có |  | Không | |
| money_dv_chandoanhinhanh | double precision | Có |  | Không | |
| money_dv_thamdochucnang | double precision | Có |  | Không | |
| money_dv_thuoctrongdanhmuc | double precision | Có |  | Không | |
| money_dv_thuocngoaidanhmuc | double precision | Có |  | Không | |
| money_dv_mauchephammau | double precision | Có |  | Không | |
| money_dv_phauthuatthuthuat | double precision | Có |  | Không | |
| money_dv_vattutrongdanhmuc | double precision | Có |  | Không | |
| money_dv_vattungoaidanhmuc | double precision | Có |  | Không | |
| money_dv_dichvukythuatcao | double precision | Có |  | Không | |
| money_dv_thuocungthungoaidanhmuc | double precision | Có |  | Không | |
| money_dv_ngaygiuongchuyenkhoa | double precision | Có |  | Không | |
| money_dv_vanchuyen | double precision | Có |  | Không | |
| money_dv_phuthu | double precision | Có |  | Không | |
| isneedupdateinfo | integer | Có | 0 | Không | |
| vienphistatus_bh | integer | Có |  | Không | |
| duyet_ngayduyet_bh | timestamp without time zone | Có |  | Không | |
| duyet_nguoiduyet_bh | integer | Có |  | Không | |
| duyet_sothutuduyet_bh | integer | Có |  | Không | |
| vienphistatus_vp | integer | Có |  | Không | |
| duyet_ngayduyet_vp | timestamp without time zone | Có |  | Không | |
| duyet_nguoiduyet_vp | integer | Có |  | Không | |
| duyet_sothutuduyet_vp | integer | Có |  | Không | |
| vienphistatus_tk | integer | Có |  | Không | |
| duyet_ngayduyet_tk | timestamp without time zone | Có |  | Không | |
| duyet_nguoiduyet_tk | integer | Có |  | Không | |
| duyet_sothutuduyet_tk | integer | Có |  | Không | |
| money_vattutrongdanhmuctt | double precision | Có |  | Không | |
| money_dv_vattutrongdanhmuctt | double precision | Có |  | Không | |
| tongtiendatra_bh | double precision | Có |  | Không | |
| tongtiendatra_dv | double precision | Có |  | Không | |
| tongtiendatra_tk | double precision | Có |  | Không | |
| dagiuthebhyt | integer | Có |  | Không | |
| duyet_quyduyet | text | Có |  | Không | |
| vienphidate_noitru | timestamp without time zone | Có |  | Không | |
| medicalrecordid_start | integer | Có |  | Không | |
| medicalrecordid_end | integer | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| datronvien | integer | Có |  | Không | |
| departmentgroupid_start | integer | Có |  | Không | |
| departmentid_start | integer | Có |  | Không | |
| bhyt_tuyenbenhvien | integer | Có |  | Không | |
| masothue | text | Có |  | Không | |
| sotaikhoan | text | Có |  | Không | |
| userdangkythebhyt | integer | Có |  | Không | |
| thoigiandangkythe | timestamp without time zone | Có |  | Không | |
| userhuydangkythebhyt | integer | Có |  | Không | |
| vienphidate_ravien_update | timestamp without time zone | Có |  | Không | |
| lydohuyduyetketoan | text | Có |  | Không | |
| theghep_bhytcode | text | Có |  | Không | |
| theghep_bhytfromdate | timestamp without time zone | Có |  | Không | |
| theghep_bhytutildate | timestamp without time zone | Có |  | Không | |
| theghep_macskcbbd | text | Có |  | Không | |
| theghep_du5nam6thangluongcoban | integer | Có |  | Không | |
| theghep_dtcbh_luyke6thang | integer | Có |  | Không | |
| theghep_noisinhsong | text | Có |  | Không | |
| isdvkham_apgiayc | integer | Có |  | Không | |
| ischeckin_xml130 | integer | Có |  | Không | |
| chandoanravien_yhct | text | Có |  | Không | |
| chandoanravien_yhct_code | text | Có |  | Không | |
| chandoanravien_yhct_kemtheo | text | Có |  | Không | |
| chandoanravien_yhct_kemtheo_code | text | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
