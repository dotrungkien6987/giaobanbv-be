/**
 * Unified Notification Templates - Chuẩn hóa Phase 3
 *
 * Run: node seeds/notificationTemplates.js
 *
 * Total: 43 templates (15 YeuCau + 21 Task + 6 KPI + 1 System)
 * - YeuCau: 15 templates (Phase 3 naming: YEUCAU_CREATED, YEUCAU_ACCEPTED...)
 * - Task: 21 templates (10 workflow + 8 field updates + 2 deadline + 1 comment)
 * - KPI: 6 templates (3 workflow + 3 updates)
 * - System: 1 template
 *
 * Updated: December 17, 2025
 */
const mongoose = require("mongoose");
require("dotenv").config();

// Import model từ modules/workmanagement
const { NotificationTemplate } = require("../modules/workmanagement/models");

const templates = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TICKET (YÊU CẦU HỖ TRỢ) - 15 templates - Phase 3
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: "YEUCAU_CREATED",
    name: "Yêu cầu hỗ trợ mới",
    description:
      "Thông báo khi có yêu cầu hỗ trợ mới được tạo và gửi đến khoa hoặc điều phối viên",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "🆕 Yêu cầu mới: {{requestCode}}",
    bodyTemplate:
      '{{requesterName}} ({{sourceDept}}) gửi yêu cầu "{{requestTitle}}" đến {{targetDept}}. Loại yêu cầu: {{requestType}}. Thời gian hẹn: {{deadline}}.',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "ticket",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "requestCode",
      "requesterName",
      "sourceDept",
      "requestTitle",
      "targetDept",
      "requestType",
      "deadline",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_ACCEPTED",
    name: "Yêu cầu được tiếp nhận",
    description:
      "Thông báo người yêu cầu khi yêu cầu của họ được tiếp nhận bởi khoa/điều phối viên",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "✅ Yêu cầu được tiếp nhận",
    bodyTemplate:
      '{{accepterName}} đã tiếp nhận yêu cầu "{{requestTitle}}" ({{requestCode}}) của bạn. Thời gian hẹn xử lý: {{deadline}}. Ghi chú: {{note}}',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "check",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "accepterName",
      "requestTitle",
      "requestCode",
      "deadline",
      "note",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_REJECTED",
    name: "Yêu cầu bị từ chối",
    description: "Thông báo người yêu cầu khi yêu cầu của họ bị từ chối",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "❌ Yêu cầu bị từ chối",
    bodyTemplate:
      '{{rejectorName}} đã từ chối yêu cầu "{{requestTitle}}" ({{requestCode}}) của bạn. Lý do: {{reason}}. Vui lòng liên hệ để biết thêm chi tiết.',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "urgent",
    requiredVariables: [
      "rejectorName",
      "requestTitle",
      "requestCode",
      "reason",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_DISPATCHED",
    name: "Yêu cầu được điều phối",
    description: "Thông báo khi yêu cầu được điều phối cho người xử lý",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "📌 Yêu cầu đã được điều phối",
    bodyTemplate:
      'Yêu cầu "{{requestTitle}}" ({{requestCode}}) từ {{sourceDept}} của {{requesterName}} đã được {{dispatcherName}} điều phối cho {{assigneeName}} xử lý. Thời gian hẹn: {{deadline}}. Nội dung: {{content}}',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "task",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "dispatcherName",
      "requestTitle",
      "requestCode",
      "sourceDept",
      "requesterName",
      "assigneeName",
      "deadline",
      "content",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_RETURNED_TO_DEPT",
    name: "Yêu cầu gửi về khoa",
    description:
      "Thông báo khoa yêu cầu khi yêu cầu được người xử lý gửi về cho khoa",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "🔄 Yêu cầu gửi về khoa",
    bodyTemplate:
      '{{performerName}} đã xử lý và gửi về khoa yêu cầu "{{requestTitle}}" ({{requestCode}}). Kết quả: {{result}}. Vui lòng kiểm tra và xác nhận hoàn thành.',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "task",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "performerName",
      "requestTitle",
      "requestCode",
      "result",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_COMPLETED",
    name: "Yêu cầu hoàn thành",
    description:
      "Thông báo người yêu cầu và người xử lý khi yêu cầu được đánh dấu hoàn thành",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "✅ Yêu cầu hoàn thành",
    bodyTemplate:
      '{{completerName}} đã đánh dấu hoàn thành yêu cầu "{{requestTitle}}" ({{requestCode}}). Thời gian hoàn thành: {{completedTime}}. Kết quả: {{result}}',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "check",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "completerName",
      "requestTitle",
      "requestCode",
      "completedTime",
      "result",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_CANCELLED",
    name: "Hủy tiếp nhận yêu cầu",
    description: "Thông báo người yêu cầu khi yêu cầu đã tiếp nhận bị hủy",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "❌ Hủy tiếp nhận",
    bodyTemplate:
      '{{cancellerName}} đã hủy tiếp nhận yêu cầu "{{requestTitle}}" ({{requestCode}}) của bạn. Lý do: {{reason}}. Yêu cầu trở về trạng thái chờ xử lý.',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "urgent",
    requiredVariables: [
      "cancellerName",
      "requestTitle",
      "requestCode",
      "reason",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_DEADLINE_CHANGED",
    name: "Đổi thời gian hẹn",
    description:
      "Thông báo người liên quan khi thời gian hẹn của yêu cầu bị thay đổi",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "⏰ Thay đổi thời gian hẹn",
    bodyTemplate:
      '{{updaterName}} đã thay đổi thời gian hẹn của yêu cầu "{{requestTitle}}" ({{requestCode}}) từ {{oldDeadline}} thành {{newDeadline}}. Lý do: {{reason}}',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "clock",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "updaterName",
      "requestTitle",
      "requestCode",
      "oldDeadline",
      "newDeadline",
      "reason",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_RATED",
    name: "Đánh giá chất lượng",
    description:
      "Thông báo người xử lý và khoa khi có đánh giá chất lượng từ người yêu cầu",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "⭐ Đánh giá chất lượng",
    bodyTemplate:
      '{{raterName}} đã đánh giá {{rating}} sao cho yêu cầu "{{requestTitle}}" ({{requestCode}}). Nhận xét: {{feedback}}',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "check",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    requiredVariables: [
      "raterName",
      "rating",
      "requestTitle",
      "requestCode",
      "feedback",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_CLOSED",
    name: "Đóng yêu cầu",
    description: "Thông báo người liên quan khi yêu cầu được đóng",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "🔒 Yêu cầu đã đóng",
    bodyTemplate:
      '{{closerName}} đã đóng yêu cầu "{{requestTitle}}" ({{requestCode}}). Trạng thái cuối: {{finalStatus}}. Ghi chú: {{note}}',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "check",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    requiredVariables: [
      "closerName",
      "requestTitle",
      "requestCode",
      "finalStatus",
      "note",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_REOPENED",
    name: "Mở lại yêu cầu",
    description:
      "Thông báo người liên quan khi yêu cầu đã đóng được mở lại hoặc yêu cầu xử lý tiếp",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "🔄 Yêu cầu mở lại",
    bodyTemplate:
      '{{reopenerName}} đã mở lại yêu cầu "{{requestTitle}}" ({{requestCode}}). Lý do: {{reason}}. Vui lòng xử lý tiếp.',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "reopenerName",
      "requestTitle",
      "requestCode",
      "reason",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_REMINDER",
    name: "Nhắc lại yêu cầu",
    description:
      "Thông báo người xử lý khi người yêu cầu gửi nhắc lại yêu cầu đang xử lý",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "🔔 Nhắc lại yêu cầu",
    bodyTemplate:
      '{{requesterName}} đã gửi nhắc lại cho yêu cầu "{{requestTitle}}" ({{requestCode}}). Thời gian hẹn: {{deadline}}. Nội dung nhắc: {{reminderNote}}',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "clock",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "requesterName",
      "requestTitle",
      "requestCode",
      "deadline",
      "reminderNote",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_ESCALATED",
    name: "Báo cáo quản lý",
    description:
      "Thông báo quản lý khi yêu cầu bị báo cáo vượt cấp do chậm xử lý hoặc vấn đề nghiêm trọng",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "⚠️ Báo cáo quản lý",
    bodyTemplate:
      '{{requesterName}} đã báo cáo yêu cầu "{{requestTitle}}" ({{requestCode}}) lên quản lý. Lý do: {{escalationReason}}. Thời gian hẹn: {{deadline}}. Cần xử lý khẩn cấp.',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "urgent",
    requiredVariables: [
      "requesterName",
      "requestTitle",
      "requestCode",
      "escalationReason",
      "deadline",
      "requestId",
    ],
  },

  {
    type: "YEUCAU_DELETED",
    name: "Xóa yêu cầu",
    description: "Thông báo người liên quan khi yêu cầu bị xóa",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "🗑️ Yêu cầu đã xóa",
    bodyTemplate:
      '{{deleterName}} đã xóa yêu cầu "{{requestTitle}}" ({{requestCode}}). Lý do: {{reason}}',
    actionUrlTemplate: "/quan-ly-cong-viec/yeu-cau",
    icon: "warning",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    requiredVariables: ["deleterName", "requestTitle", "requestCode", "reason"],
  },

  {
    type: "YEUCAU_UPDATED",
    name: "Cập nhật thông tin yêu cầu",
    description:
      "Thông báo người liên quan khi thông tin yêu cầu được cập nhật",
    category: "ticket",
    isAutoCreated: false,
    titleTemplate: "✏️ Cập nhật yêu cầu",
    bodyTemplate:
      '{{editorName}} đã cập nhật yêu cầu "{{requestTitle}}" ({{requestCode}}). Nội dung thay đổi: {{changes}}',
    actionUrlTemplate: "/yeu-cau/{{requestId}}",
    icon: "task",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    requiredVariables: [
      "editorName",
      "requestTitle",
      "requestCode",
      "changes",
      "requestId",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK (CÔNG VIỆC) - 21 templates
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: "TASK_ASSIGNED",
    name: "Được giao việc mới",
    description: "Khi user được giao một công việc",
    category: "task",
    titleTemplate: "Công việc mới",
    bodyTemplate: "{{assignerName}} đã giao cho bạn: {{taskName}}",
    icon: "task",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["assignerName", "taskName", "taskId"],
    isAutoCreated: false,
  },

  {
    type: "TASK_STATUS_CHANGED",
    name: "Trạng thái công việc thay đổi",
    description: "Khi công việc được cập nhật trạng thái",
    category: "task",
    titleTemplate: "Cập nhật công việc",
    bodyTemplate: "{{taskName}} đã chuyển sang: {{newStatus}}",
    icon: "task",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["taskName", "newStatus", "taskId"],
    isAutoCreated: false,
  },

  {
    type: "TASK_APPROVED",
    name: "Công việc được duyệt",
    description: "Khi trưởng khoa duyệt hoàn thành công việc",
    category: "task",
    titleTemplate: "Đã duyệt hoàn thành ✓",
    bodyTemplate: "{{approverName}} đã duyệt: {{taskName}}",
    icon: "check",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["approverName", "taskName", "taskId"],
    isAutoCreated: false,
  },

  {
    type: "TASK_REJECTED",
    name: "Công việc bị từ chối",
    description: "Khi công việc bị từ chối duyệt",
    category: "task",
    titleTemplate: "Công việc bị từ chối",
    bodyTemplate:
      "{{rejecterName}} đã từ chối: {{taskName}}. Lý do: {{reason}}",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "urgent",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["rejecterName", "taskName", "taskId", "reason"],
    isAutoCreated: false,
  },

  {
    type: "TASK_CANCELLED",
    name: "Công việc bị hủy giao",
    description: "Khi người giao hủy việc đã giao",
    category: "task",
    titleTemplate: "❌ Hủy giao việc - {{taskCode}}",
    bodyTemplate: '{{performerName}} đã hủy giao công việc "{{taskName}}"',
    icon: "cancel",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["performerName", "taskName", "taskId", "taskCode"],
    isAutoCreated: false,
  },

  {
    type: "TASK_ACCEPTED",
    name: "Công việc được tiếp nhận",
    description: "Khi nhân viên tiếp nhận công việc được giao",
    category: "task",
    titleTemplate: "✅ Tiếp nhận việc - {{taskCode}}",
    bodyTemplate: '{{performerName}} đã tiếp nhận công việc "{{taskName}}"',
    icon: "check",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["performerName", "taskName", "taskId", "taskCode"],
    isAutoCreated: false,
  },

  {
    type: "TASK_COMPLETED",
    name: "Công việc hoàn thành",
    description: "Khi nhân viên báo hoàn thành công việc",
    category: "task",
    titleTemplate: "🎉 Hoàn thành - {{taskCode}}",
    bodyTemplate: '{{performerName}} đã hoàn thành công việc "{{taskName}}"',
    icon: "check",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["performerName", "taskName", "taskId", "taskCode"],
    isAutoCreated: false,
  },

  {
    type: "TASK_PENDING_APPROVAL",
    name: "Công việc chờ duyệt",
    description: "Khi nhân viên báo hoàn thành tạm và chờ duyệt",
    category: "task",
    titleTemplate: "⏳ Chờ duyệt - {{taskCode}}",
    bodyTemplate:
      '{{performerName}} đã hoàn thành và đang chờ duyệt công việc "{{taskName}}"',
    icon: "pending",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["performerName", "taskName", "taskId", "taskCode"],
    isAutoCreated: false,
  },

  {
    type: "TASK_REVISION_REQUESTED",
    name: "Yêu cầu làm lại",
    description: "Khi người giao hủy hoàn thành tạm và yêu cầu làm lại",
    category: "task",
    titleTemplate: "🔄 Yêu cầu làm lại - {{taskCode}}",
    bodyTemplate: '{{performerName}} yêu cầu làm lại công việc "{{taskName}}"',
    icon: "refresh",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "urgent",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["performerName", "taskName", "taskId", "taskCode"],
    isAutoCreated: false,
  },

  {
    type: "TASK_REOPENED",
    name: "Mở lại công việc",
    description: "Khi người giao mở lại công việc đã hoàn thành",
    category: "task",
    titleTemplate: "🔓 Mở lại - {{taskCode}}",
    bodyTemplate: '{{performerName}} đã mở lại công việc "{{taskName}}"',
    icon: "unlock",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["performerName", "taskName", "taskId", "taskCode"],
    isAutoCreated: false,
  },

  {
    type: "TASK_DEADLINE_UPDATED",
    name: "Thay đổi deadline công việc",
    description: "Thông báo người tham gia khi deadline công việc bị thay đổi",
    category: "task",
    isAutoCreated: false,
    titleTemplate: "⏰ Deadline thay đổi",
    bodyTemplate:
      '{{performerName}} đã thay đổi deadline công việc "{{taskTitle}}" ({{taskCode}}) từ {{oldDeadline}} thành {{newDeadline}}',
    actionUrlTemplate: "/quan-ly-cong-viec/cong-viec/{{taskId}}",
    icon: "clock",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "performerName",
      "taskTitle",
      "taskCode",
      "oldDeadline",
      "newDeadline",
      "taskId",
    ],
  },

  {
    type: "TASK_PARTICIPANT_ADDED",
    name: "Thêm người tham gia",
    description: "Thông báo người được thêm vào công việc",
    category: "task",
    isAutoCreated: false,
    titleTemplate: "👥 Bạn được thêm vào công việc",
    bodyTemplate:
      '{{performerName}} đã thêm bạn vào công việc "{{taskTitle}}" ({{taskCode}}). Deadline: {{deadline}}',
    actionUrlTemplate: "/quan-ly-cong-viec/cong-viec/{{taskId}}",
    icon: "task",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "performerName",
      "taskTitle",
      "taskCode",
      "deadline",
      "taskId",
    ],
  },

  {
    type: "TASK_PARTICIPANT_REMOVED",
    name: "Xóa người tham gia",
    description: "Thông báo người bị xóa khỏi công việc",
    category: "task",
    isAutoCreated: false,
    titleTemplate: "❌ Bạn bị xóa khỏi công việc",
    bodyTemplate:
      '{{performerName}} đã xóa bạn khỏi công việc "{{taskTitle}}" ({{taskCode}})',
    actionUrlTemplate: "/quan-ly-cong-viec/cong-viec/{{taskId}}",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: ["performerName", "taskTitle", "taskCode", "taskId"],
  },

  {
    type: "TASK_ASSIGNEE_CHANGED",
    name: "Đổi người chịu trách nhiệm chính",
    description:
      "Thông báo người được giao làm người chịu trách nhiệm chính của công việc",
    category: "task",
    isAutoCreated: false,
    titleTemplate: "🎯 Bạn là người chính",
    bodyTemplate:
      '{{performerName}} đã chuyển trách nhiệm chính công việc "{{taskTitle}}" ({{taskCode}}) cho bạn. Deadline: {{deadline}}',
    actionUrlTemplate: "/quan-ly-cong-viec/cong-viec/{{taskId}}",
    icon: "task",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "performerName",
      "taskTitle",
      "taskCode",
      "deadline",
      "taskId",
    ],
  },

  {
    type: "TASK_PRIORITY_CHANGED",
    name: "Thay đổi độ ưu tiên",
    description: "Thông báo người tham gia khi độ ưu tiên công việc thay đổi",
    category: "task",
    isAutoCreated: false,
    titleTemplate: "🔴 Đổi độ ưu tiên",
    bodyTemplate:
      '{{performerName}} đã thay đổi độ ưu tiên công việc "{{taskTitle}}" ({{taskCode}}) từ {{oldPriority}} thành {{newPriority}}',
    actionUrlTemplate: "/quan-ly-cong-viec/cong-viec/{{taskId}}",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: [
      "performerName",
      "taskTitle",
      "taskCode",
      "oldPriority",
      "newPriority",
      "taskId",
    ],
  },

  {
    type: "TASK_PROGRESS_UPDATED",
    name: "Cập nhật tiến độ",
    description:
      "Thông báo người tạo/quản lý khi tiến độ công việc được cập nhật",
    category: "task",
    isAutoCreated: false,
    titleTemplate: "📊 Cập nhật tiến độ",
    bodyTemplate:
      '{{updaterName}} đã cập nhật tiến độ công việc "{{taskTitle}}" ({{taskCode}}) từ {{oldProgress}}% lên {{newProgress}}%',
    actionUrlTemplate: "/quan-ly-cong-viec/cong-viec/{{taskId}}",
    icon: "task",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    requiredVariables: [
      "updaterName",
      "taskTitle",
      "taskCode",
      "oldProgress",
      "newProgress",
      "taskId",
    ],
  },

  {
    type: "TASK_FILE_UPLOADED",
    name: "Upload tài liệu",
    description: "Thông báo người tham gia khi có tài liệu mới được upload",
    category: "task",
    isAutoCreated: false,
    titleTemplate: "📎 Tài liệu mới",
    bodyTemplate:
      '{{uploaderName}} đã upload tài liệu mới vào công việc "{{taskTitle}}" ({{taskCode}}). Tên file: {{fileName}}',
    actionUrlTemplate: "/quan-ly-cong-viec/cong-viec/{{taskId}}",
    icon: "task",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    requiredVariables: [
      "uploaderName",
      "taskTitle",
      "taskCode",
      "fileName",
      "taskId",
    ],
  },

  {
    type: "TASK_FILE_DELETED",
    name: "Xóa tài liệu",
    description:
      "Thông báo người tham gia khi có tài liệu bị xóa khỏi công việc",
    category: "task",
    isAutoCreated: false,
    titleTemplate: "🗑️ Tài liệu đã xóa",
    bodyTemplate:
      '{{deleterName}} đã xóa tài liệu "{{fileName}}" khỏi công việc "{{taskTitle}}" ({{taskCode}})',
    actionUrlTemplate: "/quan-ly-cong-viec/cong-viec/{{taskId}}",
    icon: "warning",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    requiredVariables: [
      "deleterName",
      "fileName",
      "taskTitle",
      "taskCode",
      "taskId",
    ],
  },

  {
    type: "DEADLINE_APPROACHING",
    name: "Deadline sắp đến",
    description: "Nhắc nhở công việc sắp đến hạn",
    category: "task",
    titleTemplate: "⏰ Deadline sắp đến",
    bodyTemplate: "{{taskName}} còn {{daysLeft}} ngày để hoàn thành",
    icon: "clock",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "urgent",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["taskName", "daysLeft", "taskId"],
    isAutoCreated: false,
  },

  {
    type: "DEADLINE_OVERDUE",
    name: "Quá hạn",
    description: "Công việc đã quá hạn",
    category: "task",
    titleTemplate: "⚠️ Công việc quá hạn!",
    bodyTemplate: "{{taskName}} đã quá hạn {{daysOverdue}} ngày",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "urgent",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: ["taskName", "daysOverdue", "taskId"],
    isAutoCreated: false,
  },

  {
    type: "COMMENT_ADDED",
    name: "Bình luận mới",
    description: "Khi có người bình luận vào công việc",
    category: "task",
    titleTemplate: "💬 Bình luận mới - {{taskCode}}",
    bodyTemplate:
      '{{commenterName}} đã bình luận trong công việc "{{taskName}}": "{{commentPreview}}"',
    icon: "comment",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    actionUrlTemplate: "/congviec/{{taskId}}",
    requiredVariables: [
      "commenterName",
      "commentPreview",
      "taskId",
      "taskCode",
      "taskName",
    ],
    isAutoCreated: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KPI - 6 templates
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: "KPI_CYCLE_STARTED",
    name: "Chu kỳ đánh giá bắt đầu",
    description: "Khi chu kỳ đánh giá KPI mới bắt đầu",
    category: "kpi",
    titleTemplate: "Chu kỳ đánh giá mới",
    bodyTemplate:
      "Chu kỳ {{cycleName}} đã bắt đầu. Hạn tự đánh giá: {{deadline}}",
    icon: "kpi",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "/kpi/tu-danh-gia",
    requiredVariables: ["cycleName", "deadline"],
    isAutoCreated: false,
  },

  {
    type: "KPI_EVALUATED",
    name: "Đã có kết quả KPI",
    description: "Khi có kết quả đánh giá KPI",
    category: "kpi",
    titleTemplate: "Kết quả đánh giá KPI",
    bodyTemplate: "Chu kỳ {{cycleName}}: Xếp loại {{rating}}",
    icon: "kpi",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "/kpi/ket-qua/{{evaluationId}}",
    requiredVariables: ["cycleName", "rating", "evaluationId"],
    isAutoCreated: false,
  },

  {
    type: "KPI_APPROVAL_REVOKED",
    name: "Hủy duyệt KPI",
    description: "Khi quản lý hủy duyệt đánh giá KPI đã duyệt trước đó",
    category: "kpi",
    titleTemplate: "⚠️ KPI bị hủy duyệt",
    bodyTemplate:
      "{{managerName}} đã hủy duyệt KPI chu kỳ {{cycleName}}. Lý do: {{reason}}",
    icon: "warning",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "urgent",
    actionUrlTemplate: "/kpi/chi-tiet/{{evaluationId}}",
    requiredVariables: ["managerName", "cycleName", "reason", "evaluationId"],
    isAutoCreated: false,
  },

  {
    type: "KPI_SCORE_UPDATED",
    name: "Cập nhật điểm KPI",
    description:
      "Thông báo nhân viên khi điểm KPI quản lý đánh giá được cập nhật",
    category: "kpi",
    isAutoCreated: false,
    titleTemplate: "📊 Điểm KPI cập nhật",
    bodyTemplate:
      "{{managerName}} đã cập nhật điểm đánh giá KPI của bạn. Nhiệm vụ: {{taskName}}. Điểm: {{score}}",
    actionUrlTemplate: "/quan-ly-cong-viec/kpi/danh-gia/{{evaluationId}}",
    icon: "kpi",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: ["managerName", "taskName", "score", "evaluationId"],
  },

  {
    type: "KPI_SELF_EVALUATED",
    name: "Tự đánh giá KPI",
    description: "Thông báo quản lý khi nhân viên hoàn thành tự đánh giá KPI",
    category: "kpi",
    isAutoCreated: false,
    titleTemplate: "✏️ Tự đánh giá mới",
    bodyTemplate:
      "{{employeeName}} đã hoàn thành tự đánh giá KPI. Nhiệm vụ: {{taskName}}. Điểm tự đánh giá: {{selfScore}}",
    actionUrlTemplate: "/quan-ly-cong-viec/kpi/danh-gia/{{evaluationId}}",
    icon: "kpi",
    defaultChannels: ["inapp"],
    defaultPriority: "normal",
    requiredVariables: [
      "employeeName",
      "taskName",
      "selfScore",
      "evaluationId",
    ],
  },

  {
    type: "KPI_FEEDBACK_ADDED",
    name: "Phản hồi đánh giá KPI",
    description:
      "Thông báo quản lý khi nhân viên thêm phản hồi về đánh giá KPI",
    category: "kpi",
    isAutoCreated: false,
    titleTemplate: "💬 Phản hồi KPI",
    bodyTemplate:
      "{{employeeName}} đã thêm phản hồi cho đánh giá KPI. Nội dung: {{feedback}}",
    actionUrlTemplate: "/quan-ly-cong-viec/kpi/danh-gia/{{evaluationId}}",
    icon: "comment",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    requiredVariables: ["employeeName", "feedback", "evaluationId"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM - 1 template
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: "SYSTEM_ANNOUNCEMENT",
    name: "Thông báo hệ thống",
    description: "Thông báo chung từ admin",
    category: "system",
    titleTemplate: "{{title}}",
    bodyTemplate: "{{message}}",
    icon: "system",
    defaultChannels: ["inapp", "push"],
    defaultPriority: "normal",
    actionUrlTemplate: "",
    requiredVariables: ["title", "message"],
    isAutoCreated: false,
  },
];

async function seedTemplates() {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Category statistics
    const stats = {
      ticket: 0,
      task: 0,
      kpi: 0,
      system: 0,
      inserted: 0,
      updated: 0,
    };

    // Upsert each template
    for (const template of templates) {
      const result = await NotificationTemplate.findOneAndUpdate(
        { typeCode: template.typeCode },
        {
          ...template,
          isAutoCreated: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        stats.inserted++;
        console.log(`  ✅ Inserted: ${template.typeCode}`);
      } else {
        stats.updated++;
        console.log(`  ♻️  Updated: ${template.typeCode}`);
      }

      // Count by category
      stats[template.category]++;
    }

    console.log("\n📊 Seeding Summary:");
    console.log(`  ✅ Inserted: ${stats.inserted} templates`);
    console.log(`  ♻️  Updated: ${stats.updated} templates`);
    console.log(`  📋 Total: ${templates.length} templates`);
    console.log("\n📊 By Category:");
    console.log(`  🎫 Ticket (YeuCau): ${stats.ticket} templates`);
    console.log(`  📋 Task (CongViec): ${stats.task} templates`);
    console.log(`  📊 KPI: ${stats.kpi} templates`);
    console.log(`  🔧 System: ${stats.system} templates`);

    // Final verification
    const totalInDB = await NotificationTemplate.countDocuments();
    console.log(`\n🎉 Total templates in database: ${totalInDB}`);
    console.log("🎉 Seeding completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedTemplates();
}

module.exports = { templates, seedTemplates };
