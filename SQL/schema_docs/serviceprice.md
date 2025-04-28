# Bảng `serviceprice`

## Mô tả

Bảng `serviceprice` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| servicepriceid | integer | Không | nextval('serviceprice_servicepriceid_seq'::regclass) | Có | |
| medicalrecordid | integer | Có |  | Không | |
| vienphiid | integer | Có | 0 | Không | |
| hosobenhanid | integer | Có | 0 | Không | |
| maubenhphamid | integer | Có |  | Không | |
| maubenhphamphieutype | integer | Có | 0 | Không | |
| servicepriceid_master | integer | Có | 0 | Không | |
| thuockhobanle | integer | Có | 0 | Không | |
| doituongbenhnhanid | integer | Có | 0 | Không | |
| loaidoituong_org | integer | Có | 0 | Không | |
| loaidoituong_org_remark | text | Có |  | Không | |
| loaidoituong | integer | Có | 0 | Không | |
| loaidoituong_remark | text | Có |  | Không | |
| loaidoituong_userid | integer | Có | 0 | Không | |
| departmentid | integer | Có | 0 | Không | |
| departmentgroupid | integer | Có | 0 | Không | |
| servicepricecode | text | Có |  | Không | |
| servicepricename | text | Có |  | Không | |
| servicepricename_nhandan | text | Có |  | Không | |
| servicepricename_bhyt | text | Có |  | Không | |
| servicepricename_nuocngoai | text | Có |  | Không | |
| servicepricedate | timestamp without time zone | Có |  | Không | |
| servicepricestatus | integer | Có |  | Không | |
| servicepricedoer | text | Có |  | Không | |
| servicepricecomment | text | Có |  | Không | |
| servicepricemoney | double precision | Có |  | Không | |
| servicepricemoney_nhandan | double precision | Có |  | Không | |
| servicepricemoney_bhyt | double precision | Có |  | Không | |
| servicepricemoney_nuocngoai | double precision | Có |  | Không | |
| servicepricemoney_bhyt_tra | double precision | Có |  | Không | |
| servicepricemoney_miengiam | double precision | Có |  | Không | |
| servicepricemoney_danop | double precision | Có |  | Không | |
| servicepricemoney_miengiam_type | integer | Có | 0 | Không | |
| soluong | double precision | Có |  | Không | |
| soluongbacsi | double precision | Có |  | Không | |
| huongdansudung | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| billid_thutien | integer | Có | 0 | Không | |
| billid_hoantien | integer | Có | 0 | Không | |
| billid_clbh_thutien | integer | Có | 0 | Không | |
| billid_clbh_hoantien | integer | Có | 0 | Không | |
| loaiduyetbhyt | integer | Có | 0 | Không | |
| billaccountid | integer | Có | 0 | Không | |
| loaipttt | integer | Có | 0 | Không | |
| soluongquyettoan | double precision | Có | 0 | Không | |
| servicepriceid_xuattoan | double precision | Có | 0 | Không | |
| daduyetthuchiencanlamsang | integer | Có | 0 | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| servicepricemoney_bhyt_danop | double precision | Có |  | Không | |
| servicepricemoney_damiengiam | double precision | Có |  | Không | |
| loaidoituong_xuat | integer | Có |  | Không | |
| servicepricemoney_tranbhyt | double precision | Có |  | Không | |
| servicepricebhytdinhmuc | text | Có |  | Không | |
| servicepricebhytquydoi | text | Có |  | Không | |
| servicepricebhytquydoi_tt | text | Có |  | Không | |
| bhyt_groupcode | text | Có |  | Không | |
| huongdanphathuoc | text | Có |  | Không | |
| servicepriceid_org | integer | Có |  | Không | |
| lankhambenh | integer | Có | 0 | Không | |
| vitrisinhthiet | text | Có |  | Không | |
| somanhsinhthiet | text | Có |  | Không | |
| stt_theodoithuoc | integer | Có |  | Không | |
| chiphidauvao | double precision | Có |  | Không | |
| chiphimaymoc | double precision | Có |  | Không | |
| chiphipttt | double precision | Có |  | Không | |
| mayytedbid | integer | Có |  | Không | |
| loaingaygiuong | integer | Có |  | Không | |
| servicepriceid_thanhtoanrieng | integer | Có |  | Không | |
| stenphuthuoc | integer | Có |  | Không | |
| bhyt_pttt | integer | Có |  | Không | |
| giuong | text | Có |  | Không | |
| vienphiid_new | integer | Có |  | Không | |
| servicepricedate_new | integer | Có |  | Không | |
| syncdatawarehouse | integer | Có |  | Không | |
| synctime | numeric | Có |  | Không | |
| servicepricedatesudung | timestamp without time zone | Có |  | Không | |
| huongdansudungchitiet | text | Có |  | Không | |
| servicepriceid_goipttt | integer | Có |  | Không | |
| stt_display | integer | Có |  | Không | |
| isdathuchienyl | integer | Có |  | Không | |
| maubenhphamid_bbhc | integer | Có |  | Không | |
| stt_theodoick | integer | Có |  | Không | |
| giuong_ketqua | timestamp without time zone | Có |  | Không | |
| servicepriceid_goc | integer | Có |  | Không | |
| t_bhtt | double precision | Có |  | Không | |
| t_bncct | double precision | Có |  | Không | |
| t_bntt | double precision | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
