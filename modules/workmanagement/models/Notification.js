const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = Schema(
  {
    recipientId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Employee",
    },
    senderId: {
      type: Schema.ObjectId,
      ref: "Employee",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    message: {
      type: String,
      maxlength: 2000,
    },
    notificationType: {
      type: String,
      enum: [
        "TASK_ASSIGNED",
        "TASK_UPDATED",
        "TASK_COMPLETED",
        "TASK_OVERDUE",
        "TICKET_CREATED",
        "TICKET_ASSIGNED",
        "TICKET_UPDATED",
        "TICKET_RESOLVED",
        "KPI_EVALUATION",
        "KPI_APPROVED",
        "KPI_REJECTED",
        "DEADLINE_REMINDER",
        "GENERAL",
      ],
      default: "GENERAL",
    },
    relatedType: {
      type: String,
      enum: ["TASK", "TICKET", "EVALUATION"],
      default: null,
    },
    relatedId: {
      type: Schema.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

// Indexes
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ senderId: 1 });
notificationSchema.index({ notificationType: 1 });
notificationSchema.index({ relatedType: 1, relatedId: 1 });

// Methods
notificationSchema.methods.toJSON = function () {
  const notification = this._doc;
  delete notification.__v;
  return notification;
};

notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsUnread = function () {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

// Static methods
notificationSchema.statics.findByRecipient = function (
  recipientId,
  unreadOnly = false
) {
  const query = { recipientId };
  if (unreadOnly) {
    query.isRead = false;
  }

  return this.find(query)
    .populate("senderId", "fullName employeeCode avatarUrl")
    .sort({ createdAt: -1 });
};

notificationSchema.statics.findBySender = function (senderId) {
  return this.find({ senderId })
    .populate("recipientId", "fullName employeeCode")
    .sort({ createdAt: -1 });
};

notificationSchema.statics.findByType = function (notificationType) {
  return this.find({ notificationType })
    .populate("recipientId", "fullName employeeCode")
    .populate("senderId", "fullName employeeCode")
    .sort({ createdAt: -1 });
};

notificationSchema.statics.findByRelated = function (relatedType, relatedId) {
  return this.find({ relatedType, relatedId })
    .populate("recipientId", "fullName employeeCode")
    .populate("senderId", "fullName employeeCode")
    .sort({ createdAt: -1 });
};

notificationSchema.statics.getUnreadCount = function (recipientId) {
  return this.countDocuments({ recipientId, isRead: false });
};

notificationSchema.statics.markAllAsRead = function (recipientId) {
  return this.updateMany(
    { recipientId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

notificationSchema.statics.deleteOldNotifications = function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });
};

// Helper method to create notifications
notificationSchema.statics.createNotification = function (data) {
  const notification = new this(data);
  return notification.save();
};

// Bulk create notifications
notificationSchema.statics.createBulkNotifications = function (notifications) {
  return this.insertMany(notifications);
};

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
