const express = require("express");
const router = express.Router();
const authentication = require("../middlewares/authentication");
const controller = require("../controllers/quyTrinhISO.controller");

// All routes require login
router.use(authentication.loginRequired);

// Statistics visible to all users - data is filtered by role in controller
router.get("/statistics", controller.getStatistics);

// Distribution Management routes (before parameterized routes)
router.get(
  "/distribution",
  authentication.qlclRequired,
  controller.getDistributionList,
);
router.get("/distributed-to-me", controller.getDistributedToMe);
router.get("/built-by-my-dept", controller.getBuiltByMyDept);

// Public routes (filtered by permission in controller)
router.get("/", controller.list);
router.get("/:id", controller.detail);
router.get("/:id/versions", controller.getVersions);
router.get(
  "/:id/audit-log",
  authentication.qlclRequired,
  controller.getAuditLog,
);

// QLCL-only routes
router.post("/", authentication.qlclRequired, controller.create);
router.put("/:id", authentication.qlclRequired, controller.update);
router.delete("/:id", authentication.qlclRequired, controller.delete);
router.post(
  "/:id/copy-files-from/:sourceVersionId",
  authentication.qlclRequired,
  controller.copyFilesFromVersion,
);
router.put(
  "/:id/distribution",
  authentication.qlclRequired,
  controller.updateDistribution,
);
router.put("/:id/activate", authentication.qlclRequired, controller.activate);
router.put(
  "/:id/deactivate",
  authentication.qlclRequired,
  controller.deactivate,
);

module.exports = router;
