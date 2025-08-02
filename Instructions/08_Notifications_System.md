# Phase 8: Xây dựng Hệ thống Thông báo (Notifications System)

## Mục tiêu Phase 8

Xây dựng hệ thống thông báo realtime và email để cập nhật trạng thái công việc, deadline, và các sự kiện quan trọng cho người dùng.

## Tiền điều kiện

- ✅ Phase 1-7 đã hoàn thành
- ✅ Socket.IO đã được cài đặt
- ✅ Email service (NodeMailer) đã được cấu hình
- ✅ Redis đã được setup (cho cache và queue)

## Đặc điểm nghiệp vụ của Notifications System

### Các loại thông báo chính:

1. **Thông báo Công việc**: Giao việc mới, deadline sắp tới, hoàn thành
2. **Thông báo Ticket**: Tạo mới, phân công, cập nhật, giải quyết, leo thang
3. **Thông báo KPI**: Chu kỳ đánh giá mới, kết quả đánh giá
4. **Thông báo Hệ thống**: Bảo trì, cập nhật, thông báo quan trọng

### Kênh thông báo:

- **In-app notifications** (realtime qua Socket.IO)
- **Email notifications** (cho các sự kiện quan trọng)
- **Browser push notifications** (tùy chọn người dùng)

### Cơ chế gửi thông báo:

- **Realtime**: Gửi ngay lập tức qua WebSocket
- **Scheduled**: Gửi theo lịch (nhắc deadline, báo cáo tuần)
- **Batch**: Gửi hàng loạt (thông báo hệ thống)

## Nhiệm vụ chính

### 1. Tạo Models cho Notifications

#### 1.1 Notification Model

**File mới**: `modules/notifications/models/Notification.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = Schema(
  {
    // Người nhận
    recipientId: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Nội dung thông báo
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Phân loại
    type: {
      type: String,
      enum: [
        "ASSIGNED_TASK_NEW", // Được giao việc mới
        "ASSIGNED_TASK_DEADLINE", // Sắp đến deadline
        "ASSIGNED_TASK_OVERDUE", // Quá deadline
        "ASSIGNED_TASK_COMPLETED", // Hoàn thành công việc

        "TICKET_CREATED", // Ticket mới được tạo
        "TICKET_ASSIGNED", // Được phân công ticket
        "TICKET_STATUS_UPDATE", // Cập nhật trạng thái ticket
        "TICKET_RESOLVED", // Ticket được giải quyết
        "TICKET_ESCALATED", // Ticket được leo thang

        "KPI_CYCLE_START", // Chu kỳ đánh giá bắt đầu
        "KPI_EVALUATION_READY", // Có đánh giá KPI mới
        "KPI_EVALUATION_COMPLETED", // Hoàn thành đánh giá

        "SYSTEM_MAINTENANCE", // Bảo trì hệ thống
        "SYSTEM_UPDATE", // Cập nhật hệ thống
        "SYSTEM_ANNOUNCEMENT", // Thông báo quan trọng
      ],
      required: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },

    // Liên kết với dữ liệu gốc
    relatedModel: {
      type: String,
      enum: ["AssignedTask", "Ticket", "DanhGiaKPI", "ChuKyDanhGia", null],
    },
    relatedId: {
      type: Schema.ObjectId,
    },

    // Metadata bổ sung
    metadata: {
      assignerName: { type: String }, // Tên người giao việc
      dueDate: { type: Date }, // Deadline
      ticketNumber: { type: String }, // Số ticket
      kpiScore: { type: Number }, // Điểm KPI
      customData: { type: Schema.Types.Mixed }, // Dữ liệu tùy chỉnh
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

    // Cấu hình kênh gửi
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },

    // Kết quả gửi
    deliveryStatus: {
      inApp: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
      },
      email: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        error: { type: String },
      },
    },

    // Tự động xóa sau thời gian
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

// Indexes for performance
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ relatedModel: 1, relatedId: 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });

// Virtual for action URL
notificationSchema.virtual("actionUrl").get(function () {
  if (!this.relatedModel || !this.relatedId) return null;

  const baseUrls = {
    AssignedTask: `/tasks/${this.relatedId}`,
    Ticket: `/tickets/${this.relatedId}`,
    DanhGiaKPI: `/kpi/evaluation/${this.relatedId}`,
    ChuKyDanhGia: `/kpi/cycles/${this.relatedId}`,
  };

  return baseUrls[this.relatedModel] || null;
});

// Methods
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.setDeliveryStatus = function (
  channel,
  status,
  error = null
) {
  this.deliveryStatus[channel].sent = status;
  this.deliveryStatus[channel].sentAt = new Date();
  if (error) {
    this.deliveryStatus[channel].error = error;
  }
  return this.save();
};

// Static methods
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    recipientId: userId,
    isRead: false,
  });
};

notificationSchema.statics.getRecentNotifications = function (
  userId,
  limit = 20
) {
  return this.find({
    recipientId: userId,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("recipientId", "HoTen Email");
};

notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
```

#### 1.2 NotificationTemplate Model

**File mới**: `modules/notifications/models/NotificationTemplate.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const templateSchema = Schema(
  {
    templateKey: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      maxlength: 255,
    },

    description: {
      type: String,
      maxlength: 500,
    },

    // Template cho in-app notification
    inAppTemplate: {
      title: {
        type: String,
        required: true,
        maxlength: 255,
      },
      message: {
        type: String,
        required: true,
        maxlength: 1000,
      },
    },

    // Template cho email
    emailTemplate: {
      subject: {
        type: String,
        maxlength: 255,
      },
      htmlContent: {
        type: String,
      },
      textContent: {
        type: String,
      },
    },

    // Variables có thể sử dụng trong template
    variables: [
      {
        name: { type: String, required: true },
        description: { type: String },
        example: { type: String },
      },
    ],

    // Cấu hình mặc định
    defaultChannels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },

    defaultPriority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "notification_templates",
  }
);

templateSchema.index({ templateKey: 1 }, { unique: true });
templateSchema.index({ isActive: 1 });

// Method để render template với data
templateSchema.methods.render = function (data = {}) {
  const renderText = (template, data) => {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  };

  const result = {
    title: renderText(this.inAppTemplate.title, data),
    message: renderText(this.inAppTemplate.message, data),
    channels: this.defaultChannels,
    priority: this.defaultPriority,
  };

  if (this.emailTemplate.subject) {
    result.email = {
      subject: renderText(this.emailTemplate.subject, data),
      htmlContent: renderText(this.emailTemplate.htmlContent, data),
      textContent: renderText(this.emailTemplate.textContent, data),
    };
  }

  return result;
};

const NotificationTemplate = mongoose.model(
  "NotificationTemplate",
  templateSchema
);
module.exports = NotificationTemplate;
```

#### 1.3 UserNotificationSettings Model

**File mới**: `modules/notifications/models/UserNotificationSettings.js`

```javascript
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userNotificationSettingsSchema = Schema(
  {
    userId: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Cài đặt theo loại thông báo
    preferences: {
      assignedTasks: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
      tickets: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
      kpiEvaluations: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
      systemAnnouncements: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
      },
    },

    // Thời gian không muốn nhận thông báo
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: "22:00" }, // HH:mm format
      endTime: { type: String, default: "08:00" },
    },

    // Frequency settings
    digestSettings: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["DAILY", "WEEKLY"],
        default: "DAILY",
      },
      time: { type: String, default: "09:00" }, // HH:mm format
    },
  },
  {
    timestamps: true,
    collection: "user_notification_settings",
  }
);

userNotificationSettingsSchema.index({ userId: 1 }, { unique: true });

// Static method để lấy settings với default values
userNotificationSettingsSchema.statics.getSettingsForUser = async function (
  userId
) {
  let settings = await this.findOne({ userId });

  if (!settings) {
    // Tạo settings mặc định
    settings = new this({
      userId,
      preferences: {
        assignedTasks: { inApp: true, email: true, push: false },
        tickets: { inApp: true, email: true, push: false },
        kpiEvaluations: { inApp: true, email: true, push: false },
        systemAnnouncements: { inApp: true, email: false, push: false },
      },
    });
    await settings.save();
  }

  return settings;
};

const UserNotificationSettings = mongoose.model(
  "UserNotificationSettings",
  userNotificationSettingsSchema
);
module.exports = UserNotificationSettings;
```

### 2. Service Layer cho Notifications

#### 2.1 NotificationService - Core Service

**File mới**: `modules/notifications/services/notification.service.js`

```javascript
const Notification = require("../models/Notification");
const NotificationTemplate = require("../models/NotificationTemplate");
const UserNotificationSettings = require("../models/UserNotificationSettings");
const EmailService = require("./email.service");
const SocketService = require("./socket.service");
const Queue = require("bull");

// Setup notification queue với Redis
const notificationQueue = new Queue("notification processing", {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || "localhost",
  },
});

class NotificationService {
  // Gửi thông báo đơn
  async sendNotification({
    recipientId,
    type,
    templateKey = null,
    title = null,
    message = null,
    relatedModel = null,
    relatedId = null,
    metadata = {},
    priority = "MEDIUM",
    channels = null,
    sendImmediately = true,
  }) {
    try {
      // Lấy settings của user
      const userSettings = await UserNotificationSettings.getSettingsForUser(
        recipientId
      );

      // Determine channels to use
      let finalChannels = channels;
      if (!finalChannels) {
        finalChannels = this.getDefaultChannelsForType(type, userSettings);
      }

      // Kiểm tra quiet hours
      if (this.isInQuietHours(userSettings) && priority !== "URGENT") {
        // Delay notification hoặc skip
        sendImmediately = false;
      }

      let finalTitle = title;
      let finalMessage = message;

      // Sử dụng template nếu có
      if (templateKey) {
        const template = await NotificationTemplate.findOne({
          templateKey,
          isActive: true,
        });

        if (template) {
          const rendered = template.render(metadata);
          finalTitle = rendered.title;
          finalMessage = rendered.message;
          if (!channels) finalChannels = rendered.channels;
        }
      }

      // Tạo notification record
      const notification = new Notification({
        recipientId,
        title: finalTitle,
        message: finalMessage,
        type,
        priority,
        relatedModel,
        relatedId,
        metadata,
        channels: finalChannels,
        expiresAt: this.calculateExpiryDate(type),
      });

      await notification.save();

      // Gửi thông báo
      if (sendImmediately) {
        await this.deliverNotification(notification);
      } else {
        // Add to queue for later delivery
        await notificationQueue.add(
          "deliver",
          { notificationId: notification._id },
          {
            delay: this.calculateDelay(userSettings),
          }
        );
      }

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }

  // Gửi thông báo hàng loạt
  async sendBulkNotifications(notifications) {
    const promises = notifications.map((notif) => this.sendNotification(notif));
    return await Promise.allSettled(promises);
  }

  // Deliver notification qua các kênh
  async deliverNotification(notification) {
    const deliveryPromises = [];

    // In-app notification (realtime)
    if (notification.channels.inApp) {
      deliveryPromises.push(this.deliverInApp(notification));
    }

    // Email notification
    if (notification.channels.email) {
      deliveryPromises.push(this.deliverEmail(notification));
    }

    // Push notification
    if (notification.channels.push) {
      deliveryPromises.push(this.deliverPush(notification));
    }

    await Promise.allSettled(deliveryPromises);
  }

  // Gửi in-app notification qua Socket.IO
  async deliverInApp(notification) {
    try {
      await SocketService.sendToUser(notification.recipientId, "notification", {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        metadata: notification.metadata,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt,
      });

      await notification.setDeliveryStatus("inApp", true);
    } catch (error) {
      await notification.setDeliveryStatus("inApp", false, error.message);
    }
  }

  // Gửi email notification
  async deliverEmail(notification) {
    try {
      const user = await User.findById(notification.recipientId);
      if (!user.Email) {
        throw new Error("User has no email address");
      }

      await EmailService.send({
        to: user.Email,
        subject: notification.title,
        html: this.generateEmailHtml(notification),
        text: notification.message,
      });

      await notification.setDeliveryStatus("email", true);
    } catch (error) {
      await notification.setDeliveryStatus("email", false, error.message);
    }
  }

  // Gửi push notification
  async deliverPush(notification) {
    try {
      // Implementation với FCM hoặc web push
      // await PushService.send(...);
      await notification.setDeliveryStatus("push", true);
    } catch (error) {
      await notification.setDeliveryStatus("push", false, error.message);
    }
  }

  // Helper methods
  getDefaultChannelsForType(type, userSettings) {
    const typeMapping = {
      ASSIGNED_TASK_NEW: "assignedTasks",
      ASSIGNED_TASK_DEADLINE: "assignedTasks",
      ASSIGNED_TASK_OVERDUE: "assignedTasks",
      ASSIGNED_TASK_COMPLETED: "assignedTasks",
      TICKET_CREATED: "tickets",
      TICKET_ASSIGNED: "tickets",
      TICKET_STATUS_UPDATE: "tickets",
      TICKET_RESOLVED: "tickets",
      TICKET_ESCALATED: "tickets",
      KPI_CYCLE_START: "kpiEvaluations",
      KPI_EVALUATION_READY: "kpiEvaluations",
      KPI_EVALUATION_COMPLETED: "kpiEvaluations",
      SYSTEM_MAINTENANCE: "systemAnnouncements",
      SYSTEM_UPDATE: "systemAnnouncements",
      SYSTEM_ANNOUNCEMENT: "systemAnnouncements",
    };

    const category = typeMapping[type] || "systemAnnouncements";
    return userSettings.preferences[category];
  }

  isInQuietHours(userSettings) {
    if (!userSettings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const start = userSettings.quietHours.startTime;
    const end = userSettings.quietHours.endTime;

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Overnight quiet hours
      return currentTime >= start || currentTime <= end;
    }
  }

  calculateExpiryDate(type) {
    const expiryDays = {
      ASSIGNED_TASK_NEW: 30,
      ASSIGNED_TASK_DEADLINE: 7,
      ASSIGNED_TASK_OVERDUE: 7,
      TICKET_CREATED: 30,
      KPI_EVALUATION_READY: 60,
      SYSTEM_ANNOUNCEMENT: 90,
    };

    const days = expiryDays[type] || 30;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }

  calculateDelay(userSettings) {
    // Calculate delay based on quiet hours
    if (!userSettings.quietHours.enabled) return 0;

    const now = new Date();
    const endTime = userSettings.quietHours.endTime;
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const endDate = new Date();
    endDate.setHours(endHour, endMinute, 0, 0);

    if (endDate <= now) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return endDate.getTime() - now.getTime();
  }

  generateEmailHtml(notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${notification.title}</h2>
        <p>${notification.message}</p>
        ${
          notification.actionUrl
            ? `
          <a href="${process.env.FRONTEND_URL}${notification.actionUrl}" 
             style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Xem chi tiết
          </a>
        `
            : ""
        }
        <hr style="margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Đây là email tự động từ hệ thống Quản lý Công việc. Vui lòng không trả lời email này.
        </p>
      </div>
    `;
  }
}

module.exports = new NotificationService();
```

### 3. Controllers cho Notifications

#### 3.1 Notification Controller

**File mới**: `modules/notifications/controllers/notification.controller.js`

```javascript
const Notification = require("../models/Notification");
const UserNotificationSettings = require("../models/UserNotificationSettings");
const NotificationService = require("../services/notification.service");
const responseFormatter = require("../../workmanagement/utils/responseFormatter");

// Lấy danh sách thông báo của user
exports.getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      isRead = null,
      type = null,
      priority = null,
    } = req.query;

    const filters = { recipientId: req.user._id };
    if (isRead !== null) filters.isRead = isRead === "true";
    if (type) filters.type = type;
    if (priority) filters.priority = priority;

    const notifications = await Notification.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(filters);

    res.json(
      responseFormatter.successResponse(
        notifications,
        "Lấy thông báo thành công",
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        }
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Lấy số lượng thông báo chưa đọc
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);
    res.json(
      responseFormatter.successResponse(
        { count },
        "Lấy số thông báo chưa đọc thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Đánh dấu thông báo đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      recipientId: req.user._id,
    });

    if (!notification) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy thông báo"));
    }

    await notification.markAsRead();
    res.json(
      responseFormatter.successResponse(
        notification,
        "Đánh dấu đã đọc thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Đánh dấu tất cả thông báo đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user._id);
    res.json(
      responseFormatter.successResponse(
        null,
        "Đánh dấu tất cả đã đọc thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Xóa thông báo
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Notification.findOneAndDelete({
      _id: id,
      recipientId: req.user._id,
    });

    if (!result) {
      return res
        .status(404)
        .json(responseFormatter.errorResponse("Không tìm thấy thông báo"));
    }

    res.json(
      responseFormatter.successResponse(null, "Xóa thông báo thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Lấy cài đặt thông báo của user
exports.getNotificationSettings = async (req, res) => {
  try {
    const settings = await UserNotificationSettings.getSettingsForUser(
      req.user._id
    );
    res.json(
      responseFormatter.successResponse(
        settings,
        "Lấy cài đặt thông báo thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Cập nhật cài đặt thông báo
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { preferences, quietHours, digestSettings } = req.body;

    let settings = await UserNotificationSettings.findOne({
      userId: req.user._id,
    });

    if (!settings) {
      settings = new UserNotificationSettings({ userId: req.user._id });
    }

    if (preferences)
      settings.preferences = { ...settings.preferences, ...preferences };
    if (quietHours)
      settings.quietHours = { ...settings.quietHours, ...quietHours };
    if (digestSettings)
      settings.digestSettings = {
        ...settings.digestSettings,
        ...digestSettings,
      };

    await settings.save();

    res.json(
      responseFormatter.successResponse(settings, "Cập nhật cài đặt thành công")
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

// Gửi thông báo test (chỉ admin)
exports.sendTestNotification = async (req, res) => {
  try {
    const {
      recipientId,
      title,
      message,
      type = "SYSTEM_ANNOUNCEMENT",
    } = req.body;

    const notification = await NotificationService.sendNotification({
      recipientId,
      title,
      message,
      type,
      priority: "MEDIUM",
    });

    res.json(
      responseFormatter.successResponse(
        notification,
        "Gửi thông báo test thành công"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(responseFormatter.errorResponse("Lỗi server", error.message));
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationSettings,
  updateNotificationSettings,
  sendTestNotification,
};
```

### 4. Routes cho Notifications

#### 4.1 Notification Routes

**File mới**: `modules/notifications/routes/notification.routes.js`

```javascript
const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const {
  authenticate,
  authorize,
} = require("../../../middlewares/authentication");

// User routes
router.get("/", authenticate, notificationController.getNotifications);
router.get(
  "/unread-count",
  authenticate,
  notificationController.getUnreadCount
);
router.put("/:id/read", authenticate, notificationController.markAsRead);
router.put(
  "/mark-all-read",
  authenticate,
  notificationController.markAllAsRead
);
router.delete("/:id", authenticate, notificationController.deleteNotification);

// Settings routes
router.get(
  "/settings",
  authenticate,
  notificationController.getNotificationSettings
);
router.put(
  "/settings",
  authenticate,
  notificationController.updateNotificationSettings
);

// Admin routes
router.post(
  "/test",
  authenticate,
  authorize(["admin"]),
  notificationController.sendTestNotification
);

module.exports = router;
```

### 5. Socket.IO Integration

#### 5.1 Socket Service

**File mới**: `modules/notifications/services/socket.service.js`

```javascript
const socketIo = require("socket.io");

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      // Authenticate socket connection
      socket.on("authenticate", (token) => {
        // Verify JWT token và lấy userId
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.id;
          this.connectedUsers.set(decoded.id, socket.id);
          socket.join(`user_${decoded.id}`);

          console.log(`User ${decoded.id} authenticated and joined room`);
        } catch (error) {
          socket.emit("auth_error", "Invalid token");
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`User ${socket.userId} disconnected`);
        }
      });

      // Handle notification read status
      socket.on("notification_read", async (notificationId) => {
        try {
          const notification = await Notification.findById(notificationId);
          if (
            notification &&
            notification.recipientId.toString() === socket.userId
          ) {
            await notification.markAsRead();
          }
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      });
    });
  }

  // Gửi thông báo cho user cụ thể
  async sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Gửi thông báo cho room
  async sendToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  // Gửi broadcast cho tất cả users
  async broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Lấy danh sách users online
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Kiểm tra user có online không
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }
}

module.exports = new SocketService();
```

### 6. Email Service

#### 6.1 Email Service với NodeMailer

**File mới**: `modules/notifications/services/email.service.js`

```javascript
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send({ to, subject, html, text, attachments = [] }) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
        to,
        subject,
        html,
        text,
        attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return result;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  async sendBatch(emails) {
    const promises = emails.map((email) => this.send(email));
    return await Promise.allSettled(promises);
  }
}

module.exports = new EmailService();
```

### 7. Scheduled Jobs

#### 7.1 Notification Jobs

**File mới**: `modules/notifications/jobs/notification.jobs.js`

```javascript
const cron = require("node-cron");
const NotificationService = require("../services/notification.service");
const AssignedTask = require("../../workmanagement/models/AssignedTask");

class NotificationJobs {
  // Chạy mỗi giờ để kiểm tra deadline
  static scheduleDeadlineReminders() {
    cron.schedule("0 * * * *", async () => {
      console.log("Running deadline reminder job...");

      try {
        // Tìm các task sắp đến deadline (trong 24h tới)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const upcomingTasks = await AssignedTask.find({
          NgayHetHan: {
            $gte: new Date(),
            $lte: tomorrow,
          },
          TrangThai: { $nin: ["HOAN_THANH", "HUY_BO"] },
          isDeleted: false,
        }).populate("NguoiThucHienID", "HoTen Email");

        // Gửi thông báo cho từng task
        const notifications = upcomingTasks.map((task) => ({
          recipientId: task.NguoiThucHienID._id,
          type: "ASSIGNED_TASK_DEADLINE",
          templateKey: "TASK_DEADLINE_REMINDER",
          relatedModel: "AssignedTask",
          relatedId: task._id,
          metadata: {
            taskTitle: task.TieuDe,
            dueDate: task.NgayHetHan,
            assignerName: task.NguoiGiaoID?.HoTen || "Hệ thống",
          },
          priority: "HIGH",
        }));

        await NotificationService.sendBulkNotifications(notifications);
        console.log(`Sent ${notifications.length} deadline reminders`);
      } catch (error) {
        console.error("Error in deadline reminder job:", error);
      }
    });
  }

  // Chạy hàng ngày để kiểm tra overdue tasks
  static scheduleOverdueChecks() {
    cron.schedule("0 9 * * *", async () => {
      console.log("Running overdue check job...");

      try {
        const overdueTasks = await AssignedTask.find({
          NgayHetHan: { $lt: new Date() },
          TrangThai: { $nin: ["HOAN_THANH", "HUY_BO"] },
          isDeleted: false,
        }).populate("NguoiThucHienID NguoiGiaoID");

        const notifications = [];

        overdueTasks.forEach((task) => {
          // Thông báo cho người thực hiện
          notifications.push({
            recipientId: task.NguoiThucHienID._id,
            type: "ASSIGNED_TASK_OVERDUE",
            templateKey: "TASK_OVERDUE",
            relatedModel: "AssignedTask",
            relatedId: task._id,
            metadata: {
              taskTitle: task.TieuDe,
              dueDate: task.NgayHetHan,
              overdueDays: Math.ceil(
                (new Date() - task.NgayHetHan) / (1000 * 60 * 60 * 24)
              ),
            },
            priority: "URGENT",
          });

          // Thông báo cho người giao việc
          if (task.NguoiGiaoID) {
            notifications.push({
              recipientId: task.NguoiGiaoID._id,
              type: "ASSIGNED_TASK_OVERDUE",
              templateKey: "TASK_OVERDUE_MANAGER",
              relatedModel: "AssignedTask",
              relatedId: task._id,
              metadata: {
                taskTitle: task.TieuDe,
                assigneeName: task.NguoiThucHienID.HoTen,
                dueDate: task.NgayHetHan,
                overdueDays: Math.ceil(
                  (new Date() - task.NgayHetHan) / (1000 * 60 * 60 * 24)
                ),
              },
              priority: "HIGH",
            });
          }
        });

        await NotificationService.sendBulkNotifications(notifications);
        console.log(`Sent ${notifications.length} overdue notifications`);
      } catch (error) {
        console.error("Error in overdue check job:", error);
      }
    });
  }

  // Clean up old notifications
  static scheduleCleanup() {
    cron.schedule("0 2 * * 0", async () => {
      // Chạy chủ nhật hàng tuần lúc 2h sáng
      console.log("Running notification cleanup job...");

      try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const result = await Notification.deleteMany({
          createdAt: { $lt: oneMonthAgo },
          isRead: true,
        });

        console.log(`Cleaned up ${result.deletedCount} old notifications`);
      } catch (error) {
        console.error("Error in cleanup job:", error);
      }
    });
  }

  static initializeAllJobs() {
    this.scheduleDeadlineReminders();
    this.scheduleOverdueChecks();
    this.scheduleCleanup();
    console.log("All notification jobs initialized");
  }
}

module.exports = NotificationJobs;
```

## Kết quả mong đợi Phase 8

Sau khi hoàn thành Phase 8:

1. ✅ Hệ thống thông báo realtime hoàn chỉnh
2. ✅ Email notifications cho các sự kiện quan trọng
3. ✅ User có thể tùy chỉnh cài đặt thông báo
4. ✅ Scheduled jobs cho deadline reminders và overdue checks
5. ✅ Template system cho customize notification content
6. ✅ Socket.IO integration cho realtime updates
7. ✅ Chuẩn bị cho Phase 9: File Attachments Management

## Files cần tạo trong Phase 8

1. `modules/notifications/models/Notification.js`
2. `modules/notifications/models/NotificationTemplate.js`
3. `modules/notifications/models/UserNotificationSettings.js`
4. `modules/notifications/services/notification.service.js`
5. `modules/notifications/services/socket.service.js`
6. `modules/notifications/services/email.service.js`
7. `modules/notifications/controllers/notification.controller.js`
8. `modules/notifications/routes/notification.routes.js`
9. `modules/notifications/jobs/notification.jobs.js`
10. `modules/notifications/tests/notification.test.js`
11. Cập nhật `app.js` để initialize Socket.IO
12. Cập nhật `routes/index.js`

## Lưu ý kỹ thuật Phase 8

- **Performance**: Sử dụng Redis cho queue và cache
- **Scalability**: Queue system cho xử lý notification hàng loạt
- **Real-time**: Socket.IO cho instant notifications
- **Email delivery**: Rate limiting và retry mechanism
- **Data cleanup**: Scheduled jobs để xóa notifications cũ
- **Security**: Validate permissions cho notification access
- **Monitoring**: Log và track notification delivery success rates
