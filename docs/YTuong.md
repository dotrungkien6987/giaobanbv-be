# Hệ thống có thể quản lý công việc với các loại như sau:
## 1.Công việc thường quy
- Mỗi 1 phòng ban sẽ có 1 danh sách các công việc thường quy, là các đầu việc liên quan đến chức năng nhiệm vụ của phòng ban đó . Ví dụ : Quản lý hạ tầng mạng LAN, Wifi, phòng máy chủ
    Quản lý hệ thống mạng Internet, Bảo mật và an ninh mạng
    Quản lý phần mềm HIS
    Quản lý phần mềm LIS

- Các đầu việc thường quy sẽ cấu hình điểm độ khó khác nhau từ (1-10)

- Có Danh mục vị trí công việc (Tên, phòng ban, mô tả chung)
- Mỗi 1 vị trí công việc sẽ đảm nhận nhiều đầu việc thường quy khác nhau
- Mỗi 1 nhân viên sẽ đảm nhận 1 ví trí công việc
- Mỗi 1 đầu việc thường quy sẽ được chấm điểm 
- Sẽ có 1 danh sách tiêu chí để chấm điểm (Tên tiêu chí, trọng số tiêu chí, Loại là giảm hoặc tăng) . 
Ví dụ : 
        + Mức độ hoàn thành : 0-100%
        + Điểm tích cực: 0-10%
        + Điểm sáng tạo: 0-10%
        + Điểm trừ quá hạn: trừ 1-10%
- Trưởng phòng sẽ chấm điểm theo các tiêu chí này đối với từng đầu việc thường quy: = Độ khó công việc (Tổng điểm các tiêu chí)        
- Chấm điểm KPI sẽ dựa trên tổng điểm KPI của từng đầu việc thường quy = Tổng điểm các đầu việc thường quy/10
## Công việc phát sinh ( chưa biết dùng tên như thế nào cho hợp lý)
- Dùng để cấp quản lý giao việc cho nhân viên, quản lý giao việc như của 1 bài toán quản lý công việc điển hình, như Mức độ ưu tiên, trạng thái công việc, ngày giao, deadline,....
- Mỗi 1 công việc này sẽ được gán thuộc loại công việc thường quy nào đó, mục đích sẽ để trưởng phòng review lại quá trình hoạt động đối với từng đầu việc thường quy để chấm điểm
- Các công việc có thể có quan hệ phân cấp cha con ( Ví dụ 1 việc từ giám đốc giao xuống trưởng phòng, trưởng phòng có thể tiếp tục chia thành nhiều việc giao xuống nhân viên)

## Công việc thuộc loại tiket
- Dùng để quản lý các nhân viên gửi yêu cầu xử lý cho nhau, quản lý như 1 hệ thống ticket điển hình
- Mỗi 1 ticket cũng sẽ gán với 1 đầu việc thường quy để hỗ trợ review cho trưởng phòng trong quá trình chấm điểm

## Các yêu cầu khác
- Có cơ chế thiết lập các chu kỳ để đánh giá chấm điểm KPI theo từng chu kỳ ( Ví dụ tháng 1,2...)
