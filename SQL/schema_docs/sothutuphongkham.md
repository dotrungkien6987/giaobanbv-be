# Bảng `sothutuphongkham`

## Mô tả

Bảng `sothutuphongkham` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| sothutuid | integer | Không | nextval('sothutuphongkham_sothutuid_seq'::regclass) | Có | |
| sothutunumber | integer | Có |  | Không | |
| readystatus | integer | Có |  | Không | |
| sothutudate | timestamp without time zone | Có |  | Không | |
| sothutudate_start | timestamp without time zone | Có |  | Không | |
| sothutudate_end | timestamp without time zone | Có |  | Không | |
| departmentid | integer | Có |  | Không | |
| departmentgroupid | integer | Có |  | Không | |
| sothutustatus | integer | Có |  | Không | |
| medicalrecordid | integer | Có |  | Không | |
| patientid | integer | Có | 0 | Không | |
| userid | integer | Có | 0 | Không | |
| isremoved | integer | Có | 0 | Không | |
| lastaccessdate | timestamp without time zone | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| goibenhnhan | integer | Có | 0 | Không | |
| maubenhphamid | integer | Có | 0 | Không | |
| canlamsangstatus | integer | Có | 0 | Không | |
| sothututype | integer | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| chandoanravien | text | Có |  | Không | |
| chandoanravien_code | text | Có |  | Không | |
| chandoanravien_kemtheo | text | Có |  | Không | |
| chandoanravien_kemtheo_code | text | Có |  | Không | |
| chandoanravien_kemtheo1 | text | Có |  | Không | |
| chandoanravien_kemtheo_code1 | text | Có |  | Không | |
| chandoanravien_kemtheo2 | text | Có |  | Không | |
| chandoanravien_kemtheo_code2 | text | Có |  | Không | |
| hinhthucxutriid | integer | Có |  | Không | |
| nextdepartmentid | integer | Có |  | Không | |
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
| chandoanbandau_code | text | Có |  | Không | |
| khambenh_thilucmatphai | text | Có |  | Không | |
| khambenh_thilucmattrai | text | Có |  | Không | |
| khambenh_klthilucmatphai | text | Có |  | Không | |
| khambenh_klthilucmattrai | text | Có |  | Không | |
| khambenh_nhanapmatphai | text | Có |  | Không | |
| khambenh_nhanapmattrai | text | Có |  | Không | |
| backdepartmentid | integer | Có |  | Không | |
| chandoanravien_phanbiet | text | Có |  | Không | |
| chandoanravien_phanbiet_code | text | Có |  | Không | |
| userid_thuchien | integer | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú
Một bệnh nhân có thể khám nhiều phòng khám, bảng này lưu thông tin 1 lần bệnh nhân đến khám tại 1 phòng.
sothutudate: thời gian phát sinh chỉ định đến khám tại phòng
sothutudate_start: thời gian bắt đầu khám
sothutudate_end: thời gian kết thúc khám
sothutustatus: = 0 khi chưa click bắt đầu khám, = 1 khi đã click bắt đầu khám, =2 đang chuyển khám thêm phòng khác, = 4 kết thúc khám
sothutunumber: Số thứ tự hiển thị bệnh nhân khi đến phòng khám