### **TÀI LIỆU PHÂN TÍCH THIẾT KẾ HỆ THỐNG**
**Dự án:** Hệ thống Quản lý Hiệu suất Công việc Toàn diện - Bệnh viện Phú Thọ
**Phiên bản:** 1.0
**Ngày tạo:** 29/07/2025
**Chuyên gia phân tích:** Gemini (AI System Analyst)

---

## **1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)**

### 1.1. Bối cảnh và Mục tiêu
Bệnh viện Phú Thọ cần một giải pháp số hóa toàn diện để quản lý công việc và đánh giá hiệu suất (KPI) của nhân viên một cách minh bạch, công bằng và hiệu quả. Hệ thống hiện tại (nếu có) còn phân mảnh, thủ công, gây khó khăn trong việc theo dõi, phối hợp và thiếu cơ sở dữ liệu tin cậy để đánh giá.

**Mục tiêu chính của hệ thống:**
* **Chuẩn hóa & Tự động hóa:** Xây dựng một quy trình quản lý công việc thống nhất từ giao việc, phối hợp liên phòng ban (tickets) đến theo dõi và báo cáo.
* **Liên kết chặt chẽ:** Tạo ra sự liên kết logic giữa các **Nhiệm vụ Thường quy** (chức năng, nhiệm vụ cốt lõi) với các **Công việc được giao** (phát sinh) và **Yêu cầu hỗ trợ** (tickets) hàng ngày.
* **Đo lường hiệu suất (KPI):** Cung cấp một nền tảng để Trưởng phòng ban đánh giá hiệu suất của nhân viên dựa trên dữ liệu định lượng và định tính được thu thập một cách có hệ thống.
* **Tăng cường Trách nhiệm & Hợp tác:** Minh bạch hóa luồng công việc, giúp nhân viên nắm rõ trách nhiệm và thúc đẩy văn hóa phối hợp hiệu quả giữa các phòng ban.

### 1.2. Phạm vi và Người dùng
* **Phạm vi:** Áp dụng cho toàn bộ các phòng ban của Bệnh viện Phú Thọ.
* **Đối tượng người dùng chính:**
    * **Ban Giám đốc:** Xem báo cáo tổng quan, theo dõi hiệu suất toàn viện, đưa ra các quyết định chiến lược.
    * **Trưởng phòng ban:** Quản lý và phân công công việc cho nhân viên, theo dõi tiến độ, xử lý các yêu cầu leo thang, và là người trực tiếp **đánh giá KPI** của nhân viên trong phòng.
    * **Nhân viên:** Nhận việc, báo cáo tiến độ, tạo yêu cầu hỗ trợ (ticket) tới các phòng ban khác, và xem lại kết quả đánh giá của bản thân.

---

## **2. PHÂN TÍCH NGHIỆP VỤ (BUSINESS ANALYSIS)**

### 2.1. Các Khái niệm Cốt lõi
Đây là nền tảng của toàn bộ hệ thống. Việc phân biệt rõ ràng 3 loại hình công việc này là chìa khóa để triển khai thành công.

| Loại hình | Tên gọi | Bản chất | Ví dụ | Mục đích chính |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Nhiệm vụ Thường quy** (Routine Duty) | Là các **chức năng, nhiệm vụ cốt lõi**, dài hạn, được gắn liền với một Vị trí công việc cụ thể. Không có deadline cụ thể nhưng có **độ khó**. | "Quản lý hạ tầng mạng LAN/Wifi", "Quản lý phần mềm HIS", "Mua sắm vật tư y tế". | Làm **khung tham chiếu** để đánh giá KPI. |
| 2 | **Công việc Được giao** (Assigned Task) | Là các **đầu việc cụ thể, có thời hạn**, do cấp trên giao cho cấp dưới. | "Nâng cấp server phòng máy chủ trong tuần này", "Lập báo cáo tài chính tháng 7". | Hoàn thành một mục tiêu cụ thể. Dữ liệu để **đánh giá** Nhiệm vụ Thường quy. |
| 3 | **Yêu cầu Hỗ trợ** (Ticket/Request) | Là các **yêu cầu phối hợp, xử lý sự cố** giữa các cá nhân/phòng ban. | "IT: Sửa máy tính phòng khám số 3", "Kỹ thuật: Sửa điều hòa khu A". | Giải quyết các vấn đề phát sinh. Dữ liệu để **đánh giá** Nhiệm vụ Thường quy. |

**Mối quan hệ VÀNG:**
Mỗi **Công việc Được giao** và mỗi **Yêu cầu Hỗ trợ (Ticket)** khi được tạo ra **BẮT BUỘC** phải được gán vào một **Nhiệm vụ Thường quy** liên quan. Đây là cơ sở để Trưởng phòng có cái nhìn tổng quan khi chấm điểm KPI.
* *Ví dụ: Ticket "Sửa máy in khoa X" sẽ được gán vào Nhiệm vụ Thường quy "Hỗ trợ và sửa chữa thiết bị văn phòng" của nhân viên IT.*

### 2.2. Luồng Nghiệp vụ Chính

#### 2.2.1. Luồng Quản lý và Đánh giá KPI (Tổng thể)
mermaid
graph TD
    subgraph "Giai đoạn Thiết lập"
        A[Admin/HR tạo Cơ cấu tổ chức] --> B[Admin/HR tạo Danh mục Vị trí Công việc]
        B --> C[Trưởng phòng định nghĩa các Nhiệm vụ Thường quy & Độ khó]
        C --> D[Trưởng phòng gán Nhiệm vụ Thường quy cho Vị trí Công việc]
        D --> E[Admin thiết lập Chu kỳ Đánh giá KPI]
    end

    subgraph "Giai đoạn Vận hành (Trong chu kỳ)"
        F[Nhân viên/Quản lý tạo & xử lý Công việc Được giao] --> G
        H[Nhân viên/Phòng ban tạo & xử lý Yêu cầu Hỗ trợ (Ticket)] --> G
        G(Tất cả công việc/ticket đều được GẮN với Nhiệm vụ Thường quy)
    end

    subgraph "Giai đoạn Đánh giá (Cuối chu kỳ)"
        I[Đến cuối chu kỳ, Trưởng phòng mở màn hình Đánh giá KPI] --> J[Hệ thống tổng hợp tất cả Công việc & Ticket theo từng Nhiệm vụ Thường quy]
        J --> K[Trưởng phòng xem lại lịch sử, tiến độ, chất lượng và chấm điểm cho từng Nhiệm vụ]
        K --> L[Hệ thống tự động tính Tổng điểm KPI]
        L --> M[Nhân viên xem kết quả, có thể phản hồi]
        M --> N[Hoàn tất chu kỳ]
    end

    E --> F & H
    
#### 2.2.2 Luồng Chi tiết cho "Công việc Được giao"
    graph TD
    A[Người giao tạo việc] --> B{Giao cho Cá nhân hay Nhóm?}
    B --Cá nhân--> C[Chọn 1 Nhân viên]
    B --Nhóm--> D[Chọn nhiều Nhân viên]
    D --> E[Nhân viên trong nhóm nhận việc]
    C --> E
    E --> F{Chấp nhận hay Từ chối?}
    F --Chấp nhận--> G[Thực hiện & Cập nhật tiến độ]
    F --Từ chối, có lý do--> H[Thông báo cho người giao]
    G --> I["Báo cáo hoàn thành (Chờ duyệt)"]
    I --> J[Người giao việc đánh giá]
    J --> K{Đạt hay Cần sửa?}
    K --Đạt--> L[Hoàn thành]
    K --Cần sửa--> G

#### 2.2.3. Luồng Chi tiết cho "Yêu cầu Hỗ trợ (Ticket)"
graph TD
    A[Người yêu cầu tạo ticket] --> B[Hệ thống tự động gửi đến Phòng ban xử lý]
    B --> C[Phòng ban xử lý nhận và phân công]
    C --> D[Nhân viên được phân công tiếp nhận]
    D --> E{Có thể xử lý?}
    E --Có--> F[Bắt đầu xử lý]
    E --Không--> G[Từ chối, nêu rõ lý do]
    F --> H[Cập nhật tiến độ/Chờ phản hồi nếu cần]
    H --> I[Báo cáo Hoàn thành]
    I --> J[Người yêu cầu xác nhận và Đóng ticket]
    J --> K{Vấn đề đã OK?}
    K --OK--> L[Đã đóng]
    K --Chưa OK--> M[Mở lại (Re-open)]
    M --> F