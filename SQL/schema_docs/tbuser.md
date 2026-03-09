# Bảng `tbuser`

## Mô tả

Bảng `tbuser` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| userid | integer | Không | nextval('tbuser_userid_seq'::regclass) | Có | |
| usercode | text | Không |  | Không | |
| username | text | Có |  | Không | |
| userpassword | text | Có |  | Không | |
| userstatus | integer | Có |  | Không | |
| permissiongroupcode | integer | Có |  | Không | |
| imagedata | bytea | Có |  | Không | |
| imagesize | integer | Có | 0 | Không | |
| lastpingtime | timestamp without time zone | Có |  | Không | |
| userremark | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| isencript | integer | Có |  | Không | |
| usercode_byt | text | Có |  | Không | |
| userdienthoai | text | Có |  | Không | |
| useremr | character varying(1000) | Có |  | Không | |
| isuseremr | integer | Có |  | Không | |
| dtqg_user | text | Có |  | Không | |
| dtqg_pass | text | Có |  | Không | |
| mabhxh | text | Có |  | Không | |
| cccd | text | Có |  | Không | |
| chucdanh | text | Có |  | Không | |
| userextend | text | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
