# Bảng `dangkykham`

## Mô tả

Bảng `dangkykham` lưu trữ thông tin về [mô tả mục đích của bảng].

## Cấu trúc bảng

| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |
|---------|-------------|---------------|------------------|------------|---------|
| dangkykhamid | integer | Không | nextval('dangkykham_dangkykhamid_seq'::regclass) | Có | |
| medicalrecordid | integer | Có |  | Không | |
| patientid | integer | Có |  | Không | |
| bhytid | integer | Có |  | Không | |
| doituongbenhnhanid | integer | Có |  | Không | |
| dangkykhamnumber | integer | Có |  | Không | |
| lydodenkham | text | Có |  | Không | |
| benhviencode | text | Có |  | Không | |
| dangkykhamstatus | integer | Có |  | Không | |
| dangkykhamdate | timestamp without time zone | Có |  | Không | |
| departmentgroupid | integer | Có |  | Không | |
| departmentid | integer | Có |  | Không | |
| version | timestamp without time zone | Có |  | Không | |
| yeucaukham | text | Có |  | Không | |
| dangkykhaminitdate | timestamp without time zone | Có |  | Không | |
| sync_flag | integer | Có |  | Không | |
| update_flag | integer | Có |  | Không | |
| nguoigioithieuid | integer | Có |  | Không | |
| isdangkyquaapi | integer | Có |  | Không | |
| servicepricerefid | integer | Có |  | Không | |
| patientid_old | integer | Có |  | Không | |

## Các chỉ mục

[Thông tin về các chỉ mục trên bảng nếu có]

## Ví dụ dữ liệu

[Ví dụ về dữ liệu trong bảng]

## Ghi chú

[Các ghi chú bổ sung về bảng]
