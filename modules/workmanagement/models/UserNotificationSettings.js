const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Type preference sub-schema
 * Cài đặt cho từng loại thông báo
 */
const typePreferenceSchema = new Schema(
  {
    inapp: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * FCM token sub-schema
 * Hỗ trợ nhiều thiết bị
 */
const fcmTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    deviceName: { type: String, default: "Unknown Device" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * UserNotificationSettings Model
 * Lưu trữ cài đặt thông báo của user
 *
 * Features:
 * - Global on/off switch
 * - Quiet hours (giờ yên tĩnh)
 * - Per-type preferences
 * - Multiple FCM tokens (multiple devices)
 */
const userNotificationSettingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Global settings
    enableNotifications: {
      type: Boolean,
      default: true,
    },
    enablePush: {
      type: Boolean,
      default: true,
    },

    // Quiet hours
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "22:00" },
      end: { type: String, default: "07:00" },
    },

    // Per-type preferences
    typePreferences: {
      type: Map,
      of: typePreferenceSchema,
      default: new Map(),
    },

    // FCM tokens for multiple devices
    fcmTokens: [fcmTokenSchema],
  },
  {
    timestamps: true,
  }
);

/**
 * Check if should send notification
 * @param {string} type - Notification type
 * @param {string} channel - 'inapp' or 'push'
 * @returns {boolean}
 */
userNotificationSettingsSchema.methods.shouldSend = function (type, channel) {
  // Global check
  if (!this.enableNotifications) return false;
  if (channel === "push" && !this.enablePush) return false;

  // Quiet hours check (only for push)
  if (channel === "push" && this.quietHours.enabled) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const { start, end } = this.quietHours;

    // Handle overnight (e.g., 22:00 - 07:00)
    if (start > end) {
      if (currentTime >= start || currentTime < end) return false;
    } else {
      if (currentTime >= start && currentTime < end) return false;
    }
  }

  // Type-specific check
  const typePref = this.typePreferences.get(type);
  if (typePref && typePref[channel] === false) {
    return false;
  }

  return true;
};

/**
 * Get or create settings for user
 * @param {ObjectId} userId
 * @returns {Promise<UserNotificationSettings>}
 */
userNotificationSettingsSchema.statics.getOrCreate = async function (userId) {
  let settings = await this.findOne({ userId });
  if (!settings) {
    settings = await this.create({ userId });
  }
  return settings;
};

module.exports = mongoose.model(
  "UserNotificationSettings",
  userNotificationSettingsSchema
);
