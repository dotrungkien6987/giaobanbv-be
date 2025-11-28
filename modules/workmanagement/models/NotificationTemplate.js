const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * NotificationTemplate Model
 * Lưu trữ các mẫu thông báo có thể tái sử dụng
 *
 * Features:
 * - Template với {{placeholder}} syntax
 * - Category để nhóm trong Admin UI
 * - Auto-create flag cho templates tự động tạo
 * - Usage statistics (usageCount, lastUsedAt)
 * - Audit fields (createdBy, updatedBy)
 */
const notificationTemplateSchema = new Schema(
  {
    // Unique type identifier (e.g., "TASK_ASSIGNED")
    type: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    // Display name for admin UI
    name: {
      type: String,
      required: true,
    },

    // Description for admin
    description: {
      type: String,
    },

    // Category for grouping in Admin UI
    category: {
      type: String,
      enum: ["task", "kpi", "ticket", "system", "other"],
      default: "other",
    },

    // Auto-created flag (needs Admin config)
    isAutoCreated: {
      type: Boolean,
      default: false,
    },

    // Usage statistics
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
    },

    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Templates with {{placeholder}} syntax
    titleTemplate: {
      type: String,
      required: true,
    },
    bodyTemplate: {
      type: String,
      required: true,
    },

    // Icon name for frontend
    icon: {
      type: String,
      default: "notification",
    },

    // Default delivery channels
    defaultChannels: {
      type: [String],
      enum: ["inapp", "push"],
      default: ["inapp", "push"],
    },

    // Default priority
    defaultPriority: {
      type: String,
      enum: ["normal", "urgent"],
      default: "normal",
    },

    // URL template with {{placeholder}}
    actionUrlTemplate: {
      type: String,
    },

    // Is template active?
    isActive: {
      type: Boolean,
      default: true,
    },

    // Variables required for this template
    requiredVariables: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Increment usage count when template is used
notificationTemplateSchema.methods.incrementUsage = async function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  await this.save();
};

module.exports = mongoose.model(
  "NotificationTemplate",
  notificationTemplateSchema
);
