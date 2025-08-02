# Phase 6: Xây dựng Frontend cho Hệ thống Quản lý Công việc và KPI

## Mục tiêu Phase 6

Xây dựng giao diện người dùng (Frontend) hoàn chỉnh cho toàn bộ hệ thống, sử dụng các APIs đã được xây dựng ở các phase trước.

## Công nghệ sử dụng

- **Framework**: React.js (hoặc Next.js)
- **State Management**: Redux Toolkit (hoặc React Context/Zustand)
- **UI Library**: Ant Design (hoặc Material-UI, Chakra UI)
- **Data Fetching**: Axios (hoặc React Query)
- **Styling**: Styled-components (hoặc CSS Modules, Tailwind CSS)
- **Routing**: React Router
- **Charts**: Recharts (hoặc Chart.js)

## Cấu trúc thư mục Frontend (ví dụ)

```
/src
  /api             // API call functions
  /app             // Redux store, slices
  /assets          // Images, fonts, etc.
  /components      // Reusable UI components
    /common        // Buttons, Inputs, Modals
    /layout        // MainLayout, Sidebar, Header
    /kpi           // KPI-related components
    /tasks         // Task-related components
    /tickets       // Ticket-related components
  /constants       // Constants, enums
  /contexts        // React contexts
  /features        // Feature-based modules (slices, components, pages)
    /auth
    /dashboard
    /kpi-evaluation
    /routine-duties
    /assigned-tasks
    /tickets
  /hooks           // Custom hooks
  /pages           // Page components
  /routes          // Routing configuration
  /styles          // Global styles, theme
  /utils           // Utility functions
  App.js
  index.js
```

## Kế hoạch triển khai Frontend (theo từng module)

### 1. Module Xác thực và Layout chính (Authentication & Main Layout)

#### Chức năng:

- Trang Đăng nhập
- Xử lý token (lưu trữ, refresh)
- Route bảo vệ (Protected Routes)
- Layout chính (Sidebar, Header, Content Area)
- Sidebar động theo vai trò người dùng (Admin, Manager, Employee)

#### Components cần tạo:

- `LoginPage.js`
- `AuthSlice.js` (Redux)
- `apiAuth.js`
- `MainLayout.js`
- `Sidebar.js`
- `Header.js`
- `ProtectedRoute.js`

### 2. Module Nhiệm vụ Thường quy (Routine Duties)

#### Chức năng:

- **Manager/Admin**:
  - Xem danh sách Nhiệm vụ Thường quy (có filter, search, pagination)
  - Tạo/Sửa/Xóa Nhiệm vụ Thường quy
  - Gán nhiệm vụ cho Vị trí công việc
- **Employee**:
  - Xem danh sách nhiệm vụ được gán cho vị trí của mình

#### Components cần tạo:

- `RoutineDutyListPage.js`
- `RoutineDutyForm.js` (Modal/Drawer)
- `AssignDutyToPositionModal.js`
- `RoutineDutySlice.js`
- `apiRoutineDuty.js`

### 3. Module Công việc Được giao (Assigned Tasks)

#### Chức năng:

- **Manager**:
  - Tạo công việc mới, giao cho cá nhân/nhóm
  - Xem danh sách công việc đã giao (dashboard view: Kanban, List, Calendar)
  - Theo dõi tiến độ, xem lịch sử cập nhật
  - Đánh giá và duyệt công việc hoàn thành
- **Employee**:
  - Xem danh sách công việc được giao
  - Chấp nhận/Từ chối công việc
  - Cập nhật tiến độ, thêm comment
  - Báo cáo hoàn thành

#### Components cần tạo:

- `AssignedTaskPage.js` (với các view Kanban, List)
- `TaskKanbanBoard.js`
- `TaskList.js`
- `TaskDetailModal.js`
- `CreateTaskForm.js`
- `TaskFeedbackModal.js` (chấp nhận/từ chối)
- `UpdateProgressModal.js`
- `SubmitCompletionModal.js`
- `EvaluateTaskModal.js`
- `AssignedTaskSlice.js`
- `apiAssignedTask.js`

### 4. Module Yêu cầu Hỗ trợ (Tickets)

#### Chức năng:

- **All Users**:
  - Tạo ticket mới
- **Manager/Handler**:
  - Xem danh sách tickets của phòng ban
  - Tiếp nhận, phân công ticket
  - Xử lý, cập nhật, chuyển tiếp, leo thang ticket
- **Requester**:
  - Theo dõi trạng thái ticket của mình
  - Phản hồi, xác nhận và đóng ticket
  - Đánh giá chất lượng hỗ trợ

#### Components cần tạo:

- `TicketListPage.js`
- `CreateTicketPage.js`
- `TicketDetailView.js`
- `TicketCommentSection.js`
- `AcknowledgeTicketModal.js`
- `AssignTicketModal.js`
- `ResolveTicketModal.js`
- `CloseTicketModal.js` (với rating)
- `TransferTicketModal.js`
- `EscalateTicketModal.js`
- `TicketSlice.js`
- `apiTicket.js`

### 5. Module Đánh giá KPI (KPI Evaluation)

#### Chức năng:

- **Admin/HR**:
  - Quản lý Chu kỳ đánh giá
- **Manager**:
  - Màn hình đánh giá KPI cho nhân viên
  - Xem dữ liệu tổng hợp (công việc, tickets)
  - Chấm điểm, đưa ra nhận xét
- **Employee**:
  - Xem kết quả KPI của mình
  - Gửi phản hồi về kết quả

#### Components cần tạo:

- `EvaluationCyclePage.js` (Admin)
- `KpiEvaluationPage.js` (Manager)
  - `EmployeeListForKpi.js`
  - `KpiEvaluationForm.js`
    - `DutyEvaluationRow.js`
    - `AggregatedDataPanel.js`
- `MyKpiResultPage.js` (Employee)
- `KpiSlice.js`
- `apiKpi.js`

### 6. Module Báo cáo và Thống kê (Dashboard & Reports)

#### Chức năng:

- **Dashboard cá nhân**:
  - Công việc của tôi, tickets của tôi
- **Dashboard quản lý**:
  - Thống kê tổng quan về công việc, tickets của phòng ban
  - Biểu đồ hiệu suất
- **Báo cáo KPI toàn viện** (cho Ban Giám đốc)

#### Components cần tạo:

- `DashboardPage.js`
- `TaskSummaryWidget.js`
- `TicketSummaryWidget.js`
- `KpiReportPage.js`
- `TeamPerformanceChart.js`
- `SlaPerformanceChart.js`
- `DashboardSlice.js`
- `apiDashboard.js`

## Quy trình phát triển Frontend

1. **Thiết lập dự án**:

   - `create-react-app` hoặc `create-next-app`
   - Cài đặt các thư viện cần thiết (Redux, Ant Design, etc.)
   - Cấu trúc thư mục

2. **Xây dựng Layout và Xác thực**:

   - Implement trang đăng nhập và layout chính
   - Thiết lập Redux store và slice cho auth

3. **Phát triển theo từng Module**:

   - Bắt đầu với module đơn giản nhất (e.g., Nhiệm vụ Thường quy)
   - Tạo slice, API functions, components và pages cho từng module
   - **Component-Driven Development**: Xây dựng các components nhỏ, tái sử dụng trước, sau đó ghép lại thành pages

4. **Tích hợp API**:

   - Viết các hàm gọi API trong `/api`
   - Sử dụng `createAsyncThunk` trong Redux slices để xử lý data fetching

5. **Quản lý State**:

   - Dùng Redux cho global state (user info, auth token)
   - Dùng state của component hoặc React Query cho local/server state (form data, fetched list)

6. **Styling**:

   - Tùy chỉnh theme của Ant Design
   - Viết custom styles khi cần thiết

7. **Testing**:

   - Unit test cho các utility functions và Redux logic (sử dụng Jest, React Testing Library)
   - Component testing
   - End-to-end testing (sử dụng Cypress hoặc Playwright)

8. **Tối ưu hóa**:
   - Code splitting (React.lazy)
   - Memoization (React.memo, useMemo, useCallback)
   - Tối ưu hóa re-renders

## Kết quả mong đợi Phase 6

- ✅ Một ứng dụng Frontend hoàn chỉnh, đáp ứng đầy đủ các yêu cầu nghiệp vụ
- ✅ Giao diện người dùng thân thiện, dễ sử dụng
- ✅ Phân quyền rõ ràng cho từng vai trò
- ✅ Tích hợp mượt mà với Backend APIs
- ✅ Sẵn sàng cho việc triển khai và sử dụng thực tế

## Files cần tạo trong Phase 6

- Toàn bộ cấu trúc thư mục và các files của một dự án React/Next.js.
- Các files chính cần tập trung:
  - `src/app/store.js` (Redux store)
  - `src/routes/AppRouter.js` (Cấu hình routes)
  - `src/features/{module}/{module}Slice.js` (Redux slices)
  - `src/api/{module}Api.js` (API calls)
  - Các files trong `src/pages` và `src/components` cho từng module.

## Lưu ý quan trọng

- **User Experience (UX)**: Thiết kế luồng người dùng một cách logic và trực quan.
- **Responsiveness**: Đảm bảo giao diện hoạt động tốt trên các kích thước màn hình khác nhau.
- **Performance**: Tối ưu hóa thời gian tải trang và tốc độ phản hồi của UI.
- **Security**: Xử lý an toàn token, tránh các lỗ hổng XSS.
- **Accessibility (a11y)**: Đảm bảo ứng dụng có thể sử dụng được bởi người khuyết tật.
