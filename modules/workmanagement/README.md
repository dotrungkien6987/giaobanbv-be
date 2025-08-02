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
├── migrations/        # Database migration scripts
└── README.md          # Documentation
```

## Các Models chính (Cập nhật 2025)

### 1. Core Organization (Tổ chức)

- **Department**: Phòng ban
- **Employee**: Nhân viên (đã bỏ liên kết với JobPosition)

### 2. Routine Duties (Nhiệm vụ thường quy)

- **RoutineDuty**: Nhiệm vụ thường quy
- **EmployeeRoutineDuty**: Gán nhiệm vụ trực tiếp cho nhân viên (thay thế PositionRoutineDuty)

### 3. Evaluation System (Hệ thống đánh giá)

- **EvaluationCriteria**: Tiêu chí đánh giá
- **EvaluationCycle**: Chu kỳ đánh giá
- **KpiEvaluation**: Đánh giá KPI
- **RoutineDutyEvaluation**: Đánh giá nhiệm vụ thường quy
- **CriteriaScore**: Điểm số theo tiêu chí

### 4. Task Management (Quản lý công việc)

- **AssignedTask**: Công việc được giao
- **TaskAssignee**: Người thực hiện công việc
- **NhomViecUser**: Nhóm việc do người dùng tự định nghĩa để phân loại công việc

### 5. Ticket System (Hệ thống ticket)

- **TicketCategory**: Loại yêu cầu hỗ trợ
- **Ticket**: Yêu cầu hỗ trợ

### 6. Support Systems (Hệ thống hỗ trợ)

- **File**: Quản lý files
- **Comment**: Bình luận (có soft delete)
- **Notification**: Thông báo

## Quan hệ dữ liệu chính (Cập nhật)

### Luồng KPI Core (Đã đơn giản hóa):

```
Employee -> EmployeeRoutineDuty -> RoutineDuty
                                       ↓
AssignedTask -> RoutineDuty <- Ticket
    ↓
NhomViecUser (Phân loại)
    ↓
KPI Evaluation
```

### Luồng đánh giá:

```
EvaluationCycle -> KpiEvaluation -> RoutineDutyEvaluation -> CriteriaScore
```

## Thay đổi quan trọng (2025)

### ✅ Đã loại bỏ:

- **JobPosition** (Vị trí công việc)
- **PositionRoutineDuty** (Gán nhiệm vụ theo vị trí)
- **EmployeePositionHistory** (Lịch sử vị trí nhân viên)
- **PositionEvaluationCriteria** (Tiêu chí đánh giá theo vị trí)

### ✅ Đã thêm:

- **EmployeeRoutineDuty**: Gán nhiệm vụ trực tiếp cho nhân viên
- **isDeleted**: Trường xóa mềm cho tất cả models chính
- **PhongBanID**: Trực tiếp trong Employee (không qua JobPosition)
- **CapBac**: Cấp bậc trực tiếp trong Employee

### ✅ Soft Delete:

Tất cả models chính đều hỗ trợ xóa mềm với trường `isDeleted`:

- Employee
- RoutineDuty
- EmployeeRoutineDuty
- AssignedTask
- Comment

## Tính năng chính

1. **Quản lý tổ chức**: Phòng ban, nhân viên (không qua vị trí công việc)
2. **Định nghĩa nhiệm vụ**: Nhiệm vụ thường quy theo phòng ban
3. **Giao việc**: Gán trực tiếp nhiệm vụ cho nhân viên
4. **Hệ thống ticket**: Yêu cầu hỗ trợ liên phòng ban
5. **Đánh giá KPI**: Chu kỳ đánh giá dựa trên hoạt động thực tế
6. **Báo cáo**: Thống kê, phân tích hiệu suất
7. **Soft Delete**: Xóa mềm cho tất cả dữ liệu quan trọng

## Cách sử dụng

```javascript
// Import models
const {
  Department,
  Employee,
  RoutineDuty,
  AssignedTask,
  EmployeeRoutineDuty,
} = require("./models");

// Tạo phòng ban
const department = new Department({
  name: "Phòng IT",
  code: "IT",
  description: "Quản lý hệ thống thông tin",
});

// Tạo nhân viên (trực tiếp thuộc phòng ban)
const employee = new Employee({
  MaNhanVien: "IT001",
  HoTen: "Nguyễn Văn A",
  Email: "a.nguyen@hospital.com",
  PhongBanID: department._id,
  CapBac: "NHANVIEN",
});

// Tạo nhiệm vụ thường quy
const routineDuty = new RoutineDuty({
  name: "Bảo trì hệ thống",
  description: "Kiểm tra và bảo trì hệ thống hàng tuần",
  departmentId: department._id,
  difficultyLevel: 5,
});

// Gán nhiệm vụ trực tiếp cho nhân viên
const employeeRoutineDuty = new EmployeeRoutineDuty({
  employeeId: employee._id,
  routineDutyId: routineDuty._id,
  weightPercentage: 50,
  assignedBy: managerId,
});

// Tạo công việc cụ thể
const assignedTask = new AssignedTask({
  TieuDe: "Bảo trì server tuần này",
  MoTa: "Kiểm tra và bảo trì server chính",
  NhiemVuThuongQuyID: routineDuty._id,
  NguoiGiaoViecID: managerId,
  NgayHetHan: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});
```

## Migration

Để chuyển đổi từ cấu trúc cũ sang cấu trúc mới:

```bash
# Chạy migration script
node modules/workmanagement/migrations/001_remove_job_position.js
```

Script sẽ tự động:

1. Backup dữ liệu hiện tại
2. Tạo EmployeeRoutineDuty từ PositionRoutineDuty
3. Cập nhật Employee records
4. Thêm trường isDeleted
5. Tạo báo cáo migration

## Lợi ích của thay đổi

1. **Đơn giản hóa**: Bỏ lớp trung gian JobPosition
2. **Linh hoạt**: Gán trực tiếp nhiệm vụ cho nhân viên
3. **Hiệu quả**: Ít join queries, tốc độ nhanh hơn
4. **Dễ bảo trì**: Cấu trúc đơn giản hơn
5. **Soft Delete**: Không mất dữ liệu khi xóa
   const routineDuty = new RoutineDuty({
   name: "Bảo trì hệ thống mạng",
   departmentId: department.\_id,
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
```
