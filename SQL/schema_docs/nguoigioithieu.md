# Bảng `nguoigioithieu`

## Mô tả

Bảng `nguoigioithieu` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| nguoigioithieuid | integer | Không | nextval('nguoigioithieu_nguoigioithieuid_seq'::regclass) | Có | |
| nguoigioithieucode | text | Có |  | Không | |
| nguoigioithieuname | text | Có |  | Không | |
| nguoigioithieuaddress | text | Có |  | Không | |
| nguoigioithieuphone | text | Có |  | Không | |
| nguoigioithieubank | text | Có |  | Không | |
| nguoigioithieuremark | text | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| agencyid | integer | Có |  | Không | |
| departmentgroupid | integer | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
