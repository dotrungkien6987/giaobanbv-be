const {
  Notification,
  NotificationTemplate,
  UserNotificationSettings,
} = require("../models");
const socketService = require("../../../services/socketService");
// const fcmService = require("../../../services/fcmService"); // Uncomment when FCM is ready

/**
 * NotificationService - Main service cho notification system
 *
 * Features:
 * - Template cache để giảm DB queries
 * - Auto-create template nếu không tìm thấy
 * - Usage statistics tracking
 * - Multi-channel delivery (inapp, push)
 * - User preferences checking
 */
class NotificationService {
  constructor() {
    this.templateCache = new Map();
  }

  /**
   * Load templates from DB into cache
   */
  async loadTemplates() {
    const templates = await NotificationTemplate.find({ isActive: true });
    templates.forEach((t) => {
      this.templateCache.set(t.type, t);
    });
    console.log(
      `[NotificationService] Loaded ${templates.length} templates into cache`
    );
  }

  /**
   * Get template by type - auto-creates if not found
   * @param {string} type - Template type
   * @param {string[]} [dataKeys] - Keys from data object (for requiredVariables)
   * @returns {Promise<NotificationTemplate>}
   */
  async getTemplate(type, dataKeys = []) {
    const upperType = type.toUpperCase();

    // Check cache first
    if (this.templateCache.has(upperType)) {
      return this.templateCache.get(upperType);
    }

    // Try DB
    let template = await NotificationTemplate.findOne({
      type: upperType,
      isActive: true,
    });

    // Auto-create template if not found
    if (!template) {
      console.warn(
        `[NotificationService] Template "${type}" not found, auto-creating...`
      );

      // Format name from type (e.g., "TASK_ASSIGNED" → "Task Assigned")
      const formattedName = type
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");

      template = await NotificationTemplate.create({
        type: upperType,
        name: formattedName,
        description: `Auto-created template for ${formattedName}. Please configure!`,
        titleTemplate: "🔔 Thông báo mới",
        bodyTemplate: `Bạn có thông báo: ${formattedName}`,
        icon: "notification",
        defaultChannels: ["inapp", "push"],
        defaultPriority: "normal",
        category: "other",
        isAutoCreated: true, // ⚠️ Flag cần Admin config
        requiredVariables: dataKeys,
      });

      console.warn(
        `[NotificationService] ⚠️ Auto-created template: ${upperType}. ` +
          `Admin should configure titleTemplate and bodyTemplate!`
      );
    }

    // Update cache
    this.templateCache.set(template.type, template);

    return template;
  }

  /**
   * Clear template from cache (call after admin updates template)
   * @param {string} type
   */
  invalidateCache(type) {
    this.templateCache.delete(type?.toUpperCase());
  }

  /**
   * Clear all template cache
   */
  clearCache() {
    this.templateCache.clear();
  }

  /**
   * Render template with data
   * @param {string} templateString - Template với {{placeholder}} syntax
   * @param {Object} data - Data object
   * @returns {string}
   */
  renderTemplate(templateString, data) {
    return templateString.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Send notification to single user
   * @param {Object} options
   * @param {string} options.type - Notification type (must match template)
   * @param {string} options.recipientId - User._id
   * @param {Object} options.data - Data for template rendering
   * @param {string} [options.priority] - Override default priority
   * @returns {Promise<Notification|null>}
   */
  async send({ type, recipientId, data = {}, priority }) {
    try {
      // 1. Get template (auto-creates if not found)
      const dataKeys = Object.keys(data);
      const template = await this.getTemplate(type, dataKeys);

      // 2. Update usage statistics
      await NotificationTemplate.findByIdAndUpdate(template._id, {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() },
      });

      // 3. Get user settings
      const settings = await UserNotificationSettings.getOrCreate(recipientId);

      // 4. Check if user wants this notification
      if (!settings.shouldSend(type, "inapp")) {
        console.log(
          `[NotificationService] User ${recipientId} disabled ${type} notifications`
        );
        return null;
      }

      // 5. Render notification
      const title = this.renderTemplate(template.titleTemplate, data);
      const body = this.renderTemplate(template.bodyTemplate, data);
      const actionUrl = template.actionUrlTemplate
        ? this.renderTemplate(template.actionUrlTemplate, data)
        : null;

      // 6. Save to database
      const notification = await Notification.create({
        recipientId,
        type: template.type,
        title,
        body,
        icon: template.icon,
        priority: priority || template.defaultPriority,
        actionUrl,
        metadata: data,
        deliveredVia: ["inapp"],
      });

      // 7. Send via Socket.IO if online
      const isOnline = socketService.isUserOnline(recipientId);
      if (isOnline) {
        socketService.emitToUser(recipientId, "notification:new", {
          notification: notification.toObject(),
        });

        // Also send updated unread count
        const unreadCount = await this.getUnreadCount(recipientId);
        socketService.emitToUser(recipientId, "notification:count", {
          count: unreadCount,
        });
      }

      // 8. Send via FCM if offline and push enabled
      if (!isOnline && settings.shouldSend(type, "push")) {
        // TODO: Implement FCM in Phase 11 (04_FCM_PUSH_SETUP.md)
        // await fcmService.sendToUser(recipientId, { title, body, actionUrl });
        // notification.deliveredVia.push("push");
        // await notification.save();
      }

      console.log(
        `[NotificationService] ✅ Sent ${type} to ${recipientId} (online: ${isOnline})`
      );
      return notification;
    } catch (error) {
      console.error("[NotificationService] Error sending notification:", error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Object} options
   * @param {string} options.type
   * @param {string[]} options.recipientIds
   * @param {Object} options.data
   * @param {string} [options.priority]
   * @returns {Promise<Notification[]>}
   */
  async sendToMany({ type, recipientIds, data, priority }) {
    const results = await Promise.all(
      recipientIds.map((recipientId) =>
        this.send({ type, recipientId, data, priority })
      )
    );
    return results.filter(Boolean); // Remove nulls
  }

  /**
   * Send notification to all users in a Khoa
   * @param {Object} options
   * @param {string} options.type
   * @param {string} options.khoaId
   * @param {Object} options.data
   * @param {string[]} [options.excludeUserIds]
   * @returns {Promise<Notification[]>}
   */
  async sendToKhoa({ type, khoaId, data, excludeUserIds = [] }) {
    const User = require("../../../models/User");
    const users = await User.find({
      KhoaID: khoaId,
      _id: { $nin: excludeUserIds },
    });

    return this.sendToMany({
      type,
      recipientIds: users.map((u) => u._id),
      data,
    });
  }

  /**
   * Get unread count for user
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
  }

  /**
   * Get notifications for user with pagination
   * @param {string} userId
   * @param {Object} options
   * @param {number} [options.page=1]
   * @param {number} [options.limit=20]
   * @param {boolean} [options.isRead]
   * @returns {Promise<{notifications: Notification[], pagination: Object}>}
   */
  async getNotifications(userId, { page = 1, limit = 20, isRead } = {}) {
    const query = { recipientId: userId };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notification as read
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Promise<Notification|null>}
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (notification) {
      // Send updated count via socket
      const unreadCount = await this.getUnreadCount(userId);
      socketService.emitToUser(userId, "notification:count", {
        count: unreadCount,
      });
    }

    return notification;
  }

  /**
   * Mark all notifications as read
   * @param {string} userId
   * @returns {Promise<{modifiedCount: number}>}
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Send updated count via socket
    socketService.emitToUser(userId, "notification:count", { count: 0 });

    return result;
  }

  /**
   * Delete notification
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Promise<Notification|null>}
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
    });

    if (notification) {
      // Send updated count via socket
      const unreadCount = await this.getUnreadCount(userId);
      socketService.emitToUser(userId, "notification:count", {
        count: unreadCount,
      });
    }

    return notification;
  }
}

module.exports = new NotificationService();
