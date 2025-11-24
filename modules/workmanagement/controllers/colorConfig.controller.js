const { AppError } = require("../../../helpers/utils");
const User = require("../../../models/User");
const service = require("../services/colorConfig.service");

exports.getColors = async (req, res, next) => {
  try {
    const data = await service.getConfig();
    res.json({ data });
  } catch (e) {
    next(e);
  }
};

exports.updateColors = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) throw new AppError(401, "Không xác thực người dùng");
    const isAdmin = user.PhanQuyen === "admin"; // Chỉ cho phép Admin
    if (!isAdmin) throw new AppError(403, "Không có quyền");

    // Validate payload hex colors
    const HEX_RE = /^#(?:[0-9A-Fa-f]{3}){1,2}$/;
    const validateColorMap = (map, fieldName) => {
      if (!map) return;
      if (typeof map !== "object" || Array.isArray(map))
        throw new AppError(400, `${fieldName} phải là object`);
      for (const [key, val] of Object.entries(map)) {
        if (typeof val !== "string" || !HEX_RE.test(val)) {
          throw new AppError(
            400,
            `Màu không hợp lệ cho '${key}' trong ${fieldName}`
          );
        }
      }
    };

    const { statusColors, priorityColors, dueStatusColors } = req.body || {};
    validateColorMap(statusColors, "statusColors");
    validateColorMap(priorityColors, "priorityColors");
    validateColorMap(dueStatusColors, "dueStatusColors");

    const data = await service.updateConfig(
      { statusColors, priorityColors, dueStatusColors },
      req.userId
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
};
