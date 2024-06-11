const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const nhanvienController = require("../controllers/nhanvien.controller");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /nhanvien
 * @description Insert  new nhanvien
 * @body {nhanvien}
 * @access  login require,
 */
router.post(
  "/",
  authentication.loginRequired,
  
  nhanvienController.insertOne
);

/**
 * @route GET /nhanvien
 * @description Get all nhanvien
 
 * @access  login require,
 */
router.get(
  "/",
  authentication.loginRequired,
  nhanvienController.getNhanviens
);

/**
 * @route GET /nhanvien/:sucoId
 * @description Get one nhanvien
 * @params {sucoId}
 * @access  login require,
 */

module.exports = router;
