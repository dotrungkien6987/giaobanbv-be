const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authentication = require("../../../middlewares/authentication");

// All routes require authentication
router.use(authentication.loginRequired);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get("/", notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread count
 * @access  Private
 */
router.get("/unread-count", notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get("/settings", notificationController.getSettings);

/**
 * @route   PUT /api/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put("/settings", notificationController.updateSettings);

/**
 * @route   POST /api/notifications/settings/fcm-token
 * @desc    Save FCM token
 * @access  Private
 */
router.post("/settings/fcm-token", notificationController.saveFcmToken);

/**
 * @route   DELETE /api/notifications/settings/fcm-token
 * @desc    Remove FCM token
 * @access  Private
 */
router.delete("/settings/fcm-token", notificationController.removeFcmToken);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all as read
 * @access  Private
 */
router.put("/read-all", notificationController.markAllAsRead);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put("/:id/read", notificationController.markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete("/:id", notificationController.deleteNotification);

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (DEV only)
 * @access  Private
 */
router.post("/test", notificationController.sendTestNotification);

/**
 * @route   GET /api/notifications/triggers/summary
 * @desc    Get summary of all notification triggers (deprecated - use notification.api.js instead)
 * @access  Private (Admin/Debug)
 */
router.get("/triggers/summary", (req, res) => {
  // This endpoint is deprecated, use /api/workmanagement/notifications/types for notification type summary
  return res.status(200).json({
    success: true,
    message: "Deprecated - Use /api/workmanagement/notifications/types instead",
    data: { deprecated: true },
  });
});

module.exports = router;
