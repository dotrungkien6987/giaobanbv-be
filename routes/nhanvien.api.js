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
 * @route PUT /nhanvien
 * @description Insert  new nhanvien
 * @body {nhanvien}
 * @access  login require,
 */
router.put(
  "/",
  authentication.loginRequired,
  
  nhanvienController.updateOneNhanVien
);

/**
 * @route GET /nhanvien
 * @description Get all nhanvien
 
 * @access  login require,
 */
router.get(
  "/",
  authentication.loginRequired,
  nhanvienController.getNhanviensPhanTrang
);
router.get(
  "/:nhanvienID",
  authentication.loginRequired,
  validators.validate([
    param("nhanvienID").exists().isString().custom(validators.checkObjectId),
      ]),
  nhanvienController.getById
);

/**
 * @route GET /nhanvien/:sucoId
 * @description Get one nhanvien
 * @params {sucoId}
 * @access  login require,
 */


router.delete(
  "/:nhanvienID",
  authentication.loginRequired,
  validators.validate([
    param("nhanvienID").exists().isString().custom(validators.checkObjectId),
      ]),
      nhanvienController.deleteOneNhanVien
);

module.exports = router;

router.post(
  "/import",
  authentication.loginRequired,
  
  nhanvienController.importNhanVien
);