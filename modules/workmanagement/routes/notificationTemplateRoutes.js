const express = require("express");
const router = express.Router();
const authentication = require("../../../middlewares/authentication");
const { sendResponse } = require("../../../helpers/utils");

// Legacy routes - DEPRECATED.
// This router used to be mounted at: /api/notification-templates
// New unified admin API: /api/workmanagement/notifications/templates

router.use(authentication.loginRequired);
router.use(authentication.adminRequired);

router.all("*", (req, res) => {
  return sendResponse(
    res,
    410,
    false,
    {
      deprecated: true,
      newEndpointBase: "/api/workmanagement/notifications/templates",
    },
    null,
    "Endpoint deprecated - use /api/workmanagement/notifications/templates"
  );
});

module.exports = router;
