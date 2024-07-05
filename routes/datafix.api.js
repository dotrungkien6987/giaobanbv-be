const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const datafixController = require("../controllers/datafix.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route GET /datafix/getonebythangnam
 * @description get datafix by thang nam
 * @params {Thang, Nam}
 * @access login require,
 */
router.get("/getAll",authentication.loginRequired,datafixController.getDataFix)

module.exports = router;
