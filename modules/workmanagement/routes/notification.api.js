const router = require("express").Router();
const notificationController = require("../controllers/notification.controller");
const authentication = require("../../../middlewares/authentication");

// All endpoints in this module are admin configuration tools
router.use(authentication.loginRequired);
router.use(authentication.adminRequired);

// ============================================================================
// NOTIFICATION TYPE ROUTES
// ============================================================================

/**
 * @route GET /api/workmanagement/notifications/types
 * @desc Get all notification types (filter by isActive)
 * @query isActive=true|false
 * @access Private
 */
router.get("/types", notificationController.getAllTypes);

/**
 * @route GET /api/workmanagement/notifications/types/code/:code
 * @desc Get notification type by code (e.g., 'yeucau-tao-moi')
 * @note This route MUST come BEFORE /types/:id to avoid conflict
 * @access Private
 */
router.get("/types/code/:code", notificationController.getTypeByCode);

/**
 * @route GET /api/workmanagement/notifications/types/:id
 * @desc Get notification type by ID
 * @access Private
 */
router.get("/types/:id", notificationController.getTypeById);

/**
 * @route POST /api/workmanagement/notifications/types
 * @desc Create new notification type
 * @body { code, name, description?, variables?, isActive? }
 * @access Private (Admin only)
 */
router.post("/types", notificationController.createType);

/**
 * @route PUT /api/workmanagement/notifications/types/:id
 * @desc Update notification type
 * @body { name?, description?, variables?, isActive? }
 * @access Private (Admin only)
 */
router.put("/types/:id", notificationController.updateType);

/**
 * @route DELETE /api/workmanagement/notifications/types/:id
 * @desc Delete notification type (soft delete - set isActive = false)
 * @access Private (Admin only)
 */
router.delete("/types/:id", notificationController.deleteType);

// ============================================================================
// NOTIFICATION TEMPLATE ROUTES
// ============================================================================

/**
 * @route GET /api/workmanagement/notifications/templates
 * @desc Get all notification templates (filter by typeCode, isEnabled)
 * @query typeCode=string, isEnabled=true|false
 * @access Private
 */
router.get("/templates", notificationController.getAllTemplates);

/**
 * @route GET /api/workmanagement/notifications/templates/:id
 * @desc Get template by ID
 * @access Private
 */
router.get("/templates/:id", notificationController.getTemplateById);

/**
 * @route POST /api/workmanagement/notifications/templates
 * @desc Create new notification template
 * @body { name, typeCode, recipientConfig, titleTemplate, bodyTemplate, actionUrl?, icon?, priority?, isEnabled? }
 * @access Private (Admin only)
 */
router.post("/templates", notificationController.createTemplate);

/**
 * @route PUT /api/workmanagement/notifications/templates/:id
 * @desc Update notification template
 * @body { name?, recipientConfig?, titleTemplate?, bodyTemplate?, actionUrl?, icon?, priority?, isEnabled? }
 * @access Private (Admin only)
 */
router.put("/templates/:id", notificationController.updateTemplate);

/**
 * @route DELETE /api/workmanagement/notifications/templates/:id
 * @desc Delete notification template (soft delete - set isEnabled = false)
 * @access Private (Admin only)
 */
router.delete("/templates/:id", notificationController.deleteTemplate);

/**
 * @route POST /api/workmanagement/notifications/templates/:id/preview
 * @desc Preview template with sample data
 * @body { data: { ...sampleData } }
 * @access Private
 */
router.post("/templates/:id/preview", notificationController.previewTemplate);

// ============================================================================
// ADMIN TOOLS
// ============================================================================

/**
 * @route POST /api/workmanagement/notifications/clear-cache
 * @desc Manually clear notification service cache
 * @access Private (Admin only)
 */
router.post("/clear-cache", notificationController.clearCache);

/**
 * @route POST /api/workmanagement/notifications/test-send
 * @desc Test send notification with sample data
 * @body { type: 'type-code', data: { ...variables } }
 * @access Private (Admin only)
 */
router.post("/test-send", notificationController.testSend);

module.exports = router;
