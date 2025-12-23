const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Notification Model
 * Lưu trữ thông báo đã gửi cho user
 *
 * Lưu ý: recipientId là User._id, KHÔNG PHẢI NhanVien._id
 */
const notificationSchema = new Schema(
  {
    // Người nhận (User._id, KHÔNG PHẢI NhanVien._id)
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Template đã dùng (optional - để track)
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "NotificationTemplate",
    },

    // Loại thông báo (match với NotificationType.code)
    type: {
      type: String,
      required: true,
      index: true,
    },

    // Nội dung đã render
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },

    // Icon để hiển thị
    icon: {
      type: String,
      default: "notification",
    },

    // Độ ưu tiên
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Trạng thái đọc
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },

    // Link khi click vào notification
    actionUrl: {
      type: String,
    },

    // Data gốc (để debug hoặc re-render)
    metadata: {
      type: Schema.Types.Mixed,
    },

    // Kênh đã gửi
    deliveredVia: {
      type: [String],
      enum: ["inapp", "push"],
      default: ["inapp"],
    },

    // Auto delete sau 30 ngày
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performance
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
