const express = require("express");
const router = express.Router();

const authentication = require("../../../middlewares/authentication");
const ctrl = require("../controllers/colorConfig.controller");

router.use(authentication.loginRequired);

// GET /api/workmanagement/colors
router.get("/colors", ctrl.getColors);

// PUT /api/workmanagement/colors
router.put("/colors", ctrl.updateColors);

module.exports = router;
