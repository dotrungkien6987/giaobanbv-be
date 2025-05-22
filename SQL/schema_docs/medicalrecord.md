# Bảng `medicalrecord`

## Mô tả

Bảng `medicalrecord` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| medicalrecordid | integer | Không | nextval('medicalrecord_medicalrecordid_seq'::regclass) | Có | |
| medicalrecordcode | text | Có |  | Không | |
| sothutuid | integer | Có |  | Không | |
| sothutunumber | integer | Có |  | Không | |
| sothutuphongkhamid | integer | Có |  | Không | |
| sothutuphongkhamnumber | integer | Có |  | Không | |
| vienphiid | integer | Có |  | Không | |
| hosobenhanid | integer | Có | 0 | Không | |
| medicalrecordid_next | integer | Có | 0 | Không | |
| medicalrecordstatus | integer | Có |  | Không | |
| departmentgroupid | integer | Có |  | Không | |
| departmentid | integer | Có |  | Không | |
| giuong | text | Có |  | Không | |
| loaibenhanid | integer | Có |  | Không | |
| userid | integer | Có |  | Không | |
| patientid | integer | Có |  | Không | |
| doituongbenhnhanid | integer | Có |  | Không | |
| bhytid | integer | Có |  | Không | |
| lydodenkham | text | Có |  | Không | |
| yeucaukham | text | Có |  | Không | |
| dathutienkham | integer | Có |  | Không | |
| thoigianvaovien | timestamp without time zone | Có |  | Không | |
| chandoanvaovien | text | Có |  | Không | |
| chandoanvaovien_code | text | Có |  | Không | |
| chandoanvaovien_kemtheo | text | Có |  | Không | |
| chandoanvaovien_kemtheo_code | text | Có |  | Không | |
| chandoankkb | text | Có |  | Không | |
| chandoankkb_code | text | Có |  | Không | |
| chandoanvaokhoa | text | Có |  | Không | |
| chandoanvaokhoa_code | text | Có |  | Không | |
| chandoanvaokhoa_kemtheo | text | Có |  | Không | |
| chandoanvaokhoa_kemtheo_code | text | Có |  | Không | |
| isthuthuat | integer | Có |  | Không | |
| isphauthuat | integer | Có |  | Không | |
| hinhthucvaovienid | integer | Có |  | Không | |
| uutienkhamid | integer | Có |  | Không | |
| noigioithieuid | integer | Có |  | Không | |
| vaoviencungbenhlanthu | integer | Có |  | Không | |
| ngayhen | timestamp without time zone | Có |  | Không | |
| thoigianravien | timestamp without time zone | Có |  | Không | |
| chandoanravien | text | Có |  | Không | |
| chandoanravien_code | text | Có |  | Không | |
| chandoanravien_kemtheo | text | Có |  | Không | |
| chandoanravien_kemtheo_code | text | Có |  | Không | |
| xutrikhambenhid | integer | Có |  | Không | |
| hinhthucravienid | integer | Có |  | Không | |
| ketquadieutriid | integer | Có |  | Không | |
| nextdepartmentid | integer | Có |  | Không | |
| nexthospitalid | integer | Có |  | Không | |
| istaibien | integer | Có |  | Không | |
| isbienchung | integer | Có |  | Không | |
| tuvongluc | timestamp without time zone | Có |  | Không | |
| giaiphaubenhid | integer | Có |  | Không | |
| thoigiantuvongid | integer | Có |  | Không | |
| iscokhamnghiem | integer | Có |  | Không | |
| nguyennhantuvongid | integer | Có |  | Không | |
| nguyennhantuvongchinh | text | Có |  | Không | |
| chandoangiaiphaututhi | text | Có |  | Không | |
| chuyenvien_loaiid | integer | Có |  | Không | |
| thoigianchuyenvien | timestamp without time zone | Có |  | Không | |
| benhvienchuyentoi_code | text | Có |  | Không | |
| tinhtrangnguoibenh | text | Có |  | Không | |
| lydochuyenvien | text | Có |  | Không | |
| phuongtienvanchuyen | text | Có |  | Không | |
| nguoivanchuyen | text | Có |  | Không | |
| lydovaovien | text | Có |  | Không | |
| vaongaythucuabenh | integer | Có |  | Không | |
| quatrinhbenhly | text | Có |  | Không | |
| tiensubenh_banthan | text | Có |  | Không | |
| tiensubenh_giadinh | text | Có |  | Không | |
| khambenh_toanthan | text | Có |  | Không | |
| khambenh_mach | text | Có |  | Không | |
| khambenh_nhietdo | text | Có |  | Không | |
| khambenh_huyetap_low | text | Có |  | Không | |
| khambenh_huyetap_high | text | Có |  | Không | |
| khambenh_nhiptho | text | Có |  | Không | |
| khambenh_cannang | text | Có |  | Không | |
| khambenh_chieucao | text | Có |  | Không | |
| khambenh_vongnguc | text | Có |  | Không | |
| khambenh_vongdau | text | Có |  | Không | |
| khambenh_bophan | text | Có |  | Không | |
| tomtatkqcanlamsang | text | Có |  | Không | |
| chandoanbandau | text | Có |  | Không | |
| daxuly | text | Có |  | Không | |
| tomtatbenhan | text | Có |  | Không | |
| chandoankhoakhambenh | text | Có |  | Không | |
| daxulyotuyenduoi | text | Có |  | Không | |
| medicalrecordremark | text | Có |  | Không | |
| lastaccessdate | timestamp without time zone | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| medicalrecordid_master | integer | Có |  | Không | |
| backdepartmentid | integer | Có |  | Không | |
| chandoanravien_kemtheo1 | text | Có |  | Không | |
| chandoanravien_kemtheo_code1 | text | Có |  | Không | |
| chandoanravien_kemtheo2 | text | Có |  | Không | |
| chandoanravien_kemtheo_code2 | text | Có |  | Không | |
| chandoantuyenduoi | text | Có |  | Không | |
| chandoantuyenduoi_code | text | Có |  | Không | |
| noigioithieucode | text | Có |  | Không | |
| canlamsangstatus | integer | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| lastuserupdated | integer | Có |  | Không | |
| lasttimeupdated | timestamp without time zone | Có |  | Không | |
| keylock | integer | Có |  | Không | |
| cv_chuyenvien_hinhthucid | integer | Có |  | Không | |
| cv_chuyenvien_lydoid | integer | Có |  | Không | |
| cv_chuyendungtuyen | integer | Có |  | Không | |
| cv_chuyenvuottuyen | integer | Có |  | Không | |
| xetnghiemcanthuchienlai | text | Có |  | Không | |
| loidanbacsi | text | Có |  | Không | |
| chandoanbandau_code | text | Có |  | Không | |
| nextbedrefid | integer | Có |  | Không | |
| nextbedrefid_nguoinha | text | Có |  | Không | |
| thoigianchuyenden | timestamp without time zone | Có |  | Không | |
| khambenh_thilucmatphai | text | Có |  | Không | |
| khambenh_thilucmattrai | text | Có |  | Không | |
| khambenh_klthilucmatphai | text | Có |  | Không | |
| khambenh_klthilucmattrai | text | Có |  | Không | |
| khambenh_nhanapmatphai | text | Có |  | Không | |
| khambenh_nhanapmattrai | text | Có |  | Không | |
| chandoantuyenduoikemtheo | text | Có |  | Không | |
| chandoantuyenduoikemtheo_code | text | Có |  | Không | |
| chandoanravien_phanbiet | text | Có |  | Không | |
| chandoanravien_phanbiet_code | text | Có |  | Không | |
| cv_tuyenduoi_tungay | timestamp without time zone | Có |  | Không | |
| cv_tuyenduoi_denngay | timestamp without time zone | Có |  | Không | |
| thoigianchuyenmo | timestamp without time zone | Có |  | Không | |
| chandoanravien_yhct | text | Có |  | Không | |
| chandoanravien_yhct_code | text | Có |  | Không | |
| chandoanravien_yhct_phu1 | text | Có |  | Không | |
| chandoanravien_yhct_phu1_code | text | Có |  | Không | |
| chandoanravien_yhct_phu2 | text | Có |  | Không | |
| chandoanravien_yhct_phu2_code | text | Có |  | Không | |
| chandoanravien_yhct_khac | text | Có |  | Không | |
| chandoanravien_yhct_khac_code | text | Có |  | Không | |
| syncdatawarehouse | integer | Có |  | Không | |
| synctime | numeric | Có |  | Không | |
| ghichubenhnhan | text | Có |  | Không | |
| lastchuyenvien | text | Có |  | Không | |
| ghichubenhchinh | text | Có |  | Không | |
| ghichubenhkt | text | Có |  | Không | |
| dangkykhamid | integer | Có |  | Không | |
| ghichubenhkt2 | text | Có |  | Không | |
| json_ghichuicd | text | Có |  | Không | |
| dm_maloaikcbid | integer | Có |  | Không | |
| bedrefid | integer | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

Trong 1 lần điều trị, bệnh nhân có thế trải qua nhiều khoa, mỗi 1 bản ghi đại diện cho điều trị tại 1 khoa nào đó

## Ghi chú cột
medicalrecordstatus = 99 : kết thúc, =2: Đang điều trị, in (4,5,7) : Đang chuyển điều trị kết hợp, =0: Đợi nhập khoa

hinhthucvaovienid: = 2 : Khoa khác chuyển khoa sang, = 3: Khoa khác chuyển điều trị kết hợp sang

hinhthucravienid: = 0: nhập viện đối với ngoại trú
                 =1: Ra viện
                 =2: Xin về
                 =3: Bỏ về
                 =4: Đưa về
                 =5: Chuyển viện
                 =6: Tử vong
                 =7: Hẹn
                 =8: Chuyển khoa

