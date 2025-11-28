const express = require("express");
const router = express.Router();
const notificationTemplateController = require("../controllers/notificationTemplateController");
const authentication = require("../../../middlewares/authentication");

// All routes require authentication and admin permission
router.use(authentication.loginRequired);
router.use(authentication.adminRequired); // PhanQuyen >= 3

/**
 * @route   GET /api/notification-templates/stats
 * @desc    Get template statistics
 * @access  Admin only
 */
router.get("/stats", notificationTemplateController.getStats);

/**
 * @route   GET /api/notification-templates
 * @desc    Get all templates with filters
 * @access  Admin only
 */
router.get("/", notificationTemplateController.getTemplates);

/**
 * @route   GET /api/notification-templates/:id
 * @desc    Get single template
 * @access  Admin only
 */
router.get("/:id", notificationTemplateController.getTemplate);

/**
 * @route   POST /api/notification-templates
 * @desc    Create new template
 * @access  Admin only
 */
router.post("/", notificationTemplateController.createTemplate);

/**
 * @route   PUT /api/notification-templates/:id
 * @desc    Update template
 * @access  Admin only
 */
router.put("/:id", notificationTemplateController.updateTemplate);

/**
 * @route   DELETE /api/notification-templates/:id
 * @desc    Soft delete template
 * @access  Admin only
 */
router.delete("/:id", notificationTemplateController.deleteTemplate);

/**
 * @route   POST /api/notification-templates/:id/test
 * @desc    Test send notification
 * @access  Admin only
 */
router.post("/:id/test", notificationTemplateController.testTemplate);

module.exports = router;
