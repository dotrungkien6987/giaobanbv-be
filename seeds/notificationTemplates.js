/**
 * Notification Templates Seed File
 *
 * Run: npm run seed:notifications
 *
 * Creates/Updates 12 default notification templates
 */
const mongoose = require("mongoose");
require("dotenv").config();

// Import model từ modules/workmanagement
const { NotificationTemplate } = require("../modules/workmanagement/models");

const templates = [
  // ===== TASK NOTIFICATIONS =====
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
  },

  // ===== COMMENT NOTIFICATIONS =====
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
  },

  // ===== DEADLINE NOTIFICATIONS =====
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
  },

  // ===== KPI NOTIFICATIONS =====
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
  },

  // ===== SYSTEM NOTIFICATIONS =====
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
  },
];

async function seedTemplates() {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaobanbv";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Upsert templates (update if exists, insert if not)
    let created = 0;
    let updated = 0;

    for (const template of templates) {
      const result = await NotificationTemplate.findOneAndUpdate(
        { type: template.type },
        {
          ...template,
          isAutoCreated: false, // Đánh dấu là template chính thức
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
        console.log(`  ➕ Created: ${template.type}`);
      } else {
        updated++;
        console.log(`  🔄 Updated: ${template.type}`);
      }
    }

    console.log(`\n🎉 Seed completed!`);
    console.log(`   Created: ${created} templates`);
    console.log(`   Updated: ${updated} templates`);
    console.log(`   Total: ${templates.length} templates`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    process.exit(1);
  }
}

// Run if executed directly
seedTemplates();
