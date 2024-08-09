const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const lopdaotaonhanvientamController = require("../controllers/lopdaotaonhanvientam.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /lopdaotao
 * @description Insert  new lopdaotao
 * @body {lopdaotao}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,
  
  lopdaotaonhanvientamController.insertOrUpdateLopdaotaoNhanVienTam
);
module.exports = router;
