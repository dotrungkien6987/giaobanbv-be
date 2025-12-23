const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * NotificationTemplate - Template thông báo cấu hình theo type
 * Admin tạo nhiều templates cho 1 type, mỗi template gửi cho nhóm người nhận khác nhau
 */
const notificationTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    }, // 'Thông báo cho điều phối viên', 'Thông báo cho người yêu cầu'

    typeCode: {
      type: String,
      required: true,
    }, // Reference to NotificationType.code: 'yeucau-tao-moi'

    // Cấu hình người nhận - chọn từ variables có isRecipientCandidate = true
    recipientConfig: {
      variables: [{ type: String }], // ['arrNguoiDieuPhoiID', 'NguoiYeuCauID']
    },

    // Template content - Simple {{variable}} syntax (flatten variables)
    titleTemplate: {
      type: String,
      required: true,
    }, // '{{MaYeuCau}} - Yêu cầu từ {{TenKhoaGui}}'

    bodyTemplate: {
      type: String,
      required: true,
    }, // 'Khoa {{TenKhoaGui}} yêu cầu: {{TieuDe}}'

    actionUrl: {
      type: String,
    }, // '/yeucau/{{_id}}' - URL để navigate khi click

    icon: {
      type: String,
      default: "notification",
    }, // Material icon name

    priority: {
      type: String,
      enum: ["normal", "high", "urgent"],
      default: "normal",
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    // Audit
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "notificationtemplates",
  }
);

// Indexes
notificationTemplateSchema.index({ typeCode: 1, isEnabled: 1 });
notificationTemplateSchema.index({ typeCode: 1 });

// Methods

/**
 * Validate template có đúng format không
 */
notificationTemplateSchema.methods.validateTemplate = function () {
  const errors = [];

  // Check title template có variables
  const titleVars = this.titleTemplate.match(/\{\{(\w+)\}\}/g);
  if (!titleVars || titleVars.length === 0) {
    errors.push("Title template phải có ít nhất 1 variable");
  }

  // Check recipient config
  if (
    !this.recipientConfig ||
    !this.recipientConfig.variables ||
    this.recipientConfig.variables.length === 0
  ) {
    errors.push("Phải cấu hình ít nhất 1 người nhận");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Extract tất cả variables được dùng trong template
 */
notificationTemplateSchema.methods.extractVariables = function () {
  const vars = new Set();

  // From title
  const titleVars = this.titleTemplate.match(/\{\{(\w+)\}\}/g) || [];
  titleVars.forEach((v) => vars.add(v.replace(/\{\{|\}\}/g, "")));

  // From body
  const bodyVars = this.bodyTemplate.match(/\{\{(\w+)\}\}/g) || [];
  bodyVars.forEach((v) => vars.add(v.replace(/\{\{|\}\}/g, "")));

  // From actionUrl
  if (this.actionUrl) {
    const urlVars = this.actionUrl.match(/\{\{(\w+)\}\}/g) || [];
    urlVars.forEach((v) => vars.add(v.replace(/\{\{|\}\}/g, "")));
  }

  return Array.from(vars);
};

// Statics

/**
 * Lấy templates enabled theo typeCode
 */
notificationTemplateSchema.statics.findByType = async function (typeCode) {
  return this.find({ typeCode, isEnabled: true }).lean();
};

/**
 * Lấy tất cả templates (cho admin)
 */
notificationTemplateSchema.statics.getAllForAdmin = async function (
  filters = {}
) {
  const query = {};
  if (filters.typeCode) query.typeCode = filters.typeCode;
  if (filters.isEnabled !== undefined) query.isEnabled = filters.isEnabled;

  return this.find(query).sort({ typeCode: 1, name: 1 }).lean();
};

const NotificationTemplate = mongoose.model(
  "NotificationTemplate",
  notificationTemplateSchema
);

module.exports = NotificationTemplate;
