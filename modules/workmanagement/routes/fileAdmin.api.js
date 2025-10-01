const express = require("express");
const router = express.Router();
const authentication = require("../../../middlewares/authentication");
const admin = require("../controllers/fileAdmin.controller");

// Require login and admin role
router.use(authentication.loginRequired);
router.use(authentication.adminRequired);

router.get("/files", admin.list);
router.get("/files/stats", admin.stats);
router.get("/files/tree", admin.tree);
router.get("/files/:id/inline", admin.streamInline);
router.get("/files/:id/download", admin.streamDownload);
router.patch("/files/:id/restore", admin.restore);
router.delete("/files/:id", admin.delete);
router.post("/files/cleanup", admin.cleanup);

module.exports = router;
