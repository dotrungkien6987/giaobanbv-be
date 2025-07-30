# Work Management Module

Module quản lý công việc và đánh giá KPI cho Bệnh viện Phú Thọ.

## Cấu trúc thư mục

```
modules/workmanagement/
├── models/              # Mongoose schemas
├── controllers/         # Business logic controllers
├── routes/             # API routes definitions
├── services/           # Business services
├── validators/         # Input validation
├── utils/             # Utility functions
└── README.md          # Documentation
```

## Các Models chính

### 1. Core Organization (Tổ chức)

- **Department**: Phòng ban
- **JobPosition**: Vị trí công việc
- **Employee**: Nhân viên
- **EmployeePositionHistory**: Lịch sử thay đổi vị trí

### 2. Routine Duties (Nhiệm vụ thường quy)

- **RoutineDuty**: Nhiệm vụ thường quy
- **PositionRoutineDuty**: Gán nhiệm vụ cho vị trí

### 3. Evaluation System (Hệ thống đánh giá)

- **EvaluationCriteria**: Tiêu chí đánh giá
- **PositionEvaluationCriteria**: Tiêu chí theo vị trí
- **EvaluationCycle**: Chu kỳ đánh giá
- **KpiEvaluation**: Đánh giá KPI
- **RoutineDutyEvaluation**: Đánh giá nhiệm vụ thường quy
- **CriteriaScore**: Điểm số theo tiêu chí

### 4. Task Management (Quản lý công việc)

- **AssignedTask**: Công việc được giao
- **TaskAssignee**: Người thực hiện công việc

### 5. Ticket System (Hệ thống ticket)

- **TicketCategory**: Loại yêu cầu hỗ trợ
- **Ticket**: Yêu cầu hỗ trợ

### 6. Support Systems (Hệ thống hỗ trợ)

- **File & FileAttachment**: Quản lý files
- **Comment**: Bình luận
- **Notification**: Thông báo

## Quan hệ dữ liệu chính

### Luồng KPI Core:

```
Employee -> JobPosition -> PositionRoutineDuty -> RoutineDuty
                                                      ↓
AssignedTask -> RoutineDuty <- Ticket
                ↓
        KPI Evaluation
```

### Luồng đánh giá:

```
EvaluationCycle -> KpiEvaluation -> RoutineDutyEvaluation -> CriteriaScore
```

## Tính năng chính

1. **Quản lý tổ chức**: Phòng ban, vị trí, nhân viên
2. **Định nghĩa nhiệm vụ**: Nhiệm vụ thường quy theo phòng ban
3. **Giao việc**: Công việc cụ thể gắn với nhiệm vụ thường quy
4. **Hệ thống ticket**: Yêu cầu hỗ trợ liên phòng ban
5. **Đánh giá KPI**: Chu kỳ đánh giá dựa trên hoạt động thực tế
6. **Báo cáo**: Thống kê, phân tích hiệu suất

## Cách sử dụng

```javascript
// Import models
const { Department, Employee, RoutineDuty, AssignedTask } = require("./models");

// Tạo phòng ban
const department = new Department({
  name: "Phòng IT",
  code: "IT",
  description: "Quản lý hệ thống thông tin",
});

// Tạo nhiệm vụ thường quy
const routineDuty = new RoutineDuty({
  name: "Bảo trì hệ thống mạng",
  departmentId: department._id,
  difficultyLevel: 7,
});
```

## Validation và Business Rules

- Mỗi công việc/ticket phải gắn với một nhiệm vụ thường quy
- Tổng tỷ trọng nhiệm vụ của một vị trí không vượt quá 100%
- Số ticket tự động tăng theo năm (TK2025000001)
- Validation điểm số theo min/max của tiêu chí

## Database Indexes

Tất cả models đều có indexes được tối ưu cho:

- Tìm kiếm thường dùng
- Foreign key relationships
- Sorting và filtering
- Performance queries

## Notes

- Compatible với MongoDB/Mongoose
- Sử dụng timestamps tự động
- Virtual fields cho navigation
- Pre/post hooks cho business logic
- Comprehensive error handling
