const mongoose = require("mongoose");
const NotificationType = require("../models/NotificationType");
const NotificationTemplate = require("../models/NotificationTemplate");
const Notification = require("../models/Notification");
const UserNotificationSettings = require("../models/UserNotificationSettings");
const notificationHelper = require("../../../helpers/notificationHelper");
const socketService = require("../../../services/socketService");

/**
 * NotificationService - Admin-Configurable Notification Engine
 *
 * Core Responsibilities:
 * - Load notification types & templates from DB (with cache)
 * - Build recipients from config + data
 * - Render templates with simple regex
 * - Send to users (check settings, create DB, emit socket)
 *
 * Usage:
 * await notificationService.send({
 *   type: 'yeucau-tao-moi',
 *   data: { _id, MaYeuCau, TenKhoaGui, arrNguoiDieuPhoiID, ... }
 * });
 */
class NotificationService {
  constructor() {
    this.typeCache = new Map();
    this.templateCache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Main entry point - Send notification
   * @param {Object} params
   * @param {string} params.type - NotificationType code (e.g., 'yeucau-tao-moi')
   * @param {Object} params.data - Flatten data với tất cả variables
   */
  async send({ type, data }) {
    console.log(`[Notification] Type: ${type}, Data keys:`, Object.keys(data));

    try {
      // 1. Load type config (with cache)
      const notifType = await this.getNotificationType(type);
      if (!notifType || !notifType.isActive) {
        console.warn(`[Notification] Type ${type} not found or inactive`);
        return { success: false, reason: "type_not_found" };
      }

      // 2. Load enabled templates (with cache)
      const templates = await this.getTemplates(type);
      if (templates.length === 0) {
        console.warn(`[Notification] No enabled templates for ${type}`);
        return { success: false, reason: "no_templates" };
      }

      console.log(`[Notification] Found ${templates.length} template(s)`);

      // 3. Process each template (parallel)
      const results = await Promise.allSettled(
        templates.map((template) => this.processTemplate(template, data))
      );

      const sent = results.filter(
        (r) => r.status === "fulfilled" && r.value?.success
      ).length;
      const failed = results.length - sent;

      console.log(`[Notification] Sent: ${sent}, Failed: ${failed}`);
      return { success: sent > 0, sent, failed };
    } catch (error) {
      console.error(`[Notification] Error sending type ${type}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process single template
   */
  async processTemplate(template, data) {
    try {
      // 1. Build recipients from config
      const recipientNhanVienIds = this.buildRecipients(
        template.recipientConfig,
        data
      );

      if (recipientNhanVienIds.length === 0) {
        console.warn(`[Template ${template.name}] No recipients found`);
        return { success: false, reason: "no_recipients" };
      }

      console.log(
        `[Template ${template.name}] Recipients (NhanVienIDs):`,
        recipientNhanVienIds.length
      );

      // 2. Convert NhanVienID → UserID
      const userIds = await notificationHelper.resolveNhanVienListToUserIds(
        recipientNhanVienIds
      );

      if (userIds.length === 0) {
        console.warn(`[Template ${template.name}] No users found`);
        return { success: false, reason: "no_users" };
      }

      console.log(
        `[Template ${template.name}] Users (UserIDs):`,
        userIds.length
      );

      // 3. Render templates
      const title = this.renderTemplate(template.titleTemplate, data);
      const body = this.renderTemplate(template.bodyTemplate, data);
      const actionUrl = template.actionUrl
        ? this.renderTemplate(template.actionUrl, data)
        : null;

      console.log(`[Template ${template.name}] Rendered title:`, title);

      // 4. Send to each user (parallel)
      const sendResults = await Promise.allSettled(
        userIds.map((userId) =>
          this.sendToUser({
            userId,
            templateId: template._id,
            typeCode: template.typeCode,
            title,
            body,
            actionUrl,
            icon: template.icon,
            priority: template.priority,
            metadata: data,
          })
        )
      );

      const sentCount = sendResults.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;
      console.log(
        `[Template ${template.name}] Sent to ${sentCount}/${userIds.length} users`
      );

      return {
        success: sentCount > 0,
        sent: sentCount,
        failed: userIds.length - sentCount,
      };
    } catch (error) {
      console.error(`[Template ${template.name}] Error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build recipients from config and data
   * @param {Object} recipientConfig - { variables: ['arrNguoiDieuPhoiID', 'NguoiYeuCauID'] }
   * @param {Object} data - Data object with NhanVienIDs
   * @returns {string[]} - Array of unique NhanVienID strings
   */
  buildRecipients(recipientConfig, data) {
    const recipients = [];

    if (!recipientConfig || !recipientConfig.variables) {
      return recipients;
    }

    for (const varName of recipientConfig.variables) {
      const value = data[varName];

      if (!value) {
        console.warn(`[BuildRecipients] Variable ${varName} not found in data`);
        continue;
      }

      // Handle different data types
      if (typeof value === "string") {
        recipients.push(value);
      } else if (value instanceof mongoose.Types.ObjectId) {
        recipients.push(value.toString());
      } else if (Array.isArray(value)) {
        const ids = value
          .map((item) => {
            if (typeof item === "string") return item;
            if (item instanceof mongoose.Types.ObjectId) return item.toString();
            if (item && item._id) return item._id.toString();
            return null;
          })
          .filter(Boolean);
        recipients.push(...ids);
      } else if (value && value._id) {
        recipients.push(value._id.toString());
      } else {
        console.warn(
          `[BuildRecipients] Unknown value type for ${varName}:`,
          typeof value
        );
      }
    }

    // Deduplicate
    return [...new Set(recipients)];
  }

  /**
   * Render template with simple regex (flatten variables only)
   * Supports: {{variableName}} - NO nested access
   * @param {string} templateString - Template with {{var}} syntax
   * @param {Object} data - Flat data object
   * @returns {string} - Rendered string
   */
  renderTemplate(templateString, data) {
    try {
      return templateString.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = data[key];
        if (value === undefined || value === null) return "";

        // Handle MongoDB ObjectId - convert to string
        if (value.constructor && value.constructor.name === "ObjectId") {
          return value.toString();
        }

        // Handle other objects (not ObjectId)
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      });
    } catch (error) {
      console.error("[RenderTemplate] Error:", error);
      return templateString; // Fallback
    }
  }

  /**
   * Send to single user
   */
  async sendToUser({
    userId,
    templateId,
    typeCode,
    title,
    body,
    actionUrl,
    icon,
    priority,
    metadata,
  }) {
    try {
      // Check user settings (per-type support)
      const settings = await UserNotificationSettings.getOrCreate(userId);
      if (!settings.shouldSend(typeCode, "inapp")) {
        console.log(
          `[SendToUser] User ${userId} disabled ${typeCode} notifications`
        );
        return null;
      }

      // Create notification document
      const notification = await Notification.create({
        recipientId: userId,
        templateId: templateId,
        type: typeCode,
        title: title,
        body: body,
        actionUrl: actionUrl,
        icon: icon || "notification",
        priority: priority || "normal",
        metadata: metadata,
        isRead: false,
        deliveredVia: ["inapp"],
      });

      console.log(
        `[SendToUser] Notification created: ${notification._id} for user ${userId}`
      );

      // Emit socket event using existing socketService
      try {
        socketService.emitToUser(userId, "notification:new", {
          notification: {
            _id: notification._id,
            title: title,
            body: body,
            actionUrl: actionUrl,
            icon: icon,
            priority: priority,
            createdAt: notification.createdAt,
          },
        });

        console.log(`[SendToUser] Socket event emitted to user:${userId}`);
      } catch (socketError) {
        console.error("[SendToUser] Socket emit error:", socketError);
        // Don't throw - notification already created in DB
      }

      return notification;
    } catch (error) {
      console.error(`[SendToUser] Error for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get notification type (with cache)
   */
  async getNotificationType(code) {
    const cacheKey = `type:${code}`;

    if (this.typeCache.has(cacheKey)) {
      const cached = this.typeCache.get(cacheKey);
      if (Date.now() < cached.expires) {
        return cached.data;
      }
    }

    const type = await NotificationType.findOne({ code }).lean();

    if (type) {
      this.typeCache.set(cacheKey, {
        data: type,
        expires: Date.now() + this.CACHE_TTL,
      });
    }

    return type;
  }

  /**
   * Get templates (with cache)
   */
  async getTemplates(typeCode) {
    const cacheKey = `templates:${typeCode}`;

    if (this.templateCache.has(cacheKey)) {
      const cached = this.templateCache.get(cacheKey);
      if (Date.now() < cached.expires) {
        return cached.data;
      }
    }

    const templates = await NotificationTemplate.find({
      typeCode,
      isEnabled: true,
    }).lean();

    this.templateCache.set(cacheKey, {
      data: templates,
      expires: Date.now() + this.CACHE_TTL,
    });

    return templates;
  }

  /**
   * Clear cache (called when admin updates config)
   */
  clearCache() {
    this.typeCache.clear();
    this.templateCache.clear();
    console.log("[Notification] Cache cleared");
  }

  /**
   * Clear cache cho specific type
   */
  clearCacheForType(typeCode) {
    this.typeCache.delete(`type:${typeCode}`);
    this.templateCache.delete(`templates:${typeCode}`);
    console.log(`[Notification] Cache cleared for type: ${typeCode}`);
  }

  // ============================================================================
  // USER-FACING METHODS (for notificationController.js)
  // ============================================================================

  /**
   * Get user's notifications with pagination
   * @param {string} userId - User ID
   * @param {Object} options - { page, limit, isRead }
   */
  async getNotifications(userId, options = {}) {
    const { page = 1, limit = 20, isRead } = options;
    const skip = (page - 1) * limit;

    const query = { recipientId: userId };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
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
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return result;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
    });

    return notification;
  }
}

// Export singleton
module.exports = new NotificationService();
