const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validators = require("../middlewares/validators");

const lopdaotaonhanvientamController = require("../controllers/lopdaotaonhanvien.controller");
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
  
  lopdaotaonhanvientamController.insertOrUpdateLopdaotaoNhanVien
);
/**
 * @route PUT /lopdaotao
 * @description Insert  new lopdaotao
 * @body {lopdaotao}
 * @access  login require,
 */
router.put(
  "/",
  authentication.loginRequired,
  
  lopdaotaonhanvientamController.updateDiemDanhForMultiple
);

/**
 * @route GET /lopdaotao
 * @description Get all lopdaotao
 
 * @access  login require,
 */
router.get(
  "/",
  authentication.loginRequired,
  lopdaotaonhanvientamController.getAllPhanTrang
);

/**
 * @route GET /lopdaotao/:sucoId
 * @description Get one lopdaotao
 * @params {sucoId}
 * @access  login require,
 */
router.get(
  "/:lopdaotaonhanvienID",
  authentication.loginRequired, validators.validate([param("lopdaotaonhanvienID").exists().isString().custom(validators.checkObjectId)]),
  lopdaotaonhanvientamController.getById
);

router.delete(
  "/:lopdaotaonhanvienID",
  authentication.loginRequired,
  validators.validate([
    param("lopdaotaonhanvienID").exists().isString().custom(validators.checkObjectId),
      ]),
      lopdaotaonhanvientamController.deleteOneById
);

module.exports = router;
