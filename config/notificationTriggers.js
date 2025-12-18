/**
 * Centralized Notification Triggers Configuration
 *
 * Mỗi trigger có cấu trúc:
 * - enabled: boolean - Bật/tắt trigger (cần restart server)
 * - template: string - Template type (phải match với NotificationTemplate.type)
 * - description: string - Mô tả trigger (Vietnamese)
 * - handler: string - Handler type để xử lý logic recipients
 * - recipients: string - Loại người nhận
 * - excludePerformer: boolean - Có loại trừ người thực hiện không
 *
 * Recipients Types:
 * - "assignee": NguoiChinhID (người được giao việc)
 * - "assigner": NguoiGiaoViecID (người giao việc)
 * - "participants": NguoiThamGia[] (người tham gia)
 * - "all": assignee + assigner + participants
 * - "employee": NhanVienID trong DanhGiaKPI
 * - "manager": NguoiDanhGiaID trong DanhGiaKPI
 */

module.exports = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CÔNG VIỆC (CongViec) - 19 triggers (11 workflow + 8 update actions)
  // ═══════════════════════════════════════════════════════════════════════════

  // Legacy function giaoViec() dùng key này
  "CongViec.giaoViec": {
    enabled: true,
    template: "TASK_ASSIGNED",
    description: "Thông báo khi được giao việc mới (legacy)",
    handler: "congViec",
    recipients: "assignee",
    excludePerformer: true,
  },

  // Transition action GIAO_VIEC dùng key này
  "CongViec.GIAO_VIEC": {
    enabled: true,
    template: "TASK_ASSIGNED",
    description: "Thông báo khi được giao việc mới (transition)",
    handler: "congViec",
    recipients: "assignee",
    excludePerformer: true,
  },

  // Hủy giao việc - thông báo cho người được giao
  "CongViec.HUY_GIAO": {
    enabled: true,
    template: "TASK_CANCELLED",
    description: "Thông báo khi hủy giao việc",
    handler: "congViec",
    recipients: "assignee",
    excludePerformer: true,
  },

  // Hủy hoàn thành tạm - thông báo cho người được giao
  "CongViec.HUY_HOAN_THANH_TAM": {
    enabled: true,
    template: "TASK_REVISION_REQUESTED",
    description: "Thông báo khi hủy hoàn thành tạm (yêu cầu làm lại)",
    handler: "congViec",
    recipients: "assignee",
    excludePerformer: true,
  },

  "CongViec.TIEP_NHAN": {
    enabled: true,
    template: "TASK_ACCEPTED",
    description: "Thông báo khi nhân viên tiếp nhận công việc",
    handler: "congViec",
    recipients: "assigner",
    excludePerformer: true,
  },

  "CongViec.HOAN_THANH": {
    enabled: true,
    template: "TASK_COMPLETED",
    description: "Thông báo khi nhân viên báo hoàn thành",
    handler: "congViec",
    recipients: "assigner",
    excludePerformer: true,
  },

  "CongViec.HOAN_THANH_TAM": {
    enabled: true,
    template: "TASK_PENDING_APPROVAL",
    description: "Thông báo khi nhân viên báo hoàn thành (chờ duyệt)",
    handler: "congViec",
    recipients: "assigner",
    excludePerformer: true,
  },

  "CongViec.DUYET_HOAN_THANH": {
    enabled: true,
    template: "TASK_APPROVED",
    description: "Thông báo khi công việc được duyệt hoàn thành",
    handler: "congViec",
    recipients: "assignee",
    excludePerformer: true,
  },

  // NOTE: TU_CHOI action chưa được implement trong workflow hiện tại
  // Trigger này sẽ không bao giờ được fire cho đến khi có action TU_CHOI
  "CongViec.TU_CHOI": {
    enabled: false, // Disabled vì action chưa tồn tại
    template: "TASK_REJECTED",
    description: "Thông báo khi công việc bị từ chối (chưa implement)",
    handler: "congViec",
    recipients: "assignee",
    excludePerformer: true,
  },

  "CongViec.MO_LAI_HOAN_THANH": {
    enabled: true,
    template: "TASK_REOPENED",
    description: "Thông báo khi mở lại công việc đã hoàn thành",
    handler: "congViec",
    recipients: "assignee",
    excludePerformer: true,
  },

  "CongViec.comment": {
    enabled: true,
    template: "COMMENT_ADDED",
    description: "Thông báo khi có bình luận mới trên công việc",
    handler: "comment",
    recipients: "all", // Gửi cho tất cả người liên quan
    excludePerformer: true,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CongViec Update Actions - 8 triggers (field changes, participants, files)
  // ──────────────────────────────────────────────────────────────────────────

  "CongViec.capNhatDeadline": {
    enabled: true,
    template: "TASK_DEADLINE_UPDATED",
    description: "Thông báo khi deadline công việc thay đổi",
    handler: "congViecUpdate",
    recipients: "all", // Người chính + người tham gia
    excludePerformer: true,
  },

  "CongViec.ganNguoiThamGia": {
    enabled: true,
    template: "TASK_PARTICIPANT_ADDED",
    description: "Thông báo khi thêm người tham gia vào công việc",
    handler: "congViecUpdate",
    recipients: "newParticipant", // Người được thêm
    excludePerformer: true,
  },

  "CongViec.xoaNguoiThamGia": {
    enabled: true,
    template: "TASK_PARTICIPANT_REMOVED",
    description: "Thông báo khi xóa người tham gia khỏi công việc",
    handler: "congViecUpdate",
    recipients: "removedParticipant", // Người bị xóa
    excludePerformer: true,
  },

  "CongViec.thayDoiNguoiChinh": {
    enabled: true,
    template: "TASK_ASSIGNEE_CHANGED",
    description: "Thông báo khi thay đổi người chịu trách nhiệm chính",
    handler: "congViecUpdate",
    recipients: "newAssignee", // Người được giao mới
    excludePerformer: true,
  },

  "CongViec.thayDoiUuTien": {
    enabled: true,
    template: "TASK_PRIORITY_CHANGED",
    description: "Thông báo khi độ ưu tiên công việc thay đổi",
    handler: "congViecUpdate",
    recipients: "all",
    excludePerformer: true,
  },

  "CongViec.capNhatTienDo": {
    enabled: true,
    template: "TASK_PROGRESS_UPDATED",
    description: "Thông báo khi tiến độ công việc được cập nhật",
    handler: "congViecUpdate",
    recipients: "assigner", // Người giao việc
    excludePerformer: true,
  },

  "CongViec.uploadFile": {
    enabled: true,
    template: "TASK_FILE_UPLOADED",
    description: "Thông báo khi upload tài liệu vào công việc",
    handler: "congViecUpdate",
    recipients: "all",
    excludePerformer: true,
  },

  "CongViec.xoaFile": {
    enabled: true,
    template: "TASK_FILE_DELETED",
    description: "Thông báo khi xóa tài liệu khỏi công việc",
    handler: "congViecUpdate",
    recipients: "all",
    excludePerformer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // YÊU CẦU (YeuCau) - 16 triggers (15 state transitions + 1 comment)
  // ═══════════════════════════════════════════════════════════════════════════

  "YeuCau.TAO_MOI": {
    enabled: true,
    template: "YEUCAU_CREATED",
    description: "Thông báo khi có yêu cầu hỗ trợ mới được tạo",
    handler: "yeuCauStateMachine",
    recipients: "targetDept", // Khoa được yêu cầu hoặc điều phối viên
    excludePerformer: true,
  },

  "YeuCau.TIEP_NHAN": {
    enabled: true,
    template: "YEUCAU_ACCEPTED",
    description: "Thông báo khi yêu cầu được tiếp nhận",
    handler: "yeuCauStateMachine",
    recipients: "requester", // Người yêu cầu
    excludePerformer: true,
  },

  "YeuCau.TU_CHOI": {
    enabled: true,
    template: "YEUCAU_REJECTED",
    description: "Thông báo khi yêu cầu bị từ chối",
    handler: "yeuCauStateMachine",
    recipients: "requester",
    excludePerformer: true,
  },

  "YeuCau.DIEU_PHOI": {
    enabled: true,
    template: "YEUCAU_DISPATCHED",
    description: "Thông báo khi yêu cầu được điều phối cho người xử lý",
    handler: "yeuCauStateMachine",
    recipients: "all", // Gửi cho: người yêu cầu + người được giao
    excludePerformer: true, // Loại trừ người điều phối
  },

  "YeuCau.GUI_VE_KHOA": {
    enabled: true,
    template: "YEUCAU_RETURNED_TO_DEPT",
    description: "Thông báo khi yêu cầu được gửi về khoa",
    handler: "yeuCauStateMachine",
    recipients: "sourceDept", // Khoa yêu cầu
    excludePerformer: true,
  },

  "YeuCau.HOAN_THANH": {
    enabled: true,
    template: "YEUCAU_COMPLETED",
    description: "Thông báo khi yêu cầu hoàn thành",
    handler: "yeuCauStateMachine",
    recipients: "all", // Người yêu cầu + người xử lý
    excludePerformer: true,
  },

  "YeuCau.HUY_TIEP_NHAN": {
    enabled: true,
    template: "YEUCAU_CANCELLED",
    description: "Thông báo khi hủy tiếp nhận yêu cầu",
    handler: "yeuCauStateMachine",
    recipients: "requester",
    excludePerformer: true,
  },

  "YeuCau.DOI_THOI_GIAN_HEN": {
    enabled: true,
    template: "YEUCAU_DEADLINE_CHANGED",
    description: "Thông báo khi thời gian hẹn thay đổi",
    handler: "yeuCauStateMachine",
    recipients: "all",
    excludePerformer: true,
  },

  "YeuCau.DANH_GIA": {
    enabled: true,
    template: "YEUCAU_RATED",
    description: "Thông báo khi có đánh giá chất lượng",
    handler: "yeuCauStateMachine",
    recipients: "performer", // Người xử lý + khoa
    excludePerformer: true,
  },

  "YeuCau.DONG": {
    enabled: true,
    template: "YEUCAU_CLOSED",
    description: "Thông báo khi yêu cầu được đóng",
    handler: "yeuCauStateMachine",
    recipients: "all",
    excludePerformer: true,
  },

  "YeuCau.MO_LAI": {
    enabled: true,
    template: "YEUCAU_REOPENED",
    description: "Thông báo khi yêu cầu được mở lại",
    handler: "yeuCauStateMachine",
    recipients: "all",
    excludePerformer: true,
  },

  "YeuCau.YEU_CAU_XU_LY_TIEP": {
    enabled: true,
    template: "YEUCAU_REOPENED",
    description: "Thông báo khi yêu cầu xử lý tiếp",
    handler: "yeuCauStateMachine",
    recipients: "performer",
    excludePerformer: true,
  },

  "YeuCau.NHAC_LAI": {
    enabled: true,
    template: "YEUCAU_REMINDER",
    description: "Thông báo nhắc lại yêu cầu",
    handler: "yeuCauStateMachine",
    recipients: "performer",
    excludePerformer: true,
  },

  "YeuCau.BAO_QUAN_LY": {
    enabled: true,
    template: "YEUCAU_ESCALATED",
    description: "Thông báo báo cáo quản lý (escalation)",
    handler: "yeuCauStateMachine",
    recipients: "manager", // Trưởng khoa / Giám đốc
    excludePerformer: true,
  },

  "YeuCau.XOA": {
    enabled: true,
    template: "YEUCAU_DELETED",
    description: "Thông báo khi yêu cầu bị xóa",
    handler: "yeuCauStateMachine",
    recipients: "all",
    excludePerformer: true,
  },

  "YeuCau.SUA": {
    enabled: true,
    template: "YEUCAU_UPDATED",
    description: "Thông báo khi thông tin yêu cầu được cập nhật",
    handler: "yeuCauStateMachine",
    recipients: "all",
    excludePerformer: true,
  },

  "YeuCau.comment": {
    enabled: true,
    template: "COMMENT_ADDED",
    description: "Thông báo khi có bình luận mới trên yêu cầu",
    handler: "yeuCauComment",
    recipients: "all", // Gửi cho người tạo + người xử lý + điều phối
    excludePerformer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KPI - 4 triggers
  // ═══════════════════════════════════════════════════════════════════════════

  "KPI.taoDanhGia": {
    enabled: true,
    template: "KPI_CYCLE_STARTED",
    description: "Thông báo khi tạo đánh giá KPI mới",
    handler: "kpi",
    recipients: "employee",
    excludePerformer: true,
  },

  "KPI.duyetDanhGia": {
    enabled: true,
    template: "KPI_EVALUATED",
    description: "Thông báo khi KPI được duyệt",
    handler: "kpi",
    recipients: "employee",
    excludePerformer: true,
  },

  "KPI.duyetTieuChi": {
    enabled: true,
    template: "KPI_EVALUATED",
    description: "Thông báo khi KPI được duyệt (theo tiêu chí)",
    handler: "kpi",
    recipients: "employee",
    excludePerformer: true,
  },

  "KPI.huyDuyet": {
    enabled: true,
    template: "KPI_APPROVAL_REVOKED",
    description: "Thông báo khi KPI bị hủy duyệt",
    handler: "kpi",
    recipients: "employee",
    excludePerformer: true,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // KPI Additional Actions - 3 triggers
  // ──────────────────────────────────────────────────────────────────────────

  "KPI.capNhatDiemQL": {
    enabled: true,
    template: "KPI_SCORE_UPDATED",
    description: "Thông báo khi điểm quản lý đánh giá được cập nhật",
    handler: "kpiUpdate",
    recipients: "employee",
    excludePerformer: true,
  },

  "KPI.tuDanhGia": {
    enabled: true,
    template: "KPI_SELF_EVALUATED",
    description: "Thông báo khi nhân viên hoàn thành tự đánh giá",
    handler: "kpiUpdate",
    recipients: "manager",
    excludePerformer: true,
  },

  "KPI.phanHoi": {
    enabled: true,
    template: "KPI_FEEDBACK_ADDED",
    description: "Thông báo khi có phản hồi về đánh giá KPI",
    handler: "kpiUpdate",
    recipients: "employee",
    excludePerformer: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEADLINE (Auto-scheduled by Agenda.js) - 2 triggers
  // ═══════════════════════════════════════════════════════════════════════════

  "CongViec.DEADLINE_APPROACHING": {
    enabled: true,
    template: "DEADLINE_APPROACHING",
    description: "Thông báo khi công việc sắp đến hạn (auto by Agenda.js)",
    handler: "deadline",
    recipients: "all", // NguoiChinhID + NguoiGiaoViecID + NguoiThamGia
    excludePerformer: false, // System triggered, no performer to exclude
  },

  "CongViec.DEADLINE_OVERDUE": {
    enabled: true,
    template: "DEADLINE_OVERDUE",
    description: "Thông báo khi công việc quá hạn (auto by Agenda.js)",
    handler: "deadline",
    recipients: "all",
    excludePerformer: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FUTURE: Thêm triggers cho các module khác
  // ═══════════════════════════════════════════════════════════════════════════

  // "BaoCaoSuCo.taoMoi": {
  //   enabled: false,
  //   template: "INCIDENT_CREATED",
  //   description: "Thông báo khi có báo cáo sự cố mới",
  //   handler: "baoCaoSuCo",
  //   recipients: "qualityManager",
  //   excludePerformer: true,
  // },
};
