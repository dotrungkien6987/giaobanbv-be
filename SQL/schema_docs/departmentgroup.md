# Bảng `departmentgroup`

## Mô tả

Bảng `departmentgroup` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| departmentgroupid | integer | Không | nextval('departmentgroup_departmentgroupid_seq'::regclass) | Có | |
| departmentgroupcode | text | Có |  | Không | |
| departmentgroupname | text | Có |  | Không | |
| departmentgrouptype | integer | Có |  | Không | |
| truongkhoacode | text | Có |  | Không | |
| departmentgroupremark | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| isnhancapcuu | integer | Có |  | Không | |
| isnhanpttt | integer | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| ischongiuongkhichuyenkhoaden | integer | Có |  | Không | |
| istachnguonhachtoan | integer | Có |  | Không | |
| departmentgroupcode_byt | text | Có |  | Không | |
| tranbhyt | double precision | Có | '0'::double precision | Không | |
| makcbbd | text | Có |  | Không | |
| khoahuyethoc | integer | Có |  | Không | |
| hotrobaodongtype | integer | Có |  | Không | |
| benhvien_chinhanhid | integer | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
