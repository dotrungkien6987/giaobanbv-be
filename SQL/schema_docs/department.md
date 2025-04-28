# Bảng `department`

## Mô tả

Bảng `department` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| departmentid | integer | Không | nextval('department_departmentid_seq'::regclass) | Có | |
| departmentgroupid | integer | Có |  | Không | |
| appid | integer | Có |  | Không | |
| departmentcode | text | Có |  | Không | |
| madaudocthe | text | Có |  | Không | |
| departmentname | text | Có |  | Không | |
| departmenttype | integer | Có |  | Không | |
| loaibenhanid | integer | Có |  | Không | |
| departmentremark | text | Có |  | Không | |
| listdepartmentlinhthuoc | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| departmentnumber | integer | Có |  | Không | |
| isphongluu | integer | Có |  | Không | |
| departmentgroupid_noitru | integer | Có |  | Không | |
| listdepartmentphongchidinh | text | Có |  | Không | |
| medicinestoreid | integer | Có |  | Không | |
| thoigianthuchien | text | Có |  | Không | |
| sothutuphongkham | integer | Có |  | Không | |
| maphongkham | text | Có |  | Không | |
| chuyenkhoaphongkham | text | Có |  | Không | |
| departmentnameck | text | Có |  | Không | |
| iskhonghoatdong | integer | Có |  | Không | |
| barcodeformat | text | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| sothutuuutien_max | integer | Có |  | Không | |
| sothutuuutien_lock | integer | Có |  | Không | |
| sothutuuutien_lastupdate | timestamp without time zone | Có |  | Không | |
| isphongcapcuu | integer | Có |  | Không | |
| departmentcode_byt | text | Có |  | Không | |
| yeucaukham | text | Có |  | Không | |
| tranbhyt | double precision | Có | '0'::double precision | Không | |
| listmayyte | text | Có |  | Không | |
| thoigianthuchiencls | double precision | Có |  | Không | |
| istudongchonmayyte | integer | Có |  | Không | |
| machuyenkhoatt43 | text | Có |  | Không | |
| makhoa4210 | text | Có |  | Không | |
| api_private_key | text | Có |  | Không | |
| listkhochidinh | text | Có |  | Không | |
| listbaodongid | text | Có |  | Không | |
| departmentgroupcode_byt | text | Có |  | Không | |
| iskhamhopdong | integer | Có |  | Không | |
| yeucaukham_dontiep | text | Có |  | Không | |
| trakq_min | double precision | Có | '0'::double precision | Không | |
| trakq_max | double precision | Có | '0'::double precision | Không | |
| truongphongcode | text | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
Departmenttype: = 7 là phòng thực hiện, = 38 là phòng lấy mẫu, = 2 là phòng khám,