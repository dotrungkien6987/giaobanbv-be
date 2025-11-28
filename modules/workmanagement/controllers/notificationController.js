const notificationService = require("../services/notificationService");
const { UserNotificationSettings, NotificationTemplate } = require("../models");
const {
  sendResponse,
  catchAsync,
  AppError,
} = require("../../../helpers/utils");

const notificationController = {};

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 */
notificationController.getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { page = 1, limit = 20, isRead } = req.query;

  const result = await notificationService.getNotifications(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
  });

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách thông báo thành công"
  );
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
notificationController.getUnreadCount = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const count = await notificationService.getUnreadCount(userId);

  return sendResponse(res, 200, true, { count }, null, "Thành công");
});

/**
 * PUT /api/notifications/:id/read
 * Mark single notification as read
 */
notificationController.markAsRead = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { id } = req.params;

  const notification = await notificationService.markAsRead(id, userId);

  if (!notification) {
    throw new AppError(404, "Không tìm thấy thông báo", "Not Found");
  }

  return sendResponse(res, 200, true, null, null, "Đã đánh dấu đã đọc");
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
notificationController.markAllAsRead = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const result = await notificationService.markAllAsRead(userId);

  return sendResponse(
    res,
    200,
    true,
    { modifiedCount: result.modifiedCount },
    null,
    "Đã đánh dấu tất cả đã đọc"
  );
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
notificationController.deleteNotification = catchAsync(
  async (req, res, next) => {
    const userId = req.userId;
    const { id } = req.params;

    const notification = await notificationService.deleteNotification(
      id,
      userId
    );

    if (!notification) {
      throw new AppError(404, "Không tìm thấy thông báo", "Not Found");
    }

    return sendResponse(res, 200, true, null, null, "Đã xóa thông báo");
  }
);

/**
 * GET /api/notifications/settings
 * Get user's notification settings
 */
notificationController.getSettings = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const settings = await UserNotificationSettings.getOrCreate(userId);

  // Get available templates for settings UI
  const templates = await NotificationTemplate.find({ isActive: true }).select(
    "type name description defaultChannels"
  );

  return sendResponse(
    res,
    200,
    true,
    {
      settings: {
        enableNotifications: settings.enableNotifications,
        enablePush: settings.enablePush,
        quietHours: settings.quietHours,
        typePreferences: Object.fromEntries(settings.typePreferences),
      },
      availableTypes: templates,
    },
    null,
    "Thành công"
  );
});

/**
 * PUT /api/notifications/settings
 * Update user's notification settings
 */
notificationController.updateSettings = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { enableNotifications, enablePush, quietHours, typePreferences } =
    req.body;

  const settings = await UserNotificationSettings.getOrCreate(userId);

  // Update fields
  if (enableNotifications !== undefined) {
    settings.enableNotifications = enableNotifications;
  }
  if (enablePush !== undefined) {
    settings.enablePush = enablePush;
  }
  if (quietHours) {
    settings.quietHours = { ...settings.quietHours, ...quietHours };
  }
  if (typePreferences) {
    Object.entries(typePreferences).forEach(([type, prefs]) => {
      settings.typePreferences.set(type, prefs);
    });
  }

  await settings.save();

  return sendResponse(res, 200, true, null, null, "Đã cập nhật cài đặt");
});

/**
 * POST /api/notifications/settings/fcm-token
 * Save FCM token for push notifications
 */
notificationController.saveFcmToken = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { token, deviceName } = req.body;

  if (!token) {
    throw new AppError(400, "Token is required", "Bad Request");
  }

  const settings = await UserNotificationSettings.getOrCreate(userId);

  // Remove existing token if same
  settings.fcmTokens = settings.fcmTokens.filter((t) => t.token !== token);

  // Add new token
  settings.fcmTokens.push({
    token,
    deviceName: deviceName || "Unknown Device",
    createdAt: new Date(),
  });

  await settings.save();

  return sendResponse(res, 200, true, null, null, "Đã lưu FCM token");
});

/**
 * DELETE /api/notifications/settings/fcm-token
 * Remove FCM token
 */
notificationController.removeFcmToken = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { token } = req.body;

  const settings = await UserNotificationSettings.getOrCreate(userId);
  settings.fcmTokens = settings.fcmTokens.filter((t) => t.token !== token);
  await settings.save();

  return sendResponse(res, 200, true, null, null, "Đã xóa FCM token");
});

/**
 * POST /api/notifications/test (DEV ONLY)
 * Send a test notification
 */
notificationController.sendTestNotification = catchAsync(
  async (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(403, "Not available in production", "Forbidden");
    }

    const userId = req.userId;
    const { type = "SYSTEM_ANNOUNCEMENT" } = req.body;

    const notification = await notificationService.send({
      type,
      recipientId: userId,
      data: {
        title: "Test Notification",
        message:
          "Đây là thông báo test từ hệ thống. Thời gian: " +
          new Date().toLocaleString("vi-VN"),
      },
    });

    return sendResponse(
      res,
      200,
      true,
      { notification },
      null,
      "Đã gửi test notification"
    );
  }
);

module.exports = notificationController;
