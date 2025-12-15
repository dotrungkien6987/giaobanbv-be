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
  // CÔNG VIỆC (CongViec) - 9 triggers
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

  // ═══════════════════════════════════════════════════════════════════════════
  // YÊU CẦU (YeuCau) - 1 trigger
  // ═══════════════════════════════════════════════════════════════════════════

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
