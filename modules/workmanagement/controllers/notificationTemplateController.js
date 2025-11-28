const { NotificationTemplate } = require("../models");
const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const notificationService = require("../services/notificationService");

const notificationTemplateController = {};

/**
 * @desc    Get all notification templates (with filters)
 * @route   GET /api/notification-templates
 * @access  Admin only
 */
notificationTemplateController.getTemplates = catchAsync(
  async (req, res, next) => {
    const {
      page = 1,
      limit = 20,
      category,
      isAutoCreated,
      isActive,
      search,
    } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (isAutoCreated !== undefined)
      filter.isAutoCreated = isAutoCreated === "true";
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
      filter.$or = [
        { type: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [templates, total] = await Promise.all([
      NotificationTemplate.find(filter)
        .sort({ category: 1, type: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("createdBy", "HoTen")
        .populate("updatedBy", "HoTen"),
      NotificationTemplate.countDocuments(filter),
    ]);

    // Stats for dashboard
    const stats = await NotificationTemplate.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          autoCreated: {
            $sum: { $cond: ["$isAutoCreated", 1, 0] },
          },
          inactive: {
            $sum: { $cond: ["$isActive", 0, 1] },
          },
        },
      },
    ]);

    return sendResponse(
      res,
      200,
      true,
      {
        templates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
        stats: stats[0] || { total: 0, autoCreated: 0, inactive: 0 },
      },
      null,
      "Lấy danh sách templates thành công"
    );
  }
);

/**
 * @desc    Get single template by ID
 * @route   GET /api/notification-templates/:id
 * @access  Admin only
 */
notificationTemplateController.getTemplate = catchAsync(
  async (req, res, next) => {
    const template = await NotificationTemplate.findById(req.params.id)
      .populate("createdBy", "HoTen")
      .populate("updatedBy", "HoTen");

    if (!template) {
      throw new AppError(404, "Không tìm thấy template", "NOT_FOUND");
    }

    return sendResponse(
      res,
      200,
      true,
      template,
      null,
      "Lấy template thành công"
    );
  }
);

/**
 * @desc    Create new template
 * @route   POST /api/notification-templates
 * @access  Admin only
 */
notificationTemplateController.createTemplate = catchAsync(
  async (req, res, next) => {
    const {
      type,
      name,
      description,
      category,
      titleTemplate,
      bodyTemplate,
      icon,
      defaultChannels,
      defaultPriority,
      actionUrlTemplate,
      requiredVariables,
    } = req.body;

    // Check duplicate type
    const existing = await NotificationTemplate.findOne({
      type: type.toUpperCase(),
    });
    if (existing) {
      throw new AppError(400, "Type đã tồn tại", "DUPLICATE_TYPE");
    }

    const template = await NotificationTemplate.create({
      type: type.toUpperCase(),
      name,
      description,
      category: category || "other",
      titleTemplate,
      bodyTemplate,
      icon: icon || "notification",
      defaultChannels: defaultChannels || ["inapp", "push"],
      defaultPriority: defaultPriority || "normal",
      actionUrlTemplate,
      requiredVariables: requiredVariables || [],
      isAutoCreated: false,
      createdBy: req.userId,
    });

    // Clear cache so new template is available
    notificationService.invalidateCache(template.type);

    return sendResponse(
      res,
      201,
      true,
      template,
      null,
      "Tạo template thành công"
    );
  }
);

/**
 * @desc    Update template
 * @route   PUT /api/notification-templates/:id
 * @access  Admin only
 */
notificationTemplateController.updateTemplate = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.type; // Type shouldn't change
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.usageCount;
    delete updateData.lastUsedAt;

    // Add audit field
    updateData.updatedBy = req.userId;

    // If updating an auto-created template, mark it as configured
    if (updateData.titleTemplate || updateData.bodyTemplate) {
      updateData.isAutoCreated = false;
    }

    const template = await NotificationTemplate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "HoTen")
      .populate("updatedBy", "HoTen");

    if (!template) {
      throw new AppError(404, "Không tìm thấy template", "NOT_FOUND");
    }

    // Clear cache so updated template is used
    notificationService.invalidateCache(template.type);

    return sendResponse(
      res,
      200,
      true,
      template,
      null,
      "Cập nhật template thành công"
    );
  }
);

/**
 * @desc    Soft delete template (set isActive = false)
 * @route   DELETE /api/notification-templates/:id
 * @access  Admin only
 */
notificationTemplateController.deleteTemplate = catchAsync(
  async (req, res, next) => {
    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isActive: false,
          updatedBy: req.userId,
        },
      },
      { new: true }
    );

    if (!template) {
      throw new AppError(404, "Không tìm thấy template", "NOT_FOUND");
    }

    // Clear cache
    notificationService.invalidateCache(template.type);

    return sendResponse(
      res,
      200,
      true,
      template,
      null,
      "Đã vô hiệu hóa template"
    );
  }
);

/**
 * @desc    Test send notification using template
 * @route   POST /api/notification-templates/:id/test
 * @access  Admin only
 */
notificationTemplateController.testTemplate = catchAsync(
  async (req, res, next) => {
    const template = await NotificationTemplate.findById(req.params.id);

    if (!template) {
      throw new AppError(404, "Không tìm thấy template", "NOT_FOUND");
    }

    // Generate test data if not provided
    const testData = req.body.data || {};
    template.requiredVariables.forEach((varName) => {
      if (!testData[varName]) {
        testData[varName] = `[Test ${varName}]`;
      }
    });

    // Send test notification to current user
    const notification = await notificationService.send({
      type: template.type,
      recipientId: req.userId,
      data: testData,
      priority: template.defaultPriority,
    });

    return sendResponse(
      res,
      200,
      true,
      {
        renderedTitle: notification?.title,
        renderedBody: notification?.body,
        sentTo: req.userId,
        notification,
      },
      null,
      "Đã gửi notification test"
    );
  }
);

/**
 * @desc    Get template statistics
 * @route   GET /api/notification-templates/stats
 * @access  Admin only
 */
notificationTemplateController.getStats = catchAsync(async (req, res, next) => {
  const stats = await NotificationTemplate.aggregate([
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              autoCreated: { $sum: { $cond: ["$isAutoCreated", 1, 0] } },
              inactive: { $sum: { $cond: ["$isActive", 0, 1] } },
            },
          },
        ],
        byCategory: [
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
        ],
        mostUsed: [
          { $match: { usageCount: { $gt: 0 } } },
          { $sort: { usageCount: -1 } },
          { $limit: 5 },
          { $project: { type: 1, name: 1, usageCount: 1 } },
        ],
      },
    },
  ]);

  const result = stats[0];
  const overall = result.overall[0] || {
    total: 0,
    autoCreated: 0,
    inactive: 0,
  };
  const byCategory = {};
  result.byCategory.forEach((item) => {
    byCategory[item._id || "other"] = item.count;
  });

  return sendResponse(
    res,
    200,
    true,
    {
      ...overall,
      byCategory,
      mostUsed: result.mostUsed,
    },
    null,
    "Lấy thống kê thành công"
  );
});

module.exports = notificationTemplateController;
