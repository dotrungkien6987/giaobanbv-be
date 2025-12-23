const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const mongoose = require("mongoose");
const NotificationType = require("../models/NotificationType");
const NotificationTemplate = require("../models/NotificationTemplate");
const notificationService = require("../services/notificationService");

const notificationController = {};

// Helper function to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ============================================================================
// NOTIFICATION TYPE CRUD
// ============================================================================

/**
 * @route GET /api/workmanagement/notifications/types
 * @desc Get all notification types
 * @access Private
 */
notificationController.getAllTypes = catchAsync(async (req, res, next) => {
  const { isActive, Nhom } = req.query;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }
  if (Nhom) {
    filter.Nhom = Nhom;
  }

  const types = await NotificationType.find(filter).sort({ code: 1 }).lean();

  return sendResponse(
    res,
    200,
    true,
    { types, total: types.length },
    null,
    "Lấy danh sách notification types thành công"
  );
});

/**
 * @route GET /api/workmanagement/notifications/types/:id
 * @desc Get notification type by ID
 * @access Private
 */
notificationController.getTypeById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!isValidObjectId(id)) {
    throw new AppError(400, "ID không hợp lệ", "INVALID_ID");
  }

  const type = await NotificationType.findById(id).lean();

  if (!type) {
    throw new AppError(
      404,
      "Không tìm thấy notification type",
      "TYPE_NOT_FOUND"
    );
  }

  return sendResponse(
    res,
    200,
    true,
    { type },
    null,
    "Lấy thông tin notification type thành công"
  );
});

/**
 * @route GET /api/workmanagement/notifications/types/code/:code
 * @desc Get notification type by code
 * @access Private
 */
notificationController.getTypeByCode = catchAsync(async (req, res, next) => {
  const { code } = req.params;

  const type = await NotificationType.findOne({ code }).lean();

  if (!type) {
    throw new AppError(
      404,
      "Không tìm thấy notification type",
      "TYPE_NOT_FOUND"
    );
  }

  return sendResponse(
    res,
    200,
    true,
    { type },
    null,
    "Lấy thông tin notification type thành công"
  );
});

/**
 * @route POST /api/workmanagement/notifications/types
 * @desc Create new notification type
 * @access Private (Admin only)
 */
notificationController.createType = catchAsync(async (req, res, next) => {
  const { code, name, description, Nhom, variables, isActive } = req.body;

  // Validate required fields
  if (!code || !name || !Nhom) {
    throw new AppError(
      400,
      "Code, name và Nhom là bắt buộc",
      "VALIDATION_ERROR"
    );
  }

  // Validate Nhom value
  const validNhom = ["Công việc", "Yêu cầu", "KPI", "Hệ thống"];
  if (!validNhom.includes(Nhom)) {
    throw new AppError(
      400,
      `Nhom phải là một trong: ${validNhom.join(", ")}`,
      "INVALID_NHOM"
    );
  }

  // Check if code already exists
  const existing = await NotificationType.findOne({ code });
  if (existing) {
    throw new AppError(
      400,
      `Notification type với code '${code}' đã tồn tại`,
      "DUPLICATE_CODE"
    );
  }

  // Create new type
  const type = await NotificationType.create({
    code: code.toLowerCase().trim(),
    name,
    description,
    Nhom,
    variables: variables || [],
    isActive: isActive !== undefined ? isActive : true,
  });

  // Clear cache
  notificationService.clearCache();

  return sendResponse(
    res,
    201,
    true,
    { type },
    null,
    "Tạo notification type thành công"
  );
});

/**
 * @route PUT /api/workmanagement/notifications/types/:id
 * @desc Update notification type
 * @access Private (Admin only)
 */
notificationController.updateType = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, Nhom, variables, isActive } = req.body;

  if (!isValidObjectId(id)) {
    throw new AppError(400, "ID không hợp lệ", "INVALID_ID");
  }

  const type = await NotificationType.findById(id);

  if (!type) {
    throw new AppError(
      404,
      "Không tìm thấy notification type",
      "TYPE_NOT_FOUND"
    );
  }

  // Validate Nhom if provided
  if (Nhom !== undefined) {
    const validNhom = ["Công việc", "Yêu cầu", "KPI", "Hệ thống"];
    if (!validNhom.includes(Nhom)) {
      throw new AppError(
        400,
        `Nhom phải là một trong: ${validNhom.join(", ")}`,
        "INVALID_NHOM"
      );
    }
    type.Nhom = Nhom;
  }

  // Update fields
  if (name !== undefined) type.name = name;
  if (description !== undefined) type.description = description;
  if (variables !== undefined) type.variables = variables;
  if (isActive !== undefined) type.isActive = isActive;

  await type.save();

  // Clear cache
  notificationService.clearCache();

  return sendResponse(
    res,
    200,
    true,
    { type },
    null,
    "Cập nhật notification type thành công"
  );
});

/**
 * @route DELETE /api/workmanagement/notifications/types/:id
 * @desc Delete notification type (soft delete by setting isActive = false)
 * @access Private (Admin only)
 */
notificationController.deleteType = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new AppError(400, "ID không hợp lệ", "INVALID_ID");
  }

  const type = await NotificationType.findById(id);

  if (!type) {
    throw new AppError(
      404,
      "Không tìm thấy notification type",
      "TYPE_NOT_FOUND"
    );
  }

  // Check if any templates use this type
  const templatesCount = await NotificationTemplate.countDocuments({
    typeCode: type.code,
  });

  if (templatesCount > 0) {
    throw new AppError(
      400,
      `Không thể xóa type này vì có ${templatesCount} template(s) đang sử dụng`,
      "TYPE_IN_USE"
    );
  }

  // Soft delete
  type.isActive = false;
  await type.save();

  // Clear cache
  notificationService.clearCache();

  return sendResponse(
    res,
    200,
    true,
    { type },
    null,
    "Xóa notification type thành công"
  );
});

// ============================================================================
// NOTIFICATION TEMPLATE CRUD
// ============================================================================

/**
 * @route GET /api/workmanagement/notifications/templates
 * @desc Get all notification templates
 * @access Private
 */
notificationController.getAllTemplates = catchAsync(async (req, res, next) => {
  const { typeCode, isEnabled } = req.query;

  const filter = {};
  if (typeCode) filter.typeCode = typeCode;
  if (isEnabled !== undefined) filter.isEnabled = isEnabled === "true";

  const templates = await NotificationTemplate.find(filter)
    .sort({ typeCode: 1, name: 1 })
    .lean();

  return sendResponse(
    res,
    200,
    true,
    { templates, total: templates.length },
    null,
    "Lấy danh sách templates thành công"
  );
});

/**
 * @route GET /api/workmanagement/notifications/templates/:id
 * @desc Get template by ID
 * @access Private
 */
notificationController.getTemplateById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new AppError(400, "ID không hợp lệ", "INVALID_ID");
  }

  const template = await NotificationTemplate.findById(id).lean();

  if (!template) {
    throw new AppError(404, "Không tìm thấy template", "TEMPLATE_NOT_FOUND");
  }

  return sendResponse(
    res,
    200,
    true,
    { template },
    null,
    "Lấy thông tin template thành công"
  );
});

/**
 * @route POST /api/workmanagement/notifications/templates
 * @desc Create new notification template
 * @access Private (Admin only)
 */
notificationController.createTemplate = catchAsync(async (req, res, next) => {
  const {
    name,
    typeCode,
    recipientConfig,
    titleTemplate,
    bodyTemplate,
    actionUrl,
    icon,
    priority,
    isEnabled,
  } = req.body;

  // Validate required fields
  if (!name || !typeCode || !titleTemplate || !bodyTemplate) {
    throw new AppError(
      400,
      "name, typeCode, titleTemplate, bodyTemplate là bắt buộc",
      "VALIDATION_ERROR"
    );
  }

  // Verify type exists
  const type = await NotificationType.findOne({ code: typeCode });
  if (!type) {
    throw new AppError(
      400,
      `Notification type '${typeCode}' không tồn tại`,
      "TYPE_NOT_FOUND"
    );
  }

  // Validate recipientConfig variables
  if (recipientConfig && recipientConfig.variables) {
    const recipientCandidates = type.variables
      .filter((v) => v.isRecipientCandidate)
      .map((v) => v.name);

    for (const varName of recipientConfig.variables) {
      if (!recipientCandidates.includes(varName)) {
        throw new AppError(
          400,
          `Variable '${varName}' không phải recipient candidate của type '${typeCode}'`,
          "INVALID_RECIPIENT_VARIABLE"
        );
      }
    }
  }

  // Create template
  const template = await NotificationTemplate.create({
    name,
    typeCode,
    recipientConfig: recipientConfig || { variables: [] },
    titleTemplate,
    bodyTemplate,
    actionUrl: actionUrl || "",
    icon: icon || "notification",
    priority: priority || "normal",
    isEnabled: isEnabled !== undefined ? isEnabled : true,
    createdBy: req.userId, // Assuming auth middleware sets req.userId
  });

  // Clear cache
  notificationService.clearCache();

  return sendResponse(
    res,
    201,
    true,
    { template },
    null,
    "Tạo template thành công"
  );
});

/**
 * @route PUT /api/workmanagement/notifications/templates/:id
 * @desc Update notification template
 * @access Private (Admin only)
 */
notificationController.updateTemplate = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    recipientConfig,
    titleTemplate,
    bodyTemplate,
    actionUrl,
    icon,
    priority,
    isEnabled,
  } = req.body;

  if (!isValidObjectId(id)) {
    throw new AppError(400, "ID không hợp lệ", "INVALID_ID");
  }

  const template = await NotificationTemplate.findById(id);

  if (!template) {
    throw new AppError(404, "Không tìm thấy template", "TEMPLATE_NOT_FOUND");
  }

  // Validate recipientConfig if provided
  if (recipientConfig && recipientConfig.variables) {
    const type = await NotificationType.findOne({ code: template.typeCode });

    if (!type) {
      throw new AppError(
        400,
        "Notification type không tồn tại",
        "TYPE_NOT_FOUND"
      );
    }

    const recipientCandidates = type.variables
      .filter((v) => v.isRecipientCandidate)
      .map((v) => v.name);

    for (const varName of recipientConfig.variables) {
      if (!recipientCandidates.includes(varName)) {
        throw new AppError(
          400,
          `Variable '${varName}' không phải recipient candidate`,
          "INVALID_RECIPIENT_VARIABLE"
        );
      }
    }
  }

  // Update fields
  if (name !== undefined) template.name = name;
  if (recipientConfig !== undefined) template.recipientConfig = recipientConfig;
  if (titleTemplate !== undefined) template.titleTemplate = titleTemplate;
  if (bodyTemplate !== undefined) template.bodyTemplate = bodyTemplate;
  if (actionUrl !== undefined) template.actionUrl = actionUrl;
  if (icon !== undefined) template.icon = icon;
  if (priority !== undefined) template.priority = priority;
  if (isEnabled !== undefined) template.isEnabled = isEnabled;
  template.updatedBy = req.userId;

  await template.save();

  // Clear cache
  notificationService.clearCache();

  return sendResponse(
    res,
    200,
    true,
    { template },
    null,
    "Cập nhật template thành công"
  );
});

/**
 * @route DELETE /api/workmanagement/notifications/templates/:id
 * @desc Delete notification template (soft delete)
 * @access Private (Admin only)
 */
notificationController.deleteTemplate = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new AppError(400, "ID không hợp lệ", "INVALID_ID");
  }

  const template = await NotificationTemplate.findById(id);

  if (!template) {
    throw new AppError(404, "Không tìm thấy template", "TEMPLATE_NOT_FOUND");
  }

  // Soft delete
  template.isEnabled = false;
  template.updatedBy = req.userId;
  await template.save();

  // Clear cache
  notificationService.clearCache();

  return sendResponse(
    res,
    200,
    true,
    { template },
    null,
    "Xóa template thành công"
  );
});

// ============================================================================
// ADMIN TOOLS
// ============================================================================

/**
 * @route POST /api/workmanagement/notifications/clear-cache
 * @desc Clear notification service cache
 * @access Private (Admin only)
 */
notificationController.clearCache = catchAsync(async (req, res, next) => {
  notificationService.clearCache();

  return sendResponse(
    res,
    200,
    true,
    { message: "Cache cleared successfully" },
    null,
    "Xóa cache thành công"
  );
});

/**
 * @route POST /api/workmanagement/notifications/test-send
 * @desc Test send notification with sample data
 * @access Private (Admin only)
 */
notificationController.testSend = catchAsync(async (req, res, next) => {
  const { type, data } = req.body;

  if (!type || !data) {
    throw new AppError(400, "type và data là bắt buộc", "VALIDATION_ERROR");
  }

  // Verify type exists
  const notifType = await NotificationType.findOne({ code: type });
  if (!notifType) {
    throw new AppError(
      400,
      `Notification type '${type}' không tồn tại`,
      "TYPE_NOT_FOUND"
    );
  }

  // Test send
  const result = await notificationService.send({ type, data });

  return sendResponse(
    res,
    200,
    true,
    { result },
    null,
    "Test gửi notification thành công"
  );
});

/**
 * @route POST /api/workmanagement/notifications/templates/:id/preview
 * @desc Preview template with sample data
 * @access Private
 */
notificationController.previewTemplate = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { data } = req.body;

  if (!isValidObjectId(id)) {
    throw new AppError(400, "ID không hợp lệ", "INVALID_ID");
  }

  const template = await NotificationTemplate.findById(id);

  if (!template) {
    throw new AppError(404, "Không tìm thấy template", "TEMPLATE_NOT_FOUND");
  }

  // Render template với sample data
  const renderTemplate = (templateString, data) => {
    return templateString.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      if (value === undefined || value === null) return match; // Keep placeholder
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
  };

  const preview = {
    title: renderTemplate(template.titleTemplate, data || {}),
    body: renderTemplate(template.bodyTemplate, data || {}),
    actionUrl: template.actionUrl
      ? renderTemplate(template.actionUrl, data || {})
      : null,
    icon: template.icon,
    priority: template.priority,
  };

  // Extract variables used in templates
  const extractedVars = template.extractVariables();

  return sendResponse(
    res,
    200,
    true,
    { preview, extractedVars },
    null,
    "Preview template thành công"
  );
});

module.exports = notificationController;
