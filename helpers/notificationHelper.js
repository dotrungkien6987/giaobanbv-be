/**
 * Notification Helper Functions
 *
 * Cung cấp helper để convert NhanVienID → User._id
 * và các utility functions khác cho notification system
 */

const User = require("../models/User");
const NhanVien = require("../models/NhanVien");

const notificationHelper = {};

/**
 * Convert NhanVienID → User._id
 * @param {string|ObjectId} nhanVienId - NhanVien._id
 * @returns {Promise<ObjectId|null>} User._id hoặc null nếu không tìm thấy
 */
notificationHelper.resolveNhanVienToUserId = async (nhanVienId) => {
  if (!nhanVienId) return null;

  try {
    const user = await User.findOne({
      NhanVienID: nhanVienId,
      isDeleted: { $ne: true },
    })
      .select("_id")
      .lean();

    return user?._id || null;
  } catch (error) {
    console.error(
      "[notificationHelper] Error resolving NhanVienID:",
      error.message
    );
    return null;
  }
};

/**
 * Batch convert nhiều NhanVienIDs → User._ids
 * @param {Array<string|ObjectId|Object>} nhanVienIds - Array of NhanVien._id hoặc populated objects
 * @returns {Promise<Array<ObjectId>>} Array of User._id (filtered nulls)
 */
notificationHelper.resolveNhanVienListToUserIds = async (nhanVienIds) => {
  console.log(
    `[notificationHelper] 📥 resolveNhanVienListToUserIds input:`,
    nhanVienIds
  );
  if (!Array.isArray(nhanVienIds) || nhanVienIds.length === 0) {
    console.log(`[notificationHelper] ⚠️ Empty or invalid input array`);
    return [];
  }

  // Extract _id from populated objects, handle both ObjectId and populated Object
  const extractedIds = nhanVienIds.map((item) => {
    if (!item) return null;
    // If it's a populated object with _id property (e.g., from YeuCau populate)
    if (typeof item === "object" && item._id) {
      return item._id;
    }
    // If it's already an ObjectId or string (e.g., from CongViec)
    return item;
  });

  // Filter out null/undefined and deduplicate
  const validIds = [...new Set(extractedIds.filter((id) => id != null))];
  console.log(
    `[notificationHelper] 🔍 validIds after extract & filter:`,
    validIds
  );
  if (validIds.length === 0) return [];

  try {
    const users = await User.find({
      NhanVienID: { $in: validIds },
      isDeleted: { $ne: true },
    })
      .select("_id NhanVienID")
      .lean();

    console.log(
      `[notificationHelper] ✅ Found ${users.length} users:`,
      users.map((u) => ({ _id: u._id, NhanVienID: u.NhanVienID }))
    );
    return users.map((u) => u._id);
  } catch (error) {
    console.error(
      "[notificationHelper] Error batch resolving NhanVienIDs:",
      error.message
    );
    return [];
  }
};

/**
 * Get display name của nhân viên
 * @param {string|ObjectId} nhanVienId - NhanVien._id
 * @returns {Promise<string>} Tên nhân viên hoặc "Người dùng"
 */
notificationHelper.getDisplayName = async (nhanVienId) => {
  if (!nhanVienId) return "Người dùng";

  try {
    const nhanVien = await NhanVien.findById(nhanVienId)
      .select("Ten HoTen")
      .lean();

    return nhanVien?.Ten || nhanVien?.HoTen || "Người dùng";
  } catch (error) {
    console.error(
      "[notificationHelper] Error getting display name:",
      error.message
    );
    return "Người dùng";
  }
};

/**
 * Get display names for multiple NhanVienIds (batch)
 * @param {Array<string|ObjectId>} nhanVienIds
 * @returns {Promise<Map<string, string>>} Map của nhanVienId → displayName
 */
notificationHelper.getDisplayNames = async (nhanVienIds) => {
  const result = new Map();
  if (!Array.isArray(nhanVienIds) || nhanVienIds.length === 0) {
    return result;
  }

  try {
    const nhanViens = await NhanVien.find({
      _id: { $in: nhanVienIds },
    })
      .select("_id Ten HoTen")
      .lean();

    nhanViens.forEach((nv) => {
      result.set(String(nv._id), nv.Ten || nv.HoTen || "Người dùng");
    });

    return result;
  } catch (error) {
    console.error(
      "[notificationHelper] Error batch getting display names:",
      error.message
    );
    return result;
  }
};

module.exports = notificationHelper;
